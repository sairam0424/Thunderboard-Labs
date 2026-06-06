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

## Results (FILL THESE IN)

<!-- TODO [HUMAN]: one row per measurement run. Add rows as needed.
     Core MHz: record the actual clock (38.4 default, 40 max).
     Get DSP/Classification/Anomaly/Total from serial-bench-parse.py output. -->

| Run | Core MHz | DSP ms | Classification ms | Anomaly ms | Total ms | inferences/sec |
|-----|----------|--------|-------------------|------------|----------|----------------|
| 1   | 38.4     | TODO   | TODO              | TODO       | TODO     | TODO           |
| 2   | 38.4     | TODO   | TODO              | TODO       | TODO     | TODO           |
| 3   | 38.4     | TODO   | TODO              | TODO       | TODO     | TODO           |
| Reference (Edge Impulse, ~80 MHz) | ~80 | 15 | 1 | 1 | ~17 | ~59 |

> The **Reference** row is Edge Impulse's published figure captured at a higher
> clock (~80 MHz, DSP ~15 ms / NN ~1 ms / anomaly ~1 ms, ~17 ms total). It is a
> sanity anchor, **not** a target you should match on this board.

---

## Honesty note (read before quoting any number)

- The **~17 ms total** Reference row is at a **higher clock (~80 MHz)** than this
  board's default. **It is not directly comparable** to a 38.4 MHz measurement.
- The often-cited **~30-45 ms total @ 38.4 MHz** is an **extrapolation**
  (roughly scaling the reference by the clock ratio), **NOT a measured value**.
  Treat it as a *hypothesis to confirm*, and replace it with your measured Total
  once you have run the board. Reference on-board figures seen in the wild are
  ~17-21 ms DSP / ~1 ms classify - **confirm-on-device.**
- Report **Model-testing accuracy** (held-out set), not training accuracy. The
  98.8% figure floating around was single-author / overfit-flagged. Targets:
  **>= 95%** overall on the held-out test set, **no class < 90%**.
- **Data quality sets the accuracy ceiling - not the silicon.** A clean,
  well-balanced capture matters more than the MCU.

---

## TODO checklist [HUMAN]

- [ ] Flash the model `.bin` to TB004 (see flashing runbook).
- [ ] Confirm the board clock is 38.4 MHz (or record the actual value).
- [ ] Stop the daemon; capture `run.log` via `--continuous` for 30-60 s.
- [ ] Run `serial-bench-parse.py run.log` and paste the table above.
- [ ] Fill Run 1-3 rows (repeat for stability; report min/mean).
- [ ] Replace every `TODO` and delete the `~30-45 ms` extrapolation once measured.
