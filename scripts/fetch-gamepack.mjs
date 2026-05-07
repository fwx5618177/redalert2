#!/usr/bin/env node
/**
 * Download upstream's full-pack.7z to apps/web/public/cdn/ so the
 * auto-import button in the GameRes dialog works without hitting a
 * CORS wall.
 *
 * Why this is needed:
 *   The committed config points `gameResArchiveUrl` at
 *   `https://download.ra2web.com/full-pack.7z`. The file IS publicly
 *   accessible (200, 140 MB on Cloudflare) but the response carries no
 *   Access-Control-Allow-Origin header — browser blocks the cross-origin
 *   fetch and the dialog surfaces both `ts:downloadfailed` +
 *   `ts:import_load_files_failed`.
 *
 * Solution:
 *   Mirror the file once into apps/web/public/cdn/ (which Vite serves at
 *   /cdn/) and let config.ini point at the relative path. Same origin =
 *   browser is happy.
 *
 * Usage:
 *   pnpm fetch:gamepack          # download (skip if size already matches)
 *   pnpm fetch:gamepack --force  # re-download even if file exists
 *
 * Storage: ~140 MB. The cdn/ dir is gitignored.
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const targetDir = path.join(repoRoot, 'apps/web/public/cdn');
const targetFile = path.join(targetDir, 'full-pack.7z');
const upstreamUrl = 'https://download.ra2web.com/full-pack.7z';
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
            resolve({
                contentLength: Number(res.headers['content-length'] ?? 0),
                etag: res.headers.etag ?? null,
                lastModified: res.headers['last-modified'] ?? null,
            });
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
                fetchToFile(res.headers.location, dest, expectedBytes)
                    .then(resolve)
                    .catch(reject);
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
                if (expectedBytes > 0) {
                    const pct = Math.floor((received / expectedBytes) * 100);
                    if (pct !== lastReportedPct && pct % 5 === 0) {
                        process.stdout.write(
                            `\r  [fetch-gamepack] ${humanSize(received)} / ${humanSize(expectedBytes)} (${pct}%)  `
                        );
                        lastReportedPct = pct;
                    }
                }
            });
            res.pipe(out);
            out.on('finish', () => {
                out.close();
                process.stdout.write('\n');
                resolve(received);
            });
        });
        req.on('error', (err) => {
            out.close();
            fs.unlink(tmp, () => {});
            reject(err);
        });
    });
}

async function main() {
    console.log(`[fetch-gamepack] target: ${path.relative(repoRoot, targetFile)}`);
    console.log(`[fetch-gamepack] source: ${upstreamUrl}`);

    fs.mkdirSync(targetDir, { recursive: true });

    let head;
    try {
        head = await fetchHead(upstreamUrl);
        console.log(
            `[fetch-gamepack] upstream: ${humanSize(head.contentLength)}` +
            (head.lastModified ? ` (modified ${head.lastModified})` : '')
        );
    } catch (err) {
        console.error(`[fetch-gamepack] HEAD failed: ${err.message}`);
        console.error('[fetch-gamepack] aborting — cannot verify upstream availability');
        process.exit(1);
    }

    if (!force && fs.existsSync(targetFile)) {
        const localSize = fs.statSync(targetFile).size;
        if (localSize === head.contentLength) {
            console.log(
                `[fetch-gamepack] already at ${humanSize(localSize)} — same as upstream. Skipping.`
            );
            console.log('[fetch-gamepack] use --force to re-download.');
            process.exit(0);
        }
        console.log(
            `[fetch-gamepack] local size ${humanSize(localSize)} ≠ upstream ${humanSize(head.contentLength)}; re-downloading`
        );
    }

    const t0 = Date.now();
    let received;
    try {
        received = await fetchToFile(upstreamUrl, targetFile, head.contentLength);
    } catch (err) {
        console.error(`[fetch-gamepack] download failed: ${err.message}`);
        process.exit(1);
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const tmp = targetFile + '.partial';
    if (received !== head.contentLength) {
        console.error(
            `[fetch-gamepack] size mismatch: got ${received}, expected ${head.contentLength}. Removing partial.`
        );
        fs.unlinkSync(tmp);
        process.exit(1);
    }

    fs.renameSync(tmp, targetFile);
    console.log(
        `[fetch-gamepack] done. ${humanSize(received)} in ${elapsed}s ` +
        `(${humanSize(received / Number(elapsed))}/s)`
    );
    console.log('[fetch-gamepack] auto-import button now hits /cdn/full-pack.7z (same origin).');
}

main().catch((err) => {
    console.error('[fetch-gamepack] unexpected error:', err);
    process.exit(1);
});
