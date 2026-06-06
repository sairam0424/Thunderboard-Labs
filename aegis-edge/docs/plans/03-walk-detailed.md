# Aegis Edge — WALK Phase: Detailed Plan (on-device keyword spotting)

> **Status: PROVISIONAL.** This plan is detailed enough to start, but its latency
> targets and final model sizing are **anchored to extrapolations** until Crawl
> milestone **C4** measures the real on-device 38.4 MHz inference latency. Treat every
> millisecond figure here as a planning estimate to be replaced with a measurement.
> The outline this expands lives in [`02-next-phases.md`](./02-next-phases.md); the
> Crawl plan it follows is [`01-implementation-plan.md`](./01-implementation-plan.md).

## Why Walk, and why provisional

**Walk** proves the same Edge Impulse -> EFR32MG12 -> BLE pipeline works on a
*fundamentally harder* signal: audio from the ICS-43434 MEMS microphone. The board
recognizes a tiny spoken vocabulary (a wake word + 1-2 commands) **entirely on-device**
and streams the recognized keyword over BLE — no cloud, no Wi-Fi.

It is sequenced **after Crawl** for one empirical reason: keyword spotting (KWS) is the
workload most punished by this board having **no NPU**, and the **MFCC feature-extraction
DSP block dominates latency** (not the neural net). Every public latency figure for KWS
on this board (~225 ms @80 MHz reference, extrapolated to ~400-470 ms @38.4 MHz) is an
*extrapolation*. Crawl's C4 gives us a real measured M4F-at-38.4 MHz datapoint (IMU DSP
~17-21 ms), which is the honest anchor to size the KWS model and set expectations.

**What unlocks finalization:** paste Crawl's measured C4 latency into
[`../../benchmark/BENCHMARK.md`](../../benchmark/BENCHMARK.md), then revisit the
"Model sizing" section below with a real per-MFLOP cost instead of an 80 MHz reference.

---

## Goal + acceptance (phase-level)

**Goal:** an on-device KWS classifier that recognizes a small vocabulary from the mic,
lights an LED / streams the keyword over BLE, and produces the **first real audio-latency
measurement** for this board.

**Phase acceptance:** KWS runs fully on-device (verified via
`edge-impulse-run-impulse --continuous`), classifies the vocabulary at usable accuracy
(>=90% on a held-out, multi-voice test set), and a measured MFCC-DSP + classify latency
is captured in `BENCHMARK.md` — replacing the extrapolated number.

---

## Milestones W0-W4

Legend: **[HUMAN]** = on-hardware/browser only · **[AI]** = scaffolded artifact.

### W0 — Confirm mic acquisition  **[HUMAN]**, runbook **[AI]**
- **Do:** with the EI firmware already flashed (from Crawl C0) and
  `edge-impulse-daemon` running, open Studio **Data acquisition**, select the
  **Microphone** sensor, record a short clip, and play it back.
- **✅ Acceptance:** a microphone sample records in Studio and plays back recognizably.
- **Notes:** the EI Thunderboard firmware exposes the mic natively (same firmware as
  Crawl — no re-flash needed). Default audio sample rate is **16 kHz** for KWS
  (confirm-on-device in the sensor dropdown).

### W1 — Collect the keyword dataset  **[HUMAN]**, runbook **[AI]**
- **Do:** pick a **tiny** vocabulary — start with **1 wake word + 1 command** (grow to 2
  only if W4 latency allows). Collect, per class, many short **~1 s** utterances across
  **multiple voices, distances, and background levels**, plus two essential extra classes:
  - **`noise`** — ambient room sound, silence, non-speech.
  - **`unknown`** — other words NOT in the vocabulary (so out-of-vocab speech isn't
    force-matched).
- **Target volume:** aim for the EI KWS tutorial's guidance (~10 min/class is generous;
  more real data beats more epochs). Hold out a genuinely unseen test set (different
  session/voice).
- **✅ Acceptance:** >=4 classes (wake + command + `noise` + `unknown`), multi-voice,
  with a held-out test split visible in Studio.
- **Tip:** you can pull EI's prebuilt keyword/noise datasets to bootstrap `noise`/`unknown`.

### W2 — Train MFCC + small int8 CNN  **[HUMAN] clicks Train**, target config **[AI]**
- **Impulse design (provisional, EI KWS defaults):**
  - Time-series window **~1000 ms**, window increase **~250-500 ms** (smaller increase
    = more overlap = smoother continuous inference, higher DSP duty).
  - **DSP block: MFCC** (the standard for speech; MFE is the lighter alternative if
    latency is tight). Keep coefficient count modest.
  - **Learning block:** a **small 1D/2D CNN**, **int8** quantized. Start from EI's
    keyword-spotting transfer-learning / small-CNN preset; do **not** scale it up until
    W4 proves you have latency headroom.
  - Run the **EON Tuner** to search DSP+model configs against the on-device latency/RAM
    budget — this is more important here than in Crawl.
- **✅ Acceptance:** **>=90%** on the held-out test set with a confusion matrix that
  cleanly separates wake/command from `noise`/`unknown`. Report **Model-testing**
  accuracy, not training accuracy.
- **RAM caution:** EI's reported RAM figure **excludes the ~16 KB raw-audio capture
  buffer** — budget it on top. It still fits 256 KB comfortably, but verify on-device.

