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

/**
 * Pure: whether a given URL search string activates screenshot mode.
 * Exposed (rather than only the constant below) so unit tests can pin
 * the flag-detection behavior without juggling global state.
 */
export function isScreenshotMode(search: string): boolean {
    try {
        return new URLSearchParams(search).has('screenshot');
    } catch {
        return false;
    }
}

export const SCREENSHOT_MODE: boolean =
    typeof window === 'undefined' ? false : isScreenshotMode(window.location.search);
