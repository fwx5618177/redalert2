import { describe, expect, test } from 'vitest';
import { WolError } from './WolError';

describe('WolError', () => {
    test('is a real Error subclass (instanceof works)', () => {
        // gui code uses `error instanceof WolError` for narrowing; the class
        // must extend Error properly (Object.setPrototypeOf in the constructor).
        const e = new WolError(WolError.Code.BadLogin);
        expect(e).toBeInstanceOf(WolError);
        expect(e).toBeInstanceOf(Error);
    });

    test('exposes the code via a public field', () => {
        const e = new WolError(WolError.Code.NoSuchChannel);
        expect(e.code).toBe(WolError.Code.NoSuchChannel);
    });

    test('synthesizes a default message including the code name', () => {
        const e = new WolError(WolError.Code.BadChannelPass);
        expect(e.message).toMatch(/BadChannelPass/);
    });

    test('honors caller-supplied message', () => {
        const e = new WolError(WolError.Code.ChannelFull, 'channel #ra2 is full');
        expect(e.message).toBe('channel #ra2 is full');
    });

    test('Code enum exposes every member referenced by gui screens', () => {
        // CustomGameScreen / LobbyScreen / LoginScreen reference these
        // specific members. Pin them so a future refactor doesn't drop one.
        const required = [
            'BadLogin',
            'BannedFromServer',
            'ServerFull',
            'OutdatedClient',
            'NoSuchChannel',
            'BadChannelPass',
            'ChannelFull',
            'BannedFromChannel',
            'GameHasClosed',
        ] as const;
        for (const name of required) {
            expect(WolError.Code[name]).toBeDefined();
        }
    });
});