### W3 — Deploy back to board (Option A: `.bin`)  **[HUMAN]**, runbook **[AI]**
- **Do:** Studio **Deployment** -> target **Thunderboard Sense 2** -> **int8** ->
  Build -> drag the `.bin` onto **`TB004`**. (Still Option A — Walk is a single-model
  impulse, so it does not yet need the Option-B C++ path; Run does.)
- **✅ Acceptance:** `edge-impulse-run-impulse --continuous` streams correct keyword
  classifications live, on-device. *(Stop the daemon first — single serial port.)*

### W4 — MEASURE real latency (the headline deliverable)  **[HUMAN] runs**, template + parser **[AI]**
- **Do:** capture a `--continuous` log of `Predictions (DSP: X ms, Classification: Y ms ...)`.
  Parse it with [`../../scripts/serial-bench-parse.py`](../../scripts/serial-bench-parse.py)
  and paste the result into [`../../benchmark/BENCHMARK.md`](../../benchmark/BENCHMARK.md).
  (Re-clocking to the part's ~40 MHz max would need a custom clock config in Option-B
  firmware — out of scope for Walk, which is Option-A only.)
- **✅ Acceptance:** a measured MFCC-DSP + classify latency at 38.4 MHz, in `BENCHMARK.md`,
  **replacing the extrapolated ~400-470 ms**. This is the single most valuable
  contribution Walk makes — a real number no published source has for this board.
- **Interpretation:** if the measured per-window latency comfortably beats the
  window-increase interval, KWS feels responsive; if not, shrink the vocabulary/model
  (see mitigations) or accept "responsive, not instant."

---

## Model sizing (finalize after Crawl C4)

| Quantity | Reference (80 MHz) | Provisional @38.4 MHz | Final (after C4 + W4) |
|----------|--------------------|-----------------------|------------------------|
| KWS window | 1 s | 1 s | _measure-driven_ |
| Total / window | **~225 ms (sourced)** | **~400-470 ms (EXTRAPOLATION)** | _TBD W4_ |
| MFCC DSP share (illustrative) | majority of the ~225 ms | majority of the total | _TBD W4_ |
| Classify share (illustrative) | a few ms | a few ms | _TBD W4_ |
| Tensor arena RAM | tens of KB | tens of KB (+~16 KB audio buf) | _verify on-device_ |

> Only the **~225 ms total @80 MHz** is a sourced reference figure; the DSP-vs-classify
> split is illustrative (MFCC dominates, classify is single-digit ms) and is not a
> measured breakdown. W4 produces the real split.

> The Crawl C4 IMU measurement gives the real DSP-cost-per-unit-work on this exact
> silicon at 38.4 MHz. Use it to rescale the MFCC estimate from a measured anchor rather
> than the 80 MHz reference. Then W4 replaces the estimate entirely.

---

## Risk register (Walk-specific)

| # | Risk | Sev | Mitigation |
|---|------|-----|------------|
| W-R1 | **Audio latency too high for snappy control** | **High** | Tiny vocabulary (1 wake + 1 command first), aggressive int8, MFE instead of MFCC if needed, sliding-window/continuous inference; set expectations to "responsive." If a product truly needs instant KWS, that is the documented signal to move to an xG24 (has the NPU). |
| W-R2 | ~16 KB hidden audio buffer overruns RAM | Medium | Budget it on top of EI's RAM estimate; verify FREE RAM on-device, not the Studio figure. |
| W-R3 | Mic data quality / background noise | Medium | Robust `noise` + `unknown` classes; multiple voices/distances/sessions; held-out test set; read the confusion matrix. |
| W-R4 | Over-large model (latency creep) | Medium | Let the EON Tuner pick against the latency budget; do not hand-scale the CNN up; grow vocabulary only after W4 confirms headroom. |
| W-R5 | Mic sample-rate / format mismatch vs trained impulse | Low | Confirm the 16 kHz mic sensor in Studio matches the impulse; the firmware enforces its own rate — verify on-device. |

---

## What stays the same as Crawl

- **On-device inference** — board does mic-read -> MFCC -> int8 CNN locally; BLE carries
  *results only*; phone/dashboard never infers.
- **Deploy path** — Option A (`.bin` drag-drop); same `TB004` flow, same
  `edge-impulse-run-impulse --continuous` verification, same FLASHING fallbacks.
- **BLE demo** — same verified UUIDs / the `dashboard/` Web Bluetooth UI; same offline
  (airplane-mode) framing.
- **Honesty** — every latency figure labeled measured vs. extrapolated; W4 exists to
  retire the extrapolation.
- **Process** — this work lands via a **PR into develop**, branch kept (per
  `CONTRIBUTING.md`).

---

## Immediate prerequisites before starting Walk

1. **Crawl C0-C3 complete** — the EI firmware + a working EI project + the deploy loop
   are reused as-is for Walk (W0 needs no re-flash).
2. **Crawl C4 measured** — the real IMU latency anchors Walk's model sizing. Paste it
   into `BENCHMARK.md` first.
3. Then execute W0 -> W4; afterward, RUN (multi-sensor fusion) becomes the next phase —
   the first one requiring the Option-B C++ firmware (already scaffolded in
   [`../../firmware-option-b/src/`](../../firmware-option-b/src/)).
