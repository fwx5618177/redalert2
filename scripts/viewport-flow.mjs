import { runFlow, waitForDebugRoot, snapshotRuntime } from './lib/runtime.mjs';
import { BASE_URL } from './lib/config.mjs';

/**
 * Verify the viewport pipeline (Application.computeViewportLayout +
 * applyRootLayout). For each common preset, resize the browser and
 * record the resulting #ra2web-root style/dataset snapshot.
 */
const PRESETS = [
    { name: 'desktop-1024x768', width: 1024, height: 768 },
    { name: 'desktop-1280x800', width: 1280, height: 800 },
    { name: 'desktop-1600x900', width: 1600, height: 900 },
    { name: 'mobile-portrait-390x844', width: 390, height: 844 },
    { name: 'mobile-landscape-844x390', width: 844, height: 390 },
    { name: 'narrow-360x640', width: 360, height: 640 },
];

runFlow('viewport-flow', async (ctx) => {
    const { page } = ctx;

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(page).catch(() => {});

    const samples = [];
    for (const preset of PRESETS) {
        await page.setViewportSize({ width: preset.width, height: preset.height });
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(700);

        const detail = await page.evaluate(() => {
            const root = document.getElementById('ra2web-root');
            if (!root) return null;
            const style = root.style;
            const rect = root.getBoundingClientRect();
            return {
                styleWidth: style.width,
                styleHeight: style.height,
                styleTransform: style.transform,
                rect: { width: rect.width, height: rect.height },
                dataset: {
                    mobileLayout: root.dataset.mobileLayout,
                    orientation: root.dataset.orientation,
                    compactLayout: root.dataset.compactLayout,
                },
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
            };
        });

        await ctx.screenshot(`viewport-${preset.name}`);
        samples.push({ preset, detail });
    }

    await ctx.writeJson('viewport-samples', samples);
    return { samplesCollected: samples.length };
}, { viewport: { width: 1024, height: 768 } });
