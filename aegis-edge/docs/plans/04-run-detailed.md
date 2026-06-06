# Aegis Edge — RUN Phase: Detailed Plan (multi-sensor fusion "Smart Guardian")

> **Status: PROVISIONAL — and the most ambitious phase.** Run depends on both prior
> phases shipping (Crawl gesture model + Walk KWS model) AND on the **Option-B C++
> firmware path** (not the no-code `.bin`). Its latency/RAM budgets are anchored to
> estimates until the Crawl C4 and Walk W4 measurements exist. Outline:
> [`02-next-phases.md`](./02-next-phases.md). Prior phase: [`03-walk-detailed.md`](./03-walk-detailed.md).

## What Run is

The **Smart Guardian**: a single, battery-capable node that watches a space across
**three sensing domains at once** and fuses them into one contextual state:

- **Motion** — ICM-20648 IMU (the Crawl gesture model)
- **Sound** — ICS-43434 mic (the Walk keyword-spotting model)
- **Environment** — Si7021 (RH/temp), BMP280 (pressure), CCS811 (air quality / eCO2/TVOC)

A small **fusion layer** maps `{motion, sound, environment}` into a single guardian
state — e.g. `quiet` / `activity` / `spoken-command` / `environmental-alert` — surfaced
on the 4x RGB LEDs and streamed over a custom BLE characteristic. This is the originally
pitched flagship and the portfolio centerpiece: *multi-model on-device ML on a no-NPU
Series-1 MCU*, which almost nobody does.

## Why Run is fundamentally different from Crawl/Walk

| Aspect | Crawl / Walk | Run |
|--------|--------------|-----|
| Models running | one | **two NN models + environmental logic, concurrent** |
| Deploy path | Option A (`.bin` drag-drop) | **Option B (C++ library in Simplicity Studio 5)** |
| Sensor loop | EI stock firmware | **custom acquisition/buffering loop you write** |
| BLE | stock EI GATT | **custom GATT service** (your own UUIDs) |
| Core lesson | the EI pipeline | **orchestration under a latency budget** |

The no-code path runs exactly one impulse on the sensors the EI firmware knows about.
Fusing two models + three extra sensors + custom LED/BLE behavior is **only** possible
via the C++ path — which is precisely why
[`../../firmware-option-b/src/`](../../firmware-option-b/src/) was built early
(`aegis_inference.cpp/.h`: `run_classifier_continuous()`, gesture->RGB-LED map,
CCCD-gated GATT notify). Run turns that scaffold from "foundation" into "running system."

---

## Goal + acceptance (phase-level)

**Goal:** a single firmware image runs the gesture + KWS models and reads the
environmental sensors, fuses them into one guardian state shown live on RGB LEDs + BLE,
entirely on-device, on USB power.

**Phase acceptance:** each guardian state is reachable and shown correctly live; a
power-budget write-up (via the AEM) and a measured fused-loop latency exist, both honest
about the no-NPU and coin-cell constraints.

---

## Milestones R0-R4

Legend: **[HUMAN]** = on-hardware/SSv5 only · **[AI]** = scaffolded artifact (the C++ is
already written; AI can extend it).

