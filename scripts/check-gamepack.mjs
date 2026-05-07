#!/usr/bin/env node
/**
 * Pre-build guard: ensure the extracted gamepack at
 * apps/web/public/cdn/full-pack/ contains the essential .mix files
 * before `pnpm build`, so the production deploy ships everything the
 * auto-import-on-first-launch path needs.
 *
 * The build itself happily proceeds without these (Vite just skips
 * missing assets), but the deployed dist/ would be silently broken —
 * GameRes would 404 on /cdn/full-pack/ra2.mix and fall back to the
 * import dialog, defeating the point of bundling.
 *
 * Skip with: SKIP_GAMEPACK_CHECK=1 pnpm build
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const extractDir = path.join(repoRoot, 'apps/web/public/cdn/full-pack');
const REQUIRED_FILES = ['language.mix', 'multi.mix', 'ra2.mix'];

if (process.env.SKIP_GAMEPACK_CHECK === '1') {
    console.log('[check-gamepack] SKIP_GAMEPACK_CHECK=1; bypassing.');
    process.exit(0);
}

const missing = REQUIRED_FILES.filter(
    (name) => !fs.existsSync(path.join(extractDir, name)),
);

if (missing.length > 0) {
    console.error('');
    console.error('[check-gamepack] FAIL: required files missing under apps/web/public/cdn/full-pack/:');
    for (const name of missing) {
        console.error(`[check-gamepack]   - ${name}`);
    }
    console.error('[check-gamepack]');
    console.error('[check-gamepack] On first visit GameRes auto-populates IndexedDB');
    console.error('[check-gamepack] from /cdn/full-pack/<file>.mix. A production build');
    console.error('[check-gamepack] without these would 404 on auto-import.');
    console.error('[check-gamepack]');
    console.error('[check-gamepack] To populate (~140 MB download → ~450 MB extracted):');
    console.error('[check-gamepack]   pnpm fetch:gamepack');
    console.error('[check-gamepack]');
    console.error('[check-gamepack] To bypass this check (e.g. CI lint-only build):');
    console.error('[check-gamepack]   SKIP_GAMEPACK_CHECK=1 pnpm build');
    console.error('');
    process.exit(1);
}

let total = 0;
for (const name of REQUIRED_FILES) {
    const sz = fs.statSync(path.join(extractDir, name)).size;
    total += sz;
    console.log(`[check-gamepack] ✓ ${name}  ${(sz / 1024 / 1024).toFixed(1)} MB`);
}
console.log(`[check-gamepack] OK: ${(total / 1024 / 1024).toFixed(1)} MB total essentials at apps/web/public/cdn/full-pack/`);
