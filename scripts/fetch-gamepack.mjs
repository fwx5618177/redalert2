#!/usr/bin/env node
/**
 * Provision game resources for first-launch-without-import.
 *
 * 1. Download upstream `full-pack.7z` (140 MB, no CORS so server-side)
 *    to apps/web/public/cdn/full-pack.7z if not already there.
 * 2. Extract via 7z-wasm CLI (Node) into apps/web/public/cdn/full-pack/.
 * 3. Lowercase every extracted filename so production fetches (Linux
 *    case-sensitive FS) resolve consistently — the upstream archive
 *    uses pre-2000 Windows uppercase convention but the runtime does
 *    case-sensitive HTTP fetches.
 * 4. Strip files the browser runtime can't use anyway (Windows EXE/DLL,
 *    Westwood launcher leftovers, runtime caches, 0-byte stubs). The TS
 *    engine never opens these — they were just along for the ride from
 *    the original 2000 install.
 * 5. Generate manifest.json listing every surviving file with its size.
 *    The runtime auto-importer reads this to know what to fetch into
 *    IndexedDB on first launch.
 * 6. Remove the 7z afterward to free 134 MB on disk.
 *
 * After this runs, GameRes fetches every file in the manifest from
 * /cdn/full-pack/ on first visit (essential mixes through the
 * music/video/splash extraction pipeline, everything else as plain
 * writes to rfs root or subdirectories), then skips the import dialog
 * forever. Subsequent visits load straight from IndexedDB.
 *
 * Usage:
 *   pnpm fetch:gamepack          # idempotent; skip if already extracted
 *   pnpm fetch:gamepack --force  # re-download + re-extract
 *
 * Storage: archive ~140 MB (deleted at end), extracted ~440 MB, kept.
 */
import fs from 'node:fs';
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const cdnDir = path.join(repoRoot, 'apps/web/public/cdn');
const extractDir = path.join(cdnDir, 'full-pack');
const archivePath = path.join(cdnDir, 'full-pack.7z');
const upstreamUrl = 'https://download.ra2web.com/full-pack.7z';
const REQUIRED_FILES = ['language.mix', 'multi.mix', 'ra2.mix'];
const sevenZipCli = path.join(repoRoot, 'node_modules/.pnpm/7z-wasm@1.2.0/node_modules/7z-wasm/bin/cli');
const force = process.argv.includes('--force');

