# Stage 2 acceptance audit

This audit preserves the complete Stage 1 handoff scope. Updated 27 September 2026. It distinguishes controlled tests, ordinary progression and observed UI behavior; final delivery is tracked below. The copied `research/feature_matrix.json` remains the original Stage 1 record.

The focused suite passed again on 27 September: 226 cases, simulation 19, saves 8, regressions 23, puzzles 10, features 143, combat matrix 23. Most use controlled fixtures. Recipe execution checks prove recipe behavior with supplied inputs; they do not prove ordinary progression. The ordinary playthrough and installed Windows checks are separate evidence below. Small reports and accepted checkpoint hashes are retained in [validation](validation/README.md).

| Required feature | Implementation / test evidence | Runtime / release evidence |
|---|---|---|
| New game and controls | `src/main.ts`; browser menu, new world and opening previously exercised | Browser and installed offline opening exercised |
| Walking, sprinting, aiming, collision | `Game.move`, combat aim, swept path tests and ordinary walking | Ordinary movement/aiming exercised; final installed keyboard/menu/persistence smoke check passed |
| Five survival gauges | `survival.ts`; mixed hunger/cold, radiation, energy and regeneration tests | Five-gauge and Tesla-equipped 14-slot HUD reviewed |
| Independent clocks and day/night | Fixed 60 Hz simulation; 30/60/144 Hz equivalence; ordinary first night | Fresh opening passed at 965 seconds, 255 health |
| Fire, sunlight, lamps, darkness | Separate heat/light; nonstacking lamp damage and sun damage tests | Day/night visibility, corrected wall shadows and native audio reviewed |
| Harvest tools and resources | Ordinary fists → hatchet → sulfur pickaxe; recipe/yield checks | Fresh-world chain passed through equipped Tesla armor |
| Boar and deer carcasses | Inactive carcass resources; ordinary leather/tendon/fat gathering | No living wildlife is added |
| Food, spoilage, refrigeration | Inventory aging, refrigerated storage, six bush harvests, soup-can return | Aging, full-inventory output retention and real smelting collection exercised |
| Medicines and drugs | Action completion, withdrawal and antidote tests; all recipes execute | Medicine timers, healing, RadAway and Lapadone UI exercised |
| XP, levels, karma, research | Supplied XP thresholds; ordinary level 33 reached; peaceful-karma interpretation in differences ledger | Ordinary level 33 reached; no server-exact XP claim |
| Inventory, builder, lightweight, zoom upgrades | Inventory upgrades reached normally; builder batch and trap-roll persistence tests | Wheel zoom and maximum 14-slot HUD verified |
| Inventory, equipment and transfer | Stack splits/partial transfers, quantity vs loaded rounds, 14-slot HUD reviewed | Clothing changes and drag-and-swap with aging food verified |
| Crafting and sequential queues | All 121 recipe executions; four-job queue, cancellation, saved work and output blocking | Hatchet and smelting queues verified after stabilizing DOM controls |
| Thirteen station/action contexts and fuels | All contexts implemented; fuel pause, destruction and fuel bootstrap checks | All station scenes reviewed; ordinary endgame passed |
| Farming, acorns and regrowth | Fruit yields and tree growth tests; crop-stage scene reviewed | Orange seed planted with real pointer input; growth-stage scene reviewed |
| Mineral extractor | All four minerals, timings, ranges and saved partial work tested | Operating extractor scene reviewed; resource and timing behavior tested |
| Feeder | Powered feeding/range test; original placed sprite | Feeder visibly restored hunger to 255 in the controlled scene |
| Walls, doors, floors and ownership | Full/low collision, four door orientations, four damage states reviewed | All house/city routes reviewed; actual wall placement exercised |
| Uranium wall and door | Both recipes execute; owner radiation test; original art | Provisional recipes and numerical assumptions remain disclosed |
| Chests, fridges, loose items | Acceptance filters, aging, destruction drops and transfer tests | Two-way chest transfer and world drops reviewed |
| Repair tools | Hammer / repair hammer / nail gun behavior; repair robot route regression | Real repair consumed one nail and restored wall appearance |
| Melee, thrown, ballistic and energy weapons | All ranged families, pellet count, loaded ammo, spear recovery and wall blocking tests | Late combat scene reviewed with actual renderer |
| Sixteen wearable recipes | Recipe checks, protection families, secondary protections; worn silhouettes reviewed | Tesla armor reached and equipped normally; worn silhouettes reviewed |
| Explosives | Mine ownership, grenade trajectory/fuse, saved dynamite fuse, C4 trigger, 700-charge bounded chain | Real C4 explosion/damage and native action audio reviewed |
| Spikes and lightweight | Movement slowdown, activated owner damage, one roll per entry across saves | Trap scene reviewed; entry-roll and slowdown tests pass |
| Five ghoul types | Each age threshold/provocation tested; light, structure damage and ordinary encounters | All five creature sprites and night scene reviewed |
| Three robot roles | LapaBot repair/retaliation; HAL/Tesla defense; deployment HP ratio | All three robot roles and runtime appearance reviewed |
| Death and sleeping-bag revival | Separate ownership/progression behavior, bag consumption, respawn kits | Ordinary respawn and level-35 sleeping-bag revival UI exercised |
| Circuits | Physical gate truth tables, exactly-one XOR, NOT fanout, crossing isolation, weighted plates, timers | Real switch interaction powered the cable and lamp |
| Nine city buildings and puzzles | Authored layouts; exhaustive City 2/7 solutions; City 5 switch/plate; ordinary City 2 salvage | All nine city layouts reviewed |
| Ten distinct houses and named variants | Authored transcriptions; cafe/office/protected-house physical wiring tests | All ten house layouts reviewed |
| Caves/bunkers and occlusion | Two authored regions; cave wall/floor; full-wall visibility mask | Cave geometry and corrected visibility boundary reviewed |
| Loot, salvage and refill | Source availability, container releases, offscreen city computer refill tests | Second city trip completed in the accepted chain |
| Seeded map and regeneration | Stable random streams; resources stay out of rooms/city entrances | Fresh opening passed on the final generator |
| Art, animation and damage states | 303 original files hash checked; 20 generated replacement files; held/worn code artwork | All 20 replacement files inspected at gameplay scale; fidelity limits disclosed |
| HUD, menus, feedback | Local menu, help/credits, crafting/research, map, maximum inventory and named save UI | Menus, map, import, save, equipment and death UI reviewed |
| Music, action sounds, Geiger | Local audio mapping and volume channels implemented | 10 real-media native Electron checks passed: playback, loops, pause, volume, attenuation and Geiger |
| Save slots, autosaves, import/export/recovery | 12 manual + 3 auto; atomic/concurrent/abort/quota/corruption/migration tests; nine real-browser checks | Named installed save survived quit/reinstall/relaunch; browser import/recovery verified |
| Pause, focus loss, offline launch | Canonical-state pause/no wall-time advancement tests; desktop network requests blocked | Final installed --offline save/quit/relaunch/load passed after more than five hours closed; no closed-time catch-up |
| Parity, recovery and performance | Scoped tests above; 578 real-browser map views passed, mean 4.0 ms/p95 11.4 ms on review viewport | Populated-base run passed: mean 29.2 ms, p95 101.4 ms, max 177.9 ms for two ticks plus one render; no 60 FPS guarantee |

