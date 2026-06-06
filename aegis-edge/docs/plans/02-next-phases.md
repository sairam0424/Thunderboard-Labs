# Aegis Edge — Next Phases (Walk + Run)

> The phased flagship is **Crawl -> Walk -> Run**. Crawl (IMU gesture) is the
> scaffolded, in-progress phase — see [`01-implementation-plan.md`](./01-implementation-plan.md).
> This document details the two phases that come **after** Crawl.
>
> **Sequencing rule:** Walk is intentionally *outlined, not finalized*, until Crawl's
> milestone **C4** produces the **real measured 38.4 MHz inference latency**. Why:
> Walk's whole risk is audio latency on a no-NPU M4F, and every published figure
> (~400-470 ms) is an *extrapolation*. The real Crawl IMU number is the empirical
> anchor we need to size the keyword-spotting model honestly. Detailed Walk planning
> is a deliberate follow-up, not a delay.

---

## Phase overview

| Phase | Sensor | Model | Runs where | Deploy path | Status |
|-------|--------|-------|-----------|-------------|--------|
| **Crawl** | ICM-20648 IMU (3-axis accel) | Spectral + small Keras NN | on-device | Option A (`.bin`) | scaffolded, in progress |
| **Walk** | ICS-43434 mic | MFCC + small int8 CNN | on-device | Option A (`.bin`) | outlined (this doc) |
| **Run** | mic + IMU + env (Si7021/BMP280/CCS811) | multi-model fusion | on-device | **Option B (C++ / SSv5)** | outlined (this doc) |

Each phase is independently demoable — if you stop after Walk you still have two
finished projects. That is the point of the crawl/walk/run structure: bank a win at
every stage, and never be one bug away from nothing to show.

---

## WALK — On-device keyword spotting (audio)

**Goal:** the board recognizes a small spoken vocabulary (e.g. a wake word + 1-2
commands) entirely on-device from the ICS-43434 MEMS microphone, streaming the
recognized keyword over BLE — proving the same EI pipeline works on a fundamentally
harder, higher-rate signal, and producing the **first real audio-latency measurement**
for this board.

**Why it is harder than Crawl (the honest framing):**
- Audio runs at far higher sample rates than the IMU; the **MFCC feature-extraction
  DSP block dominates latency** (not the neural net).
- The EFR32MG12 has **no NPU**, so KWS is the workload most penalized by the missing
  accelerator. Expect it to feel "responsive," not "instant."
- EI's reported RAM figure **excludes the ~16 KB audio capture buffer** — budget it.

### Walk milestones

| # | Milestone | Who | Acceptance test |
|---|-----------|-----|-----------------|
| **W0** | Confirm mic acquisition | [HUMAN] | The board's microphone streams into EI Studio Data acquisition (the EI firmware already exposes the mic sensor); a sample records and plays back. |
| **W1** | Collect keyword dataset | [HUMAN] | >=4 classes: 1 wake word + 1-2 commands + a **`noise`/`unknown`** class; many short (~1 s) utterances per class across voices/distances; held-out test set. |
| **W2** | Train MFCC + small int8 CNN | [HUMAN] clicks Train; [AI] target config | Impulse: ~1 s window, **MFCC** DSP block, small int8 CNN; EON Tuner run. Acceptance: >=90% on the held-out test set with a usable confusion matrix. Keep the keyword set tiny and the model aggressively quantized. |
| **W3** | Deploy back (Option A `.bin`) | [HUMAN] | `edge-impulse-run-impulse --continuous` streams correct keywords on-device. |
| **W4** | **MEASURE real latency** | [HUMAN] runs; [AI] templates | A captured `--continuous` log of MFCC-DSP ms + classify ms at 38.4 MHz, pasted into `benchmark/BENCHMARK.md`. **This replaces the extrapolated ~400-470 ms with a real number** — the headline Walk deliverable. |

### Walk design notes (to finalize after Crawl C4)
- **Latency mitigation:** use EI's **continuous inference with incremental/sliding-window
  MFCC** (`run_classifier_continuous`) so the DSP cost is amortized across overlapping
  frames instead of recomputed per window. The Option-B C++ already uses this pattern.
- **Vocabulary sizing:** the smaller the keyword set, the smaller the model and the
  lower the latency. Start with 1 wake word + 1 command; grow only if latency allows.
- **Deploy path:** still **Option A** (`.bin` drag-drop) — Walk is a single-model
  impulse, so it does not yet need the C++ path. (Run does.)
- **What unlocks final Walk numbers:** Crawl C4's measured IMU DSP latency gives the
  empirical M4F-at-38.4 MHz baseline to extrapolate the MFCC cost from a real datapoint
  rather than an 80 MHz reference.

### Walk risks
| Risk | Sev | Mitigation |
|------|-----|------------|
| Audio latency too high for snappy control | **High** | Tiny vocabulary, aggressive int8, sliding-window MFCC; set expectations to "responsive"; if a product needs instant KWS, that is the signal to move to an xG24. |
| ~16 KB hidden audio buffer overruns RAM budget | Medium | Budget it on top of EI's RAM estimate; verify free RAM on-device, not from the Studio figure. |
| Mic data quality / background noise | Medium | Robust `noise`/`unknown` class, multiple voices/distances, held-out test set. |

---

## RUN — Multi-sensor fusion "Smart Guardian" (the flagship)

