# Thunderboard Labs

A monorepo for exploring and building on the **Silicon Labs Thunderboard Sense 2**
(board `BRD4166A`, bare `EFR32MG12P332F1024GL125` SoC — Cortex-M4F @ 38.4 MHz,
256 KB RAM, 1 MB flash, **no NPU**). It holds two things: a verified hardware
**reference doc set**, and **Aegis Edge**, an on-device TinyML build that runs on
the board itself.

## Repository layout

```
Thunderboard-Labs/
├── README.md            <- you are here (project hub)
├── CONTRIBUTING.md      <- branching model + commit conventions
├── CHANGELOG.md         <- release history (Keep a Changelog)
├── docs/                <- the reference documentation
│   └── thunderboard-sense-2/
│       ├── README.md        (10-chapter hub: SoC, sensors, pinout, tooling, ...)
│       └── aegis-edge/      (the conceptual ML project guide)
└── aegis-edge/          <- the BUILDABLE project (Crawl phase scaffolded)
    ├── README.md
    ├── runbooks/            (C0-C5 + FLASHING: turn-key milestone instructions)
    ├── scripts/             (check-tooling.sh, serial-bench-parse.py)
    ├── edge-impulse/        (canonical impulse config)
    ├── firmware-option-b/   (C++ run_classifier integration for the Run phase)
    ├── benchmark/           (latency benchmark template)
    └── demo/                (offline demo video shot-list)
```

## The two pillars

| | What | Start here |
|---|---|---|
| 📚 **Reference** | Fact-checked, deep-audited hardware docs for the board | [`docs/thunderboard-sense-2/README.md`](./docs/thunderboard-sense-2/README.md) |
| 🛠️ **Build** | Aegis Edge — phased on-device TinyML (Crawl → Walk → Run) | [`aegis-edge/README.md`](./aegis-edge/README.md) |

## Project status

- ✅ **Reference docs** — 10 chapters, board identity + specs deep-audited against primary datasheets.
- ✅ **Aegis Edge — Crawl scaffold** — workspace, runbooks, scripts, and templates in place.
- ⏳ **Crawl execution** — on-hardware milestones C0→C5 (install tooling → collect gestures → train → deploy → benchmark → BLE demo).
- 📋 **Walk / Run** — outlined; detailed once Crawl ships and yields the real on-device latency number.

## Contributing / branching

This repo follows a Git Flow-style model (`main` / `develop` / `feat/*`). See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) before starting work.

## Hardware note

The board is **NRND** (Silicon Labs points new designs to the EFR32xG24 Dev Kit),
but is fully usable and well-tooled. Full details in the reference docs.
