# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- **Crawl C5** — optional offline BLE phone demo (polish; on-device inference is
  already proven). Then the planned **Walk / Run** phases, whose latency/RAM
  targets are now anchored to the real C4 measurement.

## [0.3.0] - 2026-06-08

Crawl goes from "scaffolded / in progress" to **DONE on hardware**. Milestones
C0 -> C4 are complete and verified on the physical Thunderboard Sense 2; the
on-device 38.4 MHz latency that the Walk/Run plans were waiting on is now measured.

### Added
- **On-device latency benchmark** — measured via `edge-impulse-run-impulse --debug`
  at 38.4 MHz: steady-state **~87.5 ms total per inference** (~86 ms DSP + ~1-2 ms
  classification + 0 ms anomaly, ~11 inferences/sec). RAM ~3.1K, flash ~34.5K, int8.
  This is ~5x the Edge Impulse 80 MHz reference (~17 ms), not the ~2x the plan
  extrapolated — root cause documented below.
- **Demo assets** (`aegis-edge/demo/`) — 5 Edge Impulse Studio screenshots in
  `demo/screenshots/` (impulse design, spectral DSP, the 85% classifier confusion
  matrix, anomaly explorer, deployment) and 3 video stills in `demo/frames/`.
  Recorded walkthrough videos are kept locally (gitignored).

### Changed
- **Crawl status: C0 -> C4 DONE and verified on-device.** C0 tooling + flash +
  daemon; C1 5-class IMU gesture data (36 samples, 75/25 split); C2 trained impulse
  at **85.0% test accuracy** (ROC 0.98) + K-means anomaly; C3 deployed and streaming
  live predictions on the board; C4 latency captured. The **EON Tuner** run completed
  too — its best candidate landed at ~22% (<< 85%), so the hand-tuned 85% model was
  kept.
- Updated the root `README.md` "Project status" to reflect Crawl C0-C4 done, the
  measured ~87.5 ms headline, and that only optional C5 + Walk/Run remain.

### Notes
- **FFT-16 software-FFT fallback (the optimization lever).** The impulse uses FFT
  length 16, below the EFR32 hardware-FFT minimum of 32, so DSP falls back to a
  *software* FFT (`--debug` reports `HW RFFT failed... size was 16`). Moving to FFT
  length 32/64 would engage the hardware FFT and cut DSP substantially.
- **The 85% ceiling is data-bound, not silicon-bound.** Circle / UpDown / ZigZag
  physically overlap on an accelerometer (per-class F1: Random 1.00, LeftRight 0.96,
  Circle 0.84, ZigZag 0.80, UpDown 0.73); the ROC 0.98 confirms the model, not the
  chip, is the limit. On-device gestures tracked correctly live (Circle 0.84,
  LeftRight 0.97, Random/still 0.996, ZigZag 0.81).

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

[Unreleased]: https://github.com/sairam0424/Thunderboard-Labs/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/sairam0424/Thunderboard-Labs/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/sairam0424/Thunderboard-Labs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sairam0424/Thunderboard-Labs/releases/tag/v0.1.0
