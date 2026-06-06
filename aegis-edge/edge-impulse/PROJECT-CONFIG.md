# Edge Impulse — Canonical Project Configuration (Crawl)

This is the **single source of truth** for the Crawl-phase impulse. Mirror every
value below exactly in Edge Impulse Studio. All parameters are verified from
primary sources (Edge Impulse docs, the EI firmware repo, the gatoninja236
Hackster build). Values the research could not pin down are flagged
**confirm-on-device**.

Run the **EON Tuner / DSP Autotuner** rather than treating the DSP/NN numbers as
sacred — the values here are the verified starting point, and the Tuner may find
a better operating point for your captured data. The acceptance target is what
must hold, not the exact hyperparameters.

> **[HUMAN] After training:** export the project as **C++ library** and the full
> **EI project `.zip`**, and save the `.zip` into this `edge-impulse/` folder so
> the build is reproducible. (`.gitignore` keeps loose `ei-*.json` dumps out of
> git; commit the canonical `.zip` deliberately if you want it versioned.)

---

## 1. Data acquisition

| Parameter | Value | Notes |
|-----------|-------|-------|
| Sensor | **Built-in accelerometer** | Accelerometer-only **3-axis** path (the proven recipe). NOT the 6-axis gyro path. |
| Axes | `accX`, `accY`, `accZ` | m/s^2 |
| Sample frequency | **62.5 Hz** | Board offers {20, 62.5, 100} Hz; 10ms floor = 100Hz max. Pick **62.5 Hz** regardless of the Studio default. The default Studio Hz preselect is **UNVERIFIED** — set it explicitly. **confirm-on-device.** |
| HW IMU rate | 200 Hz (`sl_imu_configure(200)`) | Hardware is configured at 200Hz; this is **NOT** the ingestion rate. Do not confuse the two — ingest at 62.5 Hz. |
| Sample length | **10000 ms** (10 s) per sample | |
| Classes | `circle`, `zigzag`, `updown`, `leftright`, `none` | 5 classes |
| Counts | 8 x 10s per gesture + 4 x 10s `none` | ~6 minutes of capture total |

> **[HUMAN]** Data acquisition happens in the Studio "Data acquisition" tab with
> the board connected via `edge-impulse-daemon`. Data quality sets the accuracy
> ceiling, not the silicon — record clean, consistent gestures.

---

## 2. Impulse design

| Parameter | Value |
|-----------|-------|
| Window size | **2000 ms** |
| Window increase | **80 ms** |
| Processing block | **Spectral Analysis** (DSP) |
| Learning block | **Classification (Keras NN)** |
| Anomaly block | **K-means** |

---

## 3. DSP block — Spectral Analysis

| Parameter | Value |
|-----------|-------|
| Filter | Low-pass |
| Cutoff | **3** |
| Order | **6** |
| Features | Spectral power (+ filtered signal) |
| Output feature count | **~33 features** |

The ~33-feature count is the input width to the NN below; if your DSP
configuration yields a different count, update the NN `Input(...)` to match.

---

## 4. NN block — Keras classifier

Architecture:

```
Input(33) -> Dense(20) -> Dense(10) -> Output(5)
```

| Hyperparameter | Value |
|----------------|-------|
| Training cycles | **40** |
| Learning rate | **0.0005** |
| Quantization (deployment) | **int8** |
| Output classes | 5 (circle / zigzag / updown / leftright / none) |

`Input(33)` must equal the DSP feature count from section 3. `Output(5)` must
equal the class count from section 1.

---

## 5. Anomaly block — K-means

| Parameter | Value |
|-----------|-------|
| Algorithm | K-means |
| Clusters | **32** |
| Input axes | RMS of `accX`, `accY`, `accZ` |

---

## 6. Deployment

| Parameter | Value |
|-----------|-------|
| Quantization | **int8** |
| Target | Thunderboard Sense 2 (Deployment tab) |
| Output | board `.bin`, dragged onto TB004 |

---

## 7. Acceptance target

| Criterion | Threshold |
|-----------|-----------|
| Overall accuracy | **>= 95%** on the **held-out test set** |
| Per-class accuracy | **No class < 90%** |
| Metric source | **Model testing** accuracy, **NOT** training accuracy |

> The 98.8% reference figure was single-author / overfit-flagged — do not quote
> training accuracy as the result. Report **Model testing** numbers.

---

## 8. Latency (headline deliverable)

On-device inference latency at the real **38.4MHz** clock is the headline
benchmark. The reference numbers below are **confirm-on-device**:

| Stage | Reference (confirm-on-device) |
|-------|-------------------------------|
| DSP | ~17-21 ms |
| Classification | ~1 ms |
| Total | ~30-45 ms |

The true 38.4MHz number is unpublished — **measuring it is the deliverable.**
Capture it via `edge-impulse-run-impulse --continuous` (see
[`../runbooks/C4-verify-benchmark.md`](../runbooks/C4-verify-benchmark.md)), which
prints `Predictions (DSP: X ms., Classification: Y ms., Anomaly: Z ms.)`.
