import { runFlow, waitForDebugRoot, waitForMainMenu } from './lib/runtime.mjs';
import { BASE_URL } from './lib/config.mjs';

/**
 * Capture window.__ra2debug.skirmishLobby — the snapshot SkirmishScreen.ts
 * exposes (gameOpts, slotsInfo, formModel, startGame()).
 *
 * Requires game files to be importable (CDN reachable or local files).
 * If the main menu never appears we record the stop point and exit
 * without failing the run.
 */
runFlow('skirmish-lobby-data-flow', async (ctx) => {
    const { page } = ctx;

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});

    let mainMenuReached = false;
    try {
        await waitForMainMenu(page, { timeoutMs: 30_000 });
        mainMenuReached = true;
    } catch {
        // No game files. Capture state and exit cleanly.
    }

    if (!mainMenuReached) {
        await ctx.screenshot('00-no-main-menu');
        const snap = await page.evaluate(() => ({
            ra2debugKeys: Object.keys((window).__ra2debug ?? {}),
            url: location.href,
        }));
        await ctx.writeJson('00-no-main-menu', snap);
        return { skipped: true, reason: 'main menu not reached (game files missing?)' };
    }

    // Drive into the Skirmish screen via mainMenuController, mirroring
    // how a tester would click the in-canvas button.
    const navigated = await page.evaluate(async () => {
        // MainMenuScreenType.Skirmish is a numeric enum; we cannot import it
        // here, so locate it via the controller's enum-like behavior by
        // calling the known method shape used in HomeScreen.
        const mc = (window).__ra2debug?.mainMenuController;
        if (!mc) return { ok: false, reason: 'no mainMenuController' };
        // Most controllers expose goToScreen(screenType: number). Try indices
        // 0..6 until skirmishLobby surfaces.
        for (let i = 0; i < 8; i++) {
            try { mc.goToScreen?.(i); } catch {}
            await new Promise((r) => setTimeout(r, 300));
            if ((window).__ra2debug?.skirmishLobby) {
                return { ok: true, viaScreenType: i };
            }
        }
        return { ok: false, reason: 'skirmishLobby never appeared after enumerating screen types' };
    });
    await ctx.writeJson('01-navigate', navigated);
    await ctx.screenshot('01-skirmish');

    if (!navigated.ok) {
        return { mainMenuReached, skirmishLobbyReached: false, ...navigated };
    }

    const lobby = await page.evaluate(() => {
        const lobby = (window).__ra2debug?.skirmishLobby;
        if (!lobby) return null;
        return {
            hasGameOpts: !!lobby.gameOpts,
            hasSlotsInfo: !!lobby.slotsInfo,
            hasFormModel: !!lobby.formModel,
            playerSlotCount: lobby.formModel?.playerSlots?.length ?? null,
            availablePlayerColors: lobby.formModel?.availablePlayerColors?.length ?? null,
            availableStartPositions: lobby.formModel?.availableStartPositions?.length ?? null,
            gameSpeed: lobby.formModel?.gameSpeed ?? null,
            credits: lobby.formModel?.credits ?? null,
            unitCount: lobby.formModel?.unitCount ?? null,
        };
    });
    await ctx.writeJson('02-lobby', lobby);

    return { mainMenuReached: true, skirmishLobbyReached: true, lobby };
});
