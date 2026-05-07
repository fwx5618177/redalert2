import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { ARTIFACTS_DIR, BASE_URL } from './lib/config.mjs';
import { ensureDevServer } from './lib/devServer.mjs';

/**
 * Long-running runtime: holds a Vite dev server + a Playwright Chromium
 * window open for interactive use. Useful for poking the app over an
 * extended session without restarting the toolchain.
 *
 * Exit with Ctrl-C; the runtime tears down browser + dev server.
 *
 * Env vars:
 *   HEADED=1     run with a visible browser (default headless)
 *   SLOWMO=200   ms slowdown between actions
 *   SCREENSHOT_INTERVAL_MS=10000  periodic screenshot to .artifacts/live-interaction-runtime/
 */
async function main() {
    const headed = !!process.env.HEADED;
    const slowMo = Number(process.env.SLOWMO ?? 0);
    const screenshotIntervalMs = Number(process.env.SCREENSHOT_INTERVAL_MS ?? 0);
    const artifactsDir = path.join(ARTIFACTS_DIR, 'live-interaction-runtime');
    await fs.mkdir(artifactsDir, { recursive: true });

    const server = await ensureDevServer({ verbose: true });
    const browser = await chromium.launch({ headless: !headed, slowMo });
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('console', (msg) => console.log(`[browser/${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[browser/pageerror] ${err.message}`));

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log(`[runtime] open at ${BASE_URL} (headed=${headed})`);

    let screenshotTimer;
    if (screenshotIntervalMs > 0) {
        let n = 0;
        screenshotTimer = setInterval(async () => {
            const fp = path.join(artifactsDir, `tick-${String(n++).padStart(4, '0')}.png`);
            try {
                await page.screenshot({ path: fp });
                console.log(`[runtime] screenshot → ${fp}`);
            } catch (e) {
                console.warn(`[runtime] screenshot failed: ${e?.message ?? e}`);
            }
        }, screenshotIntervalMs);
    }

    let shuttingDown = false;
    const shutdown = async (sig) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n[runtime] received ${sig}, shutting down...`);
        if (screenshotTimer) clearInterval(screenshotTimer);
        try { await browser.close(); } catch {}
        try { await server.dispose(); } catch {}
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Idle forever.
    await new Promise(() => {});
}

main().catch((err) => {
    console.error('[runtime] fatal', err?.stack ?? err);
    process.exit(1);
});
