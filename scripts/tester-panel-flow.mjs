import { runFlow, waitForDebugRoot, snapshotRuntime, navigateHash } from './lib/runtime.mjs';
import { TESTER_ROUTES, BASE_URL } from './lib/config.mjs';

/**
 * For each tester route that requires game files, capture window.__ra2test
 * after navigation. With no game files imported, every test panel is
 * expected to fail at the `Engine.vfs` guard — we record that state so
 * regressions in the guard text or error path stand out.
 */
runFlow('tester-panel-flow', async (ctx) => {
    const { page } = ctx;

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});

    const panels = [];
    for (const route of TESTER_ROUTES.filter((r) => r.requiresGameFiles)) {
        await navigateHash(page, route.hash);
        await page.waitForTimeout(2_000);

        const snap = await page.evaluate(() => {
            const test = (window).__ra2test ?? null;
            return test ? {
                tool: test.tool,
                stateKeys: test.state ? Object.keys(test.state) : [],
                archiveCount: Array.isArray(test.archives) ? test.archives.length : 0,
                updatedAt: test.updatedAt,
            } : null;
        });

        await ctx.screenshot(`panel-${route.name}`);
        panels.push({
            hash: route.hash,
            name: route.name,
            ra2test: snap,
        });
    }

    await ctx.writeJson('panels', panels);
    return {
        probed: panels.length,
        populated: panels.filter((p) => !!p.ra2test).length,
    };
});
