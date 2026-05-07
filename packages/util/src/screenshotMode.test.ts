import { describe, expect, test } from 'vitest';
import { isScreenshotMode } from './screenshotMode';

describe('isScreenshotMode', () => {
    test('returns false for empty search', () => {
        expect(isScreenshotMode('')).toBe(false);
    });

    test('returns false when ?screenshot is absent', () => {
        expect(isScreenshotMode('?other=1')).toBe(false);
        expect(isScreenshotMode('?test=glsl')).toBe(false);
    });

    test('returns true for bare ?screenshot', () => {
        expect(isScreenshotMode('?screenshot')).toBe(true);
    });

    test('returns true for ?screenshot=1 and equivalents', () => {
        expect(isScreenshotMode('?screenshot=1')).toBe(true);
        expect(isScreenshotMode('?screenshot=true')).toBe(true);
        // URLSearchParams.has() ignores the value — only checks presence.
        expect(isScreenshotMode('?screenshot=')).toBe(true);
    });

    test('returns true when ?screenshot is one of multiple params', () => {
        expect(isScreenshotMode('?test=glsl&screenshot=1')).toBe(true);
        expect(isScreenshotMode('?screenshot&debug=1')).toBe(true);
    });

    test('does not throw on malformed input', () => {
        // URLSearchParams is forgiving about most weirdness; ensure we
        // never bubble an exception even on edge cases.
        expect(() => isScreenshotMode('not-a-query')).not.toThrow();
        expect(isScreenshotMode('not-a-query')).toBe(false);
    });
});
