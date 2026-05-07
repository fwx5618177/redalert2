import { runFlow, waitForDebugRoot, snapshotRuntime } from './lib/runtime.mjs';
import { BASE_URL } from './lib/config.mjs';

/**
 * Trace the GameRes init pipeline. Captures:
 *   - Splash text progression (Application.splashScreenUpdateCallback fires)
 *   - Final reachable state (main menu, GameRes import dialog, or error)
 *   - Console lines that mention [Application], [GameRes], [VFS]
 *
 * Without an importable game source, this script does not assert "main
 * menu loads" — it asserts the init reaches a stable, identifiable state.
 */
runFlow('game-res-init-flow', async (ctx) => {
    const { page } = ctx;

    // Hook console early so we don't lose any [Application] lines emitted
    // during the synchronous CRC32 self-test in main.tsx.
    const splashTexts = [];
    page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('SplashScreen update callback received')) {
            splashTexts.push(text);
        }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});
    await page.waitForTimeout(4_000);

    const snap = await snapshotRuntime(page);
    await ctx.writeJson('00-snapshot', snap);
    await ctx.screenshot('00-snapshot');

    // Bucket console lines we care about.
    const buckets = {
        application: [],
        gameRes: [],
        vfs: [],
        diag: [],
        errors: [],
    };
    for (const line of ctx.consoleLog) {
        if (line.startsWith('[error]') || line.startsWith('[pageerror]')) {
            buckets.errors.push(line);
        }
        if (line.includes('[Application]')) buckets.application.push(line);
        if (line.includes('[GameRes]')) buckets.gameRes.push(line);
        if (line.includes('[VFS]')) buckets.vfs.push(line);
        if (line.includes('[Diag]')) buckets.diag.push(line);
    }
    await ctx.writeJson('01-console-buckets', {
        applicationCount: buckets.application.length,
        gameResCount: buckets.gameRes.length,
        vfsCount: buckets.vfs.length,
        diagCount: buckets.diag.length,
        errorCount: buckets.errors.length,
        sampleApplication: buckets.application.slice(0, 30),
        sampleGameRes: buckets.gameRes.slice(0, 30),
        sampleErrors: buckets.errors.slice(0, 30),
    });

    await ctx.writeJson('02-splash-progression', { splashTexts });

    return {
        reachedMainMenu: snap.ra2debugKeys.includes('mainMenu'),
        ra2debugKeys: snap.ra2debugKeys,
        errorCount: buckets.errors.length,
        applicationLogLines: buckets.application.length,
    };
});
