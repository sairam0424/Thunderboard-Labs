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

1. **C0 — Setup, flash & pair** ([`runbooks/C0-setup.md`](./runbooks/C0-setup.md)): Node + `edge-impulse-cli`,
   flash the prebuilt `silabs-thunderboard-sense2.bin` onto TB004, pair the board to your EI project.
2. **C1 — Data collection** ([`runbooks/C1-data-collection.md`](./runbooks/C1-data-collection.md)): capture
   gesture samples in Studio (62.5 Hz, 10 s windows, 5 classes incl. a negative class).
3. **C2 — Design & train the impulse** ([`runbooks/C2-train.md`](./runbooks/C2-train.md)):
   Spectral Analysis DSP + Keras NN + K-means anomaly; mirror `edge-impulse/PROJECT-CONFIG.md`.
4. **C3 — Deploy** ([`runbooks/C3-deploy.md`](./runbooks/C3-deploy.md)): build the board `.bin`
   (target "Thunderboard Sense 2", int8, EON Compiler), flash to TB004.
5. **C4 — Verify & benchmark** ([`runbooks/C4-verify-benchmark.md`](./runbooks/C4-verify-benchmark.md)):
   run `edge-impulse-run-impulse --continuous`, capture the headline on-device latency.
6. **C5 — Offline BLE demo** ([`runbooks/C5-ble-demo.md`](./runbooks/C5-ble-demo.md)): stream results over
   the verified GATT UUIDs to Simplicity Connect (or the `dashboard/`), phone in airplane mode.

> Flashing trouble? See [`runbooks/FLASHING.md`](./runbooks/FLASHING.md). Hit any other snag?
> The [`field-guide/troubleshooting.md`](./field-guide/troubleshooting.md) catalogs every error from a real bring-up.

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

- **Start here (bench-ready):** [`START-HERE.md`](./START-HERE.md) — one-page C0->C5 checklist.
- **Plans:** [`docs/plans/`](./docs/plans/) — Crawl plan, next-phases (Walk/Run), status.
- **Field guide (as-built):** [`field-guide/`](./field-guide/README.md) — the *lived* record of a
  real bring-up: actual values, observed outputs, deviations from plan, and a full
  [`troubleshooting.md`](./field-guide/troubleshooting.md) error catalog (dongle, flashing,
  daemon, auth, etc.).
- **Conceptual guide:** [`../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md`](../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)
  and the hardware docs at [`../docs/thunderboard-sense-2/`](../docs/thunderboard-sense-2/).

> **runbooks/** = prescriptive (what *should* happen). **field-guide/** = as-built (what
> *actually* happened, with fixes). Read the runbook for a step, keep the field guide open
> for reality + troubleshooting.

## Repo layout

```
aegis-edge/
├── README.md                     # this file
├── START-HERE.md                 # one-page bench-ready C0->C5 checklist
├── .gitignore
├── Makefile                      # make check / test / lint / serve-dashboard
├── docs/plans/                   # Crawl plan, next-phases (Walk/Run), STATUS
├── edge-impulse/
│   └── PROJECT-CONFIG.md          # canonical impulse spec (drop EI export .zip here)
├── runbooks/                     # prescriptive step-by-step
│   ├── C0-setup.md                # tooling + flash EI firmware + pair daemon
│   ├── C1-data-collection.md      # gesture capture in Studio
│   ├── C2-train.md                # DSP + NN + anomaly
│   ├── C3-deploy.md               # build + flash the trained .bin
│   ├── C4-verify-benchmark.md     # run-impulse --continuous + latency
│   ├── C5-ble-demo.md             # offline BLE streaming demo
│   └── FLASHING.md                # 3 flash paths + FAIL.TXT recovery
├── field-guide/                  # AS-BUILT: real values, observed outputs, errors+fixes
│   ├── README.md
│   ├── 00-session-walkthrough.md  (+ -part2)
│   ├── 01-results-and-readings.md # what you should SEE at each checkpoint
│   └── troubleshooting.md         # the error catalog
├── firmware-option-b/            # C++ run_classifier integration (Run phase)
├── dashboard/                    # Web Bluetooth dashboard (read results in Chrome)
├── benchmark/                    # latency benchmark template
├── demo/                         # offline demo video shot-list
└── scripts/                      # check-tooling.sh, serial-bench-parse.py + tests
```
