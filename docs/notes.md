# Project notes

Engineering reference for things that don't fit in the README. Active
documentation up top; historical context near the bottom.

- [Layout](#layout) — package map + dependency direction
- [Commands](#commands) — full script cheat sheet (extends the README)
- [Debug scripts](#debug-scripts) — Playwright regression flows + how to add one
- [Bundle strategy](#bundle-strategy) — chunk split, three.js dedupe, baseline gate
- [Build alignment tracker](#build-alignment-tracker) — **living** parity status; update with each PR that moves a row
- [Backstory](#backstory) — monorepo migration + type-debt cleanup (frozen 2026-05-07)

---

## Layout

pnpm workspace; one app + seven workspace packages.

```
redalert2/
├── apps/web/                    @ra2/web   (main app + entry)
│   ├── src/                     main.tsx, App.tsx, Application.ts, Gui.ts
│   ├── public/, index.html, vite.config.ts, tsconfig*.json
├── packages/
│   ├── util/      (@ra2/util)    math, Coords, LocalPrefs, ConsoleVars,
│   │                             RouteHelper, DevToolsApi, performance, …
│   ├── data/      (@ra2/data)    MIX/INI/SHP/VXL/HVA/TMP/CSF, VFS, Config
│   ├── engine/    (@ra2/engine)  three.js, sound, gameRes, renderable
│   ├── game/      (@ra2/game)    units, rules, superweapons, AI, fx
│   ├── network/   (@ra2/network) LAN, lockstep, replay, IRC, Ladder
│   ├── gui/       (@ra2/gui)     screens, HUD, options, ErrorHandler
│   └── tools/     (@ra2/tools)   in-game testers (vxltest, soundtest, ...)
├── scripts/                     Playwright regression flows + dev runtime + CI gates
└── docs/                        this file
```

Allowed dependency direction (enforced by `pnpm lint` / `eslint-plugin-boundaries`):

```
util ← data ← engine ← game ← {network, gui} ← tools ← apps/web
```

Within a package: relative imports. Across packages: `@ra2/<pkg>/<file>`.

---

## Commands

The README covers the daily commands (`pnpm dev/build/test/lint/typecheck`).
The full set including CI gates and conditional features:

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Full project `tsc --noEmit`; surfaces every error. |
| `pnpm typecheck:baseline` | Compares against `.typecheck-baseline.json#maxErrors`. **CI gate**. |
| `pnpm typecheck:entry` | Quick sanity check on `main.tsx + App.tsx` only. |
| `pnpm bundle:baseline` | `pnpm build` + per-chunk size check vs `.bundle-baseline.json`. **CI gate**. |
| `pnpm lint` | ESLint with boundaries plugin (cross-package dep direction). **CI gate**. |
| `pnpm test` | vitest run (34 tests across 7 files). |
| `pnpm test:watch` | vitest in watch mode. |
| `pnpm debug:<flow>` | One Playwright regression flow — see next section. |
| `pnpm live:runtime[:build]` | Long-running dev server + Playwright window for interactive poking. |

Both baselines are deliberately manual: when you fix errors / shrink chunks,
`pnpm typecheck:baseline` and `pnpm bundle:baseline` print suggested new
caps but never auto-update. Edit `.typecheck-baseline.json#maxErrors` or
`.bundle-baseline.json#chunks.<name>.maxBytes` by hand and commit.

### URL flags

- `?screenshot` — turn on WebGL `preserveDrawingBuffer` (per-frame GPU→CPU
  readback). Off by default; only useful when client-side code needs to
  call `canvas.toDataURL()`. Playwright's `page.screenshot()` doesn't need
  this — it uses CDP's separate path.
- `?test=glsl` — alternate test mode (legacy, see `App.tsx`).
- `?mod=<name>` — load a mod by name (passed through to GameRes).

### Build-time gates

`import.meta.env.DEV` controls roughly 40 `[Diag]` boot logs in
`Application.ts` (rules.ini head, merged-rule probes, etc.). Tree-shaken
from prod builds — verified: dist contains only the 2 real `[Diag]`
error-on-malformed-data lines from `Rules.ts`.

---

## Debug scripts

Playwright-driven regression flows under `scripts/`. Each script auto-spawns
the Vite dev server on `127.0.0.1:4000` (or reuses an existing one),
captures console + network errors, and writes artifacts to `.artifacts/<flow-name>/`.

| Command | Purpose |
| --- | --- |
| `pnpm debug:test-entries` | Iterates all 13 hash routes registered in `Application.initRouting()`. Reports honestly when GameRes blocks routing. |
| `pnpm debug:tester-panels` | Captures `window.__ra2test` snapshot per tester. |
| `pnpm debug:viewport` | Runs 6 desktop/mobile resolutions; records `#ra2web-root` style/dataset. |
| `pnpm debug:options` | Toggles a primitive in `__ra2debug.generalOptions`, reloads, verifies persistence to `_r_opts_v3` localStorage key. |
| `pnpm debug:storage-explorer` | Probes the GameRes import surface (StorageFileExplorer entry path). |
| `pnpm debug:game-res-init` | Buckets `[Application]` / `[GameRes]` / `[VFS]` console lines and records the splash progression. |
| `pnpm debug:skirmish-lobby-data` | Captures `__ra2debug.skirmishLobby` if main menu is reachable; cleanly skips otherwise. |
| `pnpm live:runtime` | Long-running dev-server + Playwright window; Ctrl-C to stop. |
| `pnpm live:runtime:build` | Same, but `vite build` first — validates the production bundle. |

### Layout

```
scripts/
├── lib/
│   ├── config.mjs              constants + tester route table
│   ├── devServer.mjs           spawn-or-reuse vite (via `pnpm --filter @ra2/web dev`)
│   └── runtime.mjs             runFlow() wrapper + helpers
├── *-flow.mjs                  one file per debug:* command
├── live-interaction-runtime.mjs
├── check-typecheck-baseline.mjs   CI gate
└── check-bundle-baseline.mjs      CI gate
```

`runFlow` launches Chromium with `ignoreHTTPSErrors: true` (the dev server
self-signs via `@vitejs/plugin-basic-ssl`), captures console + pageerror
+ requestfailed, writes `result.json` per flow. Helpers:
`waitForDebugRoot`, `waitForMainMenu`, `snapshotRuntime`, `navigateHash`.

`devServer.mjs` registers a process reaper so vite is killed even when the
parent dies hard (e.g. SIGKILL from `timeout`).

### Adding a new flow

```js
import { runFlow, waitForDebugRoot } from './lib/runtime.mjs';
import { BASE_URL } from './lib/config.mjs';

runFlow('my-flow', async (ctx) => {
    await ctx.page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await waitForDebugRoot(ctx.page);
    // drive the page via window.__ra2debug ...
    await ctx.screenshot('result');
    await ctx.writeJson('state', { /* ... */ });
    return { /* surfaced into result.json */ };
});
```

Then add `"debug:my-flow": "node scripts/my-flow-flow.mjs"` to root `package.json#scripts`.

### Env vars

- `HEADED=1` — show the browser window (off by default)
- `SLOWMO=200` — slow each Playwright action by N ms
- `DEBUG_VERBOSE=1` — proxy Vite + browser console output to the terminal

### Scripts NOT being restored

Upstream's `package.json` referenced ~30 debug scripts. After review, the
remaining ~20 were judged low value (most need real game assets or duplicate
what unit tests cover better) and **will not be ported back**:

```
debug:skirmish              debug:perf-smoke           debug:perftest
debug:refinery-free-unit    debug:terror-drone         debug:chrono-legionnaire
debug:radiation             debug:victory-exit         debug:crate-sound
debug:superweapon           debug:nuke                 debug:minimap-shroud
debug:anti-air-hit          debug:live-interaction     debug:live-interaction-loading
debug:lan-mesh              debug:lan-app-message      debug:lan-entry
debug:lan-lockstep          debug:lan-match-session    debug:lan-map-transfer
```

If a future change needs regression coverage in one of these areas, write
the targeted script then. Scaffold supports adding a flow in ~30 lines.

---

## Bundle strategy

`apps/web/vite.config.ts` adds `build.rollupOptions.output.manualChunks`
for named, stable vendor chunks so browser cache survives across app-only
deploys (sizes from 2026-05-07 measurement; current values via
`pnpm bundle:baseline`):

| Chunk | Size | Cap | Contents |
| --- | ---: | ---: | --- |
| `vendor-three` | 728 KB | 800 KB | three + three.meshline (rarely changes) |
| `vendor-react` | 190 KB | 215 KB | react + react-dom + scheduler |
| `vendor-qr` | 154 KB | 170 KB | qrcode + jsqr (LAN code path) |
| `vendor-7z` | 55 KB | 65 KB | 7z-wasm |
| `vendor-ffmpeg` | 3 KB | 8 KB | ffmpeg.wasm shim |
| `index` | 591 KB | 620 KB | apps/web entry + eager `Application`/`Gui` boot |
| ~160 other chunks | small | — | Vite-default per-file splits of `@ra2/*` source |
| **total assets** | **5.2 MB** | **9.5 MB** | |

Workspace packages (`@ra2/*`) are deliberately NOT manualChunked — Vite's
per-file lazy splitting (`VxlBuilderFactory`, `Box2`, `Engine`,
`AutoRepairTrait` each their own chunk) is finer-grained than any
hand-rolled grouping.

### Three.js single-instance

Three ways together — drop any one and the `THREE.WARNING: Multiple
instances of Three.js` console warning fires:

1. `peerDependencies: { three }` in 6 workspace package.jsons (only
   `apps/web` declares it as a real `dependencies`).
2. `pnpm.overrides: { three: '0.183.2' }` at root (overrides
   `shader-particle-engine`'s pinned `^0.84.0` transitive dep).
3. `resolve.alias.three = require.resolve('three')` in vite.config (forces
   every import to the same absolute file path so Vite's module graph
   collapses to one instance).

### Bundle baseline gate

`scripts/check-bundle-baseline.mjs` measures every prod chunk against caps
in `.bundle-baseline.json` and fails CI if any tracked chunk exceeds its
`maxBytes`. Mirrors typecheck-baseline pattern: tighten or loosen via
deliberate edits, never auto-update.

`apps/web/dist/stats.html` (rollup-plugin-visualizer treemap, ~880 KB)
is the source of truth for what's in each chunk; CI uploads it as a
7-day artifact.

Vite filename-hash quirk: hashes use base64url alphabet (incl. `-`),
so `vendor-three-BPXSdpBv.js` would naively strip down to `vendor`.
The check script anchors strictly to `-{8 chars}\.<ext>$`.

---

## Build alignment tracker

Living tracker of how closely the TypeScript reimplementation matches
original Red Alert 2 / Yuri's Revenge behavior. **Update in the same PR
that lands the change.** Status legend:

> ✅ aligned · 🟡 partial · 🔴 broken · ⚪️ untested

### Engine bootstrap

| Area | Status | Owner | Notes |
| --- | --- | --- | --- |
| App startup → splash → translations → GameRes init | 🟡 | `apps/web/src/Application.ts` | Reaches splash; downstream depends on game files. Smoke covered by `debug:game-res-init`. |
| Hash routing for tester entries | ✅ | `apps/web/src/Application.ts` | All 13 routes reachable; covered by `debug:test-entries`. |
| Viewport / fullscreen / mobile layout | 🟡 | `apps/web/src/Application.ts` | Desktop & mobile path both present; covered by `debug:viewport`. Fullscreen API only smoke-tested. |
| GeneralOptions persistence (localStorage `_r_opts_v3`) | ✅ | `packages/gui/src/screen/options/GeneralOptions.ts` | Toggle + reload covered by `debug:options`. Unit-tested. |
| StorageFileExplorer (file import) | ⚪️ | `packages/gui/src/component/fileExplorer/StorageFileExplorer.tsx` | UI loads; manual import flow not auto-tested (requires File System Access prompt). |

### Resource pipeline

| Area | Status | Owner | Notes |
| --- | --- | --- | --- |
| MIX archive parsing | 🟡 | `packages/data/src/MixFile.ts` | CRC32 self-test green at startup (see `apps/web/src/main.tsx`). |
| VFS layered file lookup | 🟡 | `packages/data/src/vfs/VirtualFileSystem.ts` | `[Diag]` logs in Application enumerate ownership. |
| INI merge (rules + rulescd, art + artcd) | 🟡 | `packages/engine/src/Engine.ts` | First 120 sections diagnostic-dumped (DEV only). |
| CSF + JSON locale merge | 🟡 | `packages/data/src/CsfFile.ts` + Application | Sample keys logged on boot. |
| ModMeta INI parse | ✅ | `packages/gui/src/screen/mainMenu/modSel/ModMeta.ts` | 11 unit tests cover required/optional fields, errors, clone. |

### Game logic

| Area | Status | Owner | Notes |
| --- | --- | --- | --- |
| Skirmish lobby form (slots, colors, start positions) | 🟡 | `packages/gui/src/screen/mainMenu/lobby/SkirmishScreen.ts` | Snapshot captured by `debug:skirmish-lobby-data`. |
| GameTurnManager / lockstep | ⚪️ | `packages/game/src/GameTurnManager.ts` | No automated coverage yet. |
| Veteran XP, spy infiltration, psychic sensor, iron curtain | 🟡 | `packages/game/src/trait/` | Behavior fixes shipped in `924e97c`. |
| Bot sandbox (third-party AI) | 🟡 | `packages/game/src/ai/thirdpartbot/` | Type-strip regex bug fixed in `d4029e3`. |
| Replay timestamp overflow | ✅ | `packages/network/src/gamestate/replay/` | Fixed in `81c90b4`. |

### Renderer

| Area | Status | Owner | Notes |
| --- | --- | --- | --- |
| three.js scene graph + multi-scene viewport render | ✅ | `packages/engine/src/gfx/Renderer.ts` | Single instance (peerDeps + override + alias). `preserveDrawingBuffer` is now `?screenshot` opt-in; off in prod. |
| Octree culling | 🟡 | `packages/engine/src/gfx/OctreeContainer.ts` | Active in renderable container. |
| Vxl geometry builder | ✅ | `packages/engine/src/renderable/builder/vxlGeometry/` | Pre-existing `3 * t` typo bug fixed during type-debt sweep. |
| Shadows | ⚪️ | n/a | `shadowMap.enabled = true` set; no comparison test. |

---

## Backstory

Frozen 2026-05-07. Reference for new contributors who want context;
not part of daily workflow.

### Monorepo migration

The repo started as a single `src/` tree. Migrated to a pnpm workspace
in one sitting. Cycle-breaking moves (each was a `git mv` then a codemod
pass over import paths):

- **`@ra2/util` ←** `src/game/math/*`, `src/game/Coords.ts`,
  `src/{LocalPrefs,RouteHelper,ConsoleVars,version}.ts`,
  `src/tools/DevToolsApi.ts`, `src/performance/`
  (broke the `util → game` cycle via `QuadTree`)
- **`@ra2/game` ←** `src/engine/RenderableManager.ts`,
  `src/engine/renderable/fx/handler/*.ts`,
  `src/engine/renderable/fx/LineTrailFx.ts`
  (broke the `engine → game` cycle)
- **`@ra2/data` ←** `src/Config.ts` (gui + engine both needed it)
- **`@ra2/gui` ←** `src/ErrorHandler.ts`
- **`@ra2/engine` ←** `src/setupThreeGlobal.ts` (engine's `speRuntime.ts`
  is the real consumer)

Acyclic graph after these moves; lint-enforced going forward.

#### Recovered upstream-stripped files

`packages/network/src/{WolConfig,WolError,qmCodes}.ts` were referenced
by gui screens but absent from the upstream `huangkaoya/redalert2` tree
(`scripts/` and `docs/` are also `.gitignore`'d there). They were
**reverse-engineered into typecheck-only stubs** — see file headers for
what each symbol means. Real protocol values must come from a live
WOL/CnCNet server if the project ever reconnects; in local dev the
screens that depend on them never reach the network.

### Type-debt cleanup: 222 → 0

The first run of full `pnpm typecheck` (post-migration) surfaced 222
pre-existing errors that the original `tsconfig.build.json` had hidden
by only checking `main.tsx + App.tsx`. All 222 closed in three buckets:

- **47 real fixes** — engine/material/builder type tightening,
  `BoxBufferGeometry → BoxGeometry` rename (which itself surfaced a
  real runtime bug in `VxlGeometryCulledBuilder` where `3 * t` was
  multiplying by a `BoxGeometry` instance), `ModMeta.ts` structural
  reconstruct (a misplaced `}` had truncated the class), missing private
  field declarations in `ParasiteSparkFxHandler`/`TriggerActionFxHandler`,
  `subscribe(handler)` → `subscribe(EventType.X, handler)`, missing 18th
  `Hud` constructor arg in `ShpTester`, `THREE.MathUtils.generateUUID()`
  → `THREE.Math.generateUUID()` to match the legacy-shim type, named
  re-export of `ChannelUser` for default+named-import consumers.
- **4 `@ts-expect-error`** for intentional private access in dev-only
  testers (`UnitMovementTester`, `InfantryTester`).
- **171 `@ts-nocheck`** on online-only or upstream-stripped screens
  (table below). Each banner cites the specific stripped API.

#### `@ts-nocheck` files (171 errors, 14 files)

Each depends on stripped network-class methods that the upstream-published
source never shipped (matches the `WolConfig`/`WolError`/`qmCodes`
pattern). Cannot reach a server in local dev anyway; faking 30+ method
stubs would silently lie about runtime behavior.

| File | Errors | Stripped |
| --- | ---: | --- |
| `gui/screen/mainMenu/lobby/LobbyScreen.ts` | 49 | `WolConnection.{isOpen,isInChannel,listUsers,getCurrentUser,sendPlayerReady,getServerName,onGameOpt,onGameStart,onGameServer,onLeaveChannel,onJoinChannel,onChatMessage,...}` |
| `gui/screen/mainMenu/customGame/CustomGameScreen.ts` | 36 | Same via `IrcConnection` + `ChatHistory.lastWhisperFrom` |
| `tools/src/BuildingTester.ts` | 15 | Dev-only debug UI; multiple drift |
| `gui/screen/mainMenu/ladder/component/Ladder.tsx` | 9 | `WLadderService.{getAvailableSeasons,getTopPlayers}` + `wladderConfig.SEARCH_LIMIT` |
| `gui/screen/mainMenu/login/LoginScreen.ts` | 6 | `ServerRegions/Regions` drift, `WolError.reason` |
| `gui/screen/mainMenu/modSel/ModSelScreen.ts` | 5 | `ScreenType.{OptionsStorage,MainMenuRoot}` |
| `gui/screen/mainMenu/quickGame/component/QuickGameForm.tsx` | 4 | Online QM form drift |
| `gui/screen/mainMenu/quickGame/ChatUi.ts` | 4 | Online QM chat |
| `gui/screen/mainMenu/ladder/LadderScreen.ts` | 4 | Online ladder |
| `tools/src/LiveInteractionTester.ts` | 4 | Dev-only tester |
| `gui/screen/mainMenu/quickGame/QuickGameScreen.ts` | 3 | Online QM screen |
| `gui/screen/mainMenu/modSel/ModManager.ts` | 3 | ModMeta path drift |
| `gui/screen/mainMenu/modSel/ModImporter.ts` | 3 | `Error({cause})` shape |
| `gui/screen/mainMenu/customGame/component/GameBrowser.tsx` | 3 | Online game browser |
| Other 1-2 error files | ~20 | Misc upstream stripping |

To rescue any of these, write proper runtime stubs (not just type) that
match the real WOL/IRC server protocol, then remove the `@ts-nocheck`
banner. CI will keep the file at 0 errors after that.

### Dev experience improvements (same session)

Beyond the migration itself:

- `[Diag]` boot logs (~40 in `Application.ts`) gated on `import.meta.env.DEV`
  — tree-shaken from prod builds.
- `preserveDrawingBuffer` was unconditionally on (per-frame GPU→CPU
  readback). Made opt-in via `?screenshot` URL flag (`SCREENSHOT_MODE`
  in `packages/util/src/screenshotMode.ts`).
- 14 `INEFFECTIVE_DYNAMIC_IMPORT` warnings eliminated by hoisting
  `MainMenuRootScreen.ts`'s redundant `await import('@ra2/...')` calls
  to top-of-file static imports (Gui.ts already pulled them eagerly).
- 27 unit tests added covering `screenshotMode`, the recovered network
  stubs, and the reconstructed `ModMeta`. Total 7 → 34 tests.
