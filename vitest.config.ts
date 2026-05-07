import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name: string) =>
    path.resolve(here, 'packages', name, 'src');

export default defineConfig({
    resolve: {
        alias: {
            '@ra2/util': pkgSrc('util'),
            '@ra2/data': pkgSrc('data'),
            '@ra2/engine': pkgSrc('engine'),
            '@ra2/game': pkgSrc('game'),
            '@ra2/network': pkgSrc('network'),
            '@ra2/gui': pkgSrc('gui'),
            '@ra2/tools': pkgSrc('tools'),
        },
    },
    test: {
        include: [
            'apps/**/*.{test,spec}.ts',
            'apps/**/*.{test,spec}.tsx',
            'packages/**/*.{test,spec}.ts',
            'packages/**/*.{test,spec}.tsx',
        ],
    },
});
