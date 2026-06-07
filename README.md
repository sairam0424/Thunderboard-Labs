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
*extrapolated*. Crawl's headline number is now **measured**: ~87.5 ms total per inference
on-device (~86 ms of it DSP), the real 38.4 MHz figure the later phases build on.

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
- ✅ **Crawl execution (on hardware)** — milestones **C0 -> C4 are DONE and verified on the physical board**: tooling + flash + daemon (C0), 5-class IMU gesture data (C1), trained impulse at **85% test accuracy** + K-means anomaly (C2), deployed and streaming live predictions on-device (C3), and **latency captured** (C4). The headline number is in: **~87.5 ms total per inference** (~86 ms DSP) at 38.4 MHz — see [`aegis-edge/benchmark/BENCHMARK.md`](./aegis-edge/benchmark/BENCHMARK.md). Demo assets (screenshots + video stills) now exist under [`aegis-edge/demo/`](./aegis-edge/demo/).
- 📋 **Crawl C5 + Walk / Run** — what remains: the optional **C5** offline BLE phone demo (polish — on-device inference is already proven), then the fully-planned **Walk / Run** phases, whose latency/RAM targets are now anchored to the real C4 measurement.

The split is deliberate: everything reproducible from verified sources is built, and the
on-board Crawl steps that needed a person at the bench (perform gestures, click *Train*,
flash, read live predictions, capture latency) are **done**. What's left is optional Crawl
polish (C5) and the later Walk / Run phases.

## Contributing / branching

Git Flow-style, with two house rules: **features merge via PR** (not local merge), and
**feature branches are kept** (not deleted) after merge. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) before starting work.

## Hardware note

The board is **NRND** (Silicon Labs points new designs to the EFR32xG24 Dev Kit), but is
fully usable and well-tooled. The newer xG24 adds the ML hardware accelerator (MVP) this
Series-1 part lacks — relevant only if you need low-latency keyword spotting as a
product. Full details in the [reference docs](./docs/thunderboard-sense-2/README.md).
