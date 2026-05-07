import { describe, expect, test } from 'vitest';
import * as qm from './qmCodes';

describe('qmCodes', () => {
    test('all expected RPL_* codes are exported as strings', () => {
        // QuickGameScreen does both `=== RPL_X` (exact) and
        // `.startsWith(RPL_X + ' ')` (prefix). Each must be a non-empty
        // string for either pattern to make sense.
        const required = [
            'RPL_QUEUE_LIST',
            'RPL_WORKING',
            'RPL_BAD_VERS',
            'RPL_BAD_HASH',
            'RPL_MODE_UNAVAIL',
            'RPL_MATCHED',
            'RPL_REQUEUE',
            'RPL_STATS',
        ] as const;
        for (const name of required) {
            const value = (qm as Record<string, unknown>)[name];
            expect(typeof value).toBe('string');
            expect((value as string).length).toBeGreaterThan(0);
        }
    });

    test('codes are pairwise distinct', () => {
        // QuickGameScreen branches on `=== RPL_X` — duplicates would silently
        // collapse the branches.
        const values = [
            qm.RPL_QUEUE_LIST,
            qm.RPL_WORKING,
            qm.RPL_BAD_VERS,
            qm.RPL_BAD_HASH,
            qm.RPL_MODE_UNAVAIL,
            qm.RPL_MATCHED,
            qm.RPL_REQUEUE,
            qm.RPL_STATS,
        ];
        expect(new Set(values).size).toBe(values.length);
    });
});
