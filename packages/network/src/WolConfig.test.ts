import { describe, expect, test } from 'vitest';
import {
    MIN_USERNAME_LEN,
    MAX_USERNAME_LEN,
    MAX_PASS_LEN,
    WolHasMapStatus,
} from './WolConfig';

describe('WolConfig constants', () => {
    test('username length bounds form a valid range', () => {
        expect(MIN_USERNAME_LEN).toBeGreaterThan(0);
        expect(MAX_USERNAME_LEN).toBeGreaterThan(MIN_USERNAME_LEN);
        // Sanity: classic WOL caps are short. If someone bumps these to 50+
        // by accident, the form-validation UI will accept names that the
        // server can't store — pin the order-of-magnitude.
        expect(MAX_USERNAME_LEN).toBeLessThanOrEqual(20);
    });

    test('password length bound is reasonable', () => {
        expect(MAX_PASS_LEN).toBeGreaterThan(0);
        expect(MAX_PASS_LEN).toBeLessThanOrEqual(64);
    });
});

describe('WolHasMapStatus enum', () => {
    test('exposes the MapTransfer member that LobbyScreen reads', () => {
        // LobbyScreen.ts compares against WolHasMapStatus.MapTransfer in
        // multiple places. Removing this member breaks the lobby's
        // "downloading map" UI silently.
        expect(WolHasMapStatus.MapTransfer).toBeDefined();
    });

    test('all members are distinct', () => {
        const values = Object.values(WolHasMapStatus).filter(
            (v) => typeof v === 'string',
        );
        expect(new Set(values).size).toBe(values.length);
    });
});
