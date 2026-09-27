# Fidelity and implementation ledger

Updated 27 September 2026. This records the practical remake's evidence and differences; it does not claim calibrated, exact server parity. The source Stage 1 folder is unchanged. The implementation uses TypeScript, Canvas 2D, DOM menus, IndexedDB and a local Electron wrapper.

## Reference and working rules

There are 185 item definitions, 121 recipes (119 supplied plus two provisional uranium construction recipes), and 13 station/action contexts. Source/confidence records are retained in `research/`. The original menu observed on 17 September displayed `0.30.383`; the official changelog checked on 18 September reaches `V0.32.1890`. That discrepancy remains unresolved.

`research/working-choices.json` records 185 filled numeric fields. Movement, radiation, armor percentages, ghoul spawning, regrowth, timer periods, sound attenuation and geometry in `src/content/index.ts` also include unmeasured choices. The uranium wall/door recipes are explicit assumptions. Replacing a choice requires a reproducible observation of the relevant original mechanic; a wiki null is not treated as zero.

The selected baseline uses eight-minute day and night phases, sequential four-job queues with concurrent stations, the supplied XP curve, five-pellet shotguns, soup-can return, five tree seeds, four oranges into eight composted oranges, and exactly-one three-input XOR. Listed XP awards are used directly because Stage 1 warns they may already include the peaceful 125% karma bonus. PvP karma changes are dormant.

Later official corrections are in `research/official-overrides.json`: the stone pickaxe starts researched; fridges accept all supplies; canceling a recipe consumes perishable inputs while returning nonperishable inputs; ghouls damage player structures only at night; secondary armor protections and welding-helmet slowdown are present. Qualitative protections are sourced; exact percentages remain choices.

Industrial fuel burns while working. Fires, extractors and feeders consume fuel continuously while active. Finished station food and refrigerated food remain fresh under the selected food-strategy interpretation. Unused stored fuel drops on destruction; an already-burning unit does not.

## Intentional single-player behavior

- No game servers, accounts, chat, teams, leaderboards, advertisements, promotional navigation or human raiders. No Ghoul Mode, Battle Royale, removed seasonal content, living wildlife or turrets.
- Day-start spawn, whole-world pause, focus-loss pause and no advancement while closed.
- Twelve named manual saves, three rolling autosaves, export/import, previous-generation recovery, recoverable deletion and a desktop single-instance lock. Atomic generation checks protect concurrent writes.
- Ordinary death abandons ownership, resets player age and supplies the selected half-level kit. Sleeping-bag revival consumes the bag and preserves progression/ownership. Abandoned HAL/Tesla guards become hostile; LapaBot retaliates when attacked. This ownership policy is an explicit interpretation.
- The supplied XP curve stops at level 79; historical higher death kits reuse kit 30. No unverified curve is extrapolated.
- Historical explosive/repair-tool exploits are excluded.

## Art, world and AI

The runtime bundle contains 303 hash-verified original files and 20 generated PNG replacements. It selects runtime media, not the full reference collection. Original art/effects permission and the soundtrack's conflicting license notices remain unresolved; see `THIRD_PARTY_NOTICES.md`. Credits and provenance accompany the build.

Replacement roles include iron, metal axe, furniture strips, the weaving machine, string/leather/tendon/fat, and seven small ground-item roles. Prompts, original paths and frame mappings are in `research/replacement-assets.json`, the prompt records and `asset-overrides.json`. The image tool did not expose a model version. Held/worn equipment extends code-drawn silhouettes and palettes; it is not recovered animation. Crops, cave surfaces and some geometry are authored replacements. All replacement files have been inspected at gameplay scale. Creature sprites preserve natural aspect ratios and use the corrected default five-ghoul mapping.

Ten numbered houses, nine city buildings and two cave/bunker regions are authored from the supplied references. All layouts have been visually reviewed. Exact original server coordinates are not asserted. Named cafe, office, boxing ring and protected-house mappings are interpretations. City 2 and 7 circuits have exhaustive solution checks; City 5 uses a physical switch/plate route. An authored five-second trap relay supplements normal four-mode timers. Big wires retain their city-computer bottleneck, including replenishment on a later trip.

AI uses bounded multi-resolution routes. One expensive search starts per fixed tick, distributing simultaneous requests without shortening searches. Routes are retained while waiting. A transient geometry cache is invalidated by door/object changes and is not saved. This is a local implementation choice, not a recovered original AI algorithm.

## Verification

- 226 focused cases pass: simulation 19, saves 8, regressions 23, puzzles 10, features 143 and combat matrix 23. They cover all 121 recipes with supplied inputs, weapon families, ammunition, explosives, farming, fuels, food, survival effects, gates, AI, ownership/death, corruption, quotas, migration and concurrent/interrupted saves.
- Complex saved fixtures continue identically to unsaved ones. Pause preserves canonical state, and 30/60/144 Hz render schedules produce the same fixed-step result.
- Nine checks passed against real browser IndexedDB, including corruption, concurrent writes, aborts, incompatible versions, export/import and restoration. Named-slot UI save and recovery were exercised.
- Fresh-world ordinary commands reach first night/research at 965.0 seconds, industrial tools/stations at 3,210 seconds, first city salvage at 4,889 seconds, Tesla bench at 5,205 seconds, power armor at 5,985 seconds and equipped Tesla armor at 7,153.3 seconds. The final state has 255 health, level 33 and no radiation. Resumes use exported checkpoints. Failed controller attempts remain separate in `artifacts/validation/runs/`.
- Furniture, stations, crops, damage states, materials, creatures, equipment and authored layouts have been reviewed with the real renderer. Visibility angles were corrected to remove a half-room occlusion artifact. A C4 scene exercises real explosion/damage feedback.
- Ten real-media checks passed in native Electron: decoded/advancing music and effects, ambient looping, pause/resume, three volume channels, attenuation and Geiger playback.
- A 578-view day/night map sweep passed. A controlled populated world with 6,355 active entities, 32 ghouls, three robots, operating stations and night lighting completed 1,800 fixed ticks and 900 renders at 1280x720: mean 29.2 ms, p95 101.4 ms, maximum 177.9 ms for two ticks plus one render. This congested closed-base fixture is not a guarantee of 60 FPS. Earlier repeated searches produced much longer stalls.
- Production typecheck/build and Windows NSIS/portable packaging pass. OneDrive rejected the packager's directory rename; packaging in the temporary directory succeeded, and the resulting executables were copied into the repository. Installation exited with code zero.
- The current game UI has exercised medicine timers/healing, RadAway, Lapadone feedback, two-way chest transfer, clothing changes and ordinary half-level respawning. Real inventory dragging, seed/wall placement, repair, circuit switching, wheel zoom, smelting and sleeping-bag revival have also been exercised. Import save is keyboard accessible; aging food and timer updates preserve button identity.

The final 27 September installed package passed offline save/quit/relaunch/load after more than five hours closed, retaining the named world without closed-time advancement. Keyboard crafting, the save-name field and manual-slot loading were exercised in the installed executable. Native file-picker automation could not target its File name field; import was verified through the browser's actual chooser flow.

Source is published in [PR #1](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/pull/1), with installer and portable builds in the [v0.2.0 release](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/releases/tag/v0.2.0). Public download status, sizes and uploaded checksums were verified. Older executables directly under `releases/` are stale; use only `releases/stage2-0.2.0/` or the tagged release assets.
