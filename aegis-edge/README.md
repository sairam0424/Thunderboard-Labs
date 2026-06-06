# Aegis Edge — On-Device TinyML on the Thunderboard Sense 2

Aegis Edge is a phased "Smart Guardian" built entirely on a Silicon Labs
Thunderboard Sense 2 (EFR32MG12) — a Cortex-M4F with **no NPU**. The thesis is
that meaningful on-device intelligence is a **latency** problem, not a memory
problem: a 256KB-RAM / 1MB-flash MCU at ~38.4MHz can run real ML inference fast
enough to be useful, and we prove it by measuring the actual numbers on the
metal. The program walks three phases — **Crawl** (IMU gesture recognition),
**Walk** (keyword spotting), **Run** (multi-sensor fusion) — each one fully
offline, no cloud, no NPU acceleration.

## Status

| Phase | Capability | Status |
|-------|-----------|--------|
| **Crawl** | On-device IMU gesture recognizer (circle / zigzag / updown / leftright / none), Edge Impulse -> EFR32MG12, results streamed over BLE | Scaffolded / in-progress |
| **Walk** | Keyword spotting (audio) on the same board | Planned |
| **Run** | Multi-sensor fusion (IMU + audio + environmental) | Planned |

## Hardware

- **Board:** Silicon Labs Thunderboard Sense 2, BRD4166A — bare
  EFR32MG12P332F1024GL125 SoC, Cortex-M4F @38.4MHz (40MHz max), 256KB RAM,
  1MB flash, **NO NPU**.
- **IMU:** ICM-20648 (6-axis). The proven Crawl recipe uses **3 accelerometer
  axes only** (accX/accY/accZ in m/s^2), not the 6-axis path.
- **USB:** mass-storage drive enumerates as **TB004** (drag-and-drop flashing).
- **Lifecycle:** NRND. Replacement is the xG24-DK2601B (out of scope for Crawl).
- **Power note:** RGB LEDs and the CCS811 are dead on CR2032 — run all demos on
  USB power.

## Reproduce from scratch

Follow the runbooks in `runbooks/` in order. Steps are tagged **[HUMAN]**
(physical / browser actions only you can do on real hardware) or
**[AI-SCAFFOLDED]** (files generated into this repo that you run/follow).

1. **C0 — Environment & tooling** (`runbooks/C0-environment.md`): Node 22 LTS,
   `edge-impulse-cli`, OS prerequisites, serial sanity checks.
2. **C1 — Flash EI firmware** (`runbooks/C1-flash-firmware.md`): drag the
   prebuilt `silabs-thunderboard-sense2.bin` onto TB004.
3. **C2 — Data acquisition** (`runbooks/C2-data-acquisition.md`): capture gesture
   samples in Studio (62.5 Hz, 10s windows, 5 classes).
4. **C3 — Impulse design & training** (`runbooks/C3-impulse-training.md`):
   Spectral Analysis DSP + Keras NN + K-means anomaly; mirror
   `edge-impulse/PROJECT-CONFIG.md`.
5. **C4 — Deploy & on-device verify** (`runbooks/C4-deploy-verify.md`): build the
   board `.bin`, flash, run `edge-impulse-run-impulse --continuous`, capture the
   headline latency benchmark.
6. **C5 — BLE streaming demo** (`runbooks/C5-ble-demo.md`): stream results over
   the verified GATT UUIDs to Simplicity Connect, phone in airplane mode.

> An **Option B** portfolio/fusion path (export the impulse as a C++ library and
> call `run_classifier(...)` inside a Simplicity Studio 5 / Gecko SDK project)
> is documented in `runbooks/C5-ble-demo.md` / the deploy runbook as an
> alternative to the prebuilt-firmware route.

## AI-scaffolded vs you-do-on-hardware

This repo is the **buildable project**: the AI scaffolds the configuration
specs, runbooks, scripts, and acceptance criteria. **You** perform every
physical and browser action — plugging in the board, dragging firmware onto
TB004, recording gestures in the Studio UI, clicking Build/Deploy, flashing, and
pairing the BLE reader app. Anywhere the research could not pin a value to a
primary source it is marked **confirm-on-device** — treat those as hypotheses to
validate on your hardware, not facts.

## Documentation

The conceptual guide lives at
[`../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md`](../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)
and the hardware docs at
[`../docs/thunderboard-sense-2/`](../docs/thunderboard-sense-2/). **This
`aegis-edge/` folder is the buildable project.**

## Repo layout

```
aegis-edge/
├── README.md                     # this file
├── .gitignore
├── edge-impulse/
│   └── PROJECT-CONFIG.md          # canonical impulse spec to mirror in Studio
│                                  # (drop the exported EI project .zip here)
├── runbooks/
│   ├── C0-environment.md          # tooling + serial sanity
│   ├── C1-flash-firmware.md       # prebuilt .bin -> TB004
│   ├── C2-data-acquisition.md     # gesture capture in Studio
│   ├── C3-impulse-training.md     # DSP + NN + anomaly
│   ├── C4-deploy-verify.md        # build, flash, measure latency
│   └── C5-ble-demo.md             # BLE streaming + Option B
└── scripts/                       # helper scripts (serial, flashing aids)
```
