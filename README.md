# Thunderboard Labs

A monorepo for exploring and building on the **Silicon Labs Thunderboard Sense 2**
(board `BRD4166A`, bare `EFR32MG12P332F1024GL125` SoC — Cortex-M4F @ 38.4 MHz,
256 KB RAM, 1 MB flash, **no NPU**). It holds two things: a verified hardware
**reference doc set**, and **Aegis Edge** — an on-device TinyML build that runs
machine-learning inference on the board itself, no cloud.

> **New here?** If you have the board in hand and want to build, jump straight to
> [`aegis-edge/START-HERE.md`](./aegis-edge/START-HERE.md).

## The two pillars

| | What | Start here |
|---|---|---|
| 📚 **Reference** | Fact-checked, deep-audited hardware docs for the board | [`docs/thunderboard-sense-2/README.md`](./docs/thunderboard-sense-2/README.md) |
| 🛠️ **Build** | Aegis Edge — phased on-device TinyML (Crawl -> Walk -> Run) | [`aegis-edge/START-HERE.md`](./aegis-edge/START-HERE.md) |

## What is Aegis Edge?

A phased build that proves real machine learning runs **entirely on the EFR32MG12** —
no NPU, no cloud, results streamed over Bluetooth:

- **Crawl** — on-device IMU **gesture** recognition (the full Edge Impulse -> MG12 -> BLE pipeline)
- **Walk** — on-device **keyword spotting** from the microphone
- **Run** — the **"Smart Guardian"**: fuse motion + sound + environment into one state

Each phase is independently demoable. The honest constraint throughout: on this board,
**latency is the wall, not memory** — and every latency figure is labeled *measured* vs.
*extrapolated*.

## Repository layout

```
Thunderboard-Labs/
├── README.md            <- you are here (project hub)
├── CONTRIBUTING.md      <- branching model (Git Flow, PR-based, kept branches)
├── CHANGELOG.md         <- release history (Keep a Changelog)
├── .github/workflows/   <- CI (shellcheck, pytest, markdown link check)
├── docs/                <- the reference documentation
│   └── thunderboard-sense-2/
│       ├── README.md        (10-chapter hub: SoC, sensors, pinout, tooling, ...)
│       └── aegis-edge/      (the conceptual ML project guide)
└── aegis-edge/          <- the BUILDABLE project
    ├── START-HERE.md       (condensed C0->C5 checklist for bench work)
    ├── docs/plans/         (01 Crawl · 02 overview · 03 Walk · 04 Run · STATUS)
    ├── runbooks/           (C0-C5 + FLASHING: turn-key milestone instructions)
    ├── scripts/            (check-tooling.sh, serial-bench-parse.py + tests)
    ├── edge-impulse/       (canonical impulse config)
    ├── firmware-option-b/  (C++ run_classifier integration -> the Run phase)
    ├── dashboard/          (Web Bluetooth dashboard — read results in Chrome)
    ├── benchmark/          (latency benchmark template)
    └── demo/               (offline demo video shot-list)
```

## Project status

- ✅ **Reference docs** — 10 chapters; board identity + specs deep-audited against primary datasheets (and re-verified against physical-board photos).
- ✅ **Aegis Edge — software + planning** — workspace, runbooks, Option-B C++ firmware, Web Bluetooth dashboard, CI + tests, and the **complete** 4-part plan set (Crawl / Walk / Run) are all in place.
- ⏳ **Crawl execution (on hardware)** — milestones C0 -> C5: install tooling -> collect gestures -> train -> deploy -> **benchmark** -> BLE demo. This is the current critical path.
- 📋 **Walk / Run** — fully planned but **provisional**: their latency/RAM targets are finalized once Crawl **C4** measures the real on-device 38.4 MHz number.

The split is deliberate: everything reproducible from verified sources is built; the
remaining work is the physical, on-board steps only a person at the bench can do
(perform gestures, click *Train*, flash, point a phone).

## Contributing / branching

Git Flow-style, with two house rules: **features merge via PR** (not local merge), and
**feature branches are kept** (not deleted) after merge. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) before starting work.

## Hardware note

The board is **NRND** (Silicon Labs points new designs to the EFR32xG24 Dev Kit), but is
fully usable and well-tooled. The newer xG24 adds the ML hardware accelerator (MVP) this
Series-1 part lacks — relevant only if you need low-latency keyword spotting as a
product. Full details in the [reference docs](./docs/thunderboard-sense-2/README.md).