function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fetchHead(targetUrl) {
    return new Promise((resolve, reject) => {
        const req = https.request(targetUrl, { method: 'HEAD' }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                resolve(fetchHead(res.headers.location));
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HEAD ${targetUrl} → ${res.statusCode}`));
                return;
            }
            resolve({ contentLength: Number(res.headers['content-length'] ?? 0) });
        });
        req.on('error', reject);
        req.end();
    });
}

function fetchToFile(targetUrl, dest, expectedBytes) {
    return new Promise((resolve, reject) => {
        const tmp = dest + '.partial';
        const out = fs.createWriteStream(tmp);
        let received = 0;
        let lastReportedPct = -1;
        const req = https.get(targetUrl, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                out.close();
                fs.unlink(tmp, () => {});
                fetchToFile(res.headers.location, dest, expectedBytes).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                out.close();
                fs.unlink(tmp, () => {});
                reject(new Error(`GET ${targetUrl} → ${res.statusCode}`));
                return;
            }
            res.on('data', (chunk) => {
                received += chunk.length;
                const pct = expectedBytes > 0 ? Math.floor((received / expectedBytes) * 100) : -1;
                if (pct !== lastReportedPct && pct % 5 === 0) {
                    process.stdout.write(`\r  download: ${humanSize(received)} / ${humanSize(expectedBytes)} (${pct}%)  `);
                    lastReportedPct = pct;
                }
            });
            res.pipe(out);
            out.on('finish', () => { out.close(); process.stdout.write('\n'); resolve(received); });
        });
        req.on('error', (err) => { out.close(); fs.unlink(tmp, () => {}); reject(err); });
    });
}

async function ensureArchive() {
    fs.mkdirSync(cdnDir, { recursive: true });
    const head = await fetchHead(upstreamUrl);
    if (!force && fs.existsSync(archivePath)) {
        const localSize = fs.statSync(archivePath).size;
        if (localSize === head.contentLength) {
            console.log(`[fetch-gamepack] archive already at ${humanSize(localSize)}, reusing`);
            return;
        }
    }
    console.log(`[fetch-gamepack] downloading ${humanSize(head.contentLength)} from upstream`);
    await fetchToFile(upstreamUrl, archivePath, head.contentLength);
    const tmp = archivePath + '.partial';
    if (fs.statSync(tmp).size !== head.contentLength) {
        fs.unlinkSync(tmp);
        throw new Error('archive size mismatch after download');
    }
    fs.renameSync(tmp, archivePath);
}

function extract() {
    fs.mkdirSync(extractDir, { recursive: true });
    console.log('[fetch-gamepack] extracting via 7z-wasm CLI');
    // 7z-wasm sandboxes its filesystem to the cwd; relative paths only.
    const result = spawnSync('node', [sevenZipCli, 'x', '-y', '../full-pack.7z'], {
        cwd: extractDir,
        stdio: ['ignore', 'inherit', 'inherit'],
    });
    if (result.status !== 0) {
        throw new Error(`7z-wasm extract exited with status ${result.status}`);
    }
}

function lowercaseTree(dir) {
    // APFS/HFS+ on macOS is case-insensitive, so a direct rename to the
    // lowercase variant is a no-op — go via a temp name to actually
    // change the on-disk casing (matters once the deploy lands on Linux).
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const lower = entry.name.toLowerCase();
        if (entry.isDirectory()) {
            lowercaseTree(full);
            if (lower !== entry.name) {
                const tmp = path.join(dir, `__tmp_${process.pid}__${lower}`);
                fs.renameSync(full, tmp);
                fs.renameSync(tmp, path.join(dir, lower));
            }
            continue;
        }
        if (lower !== entry.name) {
            const tmp = path.join(dir, `__tmp_${process.pid}__${lower}`);
            fs.renameSync(full, tmp);
            fs.renameSync(tmp, path.join(dir, lower));
        }
    }
}

// Files the TS engine cannot consume — stripping them keeps the
// deployed bundle lean and means the runtime auto-importer doesn't
// waste bytes pulling them into IndexedDB.
const USELESS_EXTS = new Set(['.dll', '.exe', '.tlb', '.bat', '.lcf', '.ico', '.dsk']);
const USELESS_NAMES = new Set([
    // empty 5-byte stubs left over from the CD ripper — engine never opens them
    'movies01.mix',
    'movies02.mix',
]);
const USELESS_DIRS = new Set([
    // runtime cache from the desktop install; engine recreates as needed
    'rmcache',
]);

function dirSize(dir) {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) total += dirSize(full);
        else total += fs.statSync(full).size;
    }
    return total;
}

function stripUseless(dir) {
    let removed = 0;
    let freed = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (USELESS_DIRS.has(entry.name)) {
                freed += dirSize(full);
                fs.rmSync(full, { recursive: true, force: true });
                removed++;
            }
            continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        const sz = fs.statSync(full).size;
        const isUselessExt = USELESS_EXTS.has(ext);
        const isUselessName = USELESS_NAMES.has(entry.name);
        const isEmpty = sz === 0;
        if (isUselessExt || isUselessName || isEmpty) {
            fs.unlinkSync(full);
            removed++;
            freed += sz;
        }
    }
    return { removed, freed };
}

function buildManifest(dir) {
    const files = [];
    function walk(sub, prefix) {
        for (const entry of fs.readdirSync(sub, { withFileTypes: true })) {
            const full = path.join(sub, entry.name);
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                walk(full, rel);
                continue;
            }
            if (entry.name === 'manifest.json') continue;
            files.push({ path: rel, size: fs.statSync(full).size });
        }
    }
    walk(dir, '');
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { version: 1, files };
}

function verifyRequired() {
    for (const name of REQUIRED_FILES) {
        const full = path.join(extractDir, name);
        if (!fs.existsSync(full)) {
            throw new Error(`required file missing after extract: ${name}`);
        }
        const sz = fs.statSync(full).size;
        if (sz === 0) {
            throw new Error(`required file empty after extract: ${name}`);
        }
        console.log(`  ✓ ${name}  ${humanSize(sz)}`);
    }
}

function writeManifest() {
    const manifest = buildManifest(extractDir);
    const manifestPath = path.join(extractDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const total = manifest.files.reduce((acc, f) => acc + f.size, 0);
    console.log(`[fetch-gamepack] wrote manifest.json (${manifest.files.length} files, ${humanSize(total)})`);
}

async function main() {
    console.log(`[fetch-gamepack] target: ${path.relative(repoRoot, extractDir)}`);

    const manifestPath = path.join(extractDir, 'manifest.json');
    if (!force && fs.existsSync(manifestPath) && REQUIRED_FILES.every((n) => fs.existsSync(path.join(extractDir, n)))) {
        console.log('[fetch-gamepack] manifest + required mixes already in place; skipping');
        console.log('[fetch-gamepack] use --force to re-download and re-extract');
        verifyRequired();
        return;
    }

    if (force && fs.existsSync(extractDir)) {
        console.log('[fetch-gamepack] --force: removing existing extract dir');
        fs.rmSync(extractDir, { recursive: true, force: true });
    }

    if (!fs.existsSync(sevenZipCli)) {
        console.error(`[fetch-gamepack] missing 7z-wasm CLI at ${sevenZipCli}`);
        console.error('[fetch-gamepack] run `pnpm install` first');
        process.exit(1);
    }

    await ensureArchive();
    const alreadyExtracted = fs.existsSync(path.join(extractDir, 'ra2.mix'))
        || fs.existsSync(path.join(extractDir, 'RA2.MIX'));
    if (!alreadyExtracted) {
        extract();
    } else {
        console.log('[fetch-gamepack] extract dir already populated; reusing');
    }
    lowercaseTree(extractDir);

    const cleanup = stripUseless(extractDir);
    if (cleanup.removed > 0) {
        console.log(`[fetch-gamepack] stripped ${cleanup.removed} useless entries (${humanSize(cleanup.freed)} reclaimed)`);
    }

    console.log('[fetch-gamepack] verifying required files');
    verifyRequired();

    writeManifest();

    if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
        console.log('[fetch-gamepack] removed archive (134 MB reclaimed)');
    }

    console.log('[fetch-gamepack] done. /cdn/game-res/v2/ ready; first visit will skip the import dialog.');
}

main().catch((err) => {
    console.error('[fetch-gamepack] error:', err.message ?? err);
    process.exit(1);
});
