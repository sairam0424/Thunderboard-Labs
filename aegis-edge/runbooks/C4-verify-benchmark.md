# Milestone C4 — On-Device Verification + Latency Benchmark

> **Goal:** Confirm the deployed impulse classifies correctly on real hardware,
> then **capture the per-stage inference latency** the firmware prints. This is
> the headline deliverable of the CRAWL phase: the real inference time on a
> bare EFR32MG12P332F1024GL125 running at **38.4 MHz** is **unpublished** —
> *measuring it is the benchmark.*

**Prereq:** [C3](./C3-deploy.md) complete — your impulse is flashed and
`edge-impulse-run-impulse --continuous` already streams sane labels.

---

## Why this milestone matters

Edge Impulse and the Hackster build cite on-board reference figures of roughly
**DSP ~17-21 ms** and **classification ~1 ms** (total typically ~30-45 ms once
you include anomaly + overhead). But:

- The board's stated clock is **38.4 MHz** (40 MHz max). Vendor/spec material
  rarely quotes inference latency at the *actual* run clock.
- "confirm-on-device" applies to every timing number here — treat the reference
  figures as a sanity range, **not** ground truth. The number **you** record is
  the deliverable.

---

## Step 1 [HUMAN — terminal] — Run the continuous classifier and read timings

> **CRITICAL — one serial port:** stop `edge-impulse-daemon` first. The board
> has a single port; the daemon and `run-impulse` cannot share it.

```bash
# Stop any running edge-impulse-daemon (Ctrl-C its terminal), then:
edge-impulse-run-impulse --continuous
```

Each inference prints a `Predictions` header. **The bracketed timings are the
data you are capturing:**

```
Predictions (DSP: 19 ms., Classification: 1 ms., Anomaly: 0 ms.):
    circle:     0.94531
    ...
```

- `DSP: X ms.` — feature extraction (Spectral Analysis) time.
- `Classification: Y ms.` — neural-net (int8) forward pass.
- `Anomaly: Z ms.` — K-means anomaly block time.
- **Total per inference ~= X + Y + Z** (plus loop overhead; capture the printed
  components and report the sum).

---

## Step 2 [HUMAN — terminal] — Capture a clean log

Capture at least ~30-60 seconds of steady-state inferences (idle/`none` is fine —
you want representative timing, not gestures). Tee the output to a file:

```bash
# Capture a timestamped log under benchmark/
edge-impulse-run-impulse --continuous | tee ../benchmark/run-$(date +%Y%m%d-%H%M%S).log
```

> Run this from the `runbooks/` directory so the `../benchmark/` relative path
> lands the log in the project's [`benchmark/`](../benchmark/) folder. Adjust the
> path if you are elsewhere.

Let it run, then Ctrl-C to stop.

---

## Step 3 [AI-SCAFFOLDED — terminal] — Parse the log into stats

Use the parser to extract DSP / Classification / Anomaly distributions
(min / mean / median / p95 / max) and total latency from a captured log:

```bash
python3 ../scripts/serial-bench-parse.py ../benchmark/run-YYYYMMDD-HHMMSS.log
```

See [`../scripts/serial-bench-parse.py`](../scripts/serial-bench-parse.py) for
flags and output format. Record the summarized numbers in
[`../benchmark/BENCHMARK.md`](../benchmark/BENCHMARK.md).

> If the parser is not present yet, you can read the timings by eye from the
> stream — but the parser gives you mean/p95 across many samples, which is what
> belongs in the benchmark report (a single eyeballed line is noisy).

---

## Step 4 [HUMAN — optional] — Re-run near the 40 MHz ceiling

The board runs at **38.4 MHz** by default; **40 MHz** is the documented max.
If your firmware/clock config exposes the higher rate, re-capture a second log so
the report can show latency at both clocks.

- **confirm-on-device:** whether your specific build runs at 38.4 MHz vs a higher
  configured clock is *not* assumed here — verify what clock the board is
  actually running before attributing a number to "38.4 MHz" vs "40 MHz".
- Capture the second run to a separate log and parse it the same way. Label both
  clearly in the report.

---

## Step 5 [HUMAN] — Verification of correctness (alongside timing)

While capturing, also confirm classification quality on-device:

- [ ] Each of `circle / zigzag / updown / leftright` is the dominant top class
      when performed.
- [ ] `none` (board held still) classifies as `none` / low anomaly.
- [ ] No class systematically swaps with another (that is a C2 data/label issue,
      not a benchmark issue — fix upstream).

> On-device accuracy is the *real* number; report **Model-testing** accuracy from
> Studio, not training accuracy. (The 98.8% reference figure was a
> single-author, overfit-flagged result — do not quote it as your own.)

---

## Acceptance criteria (C4 done when all hold)

- [ ] `--continuous` runs cleanly (daemon stopped, single port).
- [ ] A captured `.log` exists under [`../benchmark/`](../benchmark/).
- [ ] DSP / Classification / Anomaly / total latency summarized
      (min/mean/median/p95/max) and written to
      [`../benchmark/BENCHMARK.md`](../benchmark/BENCHMARK.md).
- [ ] The clock the numbers were measured at (38.4 MHz, or higher if re-run) is
      **explicitly stated and confirmed on-device**, not assumed.
- [ ] On-device classification matches expectations for all 5 classes.

Then proceed to [**C5 — BLE demo**](./C5-ble-demo.md).

---

## Reference figures (sanity range only — NOT your result)

| Stage | Reference (cited) | Your measured | Notes |
|-------|-------------------|---------------|-------|
| DSP | ~17-21 ms | _fill in_ | Spectral Analysis |
| Classification | ~1 ms | _fill in_ | int8 NN forward pass |
| Anomaly | small | _fill in_ | K-means, 32 clusters |
| **Total** | ~30-45 ms | _fill in_ | confirm-on-device @ stated clock |

> The "~30-45 ms @ 38.4 MHz" range is a published-ish ballpark. The precise
> latency at the board's true run clock is the unpublished number this milestone
> exists to produce. Record yours; do not copy the reference into the report.
