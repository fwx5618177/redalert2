#!/usr/bin/env node
/**
 * Provision game resources for first-launch-without-import.
 *
 * 1. Download upstream `full-pack.7z` (140 MB, no CORS so server-side)
 *    to apps/web/public/cdn/full-pack.7z if not already there.
 * 2. Extract via 7z-wasm CLI (Node) into apps/web/public/cdn/full-pack/.
 * 3. Lowercase every extracted filename so production fetches (Linux
 *    case-sensitive FS) resolve `language.mix`, `multi.mix`, `ra2.mix`
 *    consistently — the upstream archive uses pre-2000 Windows uppercase
 *    convention but GameRes does case-sensitive HTTP fetches.
 * 4. Remove the 7z afterward to free 134 MB on disk.
 *
 * After this runs, GameRes will fetch the .mix files from /cdn/full-pack/
 * on first visit, auto-populate IndexedDB from them, and skip the import
 * dialog entirely. Subsequent visits load straight from IndexedDB.
 *
 * Usage:
 *   pnpm fetch:gamepack          # idempotent; skip if already extracted
 *   pnpm fetch:gamepack --force  # re-download + re-extract
 *
 * Storage: archive ~140 MB (deleted at end), extracted ~458 MB, kept.
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
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const lower = entry.name.toLowerCase();
        if (entry.isDirectory()) {
            lowercaseTree(full);
            if (lower !== entry.name) {
                fs.renameSync(full, path.join(dir, lower));
            }
            continue;
        }
        if (lower !== entry.name) {
            fs.renameSync(full, path.join(dir, lower));
        }
    }
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

async function main() {
    console.log(`[fetch-gamepack] target: ${path.relative(repoRoot, extractDir)}`);

    if (!force && REQUIRED_FILES.every((n) => fs.existsSync(path.join(extractDir, n)))) {
        console.log('[fetch-gamepack] all required .mix files already extracted; skipping');
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
    extract();
    lowercaseTree(extractDir);

    console.log('[fetch-gamepack] verifying required files');
    verifyRequired();

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
