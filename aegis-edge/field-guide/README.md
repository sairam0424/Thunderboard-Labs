# Aegis Edge -- Field Guide (As-Built Record)

> The lived, real record of bringing up a Silicon Labs Thunderboard Sense 2 and
> building the Aegis Edge "Crawl" on-device IMU gesture model with Edge Impulse
> on macOS -- the exact values used, the outputs observed, and every error hit
> plus its fix.

## What a Field Guide Is (and Is Not)

There are two kinds of documentation in this project, and they serve different
purposes:

| | Runbooks (`../runbooks/C0..C5`) | Field Guide (this folder) |
|---|---|---|
| **Voice** | Prescriptive -- what *should* happen | As-built -- what *actually* happened |
| **Values** | Recommended / canonical | The *real* values used this session |
| **Errors** | Anticipated, generic | The *exact* errors hit + the fixes that worked |
| **When to read** | Before you start a step (the plan) | When the plan and reality diverge (the truth) |
| **Audience** | Anyone running the procedure fresh | This author's future self + anyone reproducing |

Read the runbooks to learn the procedure. Read the field guide to see what the
procedure looked like on a real MacBook Pro with a real board, including the
deviations and the dead ends. A wrong-but-confident doc is worse than none, so
everything here is labelled **OBSERVED** (really happened this session) or
**EXPECTED** (from the runbooks, not yet seen).

## Honest Completion State

This is a snapshot, not a victory lap. The "Crawl" milestone is partially
complete:

| Milestone | What it covers | Status |
|---|---|---|
| **C0** | Tooling + firmware flash + daemon handshake | DONE (OBSERVED) |
| **C1** | 5-class IMU data collection | DONE (OBSERVED) |
| **C2** | Impulse trained (85%) + anomaly block | DONE (OBSERVED) |
| **EON Tuner** | Attempt to beat 85% | DONE -- kept the 85% config (OBSERVED) |
| **C3** | Deploy `.bin` to the board | IN PROGRESS -- flashed, but live `--continuous` verify was interrupted by a serial-port issue and is **not yet confirmed streaming predictions** |
| **C4** | On-device latency capture (real 38.4 MHz) | NOT done (EXPECTED only) |
| **C5** | Offline BLE demo | NOT done (EXPECTED only) |

If you are continuing this work, your starting point is **C3-verify** (re-run
`edge-impulse-run-impulse --continuous` after a board RESET -- see
[troubleshooting.md](troubleshooting.md)), then C4 and C5.

## As-Built Configuration (at a glance)

Everything below is **OBSERVED** -- the literal values used this session.

| Area | As-built value |
|---|---|
| **Host** | macOS (zsh), MacBook Pro |
| **Node** | v24.16.0 (plan recommended Node 22 LTS; v24 worked fine -- see Deviations) |
| **npm** | 11.13.0 |
| **Python** | 3.14.4 |
| **edge-impulse-cli** | v1.39.1 |
| **Board** | Thunderboard Sense 2, BRD4166A, bare EFR32MG12P332F1024GL125 SoC |
| **MCU** | Cortex-M4F @ **38.4 MHz**, 256 KB RAM, 1 MB flash, **no NPU** |
| **Bootloader drive** | `TB004` -> mounts at `/Volumes/TB004` |
| **Debug chip** | SEGGER J-Link OB (triggers a macOS "Allow accessory" prompt) |
| **Serial port** | `/dev/cu.usbmodem0004401586811` (and `/dev/tty.usbmodem...`) |
| **EI project** | ID `1021910`, `aegis-edge-crawl`, Free Personal tier |
| **EI reference target** | Cortex-M4F **80 MHz** (estimates only -- NOT the real 38.4 MHz board) |
| **Device in Studio** | `tb-sense2-01`, type `SILABS_TB_SENSE2`, addr `08:6B:D7:FE:16:6D` |
| **Firmware** | `silabs-thunderboard-sense2.bin` (~457 KB) |
| **Labels (5)** | `Circle`, `LeftRight`, `UpDown`, `ZigZag` (gestures) + `Random` (negative/idle) |
| **Sensor** | Built-in accelerometer, 3-axis (accX/accY/accZ) -- NOT 6-axis |
| **Sampling** | 10000 ms length, 62.5 Hz |
| **Dataset** | 36 samples (~6 min): 8x10s each gesture + 4x10s Random |
| **Train/Test split** | 75% / 25% (27 train / 9 test) |
| **Impulse window** | 2000 ms window, 80 ms increase, 62.5 Hz |
| **DSP block** | Spectral Analysis -- low-pass, Cutoff 3, Order 6, FFT length 16, Take-log + Overlap-FFT -> **18 features** |
| **NN block** | Classification (Keras): Input(18) -> Dense(20) -> Dense(10) -> Output(5) |
| **Training** | 40 cycles, LR 0.0005, Quantized **int8** (Profile int8 checked) |
| **Anomaly block** | K-means, **5 components** (default), axes via "Select suggested axes" |
| **Validation result** | **85.0%** accuracy, loss 0.37, ROC 0.98, weighted P/R/F1 = 0.85 |
| **On-device estimate** | ~17 ms total / ~2.9 K RAM / ~49 K flash at the **80 MHz reference** (classifier alone ~1 ms) |
| **Deployment target** | "Thunderboard Sense 2" (NOT the default "C++ library"), EON Compiler, Quantized int8 |

