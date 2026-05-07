#!/usr/bin/env node
/**
 * Pre-build guard: ensure apps/web/public/cdn/full-pack.7z exists before
 * `pnpm build` so the production deploy ships the file the auto-import
 * button needs. The build itself happily proceeds without it (Vite just
 * skips the missing asset), but the deployed dist/ would be silently
 * broken — the auto-import path would 404.
 *
 * Skip with: SKIP_GAMEPACK_CHECK=1 pnpm build
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const target = path.join(repoRoot, 'apps/web/public/cdn/full-pack.7z');

if (process.env.SKIP_GAMEPACK_CHECK === '1') {
    console.log('[check-gamepack] SKIP_GAMEPACK_CHECK=1; bypassing.');
    process.exit(0);
}

if (!fs.existsSync(target)) {
    console.error('');
    console.error('[check-gamepack] FAIL: apps/web/public/cdn/full-pack.7z is missing.');
    console.error('[check-gamepack]');
    console.error('[check-gamepack] The auto-import button in the GameRes dialog');
    console.error('[check-gamepack] reads /cdn/full-pack.7z. A production build');
    console.error('[check-gamepack] without it ships a deploy where auto-import 404s.');
    console.error('[check-gamepack]');
    console.error('[check-gamepack] To populate it (~140 MB, one-time):');
    console.error('[check-gamepack]   pnpm fetch:gamepack');
    console.error('[check-gamepack]');
    console.error('[check-gamepack] To bypass this check (e.g. CI lint-only build):');
    console.error('[check-gamepack]   SKIP_GAMEPACK_CHECK=1 pnpm build');
    console.error('');
    process.exit(1);
}

const stats = fs.statSync(target);
const mb = (stats.size / 1024 / 1024).toFixed(1);
console.log(`[check-gamepack] OK: ${mb} MB at apps/web/public/cdn/full-pack.7z`);
