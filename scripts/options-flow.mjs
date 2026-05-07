import { runFlow, waitForDebugRoot, snapshotRuntime } from './lib/runtime.mjs';
import { BASE_URL } from './lib/config.mjs';

/**
 * Smoke-test the GeneralOptions persistence path. Captures:
 *   - Initial __ra2debug.generalOptions serialization
 *   - LocalStorage 'options' before / after toggling a primitive value
 *   - That a reload preserves the toggle (write → reload → read)
 *
 * Without game files we can still exercise the options object; it is
 * constructed in Application.main() before GameRes.init().
 */
runFlow('options-flow', async (ctx) => {
    const { page } = ctx;

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});

    const initial = await page.evaluate(() => {
        const options = (window).__ra2debug?.generalOptions;
        const serialized = options?.serialize?.();
        return {
            available: !!options,
            serialized: serialized ?? null,
            localStorageOptions: localStorage.getItem('_r_opts_v3'),
        };
    });
    await ctx.writeJson('00-initial', initial);
    await ctx.screenshot('00-initial');

    if (!initial.available) {
        return { skipped: true, reason: 'generalOptions not exposed (loader blocked early)' };
    }

    // Toggle a benign primitive: shroud reveal in audio? Use viewMode:
    //   resolution defaults are objects, but generalOptions.audio.musicVolume
    //   or similar primitives are safe. We probe what's there first.
    const probe = await page.evaluate(() => {
        const options = (window).__ra2debug?.generalOptions;
        const out = { groups: {} };
        for (const key of Object.keys(options)) {
            const v = options[key];
            out.groups[key] = v && typeof v === 'object'
                ? Object.keys(v)
                : typeof v;
        }
        return out;
    });
    await ctx.writeJson('01-options-shape', probe);

    // Toggle a known top-level BoxedVar. scrollRate is numeric (1..N range).
    // Fall back to flyerHelper (boolean) if scrollRate is unavailable.
    const toggle = await page.evaluate(() => {
        const options = (window).__ra2debug?.generalOptions;
        const scroll = options?.scrollRate;
        if (scroll && 'value' in scroll && typeof scroll.value === 'number') {
            const before = scroll.value;
            const next = before >= 8 ? 4 : 12;
            scroll.value = next;
            return { changed: true, key: 'scrollRate', before, after: next };
        }
        const flyer = options?.flyerHelper;
        if (flyer && 'value' in flyer) {
            const before = !!flyer.value;
            flyer.value = !before;
            return { changed: true, key: 'flyerHelper', before, after: !before };
        }
        return { changed: false };
    });
    await ctx.writeJson('02-toggle', toggle);

    // Persist explicitly through Application's regular flow: trigger a serialize.
    const persisted = await page.evaluate(() => {
        const options = (window).__ra2debug?.generalOptions;
        const serialized = options?.serialize?.();
        // LocalPrefs writes to StorageKey.Options = '_r_opts_v3'.
        if (typeof serialized === 'string') {
            localStorage.setItem('_r_opts_v3', serialized);
        }
        return {
            serialized: serialized ?? null,
            localStorageOptions: localStorage.getItem('_r_opts_v3'),
        };
    });
    await ctx.writeJson('03-persisted', persisted);

    // Reload and confirm the value survives.
    await page.reload({ waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});
    await page.waitForTimeout(800);

    const after = await page.evaluate(() => {
        const options = (window).__ra2debug?.generalOptions;
        return {
            available: !!options,
            scrollRate: options?.scrollRate?.value ?? null,
            flyerHelper: options?.flyerHelper?.value ?? null,
            localStorageOptions: localStorage.getItem('_r_opts_v3'),
        };
    });
    await ctx.writeJson('04-after-reload', after);
    await ctx.screenshot('04-after-reload');

    const persistedToToggleValue =
        toggle.changed &&
        toggle.key &&
        (after[toggle.key] === toggle.after);

    return {
        toggled: toggle.changed === true,
        toggleKey: toggle.key ?? null,
        persistedAcrossReload: !!persistedToToggleValue,
        toggleBefore: toggle.before ?? null,
        toggleAfter: toggle.after ?? null,
        afterReloadValue: toggle.key ? after[toggle.key] : null,
    };
});
