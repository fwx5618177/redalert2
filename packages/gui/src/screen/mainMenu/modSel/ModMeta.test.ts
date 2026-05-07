import { describe, expect, test, vi } from 'vitest';

// ModMeta only needs ModManager.modIdRegex (a static). Mock it so the test
// doesn't pull the rest of @ra2/gui's import graph (which itself needs
// @ra2/data parsers etc.).
vi.mock('@ra2/gui/screen/mainMenu/modSel/ModManager', () => ({
    ModManager: {
        modIdRegex: /^[a-zA-Z0-9_-]+$/,
    },
}));

import { ModMeta } from './ModMeta';

interface SectionData {
    [key: string]: string | string[] | undefined;
}

function makeSection(data: SectionData) {
    return {
        getString: (k: string) => {
            const v = data[k];
            return typeof v === 'string' ? v : undefined;
        },
        get: (k: string) => data[k],
        getNumber: (k: string) => {
            const v = data[k];
            return typeof v === 'string' ? Number(v) : undefined;
        },
        getBool: (k: string) => data[k] === 'true' || data[k] === '1',
    };
}

describe('ModMeta.fromIniSection', () => {
    test('parses required fields', () => {
        const meta = new ModMeta().fromIniSection(
            makeSection({ ID: 'my-mod_v2', Name: 'My Mod' }),
        );
        expect(meta.id).toBe('my-mod_v2');
        expect(meta.name).toBe('My Mod');
        expect(meta.supported).toBe(true);
    });

    test('throws when ID is missing', () => {
        expect(() =>
            new ModMeta().fromIniSection(makeSection({ Name: 'No ID' })),
        ).toThrow(/missing ID/i);
    });

    test('throws when ID has invalid characters', () => {
        expect(() =>
            new ModMeta().fromIniSection(
                makeSection({ ID: 'has spaces', Name: 'X' }),
            ),
        ).toThrow(/invalid ID/i);
    });

    test('throws when Name is missing', () => {
        expect(() =>
            new ModMeta().fromIniSection(makeSection({ ID: 'ok' })),
        ).toThrow(/missing Name/i);
    });

    test('parses single Author into authors[]', () => {
        const meta = new ModMeta().fromIniSection(
            makeSection({ ID: 'm', Name: 'M', Author: 'Alice' }),
        );
        expect(meta.authors).toEqual(['Alice']);
    });

    test('preserves multi-Author array', () => {
        const meta = new ModMeta().fromIniSection(
            makeSection({ ID: 'm', Name: 'M', Author: ['Alice', 'Bob'] }),
        );
        expect(meta.authors).toEqual(['Alice', 'Bob']);
    });

    test('accepts a valid http(s) Website', () => {
        const meta = new ModMeta().fromIniSection(
            makeSection({ ID: 'm', Name: 'M', Website: 'https://example.com/mod' }),
        );
        expect(meta.website).toBe('https://example.com/mod');
    });

    test('rejects a malformed Website without setting it', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const meta = new ModMeta().fromIniSection(
            makeSection({ ID: 'm', Name: 'M', Website: 'not-a-url' }),
        );
        expect(meta.website).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    test('parses optional Version, Download, DownloadSize, ManualDownload', () => {
        const meta = new ModMeta().fromIniSection(
            makeSection({
                ID: 'm',
                Name: 'M',
                Version: '1.2.3',
                Download: 'https://cdn.example.com/m.7z',
                DownloadSize: '12345',
                ManualDownload: 'true',
            }),
        );
        expect(meta.version).toBe('1.2.3');
        expect(meta.download).toBe('https://cdn.example.com/m.7z');
        expect(meta.downloadSize).toBe(12345);
        expect(meta.manualDownload).toBe(true);
    });
});

describe('ModMeta.clone', () => {
    test('produces an independent copy with all fields carried', () => {
        const original = new ModMeta().fromIniSection(
            makeSection({
                ID: 'm',
                Name: 'M',
                Description: 'desc',
                Author: ['Alice', 'Bob'],
                Website: 'https://example.com',
                Version: '1.0',
                Download: 'https://example.com/m.7z',
                DownloadSize: '10',
                ManualDownload: 'true',
            }),
        );
        const cloned = original.clone();

        expect(cloned).not.toBe(original);
        expect(cloned.id).toBe(original.id);
        expect(cloned.name).toBe(original.name);
        expect(cloned.description).toBe(original.description);
        expect(cloned.authors).toEqual(original.authors);
        // authors array should be a copy, not a reference
        expect(cloned.authors).not.toBe(original.authors);
        expect(cloned.website).toBe(original.website);
        expect(cloned.version).toBe(original.version);
        expect(cloned.download).toBe(original.download);
        expect(cloned.downloadSize).toBe(original.downloadSize);
        expect(cloned.manualDownload).toBe(original.manualDownload);
        expect(cloned.supported).toBe(original.supported);
    });
});
