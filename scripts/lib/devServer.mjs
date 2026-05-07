import net from 'node:net';
import { spawn } from 'node:child_process';
import { DEV_HOST, DEV_PORT, PROJECT_ROOT } from './config.mjs';

function probePort(host, port, timeoutMs = 500) {
    return new Promise((resolve) => {
        const sock = new net.Socket();
        let done = false;
        const finish = (ok) => {
            if (done) return;
            done = true;
            sock.destroy();
            resolve(ok);
        };
        sock.setTimeout(timeoutMs);
        sock.once('connect', () => finish(true));
        sock.once('timeout', () => finish(false));
        sock.once('error', () => finish(false));
        sock.connect(port, host);
    });
}

export async function ensureDevServer({ verbose = false, startupTimeoutMs = 90_000 } = {}) {
    if (await probePort(DEV_HOST, DEV_PORT)) {
        if (verbose) console.log(`[devServer] reuse ${DEV_HOST}:${DEV_PORT}`);
        return { spawned: false, dispose: async () => {} };
    }

    if (verbose) console.log(`[devServer] spawning vite on ${DEV_HOST}:${DEV_PORT}`);
    // Vite, vite.config.ts, and index.html now live under apps/web/.
    // Spawn `pnpm dev` so pnpm resolves the @ra2/web filter and runs vite from
    // the correct cwd; this keeps the script harness independent of physical
    // node_modules layout (pnpm hoists differently from npm).
    const proc = spawn('pnpm', ['--silent', '--filter', '@ra2/web', 'dev'], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
        detached: false,
    });

    // Best-effort: if this process exits without reaching dispose() (e.g. SIGKILL
    // from `timeout`), reap vite via process.on('exit') anyway. exit handlers
    // can only run sync work, so we just send SIGKILL.
    const reaper = () => {
        try { if (proc.exitCode === null) proc.kill('SIGKILL'); } catch {}
    };
    process.on('exit', reaper);
    process.on('SIGINT', reaper);
    process.on('SIGTERM', reaper);

    let viteOut = '';
    proc.stdout.on('data', (chunk) => {
        const s = chunk.toString();
        viteOut += s;
        if (verbose) process.stdout.write(`[vite] ${s}`);
    });
    proc.stderr.on('data', (chunk) => {
        const s = chunk.toString();
        viteOut += s;
        if (verbose) process.stderr.write(`[vite] ${s}`);
    });

    const deadline = Date.now() + startupTimeoutMs;
    while (Date.now() < deadline) {
        if (proc.exitCode !== null) {
            throw new Error(`Vite exited early (code ${proc.exitCode}). Output:\n${viteOut}`);
        }
        if (await probePort(DEV_HOST, DEV_PORT)) {
            return {
                spawned: true,
                proc,
                dispose: async () => {
                    if (verbose) console.log('[devServer] stopping vite');
                    proc.kill('SIGTERM');
                    await new Promise((r) => setTimeout(r, 300));
                    if (proc.exitCode === null) {
                        proc.kill('SIGKILL');
                    }
                },
            };
        }
        await new Promise((r) => setTimeout(r, 250));
    }

    proc.kill('SIGKILL');
    throw new Error(
        `Dev server did not come up within ${startupTimeoutMs}ms. Output:\n${viteOut}`
    );
}