### R0 — Stand up the Option-B C++ build  **[HUMAN] builds**, code **[AI]**
- **Do:** fork `edgeimpulse/firmware-silabs-thunderboard-sense-2` (pin **GSDK 4.0.2 +
  GNU Arm 10-2020-q4-major**), export the **Crawl gesture model** from EI as a **C++
  library** (or Simplicity Studio Component, per that repo's convention), drop it in,
  and wire in `aegis_inference.cpp/.h`. Build in Simplicity Studio 5; flash to `TB004`.
- **✅ Acceptance:** the **gesture model runs from the custom C++ firmware** (not the
  stock `.bin`) with the same accuracy as Crawl C3. This isolates "the C++ path works"
  from all later fusion complexity.
- **Key risk:** GSDK/toolchain version drift (R-R1) — pin versions, confirm the build
  target is **BRD4166A** (the NRML import flow skews toward xG24).

### R1 — Add the second model (KWS)  **[HUMAN]**, code **[AI]**
- **Do:** add the Walk KWS model alongside the gesture model. Two EI impulses in one
  firmware means two `run_classifier*` contexts — keep each model's `signal_t` sized to
  **its own** `EI_CLASSIFIER_*` macros; do not share buffers blindly. Time-slice the two
  inferences (don't run both every tick).
- **✅ Acceptance:** both gesture and KWS classify correctly when exercised in turn,
  on-device, from the one firmware.
- **Key risk:** RAM pressure from two tensor arenas + an audio buffer + the BLE stack
  (R-R2) — static allocation, tiny models, verify FREE RAM on-device.

### R2 — Add environmental context  **[HUMAN]**, code **[AI]**
- **Do:** in the custom sensor loop, read Si7021 / BMP280 / CCS811 over I2C at a low rate
  (these are slow signals — seconds, not milliseconds). Expose them as context features /
  thresholds, not a third NN (keep it simple first). **USB power required** — CR2032
  disables the CCS811.
- **✅ Acceptance:** an environmental change (breathe on it for humidity/eCO2; cover the
  light; warm it) measurably moves a context input, visible in the log/BLE.
- **Note:** CCS811 needs warm-up/burn-in before eCO2/TVOC stabilize — gate early readings.

### R3 — Fusion + state machine  **[HUMAN] runs**, design + code **[AI]**
- **Do:** implement a small fusion layer: a state machine that maps the three domains'
  current outputs into one guardian state (e.g. `quiet` -> `activity` on motion ->
  `spoken-command` on a recognized keyword -> `environmental-alert` on an air-quality
  excursion, with sensible priority/hysteresis). Drive RGB LED color per state + notify
  the state over a **custom** BLE characteristic (the `dashboard/` can read it).
- **✅ Acceptance:** every guardian state is reachable on demand and shown live on LEDs +
  BLE/dashboard.
- **Design note:** keep the fusion deterministic and documented (a state table) — the
  "ML taste" here is *orchestration*, not a fourth model.

### R4 — Power + latency validation  **[HUMAN] runs**, template **[AI]**
- **Do:** profile current draw with the on-board **AEM** (needs an external WSTK via the
  Mini Simplicity connector — cannot profile while the USB debugger powers it; see the
  hardware docs). Capture the **fused-loop latency** (total time for one full
  gesture+KWS+env+fusion cycle).
- **✅ Acceptance:** a battery-budget write-up + a measured fused-loop latency in
  `BENCHMARK.md`, honest about no-NPU and coin-cell limits.
- **Reality check:** with KWS as the slow path, the fused loop is dominated by audio MFCC
  DSP — schedule cheap IMU/env reads in its idle gaps and duty-cycle the audio.

---

## Architecture (the orchestration)

```
                 +------------------- custom C++ firmware (Option B) --------------------+
  IMU (accel) -> | gesture model (run_classifier_continuous)  --\                        |
  Mic (16kHz) -> | KWS model (run_classifier_continuous)  ------ >  FUSION state machine  | -> RGB LEDs
  Si7021 ------> | env reads (I2C, low rate) -> thresholds  ---/    (priority+hysteresis) | -> BLE notify (custom GATT)
  BMP280 ------> |                                                                        |       |
  CCS811 ------> |                                                                        |       v
                 +------------------------------------------------------------------------+   dashboard/ (Web BLE)
```

**Scheduling principle (the core lesson):** the KWS MFCC path owns the latency budget.
Run it on its own cadence; service the cheap IMU + environmental reads in the gaps;
update LEDs/BLE immediately on any state change so the *system* feels responsive even
when one model is mid-inference.

---

## Model + resource sizing (finalize after C4 + W4)

| Quantity | Source | Provisional | Final |
|----------|--------|-------------|-------|
| Gesture inference | design estimate (C4 will measure) | ~18-22 ms @38.4 MHz (DSP ~17-21 + classify ~1, extrapolated) | _C4 measured_ |
| KWS inference | Walk W4 | ~400-470 ms @38.4 MHz (extrapolated) | _W4 measured_ |
| Env read cadence | design | every 1-5 s (slow signals) | _tune on-device_ |
| Combined RAM | design | 2 arenas + ~16 KB audio buf + BLE stack | _verify FREE RAM on-device_ |
| Fused-loop latency | R4 | dominated by KWS | _R4 measured_ |

> Run cannot be sized honestly until Crawl C4 and Walk W4 produce the two real
> per-model latencies. This table is the placeholder those measurements fill.

---

## Risk register (Run-specific)

| # | Risk | Sev | Mitigation |
|---|------|-----|------------|
| R-R1 | **GSDK / toolchain drift on the Option-B build** | **High** | Pin GSDK 4.0.2 + GNU Arm 10-2020-q4 exactly; avoid the deprecated `tflite-micro-efr32-examples` repo; confirm target is BRD4166A (import flow skews to xG24); the board is NRND. |
| R-R2 | **RAM: 2 models + audio buffer + BLE stack** | **High** | Static tensor-arena allocation, tiniest viable models, verify FREE RAM on-device (not the Studio estimate); the gesture model is small but KWS + buffers compete. |
| R-R3 | Fused-loop latency under multi-model load | Medium | Duty-cycle audio; schedule cheap reads around the slow KWS path; measure (R4); accept "responsive, not instant." |
| R-R4 | Coin-cell can't power the full demo | Medium | Demo on **USB** (CR2032 disables RGB LEDs + CCS811); use the AEM only to characterize a duty-cycled low-power variant. |
| R-R5 | Fusion logic ambiguity (states overlap/flicker) | Medium | Deterministic state table with priority + hysteresis; document it; debounce transitions. |
| R-R6 | Two EI models' buffers/macros confused | Medium | Keep each model's `signal_t` sized to its OWN `EI_CLASSIFIER_*`; never share a buffer across models without separate length checks. |

---

## Dependencies + sequencing

Run is the **last** phase and has hard prerequisites:

1. **Crawl shipped** — gesture model exists + C4 latency measured.
2. **Walk shipped** — KWS model exists + W4 latency measured.
3. **Option-B build stood up (R0)** — the C++ path proven with one model before fusion.

Only then do R1 -> R4 make sense. Attempting fusion before the single-model C++ build
works (R0) is the classic trap — debug the toolchain/RAM/sensor-loop in isolation first.

---

## What stays the same

- **Fully on-device** — all inference + fusion on the EFR32MG12; BLE carries the guardian
  *state* only; phone/dashboard never infers.
- **Honesty** — latency/RAM figures labeled measured vs. estimated; R4 retires the
  estimates with real AEM + timing data.
- **Process** — lands via a **PR into develop**, branch kept (per `CONTRIBUTING.md`).
- **The hard boundary** — the AI extends the C++/fusion code; the human builds in
  Simplicity Studio, flashes, exercises the sensors, profiles with the AEM, and films.

---

## After Run

Run completing = the full **Smart Guardian** flagship is real: three sensor domains,
two on-device models, fusion, LED + BLE, on a no-NPU MCU. Natural follow-ons (out of
current scope): on-device learning / drift adaptation, multiprotocol reporting over
Zigbee/Thread (not just BLE), and a duty-cycled coin-cell variant characterized with the
AEM. These would be planned as their own phases if pursued.
