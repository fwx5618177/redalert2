import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { ARTIFACTS_DIR, BASE_URL } from './config.mjs';
import { ensureDevServer } from './devServer.mjs';

/**
 * runFlow(name, fn, options?)
 *
 * Wraps a Playwright-driven debug flow:
 *   - Spawns (or reuses) the Vite dev server on 127.0.0.1:4000
 *   - Launches Chromium with ignoreHTTPSErrors (basic-ssl plugin uses self-signed cert)
 *   - Captures console + network errors → .artifacts/<name>/console.log
 *   - Persists a result.json summary
 *   - Tears down on success or failure
 *
 * The `fn` receives a context object: { page, context, browser, baseUrl,
 *   artifactsDir, screenshot(suffix), writeJson(suffix, data) }.
 */
export async function runFlow(name, fn, options = {}) {
    const verbose = options.verbose ?? !!process.env.DEBUG_VERBOSE;
    const headed = options.headed ?? !!process.env.HEADED;
    const slowMo = Number(process.env.SLOWMO ?? options.slowMo ?? 0);
    const viewport = options.viewport ?? { width: 1024, height: 768 };
    const artifactsDir = path.join(ARTIFACTS_DIR, name);

    await fs.mkdir(artifactsDir, { recursive: true });
    console.log(`[${name}] start (artifacts: ${artifactsDir})`);

    const startedAt = Date.now();
    const consoleLog = [];
    const networkErrors = [];
    let server;
    let browser;
    let exitCode = 0;
    let resultPayload = null;

    try {
        server = await ensureDevServer({ verbose });
        browser = await chromium.launch({ headless: !headed, slowMo });
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport,
        });
        const page = await context.newPage();
        page.on('console', (msg) => {
            const line = `[${msg.type()}] ${msg.text()}`;
            consoleLog.push(line);
            if (verbose) console.log(`  ${line}`);
        });
        page.on('pageerror', (err) => {
            const line = `[pageerror] ${err.message}`;
            consoleLog.push(line);
            if (verbose) console.error(`  ${line}`);
        });
        page.on('requestfailed', (req) => {
            const f = req.failure();
            networkErrors.push(`${req.method()} ${req.url()} -> ${f?.errorText ?? 'unknown'}`);
        });

        const ctx = {
            page,
            context,
            browser,
            baseUrl: BASE_URL,
            artifactsDir,
            consoleLog,
            networkErrors,
            async screenshot(suffix) {
                const fp = path.join(artifactsDir, `${suffix}.png`);
                await page.screenshot({ path: fp, fullPage: false });
                return fp;
            },
            async writeJson(suffix, data) {
                const fp = path.join(artifactsDir, `${suffix}.json`);
                await fs.writeFile(fp, JSON.stringify(data, null, 2));
                return fp;
            },
        };

        resultPayload = (await fn(ctx)) ?? null;
        await fs.writeFile(path.join(artifactsDir, 'console.log'), consoleLog.join('\n'));
        if (networkErrors.length) {
            await fs.writeFile(
                path.join(artifactsDir, 'network-errors.log'),
                networkErrors.join('\n')
            );
        }
        await fs.writeFile(
            path.join(artifactsDir, 'result.json'),
            JSON.stringify(
                {
                    name,
                    ok: true,
                    durationMs: Date.now() - startedAt,
                    networkErrorCount: networkErrors.length,
                    consoleLineCount: consoleLog.length,
                    result: resultPayload,
                },
                null,
                2
            )
        );
        console.log(`[${name}] OK ${Date.now() - startedAt}ms`);
    } catch (err) {
        exitCode = 1;
        console.error(`[${name}] FAIL`, err?.stack ?? err);
        await fs.writeFile(path.join(artifactsDir, 'console.log'), consoleLog.join('\n'));
        if (networkErrors.length) {
            await fs.writeFile(
                path.join(artifactsDir, 'network-errors.log'),
                networkErrors.join('\n')
            );
        }
        await fs.writeFile(
            path.join(artifactsDir, 'result.json'),
            JSON.stringify(
                {
                    name,
                    ok: false,
                    durationMs: Date.now() - startedAt,
                    error: String(err?.message ?? err),
                    networkErrorCount: networkErrors.length,
                    consoleLineCount: consoleLog.length,
                },
                null,
                2
            )
        );
    } finally {
        if (browser) {
            try { await browser.close(); } catch {}
        }
        if (server) {
            try { await server.dispose(); } catch {}
        }
    }
    process.exit(exitCode);
}

/**
 * Wait for `__ra2debug` global to appear — the earliest signal that
 * Application.main() has progressed past viewport setup. Does not require
 * game files to be loaded.
 */
export async function waitForDebugRoot(page, { timeoutMs = 60_000 } = {}) {
    await page.waitForFunction(
        () => !!(window).__ra2debug,
        null,
        { timeout: timeoutMs }
    );
}

/**
 * Wait for the main menu to be constructed. This requires GameRes init to
 * succeed (i.e. game files imported or CDN reachable). If files are missing,
 * this will time out — callers should treat the timeout as an expected state
 * and fall back to capturing the GameRes screen.
 */
export async function waitForMainMenu(page, { timeoutMs = 60_000 } = {}) {
    await page.waitForFunction(
        () => !!(window).__ra2debug?.mainMenu,
        null,
        { timeout: timeoutMs }
    );
}

/**
 * Probe what the runtime currently looks like (which __ra2debug keys are set,
 * is __ra2test populated, is the splash still mounted, etc.).
 */
export async function snapshotRuntime(page) {
    return page.evaluate(() => {
        const dbg = (window).__ra2debug ?? null;
        const test = (window).__ra2test ?? null;
        const root = document.getElementById('ra2web-root');
        return {
            url: location.href,
            hash: location.hash,
            ra2debugKeys: dbg ? Object.keys(dbg) : [],
            ra2testTool: test?.tool ?? null,
            ra2testArchives: test?.archives ?? null,
            rootChildCount: root ? root.childElementCount : -1,
            rootDataset: root
                ? {
                    mobileLayout: root.dataset.mobileLayout,
                    orientation: root.dataset.orientation,
                    compactLayout: root.dataset.compactLayout,
                }
                : null,
            documentTitle: document.title,
        };
    });
}

/**
 * Navigate by setting location.hash. Vite picks up the hashchange event via
 * Routing util. Returns once the hash actually applied.
 */
export async function navigateHash(page, hash) {
    const target = hash.startsWith('#') ? hash : `#${hash}`;
    await page.evaluate((h) => {
        window.location.hash = h;
    }, target);
    await page.waitForFunction(
        (h) => window.location.hash === h,
        target,
        { timeout: 5_000 }
    );
}
