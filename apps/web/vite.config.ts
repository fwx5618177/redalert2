import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { visualizer } from 'rollup-plugin-visualizer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const devPort = 4000;

// Resolve three to a single absolute path so every import — workspace
// packages, optimizeDeps pre-bundle, SPE — collapses to the same module
// instance. Without this, three's `window.__THREE__` guard fires its
// "Multiple instances of Three.js" warning even with dedupe configured.
const requireFromHere = createRequire(import.meta.url);
const threePath = requireFromHere.resolve('three');
const threeMeshlinePath = requireFromHere.resolve('three.meshline');

const certDir = path.join(repoRoot, 'certs');
const manualHttpsConfig =
    fs.existsSync(path.join(certDir, 'server.key')) &&
    fs.existsSync(path.join(certDir, 'server.crt'))
        ? {
            key: fs.readFileSync(path.join(certDir, 'server.key')),
            cert: fs.readFileSync(path.join(certDir, 'server.crt')),
        }
        : undefined;

const pkgSrc = (name: string) =>
    path.resolve(repoRoot, 'packages', name, 'src');

export default defineConfig({
    root: here,
    plugins: [
        react(),
        ...(manualHttpsConfig ? [] : [basicSsl()]),
        // Writes apps/web/dist/stats.html (bundle treemap) on every prod build.
        // Open it in a browser to see what's in each chunk. Generated only
        // during build; harmless during dev.
        visualizer({
            filename: 'dist/stats.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            sourcemap: false,
        }) as any,
    ],
    server: {
        host: '0.0.0.0',
        port: devPort,
        strictPort: true,
        https: manualHttpsConfig ?? {},
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
        fs: {
            allow: [repoRoot],
        },
    },
    preview: {
        host: '0.0.0.0',
        port: devPort,
        strictPort: true,
    },
    resolve: {
        alias: {
            '@ra2/util': pkgSrc('util'),
            '@ra2/data': pkgSrc('data'),
            '@ra2/engine': pkgSrc('engine'),
            '@ra2/game': pkgSrc('game'),
            '@ra2/network': pkgSrc('network'),
            '@ra2/gui': pkgSrc('gui'),
            '@ra2/tools': pkgSrc('tools'),
            // Pin three + three.meshline to a single absolute path so every
            // import collapses to the same module instance — see top of file.
            three: threePath,
            'three.meshline': threeMeshlinePath,
        },
        dedupe: ['three', 'three.meshline', 'react', 'react-dom'],
    },
    optimizeDeps: {
        exclude: ['7z-wasm', '@ffmpeg/ffmpeg'],
        include: ['three', 'three.meshline', 'shader-particle-engine'],
    },
    worker: {
        format: 'es',
    },
    assetsInclude: ['**/*.wasm'],
    build: {
        // Stable, named vendor chunks so browser cache survives across
        // app-only deploys. We do NOT manualChunk workspace packages
        // (@ra2/*) — Vite's default per-file splitting is better at
        // co-locating actually-used code than any hand-rolled grouping.
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    // Match either "/three/" or end-of-path (some resolvers
                    // give absolute paths to specific entry files).
                    if (/[\\/]three(?:[\\/]|$|\.meshline[\\/])/.test(id)) {
                        return 'vendor-three';
                    }
                    if (/[\\/](?:react|react-dom|scheduler)[\\/]/.test(id)) {
                        return 'vendor-react';
                    }
                    if (/[\\/]@ffmpeg[\\/]/.test(id)) {
                        return 'vendor-ffmpeg';
                    }
                    if (/[\\/]7z-wasm[\\/]/.test(id)) {
                        return 'vendor-7z';
                    }
                    if (/[\\/](?:qrcode|jsqr)[\\/]/.test(id)) {
                        return 'vendor-qr';
                    }
                    return undefined; // let Vite decide
                },
            },
        },
    },
});
