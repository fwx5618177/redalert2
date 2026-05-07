/**
 * Whether the WebGL renderer should keep its drawing buffer accessible
 * after each frame swap. `true` enables `canvas.toDataURL()` capture but
 * costs a per-frame GPU→CPU readback hit (~5-10% of frame budget).
 *
 * Off in production. Turn on with `?screenshot` (or `?screenshot=1`) in
 * the URL — useful for tester pages that grab framebuffer manually.
 * Playwright's `page.screenshot()` does NOT need this flag (uses CDP
 * Page.captureScreenshot, which reads via a different path).
 */
export const SCREENSHOT_MODE: boolean = (() => {
    if (typeof window === 'undefined') return false;
    try {
        return new URLSearchParams(window.location.search).has('screenshot');
    } catch {
        return false;
    }
})();
