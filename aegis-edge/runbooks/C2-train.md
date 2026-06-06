# Milestone C2 — Design and Train the Impulse

> Goal: build the DSP + neural-network impulse in Edge Impulse Studio, train it, and
> pass the accuracy gate on the **held-out test set** (not training accuracy). After C2
> you deploy and benchmark on the bare MG12 (deploy-verify runbook).

**Prerequisite:** [C1](./C1-data-collection.md) complete — balanced 5-class dataset
with an 80/20 train/test split visible in Studio.

**Conceptual background:** [../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md](../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)

---

## Step C2.1 — Create the impulse  `[HUMAN]` (browser)

Studio -> **Impulse design -> Create impulse**.

| Block | Setting |
|-------|---------|
| Time-series input | **Window size 2000 ms**, **window increase 80 ms**, frequency **62.5 Hz** (from [C1](./C1-data-collection.md), `confirm-on-device`). |
| Processing (DSP) | **Spectral Analysis** on `accX` / `accY` / `accZ`. |
| Learning | **Classification (Keras NN)**. |
| Learning (anomaly) | **K-means anomaly detection**. |

Then **Save impulse**.

## Step C2.2 — Configure the DSP (Spectral Analysis) block  `[HUMAN]`

| Parameter | Value |
|-----------|-------|
| Filter | **Low-pass** |
| Filter cutoff | **3** |
| Filter order | **6** |
| Analysis | Spectral power enabled |
| Output | **~33 features** (the Input layer size below must match this) |

Click **Generate features** and inspect the **Feature explorer**: the five classes
should form visually separable clusters. Heavy overlap here predicts a poor model —
go back to [C1](./C1-data-collection.md) and improve data before training.

## Step C2.3 — Configure the neural network  `[HUMAN]`

Architecture (matches the verified reference):

```
Input(33) -> Dense(20) -> Dense(10) -> Output(5)
```

| Training setting | Value |
|------------------|-------|
| Training cycles (epochs) | **40** |
| Learning rate | **0.0005** |
| Quantization | **int8** (required for the MG12 target) |

## Step C2.4 — Add the anomaly (K-means) block  `[HUMAN]`

- Algorithm: **K-means**, **32 clusters**.
- Input features: the **RMS of `accX` / `accY` / `accZ`**.
- This flags out-of-distribution motion at inference time (an `anomaly` score), which
  is what catches gestures the 5-class model has never seen.

## Step C2.5 — Tune rather than hardcode  `[HUMAN]`

> The values above are a **known-good starting point**, not a final answer. Run the
> **EON Tuner** (and/or the **DSP Autotuner**) and let it search architectures/DSP
> params for the on-device latency + memory budget of the MG12. Adopt a tuner result
> only if it **meets or beats** the acceptance gate below on the **test** set.

---

## Step C2.6 — Train and read the confusion matrix  `[HUMAN]`

1. Click **Start training**. Note the reported training accuracy AND the validation
   confusion matrix.
2. **How to read the confusion matrix:** rows = true label, columns = predicted label.
   The diagonal is correct predictions; bright off-diagonal cells are systematic
   confusions (e.g. `circle` leaking into `updown`). For each row, the diagonal share
   is that class's recall. Watch especially for:
   - Any **single class < 90%** -> targeted data fix for that class.
   - Real gestures landing in `none` (under-trained gesture) or `none` landing in a
     gesture (`none` too narrow — add varied negatives per [C1](./C1-data-collection.md)).

## Step C2.7 — Model testing (the real number)  `[HUMAN]`

Run **Model testing** against the held-out **Test** set from [C1](./C1-data-collection.md).

> **Report the Model-testing accuracy, NOT the training accuracy.** The frequently
> cited **98.8%** reference figure was single-author and **flagged as overfit** — do
> not quote training accuracy as the result. The test-set number is the honest metric.

---

## Acceptance gate (C2 done when)

- [ ] **Model-testing (held-out) accuracy >= 95%.**
- [ ] **No single class < 90%** recall in the test confusion matrix.
- [ ] Quantized **int8** model built; impulse fits the MG12 (no NPU, 256KB RAM).
- [ ] If a tuner result was adopted, it **meets the two gates above on the test set**.
- [ ] The number you report is the **Model-testing** accuracy (training accuracy and
      the 98.8% reference are explicitly NOT the deliverable).

If the gate fails: the fix is almost always **data** ([C1](./C1-data-collection.md)) —
more/varied samples for the weak class and a richer `none` — not more epochs. Data
quality sets the ceiling.

**Next:** deploy the `.bin` to `TB004` and benchmark real on-device latency (see the
deploy-verify runbook / the
[conceptual guide](../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)).
Reminder: **stop `edge-impulse-daemon` before `edge-impulse-run-impulse`** (single
serial port).
