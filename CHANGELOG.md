# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Aegis Edge **Walk** phase — on-device keyword spotting (ICS-43434 mic); detailed
  after Crawl yields the real on-device 38.4 MHz latency baseline.
- Aegis Edge **Run** phase — multi-sensor fusion "Smart Guardian" (Option B, C++).

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

[Unreleased]: https://example.invalid/compare/v0.1.0...HEAD
[0.1.0]: https://example.invalid/releases/tag/v0.1.0
