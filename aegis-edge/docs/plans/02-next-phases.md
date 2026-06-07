# Aegis Edge — Next Phases (Walk + Run)

> The phased flagship is **Crawl -> Walk -> Run**. Crawl (IMU gesture) is **DONE
> (C0-C4 verified on-device)** — see [`01-implementation-plan.md`](./01-implementation-plan.md).
> This document details the two phases that come **after** Crawl.
>
> **Sequencing rule (now satisfied for the anchor):** Walk was intentionally
> *outlined, not finalized*, until Crawl's milestone **C4** produced the **real
> measured 38.4 MHz inference latency**. C4 is now done: the measured Crawl total is
> **~87.5 ms** (~86 ms DSP + ~1-2 ms classify), so the empirical anchor exists.
> Critically, this measured DSP cost is **~5x** the Edge Impulse 80 MHz reference,
> **not** the ~2x the earlier figures extrapolated — so every audio (KWS) estimate
> below must be revised UP and then measured. Detailed Walk planning was a deliberate
> follow-up; the anchor it waited on now exists.

---

## Phase overview

| Phase | Sensor | Model | Runs where | Deploy path | Status |
|-------|--------|-------|-----------|-------------|--------|
| **Crawl** | ICM-20648 IMU (3-axis accel) | Spectral + small Keras NN | on-device | Option A (`.bin`) | **DONE (C0-C4 verified on-device, ~87.5 ms measured)** — only optional C5 remains |
| **Walk** | ICS-43434 mic | MFCC + small int8 CNN | on-device | Option A (`.bin`) | outlined (this doc) — now sized against the **real C4 anchor (~86 ms DSP @38.4 MHz)** |
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
- **Crawl's C4 raised the bar on the estimate.** The measured Crawl DSP came in at
  **~86 ms — about 5x the EI 80 MHz reference, not ~2x.** The old ~400-470 ms KWS
  figures assumed ~2x scaling, so they are now optimistic; treat the working KWS
  estimate as **revised UP** until W4 measures it.
- **Engage the hardware FFT.** Crawl's impulse used **FFT length 16**, which is below
  the EFR32 hardware-FFT minimum of 32, forcing a **software FFT** (the dominant slow
  path — see `BENCHMARK.md`). Walk's MFCC/MFE block should use an **FFT size >=32** so
  the hardware FFT engages and the DSP cost stays in budget.

### Walk milestones

| # | Milestone | Who | Acceptance test |
|---|-----------|-----|-----------------|
| **W0** | Confirm mic acquisition | [HUMAN] | The board's microphone streams into EI Studio Data acquisition (the EI firmware already exposes the mic sensor); a sample records and plays back. |
| **W1** | Collect keyword dataset | [HUMAN] | >=4 classes: 1 wake word + 1-2 commands + a **`noise`/`unknown`** class; many short (~1 s) utterances per class across voices/distances; held-out test set. |
| **W2** | Train MFCC + small int8 CNN | [HUMAN] clicks Train; [AI] target config | Impulse: ~1 s window, **MFCC** DSP block, small int8 CNN; EON Tuner run. Acceptance: >=90% on the held-out test set with a usable confusion matrix. Keep the keyword set tiny and the model aggressively quantized. |
| **W3** | Deploy back (Option A `.bin`) | [HUMAN] | `edge-impulse-run-impulse --continuous` streams correct keywords on-device. |
| **W4** | **MEASURE real latency** | [HUMAN] runs; [AI] templates | A captured `--continuous` log of MFCC-DSP ms + classify ms at 38.4 MHz, pasted into `benchmark/BENCHMARK.md`. **This replaces the extrapolated KWS number with a real one** — the headline Walk deliverable. Note: Crawl's C4 showed DSP scales ~5x (not ~2x) off the EI reference, so the prior ~400-470 ms figure is likely an underestimate — measure, don't assume. |

### Walk design notes (anchored to the measured Crawl C4)
- **FFT size >=32 (the headline lesson):** Crawl's spectral block used FFT length 16,
  below the EFR32 hardware-FFT minimum of 32, so the DSP fell back to a **software FFT**
  and ate ~86 ms. Walk's MFCC/MFE block should pick an **FFT size of 32 or 64** so the
  hardware FFT engages — the single biggest latency lever this board exposes.
- **Latency mitigation:** use EI's **continuous inference with incremental/sliding-window
  MFCC** (`run_classifier_continuous`) so the DSP cost is amortized across overlapping
  frames instead of recomputed per window. The Option-B C++ already uses this pattern.
- **Vocabulary sizing:** the smaller the keyword set, the smaller the model and the
  lower the latency. Start with 1 wake word + 1 command; grow only if latency allows.
- **Deploy path:** still **Option A** (`.bin` drag-drop) — Walk is a single-model
  impulse, so it does not yet need the C++ path. (Run does.)
- **The real anchor (no longer pending):** Crawl C4 measured **~87.5 ms total / ~86 ms
  DSP** at 38.4 MHz. That is the empirical M4F baseline — and it showed DSP scales ~5x
  off the EI 80 MHz reference, so size the MFCC estimate UP from that measured anchor,
  then let W4 replace the estimate entirely.

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

Crawl is **DONE**: C0-C4 are complete and verified on the physical board (model streaming
live predictions on-device; latency measured at **~87.5 ms**, see
[`01-implementation-plan.md`](./01-implementation-plan.md) and `benchmark/BENCHMARK.md`).
The EON Tuner run is also done — its best candidate (~22%) lost badly to the hand-tuned
85% model, so the 85% model was kept. Only **C5** (the offline BLE phone demo) remains, and
it is **optional polish** — the on-device inference is already proven.

The next substantive phase is therefore **Walk**: its latency reasoning is now anchored to
the **real** C4 number (~86 ms DSP @38.4 MHz) rather than an 80 MHz extrapolation. The
detailed Walk plan, [`03-walk-detailed.md`](./03-walk-detailed.md), is written and ready to
start — with the C4 anchor and the FFT-16 -> FFT-32/64 hardware-FFT lesson folded in.
