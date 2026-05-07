// Flat-config ESLint setup for the monorepo.
//
// The single rule we care about is `boundaries/element-types`: it enforces
// the cross-package dependency direction. Edits that introduce a back-edge
// (e.g. `@ra2/util` importing `@ra2/game`) get flagged at lint time, before
// they make it into typecheck.
//
// We deliberately do NOT add the typescript-eslint full ruleset here. That
// would surface another wave of pre-existing style debt unrelated to the
// migration — out of scope for what this config is trying to solve.

import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';

const ELEMENTS = [
    { type: 'util',    pattern: 'packages/util/src/**' },
    { type: 'data',    pattern: 'packages/data/src/**' },
    { type: 'engine',  pattern: 'packages/engine/src/**' },
    { type: 'game',    pattern: 'packages/game/src/**' },
    { type: 'network', pattern: 'packages/network/src/**' },
    { type: 'gui',     pattern: 'packages/gui/src/**' },
    { type: 'tools',   pattern: 'packages/tools/src/**' },
    { type: 'web',     pattern: 'apps/web/src/**' },
];

// Allowed dependency direction: util ← data ← engine ← game
//                                             ← network ← gui ← tools ← web
// Each entry says "X may import Y".
const ALLOW = {
    util:    [],
    data:    ['util'],
    engine:  ['util', 'data'],
    game:    ['util', 'data', 'engine'],
    network: ['util', 'data', 'engine', 'game'],
    gui:     ['util', 'data', 'engine', 'game', 'network'],
    tools:   ['util', 'data', 'engine', 'game', 'network', 'gui'],
    web:     ['util', 'data', 'engine', 'game', 'network', 'gui', 'tools'],
};

export default [
    {
        files: ['packages/**/*.{ts,tsx}', 'apps/web/src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { sourceType: 'module', ecmaVersion: 'latest' },
        },
        plugins: { boundaries },
        settings: {
            'boundaries/elements': ELEMENTS,
            'boundaries/include': [
                'packages/**/*.{ts,tsx}',
                'apps/web/src/**/*.{ts,tsx}',
            ],
            'boundaries/dependency-nodes': ['import', 'dynamic-import', 'require'],
        },
        rules: {
            // boundaries v5 element-types syntax. (We pinned the plugin to
            // v5 because v6's `dependencies` rule schema isn't well-documented
            // and the migration broke our config.)
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    rules: Object.entries(ALLOW).map(([from, to]) => ({
                        from: [from],
                        allow: to,
                    })),
                },
            ],
            // We only enforce cross-element direction. `no-unknown` was tried
            // but reports every external npm import (three, react, ...) as
            // "unknown" — too noisy. The directional rule is the actual
            // value-adding constraint here.
            'boundaries/no-unknown': ['off'],
            'boundaries/no-unknown-files': ['off'],
            'boundaries/no-private': ['off'],
        },
    },
    {
        // Don't lint our own scripts/codemods or tests.
        ignores: [
            'scripts/**',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            'apps/web/src/test/**',
            '**/dist/**',
            '**/.tsbuild/**',
            'node_modules/**',
        ],
    },
];
