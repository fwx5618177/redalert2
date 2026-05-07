import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(here, '..', '..');
export const ARTIFACTS_DIR = path.join(PROJECT_ROOT, '.artifacts');
export const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

export const DEV_HOST = '127.0.0.1';
export const DEV_PORT = 4000;

// Vite serves plain HTTP unless certs/server.{key,crt} are present
// (the manual-cert opt-in path in apps/web/vite.config.ts). Mirror that
// detection here so smoke flows hit the right scheme without the user
// passing a flag.
const certsExist =
    fs.existsSync(path.join(PROJECT_ROOT, 'certs', 'server.key')) &&
    fs.existsSync(path.join(PROJECT_ROOT, 'certs', 'server.crt'));
export const BASE_URL = `${certsExist ? 'https' : 'http'}://${DEV_HOST}:${DEV_PORT}`;

export const TESTER_ROUTES = [
    { hash: '/', name: 'main', requiresGameFiles: false },
    { hash: '/vxltest', name: 'vxltest', requiresGameFiles: true },
    { hash: '/lobbytest', name: 'lobbytest', requiresGameFiles: true },
    { hash: '/soundtest', name: 'soundtest', requiresGameFiles: true },
    { hash: '/buildtest', name: 'buildtest', requiresGameFiles: true },
    { hash: '/inftest', name: 'inftest', requiresGameFiles: true },
    { hash: '/airtest', name: 'airtest', requiresGameFiles: true },
    { hash: '/vehicletest', name: 'vehicletest', requiresGameFiles: true },
    { hash: '/shptest', name: 'shptest', requiresGameFiles: true },
    { hash: '/worldscenetest', name: 'worldscenetest', requiresGameFiles: true },
    { hash: '/unitmovementtest', name: 'unitmovementtest', requiresGameFiles: true },
    { hash: '/perftest', name: 'perftest', requiresGameFiles: true },
    { hash: '/liveinteraction', name: 'liveinteraction', requiresGameFiles: true },
];