Secrets note: the Edge Impulse API key is referenced throughout as the
placeholder `ei_YOUR_KEY_HERE`. Real keys are secrets and must never be written
to any file or committed.

## Deviations From the Plan

Where reality diverged from the runbooks. None of these were blockers, but they
are worth knowing about so you do not think you mis-followed the procedure.

| Item | Plan said | As-built reality |
|---|---|---|
| **Node version** | Node 22 LTS | **Node v24.16.0** -- worked fine end-to-end |
| **DSP feature count** | ~33 features (estimated at a different FFT length) | **18 features** (FFT length 16, the real config) |
| **K-means components** | 32 | **5 components** (the EON default; left as-is) |
| **Negative class name** | `none` | **`Random`** -- same role (idle / not-a-gesture), capitalized to match the other labels (EI labels are case-sensitive) |
| **EI reference target** | (board is 38.4 MHz) | Studio estimates against an **80 MHz** Cortex-M4F reference -- real latency is ~2x and is a C4 measure-on-device item |

## Table of Contents

Field-guide files (this folder):

- [`00-session-walkthrough.md`](00-session-walkthrough.md) -- the narrative,
  step-by-step record of the session from unbox to deploy, in the order it
  actually happened.
- [`01-results-and-readings.md`](01-results-and-readings.md) -- "what you should
  SEE at each checkpoint": per-milestone command/action, the observed result,
  and the acceptance signal. Includes the full per-class F1 table and the EON
  Tuner outcome.
- [`troubleshooting.md`](troubleshooting.md) -- every error hit this session,
  its root cause, and the fix that actually worked (cable/data-path, J-Link
  prompt, the `.bin` permission-denied trap, the OAuth-no-password CLI login,
  EON Tuner search-space error, daemon won't-quit, serial port half-open after
  `pkill`).

Sibling runbooks (the prescriptive plan):

- [`../runbooks/C0-setup.md`](../runbooks/C0-setup.md) -- tooling, flash, daemon
- [`../runbooks/C1-data-collection.md`](../runbooks/C1-data-collection.md) -- data acquisition
- [`../runbooks/C2-train.md`](../runbooks/C2-train.md) -- impulse + training
- [`../runbooks/C3-deploy.md`](../runbooks/C3-deploy.md) -- build + flash the model
- [`../runbooks/C4-verify-benchmark.md`](../runbooks/C4-verify-benchmark.md) -- on-device latency
- [`../runbooks/C5-ble-demo.md`](../runbooks/C5-ble-demo.md) -- offline BLE demo
- [`../runbooks/FLASHING.md`](../runbooks/FLASHING.md) -- all flash methods (drag-drop, Simplicity Studio, Commander)
