#!/usr/bin/env tsx
/**
 * Offline media bake. Runs after fetch-gamepack extracts the gamepack
 * to apps/web/public/cdn/full-pack/. Pulls the FFmpeg-bound work that
 * used to happen in the browser on first launch (Bink → WebM for the
 * menu video, WAV → MP3 for music) up into a one-time build step:
 *
 *   - Open theme.mix, decode every WAV listed in mixDatabase, encode
 *     it as MP3, and drop the result at cdn/full-pack/music/{name}.mp3.
 *   - Open language.mix, pull ra2ts_l.bik, transcode to WebM/VP8, and
 *     drop the result at cdn/full-pack/ra2ts_l.webm.
 *   - Delete theme.mix from the bundle: it's pure WAV container, the
 *     runtime never wrote it to rfs anyway.
 *
 * After this step the runtime auto-importer fetches pre-baked .mp3 /
 * .webm files straight into rfs — no more 16 MB FFmpeg WASM download
 * and ~25s of in-browser transcoding on every fresh profile.
 *
 * Run via tsx (devDependency). The script imports the same MixFile /
 * Blowfish / DataStream code the browser uses, so any format bug fixes
 * stay in one place.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';

import ffmpegPath from 'ffmpeg-static';
import { MixFile } from '../packages/data/src/MixFile';
import { DataStream } from '../packages/data/src/DataStream';
import { mixDatabase } from '../packages/engine/src/mixDatabase';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const fullPackDir = path.join(repoRoot, 'apps/web/public/cdn/full-pack');
const themeMixPath = path.join(fullPackDir, 'theme.mix');
const languageMixPath = path.join(fullPackDir, 'language.mix');
const musicDir = path.join(fullPackDir, 'music');
const menuVideoOut = path.join(fullPackDir, 'ra2ts_l.webm');

const VIDEO_SOURCE_NAME = 'ra2ts_l.bik';

function humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readMix(absPath: string): MixFile {
    const buf = fs.readFileSync(absPath);
    // Slice to a fresh ArrayBuffer to avoid alignment quirks from Buffer.
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return new MixFile(new DataStream(ab));
}

function ffmpegRun(args: string[]): void {
    if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a binary path for this platform');
    const result = spawnSync(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    if (result.status !== 0) {
        const stderr = result.stderr?.toString() ?? '';
        throw new Error(`ffmpeg exited ${result.status}\n${stderr}`);
    }
}

function isMostlyZeros(absPath: string, sampleSize = 4096): boolean {
    // Upstream full-pack ships a 73 MB theme.mix that is just the index
    // header followed by all zeros — no actual WAV data, presumably to
    // dodge music copyright. Sniff for it instead of wasting time trying
    // to decode silence into mp3s.
    const fd = fs.openSync(absPath, 'r');
    try {
        const stat = fs.fstatSync(fd);
        const buf = Buffer.allocUnsafe(Math.min(sampleSize, stat.size));
        let totalNonZero = 0;
        const positions = [stat.size / 4, stat.size / 2, (stat.size * 3) / 4];
        for (const p of positions) {
            const pos = Math.floor(p);
            const read = fs.readSync(fd, buf, 0, buf.length, pos);
            for (let i = 0; i < read; i++) if (buf[i] !== 0) totalNonZero++;
        }
        return totalNonZero === 0;
    }
    finally {
        fs.closeSync(fd);
    }
}

function bakeMusic(): { converted: number; skipped: number; bytes: number } {
    if (!fs.existsSync(themeMixPath)) {
        console.log('[bake-media] no theme.mix; skipping music bake');
        return { converted: 0, skipped: 0, bytes: 0 };
    }
    if (isMostlyZeros(themeMixPath)) {
        console.log('[bake-media] theme.mix has no WAV payload (header-only stub from upstream); skipping music bake');
        return { converted: 0, skipped: 0, bytes: 0 };
    }
    const themeMix = readMix(themeMixPath);
    const tracks = mixDatabase.get('theme.mix') ?? [];
    if (tracks.length === 0) {
        throw new Error('mixDatabase has no entry for theme.mix');
    }
    fs.mkdirSync(musicDir, { recursive: true });
    let converted = 0;
    let skipped = 0;
    let bytes = 0;
    for (const wavName of tracks) {
        if (!wavName.toLowerCase().endsWith('.wav')) continue;
        const mp3Name = wavName.replace(/\.wav$/i, '.mp3').toLowerCase();
        const outPath = path.join(musicDir, mp3Name);
        if (!themeMix.containsFile(wavName)) {
            console.warn(`  [bake-media]  ! ${wavName} missing in theme.mix`);
            skipped++;
            continue;
        }
        const wav = themeMix.openFile(wavName);
        const wavBytes = new Uint8Array(wav.stream.buffer, wav.stream.byteOffset, wav.stream.byteLength);
        if (wavBytes.byteLength === 0) {
            console.warn(`  [bake-media]  ! ${wavName} is empty in theme.mix`);
            skipped++;
            continue;
        }
        // Mirror browser-side args from GameResImporter.importMusic exactly:
        // -ar 22050 -q:a 5 (LAME VBR ~130 kbps), no video. Browser writes the
        // WAV to FFmpeg's virtual FS as a real file and lets autodetect run;
        // do the same here — piping skips RIFF chunk seeking which some of
        // these WAVs (non-standard fmt chunks) need to parse correctly.
        if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a binary path');
        const tmpWav = path.join(musicDir, `__bake_tmp__${mp3Name.replace('.mp3', '.wav')}`);
        fs.writeFileSync(tmpWav, wavBytes);
        try {
            const result = spawnSync(
                ffmpegPath,
                ['-y', '-i', tmpWav, '-vn', '-ar', '22050', '-q:a', '5', outPath],
                { stdio: ['ignore', 'ignore', 'pipe'] },
            );
            if (result.status !== 0) {
                const stderr = result.stderr?.toString() ?? '';
                console.error(`  [bake-media]  x ${wavName} → ${mp3Name} failed (status=${result.status})`);
                console.error(stderr.split('\n').slice(-3).join('\n'));
                skipped++;
                continue;
            }
        }
        finally {
            try { fs.unlinkSync(tmpWav); } catch {}
        }
        const sz = fs.statSync(outPath).size;
        bytes += sz;
        converted++;
        console.log(`  [bake-media]  ✓ ${mp3Name}  ${humanSize(sz)}`);
    }
    return { converted, skipped, bytes };
}

function bakeMenuVideo(): { ok: boolean; bytes: number } {
    if (!fs.existsSync(languageMixPath)) {
        throw new Error('language.mix missing; cannot bake menu video');
    }
    if (fs.existsSync(menuVideoOut)) {
        const sz = fs.statSync(menuVideoOut).size;
        if (sz > 0) {
            console.log(`[bake-media] ra2ts_l.webm already baked (${humanSize(sz)}); skipping`);
            return { ok: true, bytes: sz };
        }
    }
    const langMix = readMix(languageMixPath);
    if (!langMix.containsFile(VIDEO_SOURCE_NAME)) {
        throw new Error(`language.mix has no ${VIDEO_SOURCE_NAME} entry`);
    }
    const bink = langMix.openFile(VIDEO_SOURCE_NAME);
    const binkBytes = new Uint8Array(bink.stream.buffer, bink.stream.byteOffset, bink.stream.byteLength);
    if (binkBytes.byteLength === 0) {
        throw new Error(`${VIDEO_SOURCE_NAME} is empty in language.mix`);
    }
    // ffmpeg refuses to read Bink from a pipe (needs seekable input), so
    // dump to a temp file alongside the source mix.
    const tmpBink = path.join(fullPackDir, '__bake_tmp__.bik');
    fs.writeFileSync(tmpBink, binkBytes);
    try {
        // Mirror VideoConverter.convertBinkVideo args:
        // -vcodec libvpx -crf 10 -b:v 2M -an
        ffmpegRun([
            '-y',
            '-i', tmpBink,
            '-vcodec', 'libvpx',
            '-crf', '10',
            '-b:v', '2M',
            '-an',
            menuVideoOut,
        ]);
    }
    finally {
        try { fs.unlinkSync(tmpBink); } catch {}
    }
    const sz = fs.statSync(menuVideoOut).size;
    console.log(`[bake-media] ra2ts_l.webm  ${humanSize(sz)}`);
    return { ok: true, bytes: sz };
}

function dropThemeMix(): void {
    if (fs.existsSync(themeMixPath)) {
        const sz = fs.statSync(themeMixPath).size;
        fs.unlinkSync(themeMixPath);
        console.log(`[bake-media] removed theme.mix (${humanSize(sz)} reclaimed; mp3s now stand on their own)`);
    }
}

function main(): void {
    if (!fs.existsSync(fullPackDir)) {
        throw new Error(`gamepack not extracted at ${fullPackDir}; run pnpm fetch:gamepack first`);
    }
    console.log('[bake-media] baking music tracks…');
    const music = bakeMusic();
    console.log(`[bake-media] music: ${music.converted} converted, ${music.skipped} skipped (${humanSize(music.bytes)})`);

    console.log('[bake-media] baking menu video…');
    bakeMenuVideo();

    dropThemeMix();
    console.log('[bake-media] done.');
}

main();
