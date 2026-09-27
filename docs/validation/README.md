# Validation evidence

These reports distinguish controlled tests from ordinary progression. Large captures and checkpoint saves remain local under ignored `artifacts/`.

- `focused-tests.json`: the six-file, 226-case run on 27 September 2026, plus typecheck and production build.
- `first-night.json` and `industry.json`: accepted normal-command progression reports, with no debug grants. The latter ends with equipped Tesla armor at 7,153.3 seconds.
- `checkpoint-hashes.json`: integrity and size records for seven accepted local checkpoint files.
- `interaction-review.md`: real browser and installed Windows observations, including tool limitations.
- `windows-release.json`: final installer/portable checksums and installed archive verification.

Run `pnpm test` for the suite and first-night controller. The longer chain uses the environment flags documented in the root README. Scene fixtures and browser review pages are in `tests/visual-fixtures.test.ts` and `tools/`; they are excluded from the packaged game.

Ordinary progression is an automated, map-aware controller using normal commands and exported checkpoint resumes. It is not an uninterrupted human playthrough. It cannot grant inventory, health, XP or research, teleport, or alter game balance. Failed attempts remain separate from accepted reports.

Review strings inside `src/content/generated/content.json` are historical import-time annotations. Current review evidence is in `research/asset-map.json`, `research/replacement-assets.json` and the dated acceptance/differences records.