> A full milestone-by-milestone breakdown (R0-R4, architecture, fusion state machine,
> risk register) now lives in [`04-run-detailed.md`](./04-run-detailed.md). The summary
> below remains as the at-a-glance outline.

**Goal:** a single battery-capable node that watches a space across **three sensing
domains** — motion (IMU), sound (mic), environment (Si7021 RH/T, BMP280 pressure,
CCS811 air quality) — runs small on-device models against each, **fuses** their outputs
into one contextual state (e.g. `quiet` / `activity` / `spoken-command` / `environmental-alert`),
and surfaces it on the 4x RGB LEDs + over BLE. This is the originally-pitched Smart
Guardian and the portfolio centerpiece.

**Why Run forces Option B (custom C++ firmware):**
- The no-code `.bin` deploy path runs **one** stock impulse on the sensors the EI
  firmware knows about. Fusing multiple models + multiple sensors + custom BLE/LED
  behavior is **not possible** from that path.
- Run therefore builds on the **`firmware-option-b/src/` C++ integration** (already
  scaffolded: `run_classifier_continuous()`, gesture->RGB-LED mapping, CCCD-gated GATT
  notify). This is exactly why that code was written early.
- Engineering lesson: **orchestration under a latency budget** — the KWS path is the
  slow one, so schedule the cheap IMU + environmental reads around it and duty-cycle the
  audio inference, using LEDs/BLE for instant local feedback so the *system* feels
  responsive even when one model is not.

### Run milestones

| # | Milestone | Who | Acceptance test |
|---|-----------|-----|-----------------|
| **R0** | Stand up the Option-B C++ build | [HUMAN] builds; [AI] code ready | Fork `firmware-silabs-thunderboard-sense-2` (GSDK 4.0.2 + GNU Arm 10-2020-q4), drop in the Crawl gesture model as a C++ library, build + flash. Acceptance: the gesture model runs from the **custom C++ firmware** (not the stock `.bin`) with the same accuracy. |
| **R1** | Add the second model (KWS) | [HUMAN] | Both the gesture and KWS models loaded and inferring on-device, time-sliced. Acceptance: both classify correctly when exercised in turn. |
| **R2** | Add environmental context | [HUMAN] | The custom sensor loop reads Si7021/BMP280/CCS811 and feeds thresholds/features. Acceptance: an environmental excursion (e.g. breathe on it / cover the light) changes a context input. **(USB power — CR2032 disables CCS811.)** |
| **R3** | Fusion + state machine | [HUMAN]; [AI] design | A small fusion layer maps {motion, sound, environment} -> one guardian state surfaced on RGB LEDs + a custom BLE notify. Acceptance: each state is reachable and shown live. |
| **R4** | Power + latency validation | [HUMAN] runs; [AI] templates | Use the on-board AEM (external WSTK) to profile current; capture the multi-model loop latency. Acceptance: a battery-budget write-up + a measured fused-loop latency, both honest about the no-NPU/coin-cell constraints. |

### Run design notes
- **LED feedback requires USB power** (CR2032 disables the RGB LEDs *and* the CCS811) —
  plan the demo on USB.
- **Custom GATT:** Run uses its own service/characteristics (the `aegis_inference`
  code's `gattdb_*` handles), not the stock EI UUIDs — the Web Bluetooth `dashboard/`
  can be pointed at the custom UUIDs for the demo.
- **Scheduling:** treat the KWS path as the latency budget owner; run IMU + env work in
  its idle gaps; duty-cycle audio.

### Run risks
| Risk | Sev | Mitigation |
|------|-----|------------|
| GSDK/toolchain version drift on the Option-B build | **High** | Pin GSDK 4.0.2 + GNU Arm 10-2020-q4-major exactly; avoid the deprecated `tflite-micro-efr32-examples` repo; the board is NRND so import steps skew toward xG24 — double-check the target is BRD4166A. |
| RAM pressure from 2 models + sensor buffers + BLE stack | **High** | Static tensor-arena allocation, tiny models, verify free RAM on-device; the gesture model is small but KWS + buffers compete. |
| Fusion-loop latency under the multi-model load | Medium | Duty-cycle audio; schedule cheap reads around the slow KWS path; measure (R4). |
| Coin-cell can't power the full demo | Medium | Demo on USB; use the AEM only to characterize a duty-cycled low-power variant. |

---

## What stays the same across all phases

- **On-device inference** — the board does sensor-read -> DSP -> NN locally; BLE carries
  *results only*; the phone/dashboard never infers.
- **Honesty about measured vs. extrapolated** — every latency figure is labeled; the
  benchmark deliverables exist to replace extrapolations with real numbers.
- **Git Flow with kept branches** — each phase/milestone lands on its own `feat/*`
  branch, merged `--no-ff`, and **the branch is kept** (see the repo `CONTRIBUTING.md`).
- **The hard boundary** — software is buildable by the AI assistant; data collection,
  training, flashing, and the physical demo are the human's on-hardware work.

---

## Immediate next action

Crawl is scaffolded and ready. The next concrete step is **the human executing Crawl
milestones C0 -> C5 on the board**, following the `runbooks/`. When **C4** yields the
measured 38.4 MHz latency, that number finalizes the **provisional** detailed Walk plan,
[`03-walk-detailed.md`](./03-walk-detailed.md) — which is written and ready to start, with
its latency targets explicitly flagged as extrapolations to be replaced by the C4/W4
measurements.