Excluded as requested: multiplayer/accounts/chat/teams/leaderboards; Ghoul Mode/Battle Royale/admin tools; removed seasonal content; living wildlife/turrets; promotional navigation/ads/social buttons. There is no replacement human-raider system.

## Ordinary progression gate

- Opening and first night: passed from two stones, no grants, unchanged 60 Hz simulation, 965 seconds, 255 health. `artifacts/validation/research-playthrough.devastsave`.
- Industry: passed through research bench, weaving machine, compost, smelter, sulfur pickaxe, winter coat, radiation mask and hammer. Accepted checkpoint `milestones/industry-pre-city-3210.devastsave`, time 3,210 seconds, 255 health.
- City: full radiation suit and firearm crafted normally; six-switch room solved by ordinary interactions; four big wires scavenged. Checkpoint `milestones/first-city-salvage-4889.devastsave`, level 28, 255 health.
- Tesla bench, power armor and equipped Tesla armor: accepted. The fresh-world chain reaches Tesla armor at 7,153.3 seconds, level 33, 255 health. Failed/terminated attempts remain separate from valid milestones. The controller may plan routes using map data, but cannot grant items, teleport, change gauges, grant research/XP or alter simulation balance.
- The final fresh opening passed with the current generator. Continuing an older saved world preserves its old resource placements; no migration deletes inconvenient obstacles.

## Delivery gates

- Preserve Stage 1 originals and provenance: satisfied by separate imports/derivatives; selected runtime media and attribution accompany the requested build; the complete reference archive is excluded.
- Keep unknown numbers and authored wiring interpretations visible: `DIFFERENCES.md`, `research/working-choices.json`, `research/official-overrides.json`, `research/replacement-assets.json`.
- Final focused tests, typecheck, production build and Windows NSIS/portable packaging passed on 27 September. Final packages and checksums are in `releases/stage2-0.2.0/`; older root-level packages are stale. Installation exited with code zero and the installed application archive matches the packaged one.
- Installed offline save/quit/reinstall/relaunch/load passed on 26 September. The rebuilt 27 September package also passed retained-slot loading, a new named save, clean close and offline relaunch/load after more than five hours closed, with no elapsed-world catch-up. See `validation/interaction-review.md`.
- Repository commit/push and build placement: complete. Built source commit `64e47cadc5f753a070d9f3563a42c29bc8b63001` is published on `codex/stage-2` and tagged `v0.2.0`. [PR #1](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/pull/1) contains the implementation and final delivery records.
- Direct installer, portable and checksum links are published in the [v0.2.0 release](https://github.com/ProgrammingWithYagle/Devast.io-REMAKE/releases/tag/v0.2.0). Anonymous requests returned HTTP 200 and expected sizes; uploaded digests matched local hashes. See `validation/publication.json` and `releases/stage2-0.2.0/SHA256SUMS.txt`.

All M0–M7 delivery gates above have evidence. The practical remake's unmeasured original constants, provisional recipes, authored geometry, replacement art and measured performance limits remain disclosed in `DIFFERENCES.md`; completion is not a perfect 1:1 parity claim.
