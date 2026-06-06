# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- **Crawl execution (on hardware)** — milestones C0 -> C5; C4 measures the real
  on-device 38.4 MHz latency, which finalizes the provisional Walk/Run plans.

## [0.2.0] - 2026-06-06

The buildable software layer plus the complete phase-by-phase plan set. After this
release the critical path is on-hardware Crawl execution.

### Added
- **Option-B C++ firmware integration** (`aegis-edge/firmware-option-b/src/`) —
  `run_classifier_continuous()` loop, gesture -> RGB-LED mapping, and CCCD-gated
  GATT notify via the GSDK 4.x `sl_bt` API. Not compiled here (needs Simplicity
  Studio 5 + GSDK 4.0.2); the Run-phase firmware foundation.
- **Web Bluetooth dashboard** (`aegis-edge/dashboard/`) — a browser alternative
  to the phone app that reads live inference over the verified BLE UUIDs; runs in
  Chrome/Edge from `localhost`.
- **CI + tests + tooling** — `.github/workflows/ci.yml` (shellcheck, pytest,
  relative-link check), a 12-test pytest suite for `serial-bench-parse.py`, and a
  `Makefile` of dev tasks.
- **Complete plan set** (`aegis-edge/docs/plans/`) — `01-implementation-plan` (Crawl
  C0-C5), `02-next-phases` (overview), `03-walk-detailed` (W0-W4), `04-run-detailed`
  (R0-R4), `STATUS`, and `README`. Walk/Run are provisional pending Crawl C4.
- **`aegis-edge/START-HERE.md`** — condensed bench-ready C0-C5 checklist.

### Changed
- Adopted a **PR-based merge workflow** (features merge into `develop` via PR, not
  local merge) and a **keep-feature-branches** policy; documented in `CONTRIBUTING.md`.
- Polished the root `README.md` to reflect the full repo layout and status.

### Fixed
- Repaired 4 pre-existing broken relative links in the runbooks/config docs.
- Aligned the firmware<->dashboard confidence-scale contract on 0..100 percent.

## [0.1.0] - 2026-06-06

First tagged milestone: the verified reference documentation set plus the
scaffolded, ready-to-build Aegis Edge Crawl phase.

### Added
- **Reference docs** — 10-chapter Thunderboard Sense 2 doc set under
  `docs/thunderboard-sense-2/` (overview, SoC & radio, sensors, pinout/power,
  use-cases, getting-started, toolchain, references, and the Aegis Edge guide),
  deep-audited against primary Silicon Labs datasheets.
- **Aegis Edge Crawl scaffold** — buildable workspace under `aegis-edge/`:
  - `README.md` and `edge-impulse/PROJECT-CONFIG.md` (canonical impulse spec).
  - `runbooks/C0-C5` + `FLASHING.md` — turn-key milestone instructions with
    verified Edge Impulse parameters and BLE GATT UUIDs.
  - `scripts/check-tooling.sh` and `serial-bench-parse.py` (tested).
  - `firmware-option-b/` — C++ `run_classifier` integration notes for the Run phase.
  - `benchmark/` and `demo/` templates for the portfolio deliverables.
- **Repo structure** — root `README.md`, `CONTRIBUTING.md` (Git Flow model),
  this `CHANGELOG.md`, and a consolidated root `.gitignore`.

### Notes
- Board identity (Thunderboard Sense 2 / BRD4166A / bare EFR32MG12 SoC) and key
  specs were independently re-verified against physical-board photos and datasheets.
- On-device latency at 38.4 MHz is intentionally left as a measure-on-device
  deliverable rather than an assumed figure.

[Unreleased]: https://github.com/sairam0424/Thunderboard-Labs/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/sairam0424/Thunderboard-Labs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sairam0424/Thunderboard-Labs/releases/tag/v0.1.0
