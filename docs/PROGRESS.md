# Stage 2 implementation

Updated 27 September 2026. Working branch: `codex/stage-2`, based on `5985190`.

- [x] Inspect Stage 1 and preserve its original research and media.
- [x] M0: content schema, semantic asset map, local game shell and versioned saves.
- [x] M1: ordinary opening, research and first-night survival from two stones.
- [x] M2: durable saves, recovery, pause and separate death/revival behavior.
- [x] M3: ordinary industry, city scavenging, power armor and equipped Tesla armor.
- [x] M4: weapons, ammunition, survival hazards, five ghouls and three robots.
- [x] M5: ten houses, nine city buildings, caves/bunkers and physical circuits.
- [x] M6: artwork, layouts, night visibility, native audio and browser gameplay controls reviewed; import accessibility and unstable crafting controls fixed.
- [ ] M7: repository publication and Windows delivery. The final installed package passed offline save/quit/relaunch/load after more than five hours closed.

The focused suite has 226 passing cases: simulation 19, saves 8, regressions 23, puzzles 10, features 143 and combat matrix 23. The fresh-world ordinary chain reaches equipped Tesla armor at 7,153.3 simulation seconds with 255 health and level 33. It uses normal commands and exported checkpoints without inventory, health, XP or research grants. Controlled fixtures remain separate.

The final Windows installer and portable executable were rebuilt on 27 September and copied to `releases/stage2-0.2.0`. Installation exited with code zero; installed and packaged application archives have identical SHA-256 hashes. Final native menu, keyboard crafting, named save, restart, load and pause checks passed. GitHub access has been renewed; source and release publication are next. See [acceptance](ACCEPTANCE.md), [validation](validation/README.md) and [differences](DIFFERENCES.md).
