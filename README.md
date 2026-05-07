# RA2WEB React

免责声明：这是基于《时空分裂》中文版RA2WEB www.ra2web.com 的分析而开发，并意图基于最新的react和three版本进行重构。

但项目所有权利（包括收益权）归《时空分裂》/RA2WEB负责人所有。未经《时空分裂》的所有者/RA2WEB负责人许可，严禁用于任何商业行为。

需要注意的是，《时空分裂》的所有者从未以任何方式开源游戏客户端代码（即便存在诸如mod-sdk之类的周边开源内容）。本项目运行产生的BUG、功能不完善，不能等同视为对《时空分裂》的名誉贬损。任何基于本项目开展商业行为，包括但不限于植入广告、开发“弹幕红警”收受礼物获利、直接封装收费、以“作者”身份骗取赞助和充电收益等，均视为对《时空分裂》原作者Alexandru Ciucă和RA2WEB的侵权。

红色警戒2网页版，一款经典的即时战略类游戏的完整TypeScript重构版本，使用React + TypeScript + Vite + Three.js构建。

![动画](https://github.com/user-attachments/assets/d83f6001-d426-4d49-98a6-8282addc898d)

Disclaimer

This project is developed based on the analysis of the Chinese version of Chronodivide — RA2WEB (www.ra2web.com), and is intended to be refactored using the latest versions of React and Three.js. All rights to this project, including profit rights, belong to the owner of Chronodivide. Without permission from the owner of Chronodivide, any commercial use of this project is strictly prohibited.

It should be noted that the owner of Chronodivide has never open-sourced the game client code in any form, even though some peripheral open‑source content such as a mod‑SDK exists. Bugs, incomplete functions or other issues arising from the operation of this project shall not be regarded as damage to the reputation of Chronodivide. Any commercial activities conducted based on this project, including but not limited to placing advertisements, developing a “bullet-screen Red Alert” mode to profit from gifts, directly packaging and selling the project, or fraudulently obtaining sponsorship and donation revenue by claiming to be the “author”, shall be deemed as infringement upon the original author of Chronodivide, Alexandru Ciucă, and RA2WEB.

![image](https://github.com/user-attachments/assets/f146dc1c-ca15-456a-a8f0-4b43f2d431e8)

![image](https://github.com/user-attachments/assets/a23760df-e679-4b32-a9a2-ca51c214c420)

![image](https://github.com/user-attachments/assets/4781f451-7a51-45e2-919b-cbcb8bbd727a)

## 项目简介

本项目是使用Typescript编写，完全对标“红色警戒2”的游戏引擎，本地自行导入红色警戒2美术素材后，就可以获得类似红警2的游玩体验

## 当前技术状态

### 运行时和构建

- 包管理：`pnpm 9+`
- 运行时：`Node 20+`
- 开发服务器：`Vite 8.0.1`
- UI：`React 19.2.4` + `react-dom 19.2.4`
- 类型系统：`TypeScript 5.9.3`
- 渲染：`three 0.183.2`
- 自动化：`Playwright 1.58.2`
- 默认开发和预览端口：`127.0.0.1:4000`

## 快速开始

### 环境要求

- `Node 20+`
- `pnpm 9+`
- 现代浏览器，推荐 Chrome / Edge
- 浏览器需要支持：
  - `WebGL`
  - `Web Audio API`
  - `File System Access API`

### 安装与启动

```bash
cd redalert2
pnpm install
pnpm dev
```

默认访问地址：

```text
http://127.0.0.1:4000
```

生产构建与预览：

```bash
pnpm build
pnpm preview
```

类型检查：

```bash
pnpm typecheck:entry
```

## 自动化回归

`scripts/` 下维护了一组可直接执行的 Playwright 回归脚本，覆盖路由、视口、配置持久化、GameRes 启动等。脚本会自动启动（或复用已有的）`127.0.0.1:4000` 上的 Vite dev server，并在退出时清理。

> **历史背景**：上游仓库 `huangkaoya/redalert2` 把 `scripts/` 和 `docs/` 在 `.gitignore` 中忽略，从未对外发布。当前目录由本仓库 2026-05-07 重新搭建，详见 `docs/notes.md`。

可用命令：

```bash
pnpm debug:test-entries          # 13 条 hash 路由全部走一遍
pnpm debug:tester-panels         # 每个 tester 的 window.__ra2test 快照
pnpm debug:viewport              # 6 种桌面/移动分辨率
pnpm debug:options               # GeneralOptions 持久化（toggle → reload → 验）
pnpm debug:storage-explorer      # GameRes 导入入口
pnpm debug:game-res-init         # 启动期 console 分桶（[Application]/[GameRes]/[VFS]）
pnpm debug:skirmish-lobby-data   # __ra2debug.skirmishLobby 快照（需要游戏资源）
pnpm live:runtime                # 长驻 dev server + Playwright 浏览器（Ctrl-C 退出）
```

首次运行前装一次浏览器二进制：`pnpm exec playwright install chromium`。

常用环境变量：`HEADED=1` 显示浏览器窗口；`SLOWMO=200` 放慢动作；`DEBUG_VERBOSE=1` 把 vite 与浏览器 console 透到终端。

脚本产物写到 `.artifacts/<flow-name>/`：截图、`result.json`、`console.log`、`network-errors.log`。

## 测试入口

主菜单中的测试入口目前分为三类：

1. 素材测试
   - `VXL测试`
   - `SHP测试`
   - `音频测试`
2. 机制测试
   - `建筑测试`
   - `载具测试`
   - `步兵测试`
   - `飞行器测试`
3. 场景测试
   - `大厅测试`
   - `世界测试`
   - `移动测试`

这些 tester 页面不是孤立 Demo，而是当前仓库里很重要的调试和回归入口。页面左侧面板状态会同步到调试状态对象，自动化脚本也会直接使用这些入口验证渲染和交互结果。

## 技术架构

### 核心技术栈

- `Node 20+` + `pnpm 9+`
- `React 19.2.4`
- `TypeScript 5.9.3`
- `Vite 8.0.1`
- `three 0.183.2`
- `Playwright 1.58.2`
- `7z-wasm`
- `file-system-access`
- `@ffmpeg/ffmpeg`
- `@ra2web/pcxfile`
- `@ra2web/wavefile`

### 目录说明

仓库为 **pnpm workspace monorepo**，分层如下：

```text
redalert2/
├── apps/
│   └── web/                 主前端 app (@ra2/web)
│       ├── src/             main.tsx, App.tsx, Application.ts, Gui.ts, ...
│       ├── public/          静态资源、CSF、locale、CSS
│       ├── index.html
│       └── vite.config.ts
├── packages/
│   ├── util/   (@ra2/util)    通用工具 + math + Coords + LocalPrefs + ConsoleVars + RouteHelper + DevToolsApi + performance
│   ├── data/   (@ra2/data)    原版资源格式（MIX/INI/SHP/VXL/HVA/TMP/CSF）+ VFS + Config
│   ├── engine/ (@ra2/engine)  渲染、音频、资源加载（依赖 util, data）
│   ├── game/   (@ra2/game)    游戏逻辑、单位、规则、超武、AI、RenderableManager、fx 桥接（依赖 engine, data, util）
│   ├── network/ (@ra2/network) LAN、Lockstep、Replay（依赖 game）
│   ├── gui/    (@ra2/gui)     主菜单、HUD、选项、ErrorHandler（依赖 network 及以上层）
│   └── tools/  (@ra2/tools)   tester 入口（依赖 gui 及以上层）
├── scripts/                 Playwright 回归 + dev runtime
├── docs/                    对齐记录与工程说明
├── pnpm-workspace.yaml
├── tsconfig.base.json       共享 paths 别名 @ra2/*
└── package.json             根工作区入口
```

依赖方向严格单向：`util ← data ← engine ← game ← {network, gui} ← tools ← apps/web`，无循环依赖。包内引用用相对路径，跨包用 `@ra2/<pkg>/<file>`。

### 主要模块

`packages/engine/`

- `gfx/`：three 渲染层、材质、批处理、viewport、lighting
- `renderable/`：游戏对象到可视对象的桥接层（fx handler 已迁出至 game）
- `sound/`：音频混音、音乐、音效播放
- `gameRes/`：资源导入、CDN 加载、缓存与目录处理

`packages/game/`

- `gameobject/`：单位、建筑、抛射体、trait、locomotor
- `rules/`：INI 规则读取与对象规则构建
- `trigger/`：地图触发器、条件、执行器
- `superweapon/`：核弹、闪电风暴、超时空等超武逻辑
- `renderable/fx/handler/`：响应游戏事件触发的视觉效果（从 engine 迁入）

`packages/gui/`

- `screen/mainMenu/`：主菜单、地图选择、大厅、选项
- `screen/game/`：游戏内 HUD、世界交互、菜单
- `component/`：React 组件
- `jsx/`：自定义 UI 渲染桥接

`packages/tools/`

- 提供素材、机制、场景三类 tester 页面
- 当前是调试结果可视化和自动化断言的重要入口

## 开发命令

```bash
pnpm dev                   # 开发服务器（Vite，:4000）
pnpm build                 # 生产构建（含 vendor-three/react/qr/7z/ffmpeg 命名 chunk）
pnpm preview               # 预览生产构建
pnpm typecheck             # 全项目 tsc --noEmit（surface 上游 pre-existing 债务）
pnpm typecheck:baseline    # 与 .typecheck-baseline.json 比对，错误数不许增加
pnpm typecheck:entry       # 仅入口（main.tsx + App.tsx）—— 快速 sanity check
pnpm lint                  # ESLint + boundaries（强制 util ← data ← engine ← game ← gui ← tools 单向依赖）
pnpm test                  # 单元测试（vitest）
```

CI 在 `.github/workflows/ci.yml` 配好：每个 PR 跑 `test` + `lint` + `typecheck:baseline`（防退化门）+ `build` + 5 个 Playwright 烟雾流程，artifact 自动上传。

`.typecheck-baseline.json#maxErrors` **目前是 0**——typecheck 任何新错误直接 fail CI。达成路径：47 个真实修复 + 4 个 `@ts-expect-error` 标注的内部私有访问 + 12 个 `@ts-nocheck` 标记的 online-only / upstream-stripped 屏幕（这些屏幕本地无服务器可连，强行补 stub 会撒谎）。详见 `docs/notes.md`。

如果你**真的修了一批 nocheck 文件**：运行 `pnpm typecheck:baseline`——它会比较当前错误数 vs baseline。降错误数永远 OK，只在 baseline 不变就直接通过；你想锁紧 baseline 时直接编辑 `.typecheck-baseline.json` 把 `maxErrors` 调低。我们故意不自动写——一个静默下降的数字会变成没人读的橡皮图章。

## 文档与调试约定

- 开发端口固定为 `4000`
- 主要技术对齐记录维护在 `docs/notes.md`
- 自动化产物默认输出到 `.artifacts/`
- 构建通过并不等于所有行为已完全对齐，功能层面仍应优先参考专项脚本和实际流程验证

## 贡献建议

提交改动前，至少建议执行：

```bash
pnpm typecheck:entry
pnpm build
pnpm test
```

如果改动涉及大厅、资源加载、进图、HUD、机制或 tester，请补跑相应的 `debug:*` 脚本。

## 许可证

本项目基于GNU General Public License v3.0（GPL-3.0）许可证开源。详见 [LICENSE](LICENSE) 文件。

### 重要说明
- 可以自由使用、修改和分发，除非取得RA2WEB负责人许可，否则严禁用于商业目的
- 必须保留版权声明和许可证文本
- 任何衍生作品必须使用相同的 GPL-3.0 许可证
- 必须提供源代码，包括修改后的版本
- 不能将 GPL 代码集成到专有软件中

**注意：** 本项目仅用于学习和研究目的。红色警戒2是EA公司的知识产权，导入美术素材时请确保拥有合法的游戏副本。

## 致谢

- RA2WEB.COM
- Three.js 社区
- React 团队
- TypeScript 团队
- 相关开源依赖维护者
- 红警 2 玩家社区

---

**免责声明**: 本项目仅供学习研究使用，不用于商业目的。红色警戒2及相关商标归EA公司所有。

---
