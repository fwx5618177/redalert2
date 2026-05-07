#!/usr/bin/env node
/**
 * CI gate: measure prod build chunk sizes against `.bundle-baseline.json`.
 *
 * Exit codes:
 *   0 — pass (every tracked chunk ≤ its maxBytes; total ≤ totalAssetsMaxBytes)
 *   1 — fail (something exceeded; surface a per-chunk diff)
 *   2 — usage error (missing baseline / dist not built)
 *
 * Local usage:
 *   pnpm build && node scripts/check-bundle-baseline.mjs
 *   # or in one shot:
 *   pnpm bundle:baseline
 *
 * Tracked chunks are matched by FILENAME PREFIX before the content hash:
 * `index-Bt-CoA6D.js` → "index". Vite emits names of the form
 * `<name>-<8+chars hash>.js`; we strip the `-<hash>.js` tail.
 *
 * Like typecheck baseline: when a chunk shrinks, the script suggests
 * lowering the cap but does NOT auto-update. Edit `.bundle-baseline.json`
 * by hand to commit a tighter limit.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const baselinePath = path.join(repoRoot, '.bundle-baseline.json');
const distAssets = path.join(repoRoot, 'apps/web/dist/assets');

if (!fs.existsSync(baselinePath)) {
    console.error(`[bundle-baseline] missing ${baselinePath}`);
    process.exit(2);
}
if (!fs.existsSync(distAssets)) {
    console.error(`[bundle-baseline] missing ${distAssets} — run \`pnpm build\` first`);
    process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const trackedChunks = baseline.chunks ?? {};
const totalCap = baseline.totalAssetsMaxBytes ?? Infinity;

// Map filename → chunk name (strip Vite's `-<hash>.<ext>` tail).
// Vite hashes are exactly 8 chars (default `assetsHashLength`). They may
// contain hyphens (base64url alphabet), so the `{8}` anchor on the trailing
// hash is what disambiguates `vendor-three-BPXSdpBv.js` → `vendor-three`.
function chunkName(filename) {
    return filename.replace(/-[A-Za-z0-9_-]{8}\.(js|css|wasm)$/, '');
}

// Collect actual sizes
const measured = new Map(); // chunkName → totalBytes (sum across files matching that prefix)
let totalBytes = 0;
for (const file of fs.readdirSync(distAssets)) {
    const full = path.join(distAssets, file);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    totalBytes += stat.size;
    const name = chunkName(file);
    measured.set(name, (measured.get(name) ?? 0) + stat.size);
}

// Compare
const failures = [];
const suggestions = [];
for (const [name, rule] of Object.entries(trackedChunks)) {
    const actual = measured.get(name);
    if (actual === undefined) {
        failures.push(`  MISSING  chunk "${name}" not found in dist/assets/`);
        continue;
    }
    const max = rule.maxBytes;
    if (actual > max) {
        failures.push(`  OVER     ${name.padEnd(16)} ${actual}B > ${max}B (delta +${actual - max}B)`);
    } else {
        const headroom = max - actual;
        const headroomPct = (headroom / max) * 100;
        if (headroomPct > 25) {
            suggestions.push(`  ${name.padEnd(16)} ${actual}B (cap ${max}B, ${headroomPct.toFixed(0)}% headroom — consider lowering to ~${Math.ceil(actual * 1.1)})`);
        }
    }
}
if (totalBytes > totalCap) {
    failures.push(`  OVER     total assets ${totalBytes}B > ${totalCap}B (delta +${totalBytes - totalCap}B)`);
}

// Print report
console.log(`[bundle-baseline] tracked chunks (${measured.size} files in dist/assets):`);
for (const [name, rule] of Object.entries(trackedChunks)) {
    const actual = measured.get(name);
    const status = actual === undefined ? 'MISSING' : actual > rule.maxBytes ? 'OVER' : 'OK';
    console.log(`  ${status.padEnd(8)} ${name.padEnd(16)} actual=${actual ?? '-'} cap=${rule.maxBytes}`);
}
console.log(`  ${(totalBytes <= totalCap ? 'OK' : 'OVER').padEnd(8)} total            actual=${totalBytes} cap=${totalCap}`);

if (failures.length > 0) {
    console.error(`\n[bundle-baseline] FAIL: ${failures.length} chunk(s) over budget`);
    for (const f of failures) console.error(f);
    console.error('\n[bundle-baseline] To resolve: cut bundle bloat (check apps/web/dist/stats.html)');
    console.error('[bundle-baseline] OR if growth is genuine, edit `.bundle-baseline.json` to widen.');
    process.exit(1);
}

if (suggestions.length > 0) {
    console.log('\n[bundle-baseline] OK. Caps with extra headroom (consider tightening):');
    for (const s of suggestions) console.log(s);
} else {
    console.log('\n[bundle-baseline] OK.');
}
process.exit(0);
