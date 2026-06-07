# Aegis Edge - On-Device Inference Benchmark

> **This is a template. Fill the EMPTY rows with MEASURED numbers from your own
> hardware.** The headline deliverable for the Crawl phase is the real
> per-inference timing on the EFR32MG12 at its **default 38.4 MHz** clock - a
> number that is **unpublished** by Edge Impulse and only exists once you measure
> it. Look for `TODO` markers below.

- **Board:** Silicon Labs Thunderboard Sense 2 (BRD4166A, bare EFR32MG12P332F1024GL125)
- **Core:** Cortex-M4F, **38.4 MHz default** (40 MHz max), 256 KB RAM, 1 MB flash, **no NPU**
- **Impulse:** Spectral Analysis (~33 features) -> Dense(20) -> Dense(10) -> 5-class
  output, int8 quantization, + K-means anomaly (32 clusters)
- **Sensor path:** 3-axis accelerometer only (accX/accY/accZ), window 2000 ms / stride 80 ms

---

## Methodology

1. **[HUMAN]** Flash the model `.bin` to the board (drag to **TB004**, wait ~30 s).
   See the flashing runbook in `../runbooks/`.
2. **[HUMAN]** Stop the Edge Impulse daemon first - there is a **single serial
   port**, and the daemon will fight `run-impulse` for it.
   ```bash
   # ensure no daemon is holding the port, then:
   edge-impulse-run-impulse --continuous | tee run.log
   ```
   Perform gestures for ~30-60 s so you capture many inference samples.
3. **[AI-SCAFFOLDED]** Parse the captured log into a timing table:
   ```bash
   python3 ../scripts/serial-bench-parse.py run.log
   ```
   Each `--continuous` line reports
   `Predictions (DSP: X ms., Classification: Y ms., Anomaly: Z ms.)`. The parser
   reports count / min / max / mean for DSP, Classification, Anomaly, and Total.
4. **Record the core clock** in the table alongside the timing. The board runs at
   **38.4 MHz by default**; if you change `HFCLK`/`HFRCO` you MUST note the clock,
   because timing scales with it and a reference at another clock is not
   comparable.
5. Paste the parser's Markdown table into the **Results** section and fill the
   summary row.

> **inferences/sec** here is derived from mean **Total** (`1000 / mean_total_ms`).
> In `--continuous` mode the model slides over overlapping windows, so wall-clock
> throughput can differ from this compute-only figure - mark it
> **confirm-on-device**.

---

## Results (MEASURED - 2026-06-07)

Captured live via `edge-impulse-run-impulse --debug` on the real board at the
default 38.4 MHz clock. Five consecutive inference windows observed:

| Window | Core MHz | DSP ms | Classification ms | Anomaly ms | Total ms | Note |
|--------|----------|--------|-------------------|------------|----------|------|
| 1 (cold) | 38.4 | 95 | 1 | 0 | 96 | first window after start (warm-up outlier) |
| 2   | 38.4 | 86 | 2 | 0 | 88 | |
| 3   | 38.4 | 85 | 2 | 0 | 87 | |
| 4   | 38.4 | 86 | 1 | 0 | 87 | |
| 5   | 38.4 | 86 | 2 | 0 | 88 | |
| **Steady-state mean (windows 2-5)** | **38.4** | **~85.8** | **~1.75** | **0** | **~87.5** | **~11.4 inf/sec** |
| Reference (Edge Impulse, ~80 MHz) | ~80 | 15 | 1 | 1 | ~17 | sanity anchor only |

> **Headline result:** on the EFR32MG12 at **38.4 MHz**, steady-state inference is
> **~86 ms DSP + ~1-2 ms classify + 0 ms anomaly = ~87.5 ms total** (~11 inferences/sec).
> The **DSP (spectral feature extraction) dominates** the time; the neural net itself
> is ~1-2 ms, and the K-means anomaly check is sub-millisecond. This is the
> previously-unpublished real number for this board.

> **The Reference row** is Edge Impulse's published figure at ~80 MHz (~17 ms total).
> It is a sanity anchor, NOT a target -- see the honesty note below for why the
> measured 38.4 MHz number is ~5x higher than that reference, not the ~2x a naive
> clock-scaling would predict.

---

## Honesty note (read before quoting any number)

- The **~17 ms total** Reference row is at a **higher clock (~80 MHz)** than this
  board's default. **It is not directly comparable** to a 38.4 MHz measurement.
- **The ~30-45 ms extrapolation was WRONG (now corrected by measurement).** The plan
  predicted ~30-45 ms total @ 38.4 MHz by linearly scaling the 80 MHz reference. The
  **real measured value is ~87.5 ms total (~86 ms DSP)** -- roughly **5x** the 80 MHz
  reference, not the ~2x clock-scaling implied. This is the single most important
  reason the project insisted on *measuring* rather than trusting the extrapolation.
- **Why the DSP is so much higher than expected -- a real, board-specific finding:**
  the `--debug` run printed
  `INFO: HW RFFT failed, FFT size not supported. Must be a power of 2 between 32 and
  4096, (size was 16)`. The EFR32's hardware FFT accelerator requires a power-of-2 size
  **>= 32**, but the impulse uses **FFT length 16**, so the DSP **falls back to a
  software FFT** -- which is why spectral feature extraction costs ~86 ms instead of a
  hardware-accelerated few ms. **Optimization opportunity:** re-running the impulse with
  **FFT length 32 or 64** would likely let the hardware RFFT engage and cut DSP latency
  substantially. (Not required -- ~11 inf/sec is fine for gesture recognition -- but it's
  the obvious next lever, and a great thing to benchmark as a before/after.)
- Report **Model-testing accuracy** (held-out set), not training accuracy. The
  98.8% figure floating around was single-author / overfit-flagged. Targets:
  **>= 95%** overall on the held-out test set, **no class < 90%**.
- **Data quality sets the accuracy ceiling - not the silicon.** A clean,
  well-balanced capture matters more than the MCU.

---

## Checklist [DONE 2026-06-07]

- [x] Flash the model `.bin` to TB004 (filename `aegis-edge-crawl-silabs-thunderboard2-v1-impulse-#1.bin`).
- [x] Board clock confirmed 38.4 MHz (Interval 16.0000 ms = 62.5 Hz reported by firmware).
- [x] Captured live timing via `edge-impulse-run-impulse --debug` (5 windows).
- [x] Recorded the measured table above (steady-state ~86 ms DSP / ~1-2 ms classify).
- [x] Replaced the ~30-45 ms extrapolation with the **measured ~87.5 ms total** and
      documented WHY (FFT-16 software-FFT fallback).

### Optional follow-up (not blocking)
- [ ] Re-run with FFT length 32/64 to engage the hardware RFFT and benchmark the DSP speedup.
- [ ] Re-run at the 40 MHz max clock and note the delta.
