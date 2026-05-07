import { runFlow, waitForDebugRoot, snapshotRuntime, navigateHash } from './lib/runtime.mjs';
import { TESTER_ROUTES, BASE_URL } from './lib/config.mjs';

/**
 * Verify that every hash route registered in Application.initRouting()
 * is reachable. For each route, capture a screenshot and a runtime
 * snapshot. Routes that require game files (when no assets are loaded)
 * are expected to surface either a "missing game files" error UI or
 * keep the GameRes import dialog — both are recorded, neither fails
 * the run on its own.
 */
runFlow('test-entry-flow', async (ctx) => {
    const { page } = ctx;

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {
        // Even if __ra2debug never appears, continue and capture state.
    });

    const initialSnap = await snapshotRuntime(page);
    await ctx.writeJson('00-initial', initialSnap);
    await ctx.screenshot('00-initial');

    // Detect whether we got past GameRes init. If not, hash routing is never
    // installed and the per-route screenshots will all be identical splash
    // captures — record that explicitly instead of pretending we tested.
    const gameResProbe = await page.evaluate(() => {
        const root = document.getElementById('ra2web-root');
        const dialogText = root?.querySelector('.game-res-box')?.textContent ?? null;
        return {
            gameResDialogOpen: !!dialogText,
            dialogTextSample: dialogText ? dialogText.trim().slice(0, 300) : null,
            mainMenuPresent: !!(window).__ra2debug?.mainMenu,
        };
    });
    await ctx.writeJson('01-gameres-probe', gameResProbe);

    const routingActive = gameResProbe.mainMenuPresent;

    const perRoute = [];
    for (const route of TESTER_ROUTES) {
        const slug = route.name;
        const before = await snapshotRuntime(page);
        await navigateHash(page, route.hash);
        await page.waitForTimeout(1_500);
        const after = await snapshotRuntime(page);
        await ctx.screenshot(`route-${slug}`);

        perRoute.push({
            hash: route.hash,
            requiresGameFiles: route.requiresGameFiles,
            beforeKeys: before.ra2debugKeys,
            afterKeys: after.ra2debugKeys,
            ra2testTool: after.ra2testTool,
            archives: after.ra2testArchives,
            stateAdvanced:
                JSON.stringify(after.ra2debugKeys) !== JSON.stringify(before.ra2debugKeys),
        });
    }

    await ctx.writeJson('routes', perRoute);

    return {
        baseUrl: BASE_URL,
        routesProbed: perRoute.length,
        initialDebugKeys: initialSnap.ra2debugKeys,
        routingActive,
        gameResDialogOpen: gameResProbe.gameResDialogOpen,
        // Honest: if routing was never installed, route iteration was a no-op.
        observation: routingActive
            ? 'routing active; routes were exercised'
            : 'GameRes import dialog blocked init; route handlers never registered. Each route-*.png is the same pre-routing screen.',
    };
});
