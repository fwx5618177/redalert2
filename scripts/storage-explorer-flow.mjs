import { runFlow, waitForDebugRoot, snapshotRuntime } from './lib/runtime.mjs';
import { BASE_URL } from './lib/config.mjs';

/**
 * StorageFileExplorer (src/gui/component/fileExplorer/StorageFileExplorer.tsx)
 * is mounted from inside the GameRes import flow. Without game files
 * imported the GameRes screen is the first thing rendered after splash;
 * we look for the import-data UI and capture screenshots/text. If the
 * UI is gated behind file-system-access prompts, we record what we
 * actually see so a regression in the entry surface is detectable.
 */
runFlow('storage-explorer-flow', async (ctx) => {
    const { page } = ctx;

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});

    // Wait a beat for GameRes to either reach main menu or stop on import dialog.
    await page.waitForTimeout(3_500);
    await ctx.screenshot('00-after-load');

    const initial = await snapshotRuntime(page);
    await ctx.writeJson('00-snapshot', initial);

    // Probe DOM for import / explorer affordances. Look for known buttons
    // by heuristic strings used in this codebase.
    const domProbe = await page.evaluate(() => {
        const root = document.getElementById('ra2web-root');
        const text = root ? root.innerText : '';
        const buttons = Array.from(document.querySelectorAll('button'))
            .map((b) => (b.textContent ?? '').trim())
            .filter(Boolean);
        const links = Array.from(document.querySelectorAll('a'))
            .map((a) => (a.textContent ?? '').trim())
            .filter(Boolean);
        return {
            rootInnerTextLen: text.length,
            rootInnerTextSample: text.slice(0, 800),
            buttons,
            links,
            hasFileExplorerNode: !!document.querySelector('[data-storage-explorer]'),
        };
    });
    await ctx.writeJson('01-dom-probe', domProbe);

    // Capture localStorage + IndexedDB quotas (GameRes uses these).
    const storage = await page.evaluate(async () => {
        const ls = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) ls[k] = (localStorage.getItem(k) ?? '').slice(0, 200);
        }
        let estimate = null;
        try {
            estimate = await navigator.storage?.estimate?.();
        } catch {}
        return { localStorageKeys: Object.keys(ls), localStorageSample: ls, estimate };
    });
    await ctx.writeJson('02-storage', storage);
    await ctx.screenshot('02-final');

    return {
        buttonsFound: domProbe.buttons.length,
        hasFileExplorerNode: domProbe.hasFileExplorerNode,
    };
});
