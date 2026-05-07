#!/usr/bin/env node
/**
 * CI gate: count `pnpm typecheck` errors and compare against
 * `.typecheck-baseline.json#maxErrors`.
 *
 * Exit codes:
 *   0 — pass (current ≤ baseline)
 *   1 — fail (current > baseline; surface a diff)
 *
 * Local usage: `node scripts/check-typecheck-baseline.mjs`
 *
 * The baseline is intentionally maintained by hand. When you fix a batch
 * of errors, run this script, see "current N is below baseline by K", then
 * decrement `maxErrors` by K and commit. We do not auto-update because a
 * silently-decreasing number trades one lurking debt for another (a
 * rubber-stamped baseline that nobody reads).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const baselinePath = path.join(repoRoot, '.typecheck-baseline.json');

if (!fs.existsSync(baselinePath)) {
    console.error(`[typecheck-baseline] missing ${baselinePath}`);
    process.exit(2);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const max = baseline.maxErrors;

const result = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
});
const output = (result.stdout ?? '') + (result.stderr ?? '');
const errorCount = (output.match(/error TS/g) ?? []).length;

console.log(`[typecheck-baseline] errors=${errorCount} baseline=${max}`);

if (errorCount > max) {
    console.error(
        `[typecheck-baseline] FAIL: typecheck regressed by ${errorCount - max} (current=${errorCount}, baseline=${max}).`
    );
    console.error('[typecheck-baseline] Run `pnpm typecheck` locally and fix the new errors,');
    console.error('[typecheck-baseline] OR if you genuinely need to widen the baseline,');
    console.error('[typecheck-baseline] update `.typecheck-baseline.json#maxErrors` with rationale.');
    // Re-emit recent error lines to make CI logs actionable.
    const lines = output.split('\n').filter((l) => l.includes('error TS')).slice(-30);
    if (lines.length) {
        console.error('\n[typecheck-baseline] last error lines:');
        for (const l of lines) console.error('  ' + l);
    }
    process.exit(1);
}

if (errorCount < max) {
    console.log(
        `[typecheck-baseline] OK: ${max - errorCount} errors fixed since baseline. Consider lowering baseline to ${errorCount}.`
    );
} else {
    console.log('[typecheck-baseline] OK: at baseline.');
}
process.exit(0);
