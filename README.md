# Devast.io REMAKE

A local single-player remake of Devast.io with persistent worlds. Stage 2 follows the supplied survival-game research: gather, research, build a base, solve city circuits and progress to Tesla equipment. Future content additions are outside this release.

## Windows downloads

- [Install Devast Remake 0.2.0](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/releases/download/v0.2.0/Devast-Remake-0.2.0-Setup.exe)
- [Portable executable](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/releases/download/v0.2.0/Devast-Remake-0.2.0-Portable.exe)
- [Release notes and checksums](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/releases/tag/v0.2.0)

The Windows x64 packages are unsigned. The installer lets you choose its destination; the portable executable needs no installation. Both contain the game media and run offline. Development copies of these exact downloads live in `releases/stage2-0.2.0/`; the binaries are hosted as repository release assets because they exceed GitHub's regular Git file limit.

## Play

Start **New Game** with a world name and seed. You begin with two stones: punch trees, craft a hatchet, then build a workbench and a fire before night. The local **Field guide** explains the progression and controls.

| Control | Action |
|---|---|
| WASD / arrows, Shift | Walk, sprint |
| Mouse, left click | Aim, attack, eat or place |
| E / F | Interact / pick up loose items |
| 1–9, 0 / Space | Select a slot / use or equip |
| R / right click | Rotate or reload / put item away |
| C / M / H | Craft / map / field guide |
| Q / Shift+Q | Drop stack / drop half |
| Drag / Shift-drag | Arrange / split inventory |
| Mouse wheel / Escape | Zoom / close panel and pause |

Twelve named manual slots and three rotating autosaves preserve the whole world. Export a `.devastsave` file for independent backup or transfer between the browser, installer and portable app. Save data lives in Electron's per-user app-data storage, outside the installation folder; uninstalling preserves it. The world pauses when its window loses focus and does not advance while closed. Ordinary respawning and sleeping-bag revival are separate from loading a save.

## Scope and verification

The game includes 185 item definitions, 121 recipes, 13 station/action contexts, five survival gauges, farming, spoilage, ammunition, clothing, medicine, explosives, repair, physical circuits, five ghoul types and three robots. Ten house layouts, nine city buildings and two cave/bunker regions preserve the dangerous city salvage loop and big-wire bottleneck. Feeder, wheel zoom and uranium walls/doors are included.

There are no accounts, multiplayer, cloud saves, human raiders, advertising or promotional links. Local pause and durable saves are intentional single-player changes. This is a practical remake, not a claim of exact hidden-server parity: 185 filled numeric fields, provisional uranium recipes and other interpretations are documented in [the differences ledger](docs/DIFFERENCES.md). Original and replacement media are distinguished in [third-party notices](THIRD_PARTY_NOTICES.md).

Validation covers 226 focused simulation/persistence cases, real-browser IndexedDB recovery, native audio, day/night visual scenes and ordinary progression from two stones through equipped Tesla armor. See the [acceptance record](docs/ACCEPTANCE.md) for the exact evidence and performance limits.

## Build from source

Use Node.js 24 and `pnpm@11.19.0`. Versions are pinned in `package.json` and `pnpm-lock.yaml`; the selected runtime media is included in `public/assets`.

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm desktop
pnpm package
```

`pnpm package` creates the Windows installer and portable executable in `releases`. If a synced folder prevents the packager's final directory rename, set a temporary local output directory with electron-builder's `--config.directories.output` option, then copy the completed executables back. The renderer loads local files only; the desktop wrapper blocks network requests, external navigation and permission requests. Launch with `--offline` to additionally enable Electron's offline emulation.

`pnpm test` includes a deterministic ordinary first-night playthrough and clearly labeled controlled fixtures. After it creates `artifacts/validation/research-playthrough.devastsave`, the longer progression check runs with normal commands and unchanged simulation balance:

```powershell
$env:DEVAST_ACCEPTANCE_STAGE = 'industry'
pnpm exec vitest run tests/progression.test.ts
Remove-Item Env:DEVAST_ACCEPTANCE_STAGE
```

`tools/` contains development-only visual, audio, storage and performance review pages; they are excluded from the production bundle. `tools/import-stage1.mjs` can regenerate the imported data from an owner-provided Stage 1 folder; it is not needed for a normal checkout/build. The complete reference archive is not distributed.
