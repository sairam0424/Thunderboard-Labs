# Aegis Edge — WALK Phase: Detailed Plan (on-device keyword spotting)

> **Status: READY TO START (Walk itself is still future).** The empirical anchor this
> plan waited on now exists: Crawl milestone **C4** measured the real on-device 38.4 MHz
> latency at **~87.5 ms total (~86 ms DSP + ~1-2 ms classify)**. So the Crawl-side
> "extrapolation pending" is resolved — but Walk's *own* KWS latency targets remain
> planning estimates until **W4** measures them on the trained audio impulse. Treat the
> KWS millisecond figures below as estimates (now revised UP off the real anchor) to be
> replaced by W4. The outline this expands lives in
> [`02-next-phases.md`](./02-next-phases.md); the Crawl plan it follows is
> [`01-implementation-plan.md`](./01-implementation-plan.md).

## Why Walk, and the anchor it now stands on

**Walk** proves the same Edge Impulse -> EFR32MG12 -> BLE pipeline works on a
*fundamentally harder* signal: audio from the ICS-43434 MEMS microphone. The board
recognizes a tiny spoken vocabulary (a wake word + 1-2 commands) **entirely on-device**
and streams the recognized keyword over BLE — no cloud, no Wi-Fi.

It is sequenced **after Crawl** for one empirical reason: keyword spotting (KWS) is the
workload most punished by this board having **no NPU**, and the **MFCC feature-extraction
DSP block dominates latency** (not the neural net). Crawl's C4 now gives us a **real
measured M4F-at-38.4 MHz datapoint**: total ~87.5 ms, of which **DSP was ~86 ms** (the
classify step was only ~1-2 ms). That measured DSP is **~5x** the Edge Impulse 80 MHz
reference — **not** the ~2x earlier figures assumed — so the old ~400-470 ms KWS
extrapolation is now an *underestimate*; the working KWS estimate must be revised UP and
then measured at W4.

**The FFT lesson that anchors Walk's DSP design:** Crawl's spectral block used **FFT
length 16**, which is below the EFR32 hardware-FFT minimum of **32**, so the DSP silently
fell back to a **software FFT** (revealed by `--debug`: `HW RFFT failed... size was 16`).
That software path is why Crawl's DSP was ~86 ms. **Walk's MFCC/MFE block should use an
FFT size of 32 or 64** so the hardware FFT engages and the DSP cost drops substantially —
this is the single most important sizing decision in the plan below.

**What is already done vs. still to measure:** Crawl's measured C4 latency is recorded in
[`../../benchmark/BENCHMARK.md`](../../benchmark/BENCHMARK.md). The "Model sizing" section
below now scales off that real anchor (and a hardware-FFT assumption) instead of an 80 MHz
reference. W4 then replaces the KWS estimate with a measurement.

---

## Goal + acceptance (phase-level)

**Goal:** an on-device KWS classifier that recognizes a small vocabulary from the mic,
lights an LED / streams the keyword over BLE, and produces the **first real audio-latency
measurement** for this board.

**Phase acceptance:** KWS runs fully on-device (verified via
`edge-impulse-run-impulse --continuous`), classifies the vocabulary at usable accuracy
(>=90% on a held-out, multi-voice test set), and a measured MFCC-DSP + classify latency
is captured in `BENCHMARK.md` — replacing the KWS estimate (which is now anchored to
Crawl's real ~86 ms DSP rather than an 80 MHz reference).

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
    latency is tight). Keep coefficient count modest. **Set the FFT length to >=32 (32
    or 64)** — Crawl proved that FFT 16 forces a slow software FFT (its ~86 ms DSP);
    FFT >=32 engages the EFR32 hardware FFT and is the main DSP-latency lever here.
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
  **replacing the KWS estimate**. This is the single most valuable contribution Walk
  makes — a real number no published source has for this board. (Crawl's C4 already
  showed DSP scales ~5x off the EI reference and that FFT 16 forces a software FFT, so
  compare W4's number against the FFT-size choice from W2 — a hardware FFT at size >=32
  should land well below a naive FFT-16 software-path extrapolation.)
- **Interpretation:** if the measured per-window latency comfortably beats the
  window-increase interval, KWS feels responsive; if not, shrink the vocabulary/model
  (see mitigations) or accept "responsive, not instant."

---

## Model sizing (anchored to Crawl C4; finalize at W4)

| Quantity | Reference (80 MHz) | Estimate @38.4 MHz (anchored to C4) | Final (after W4) |
|----------|--------------------|--------------------------------------|------------------|
| KWS window | 1 s | 1 s | _measure-driven_ |
| Total / window | **~225 ms (sourced)** | **revised UP — old ~400-470 ms assumed ~2x; C4 showed ~5x** | _TBD W4_ |
| MFCC DSP share (illustrative) | majority of the ~225 ms | majority of the total; **dominated by FFT path** | _TBD W4_ |
| Classify share (illustrative) | a few ms | a few ms (Crawl classify measured ~1-2 ms) | _TBD W4_ |
| FFT length / DSP path | n/a | **use >=32 -> hardware FFT** (FFT 16 = software fallback) | _confirm via --debug_ |
| Tensor arena RAM | tens of KB | tens of KB (+~16 KB audio buf) | _verify on-device_ |

> Crawl C4 is the real anchor: measured **~87.5 ms total / ~86 ms DSP @38.4 MHz**, which
> is **~5x** the EI 80 MHz reference (not the ~2x earlier figures assumed). So the prior
> ~400-470 ms KWS extrapolation is an **underestimate** unless Walk's DSP is faster per
> unit work — which is exactly what choosing **FFT >=32 (hardware FFT)** buys back.
> Crawl's ~86 ms was inflated by its **FFT-16 software fallback**; a Walk MFCC block at
> FFT 32/64 avoids that path. Net: do not trust a single scaled number — W4 measures it.

> Only the **~225 ms total @80 MHz** is a sourced reference figure; the DSP-vs-classify
> split is illustrative (MFCC dominates, classify is single-digit ms — Crawl's measured
> classify was ~1-2 ms) and is not a measured KWS breakdown. W4 produces the real split.

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

1. **Crawl C0-C3 complete** — ✅ DONE. The EI firmware + a working EI project + the deploy
   loop are reused as-is for Walk (W0 needs no re-flash).
2. **Crawl C4 measured** — ✅ DONE. The real latency (~87.5 ms total / ~86 ms DSP @38.4 MHz)
   is recorded in `BENCHMARK.md` and anchors Walk's model sizing, including the FFT >=32
   hardware-FFT lesson.
3. With both done, execute W0 -> W4; afterward, RUN (multi-sensor fusion) becomes the next
   phase — the first one requiring the Option-B C++ firmware (already scaffolded in
   [`../../firmware-option-b/src/`](../../firmware-option-b/src/)).
