# Session Walkthrough -- Part 2 (C2 + C3)

> **How to read this file.** This is the AS-BUILT, lived record of the Aegis Edge
> Crawl session -- the real values entered, the exact outputs seen, and every
> error hit plus its fix. It picks up where Part 1 (intro / C0 / C1) ends and
> covers **C2** (impulse design + training), the optional **EON Tuner** accuracy
> chase, and **C3** (deployment, which is still IN PROGRESS). Concatenate
> `00-session-walkthrough.md` (Part 1) and this file for the full narrative.
>
> Throughout, **OBSERVED** = what really happened this session; **EXPECTED** =
> what should happen, taken from the prescriptive runbooks. Anything not yet
> done is labeled clearly.
>
> Prescriptive counterparts: [`../runbooks/C2-train.md`](../runbooks/C2-train.md)
> and [`../runbooks/C3-deploy.md`](../runbooks/C3-deploy.md).

---

## C2 -- Impulse design + training

**Goal of this phase.** Take the 36 labeled 10-second accelerometer samples from
C1 ([`../runbooks/C1-data-collection.md`](../runbooks/C1-data-collection.md)) and
turn them into a trained, quantized on-device classifier plus an anomaly block --
all inside Edge Impulse Studio project `1021910` (`aegis-edge-crawl`).

> **Honesty note on the target.** Studio shows the target as **Cortex-M4F 80MHz**.
> That is Edge Impulse's *reference* target for its latency/RAM/ROM estimates, **not**
> the real board. The real Thunderboard Sense 2 EFR32MG12 runs the Cortex-M4F at
> **38.4MHz** with **no NPU**, so real on-device latency is roughly **2x** the Studio
> estimate. Treat every "on-device estimate" below as an 80MHz reference number, not a
> measured board number.

### Step 1 -- Create the impulse

In Studio: **Impulse design -> Create impulse**. The time-series input block was
configured as:

| Setting | OBSERVED value |
|---|---|
| Window size | `2000` ms |
| Window increase (stride) | `80` ms |
| Frequency | `62.5` Hz |
| Sensor axes | `accX`, `accY`, `accZ` (3-axis) |

A 2000 ms window at 62.5 Hz = 125 samples/axis = 375 values/window. The 80 ms
increase means windows overlap heavily, multiplying the 36 raw samples into many
training windows.

### Step 2 -- Processing block: Spectral Analysis

Added a **Spectral Analysis** processing block (the standard DSP choice for
sustained motion gestures on an accelerometer). Parameters used:

| Parameter | OBSERVED value |
|---|---|
| Filter type | `low` |
| Cutoff frequency | `3` |
| Filter order | `6` |
| FFT length | `16` |
| Take log of spectrum | enabled |
| Overlap FFT frames | enabled |

This produced **18 features**.

> **DEVIATION (real vs plan).** An earlier plan estimated **~33 features** (it
> assumed a larger FFT length). The **actual** generated feature count at FFT
> length 16 with these filter settings was **18**. Document the real number: **18
> features**. If you are reproducing and see 18, you matched the as-built config;
> if you see ~33, your FFT length / axes differ from this session.

### Step 3 -- Generate features + read the Feature explorer

Ran **Generate features**. The Feature explorer is the single most predictive
artifact in the whole session -- it told us the accuracy ceiling *before* we
trained anything.

**OBSERVED Feature explorer:**

- **Random** (green) -- formed its own clean, separated cluster.
- **LeftRight** (orange) -- also formed a clean, separated cluster.
- **Circle / UpDown / ZigZag** -- overlapped in one dense blob.

**Prediction made at this point:** the model will classify Random and LeftRight
nearly perfectly, and will **confuse Circle / UpDown / ZigZag** with each other.
(Training confirmed this exactly -- see Step 6.)

**OBSERVED feature-importance (top axes), most to least important:**

1. `accX RMS`
2. `accZ Spectral Power`
3. `accX Spectral Power`
4. `accZ RMS`
5. `accY RMS`

### Step 4 -- Learning block: Classification (Keras)

| Setting | OBSERVED value |
|---|---|
| Architecture | `Input(18) -> Dense(20) -> Dense(10) -> Output(5)` |
| Training cycles | `40` |
| Learning rate | `0.0005` |
| Quantization | `int8` |
| Profile int8 model | checked |

The 5 output classes are `Circle`, `LeftRight`, `Random`, `UpDown`, `ZigZag`.

> **DEVIATION (labels / negative class).** The plan referred to the negative/idle
> class as `none`. In the as-built session the negative class is **`Random`**
> (capitalized). EI labels are **case-sensitive** -- the consistent capitalized
> set used end-to-end is `Circle`, `LeftRight`, `Random`, `UpDown`, `ZigZag`.

### Step 5 -- Anomaly detection (K-means)

Added a **K-means anomaly detection** block alongside the classifier.

| Setting | OBSERVED value |
|---|---|
| Cluster count (components) | `5` (the default) |
| Axis selection | via **Select suggested axes** |
| Suggested axes chosen | `accX RMS`, `accX Spectral Power 1.95-5.86Hz`, `accZ RMS`, `accZ Spectral Power 1.95-5.86Hz` |

The Anomaly explorer showed healthy **purple K-means cluster ellipses** sitting
over the training data -- i.e. the clusters bound the known-gesture distribution,
so genuinely novel motion would fall outside them.

> **DEVIATION (real vs plan).** The plan mentioned **32** components. The
> **actual** value used was the default **5** components. Document the real value:
> **5**.

### Step 6 -- Train and read the result

**OBSERVED training result (validation set, Quantized int8):**

| Metric | OBSERVED value |
|---|---|
| Validation accuracy | **85.0%** |
| Loss | **0.37** |
| Area under ROC | **0.98** |
| Weighted Precision / Recall / F1 | **0.85 / 0.85 / 0.85** |

**OBSERVED per-class F1:**

| Class | F1 | Notes |
|---|---|---|
| Random | **1.00** | perfect -- the negative class is unmistakable |
| LeftRight | **0.96** | clean, as the Feature explorer predicted |
| Circle | **0.84** | inside the overlap blob |
| ZigZag | **0.80** | inside the overlap blob |
| UpDown | **0.73** | **weakest** -- 74% recall; confused with ZigZag (17.9%) and Circle (8.1%) |

**Honest read of the 85% ceiling.** The ~85% ceiling is set by the **data**, not
the silicon. `Circle`, `UpDown`, and `ZigZag` physically overlap when sensed by a
3-axis accelerometer (similar acceleration signatures), so no amount of bigger
model or faster chip separates them from these features. The proof the model
*itself* is healthy is the **Area under ROC = 0.98** -- the classifier ranks
classes very well; the confusion is inherent label overlap, not a broken model.
The Feature explorer (Step 3) called this before training.

**OBSERVED on-device estimate** (deployment page, Quantized int8, **80MHz
reference target**):

| Estimate | OBSERVED value |
|---|---|
| Total latency | ~`17` ms |
| Peak RAM | ~`2.9` KB |
| Flash | ~`49` KB |
| Classifier alone | ~`1` ms |

> Real **38.4MHz** latency is roughly **2x** these numbers and is a
> **measure-on-device** item -- not yet captured (that is **C4**, below).

---

## EON Tuner -- the optional accuracy chase

After locking 85%, we ran the **EON Tuner** to see whether an automated
architecture/DSP search could beat the hand-tuned impulse. Short answer: it
could not, and that is itself a useful result.

### Setting it up

In Studio: **EON Tuner -> New run**.

> ### ⚠ ERROR CALLOUT -- "Search space is invalid"
> **Symptom:** Starting the run threw **"Search space is invalid"** with red `X`
> marks on empty `inputBlocks` / `dspBlocks` / `learnBlocks`.
> **Cause:** The search space was **empty** -- the Tuner had nothing to search.
> **Fix:** Click **Use template** and pick **"Continuous motion | Classification"**
> (it matches sustained gestures + classification). This populates the search space
> with FFT + wavelet DSP blocks, several window sizes, and Dense models. Do **not**
> add anomaly variants when you are purely chasing classification accuracy.

> ### ⚠ ERROR CALLOUT -- no "Maximize accuracy" objective
> **Symptom:** The run-objective dropdown offered only **Minimize validation loss /
> latency / RAM / ROM** -- there was **no "Maximize accuracy"** option.
> **Cause:** This EON Tuner version frames the primary objective as **loss**;
> latency/RAM/ROM are the alternative objectives.
> **Fix:** Keep **"Minimize validation loss"** (lower loss tracks higher accuracy)
> and set **Sort = Accuracy** in the right-hand sidebar so the leaderboard ranks
> candidates by accuracy.

### Running it

The UI warned the run **"can take up to 32 hours."**

> **OBSERVED vs the warning.** The 32-hour figure is generic worst-case
> boilerplate. This dataset is tiny, so it was far faster than that -- but it still
> **ran overnight** (started **23:58**, finished the next morning).

### Result

**OBSERVED:** only **2 candidates completed, 4 failed**.

| Candidate | OBSERVED accuracy | Verdict |
|---|---|---|
| `spectr-dense-639` | **22%** | far worse than 85% |
| `spectr-dense-32a` | **7%** | far worse than 85% |

**LESSON:** Both Tuner candidates were **far worse** than the existing **85%**
hand-tuned impulse. The hand-tuned config was already near-optimal, and the Tuner
*confirmed* the ceiling is **data-bound**, not config-bound. **Do not apply a
worse Tuner variant for momentum's sake.** We **kept the original 85% impulse**
and moved on to deployment.

---

## C3 -- Deploy (IN PROGRESS)

**Goal of this phase.** Build a ready-to-flash firmware image from the 85% impulse
and run it live on the board, streaming predictions. See the prescriptive runbook
[`../runbooks/C3-deploy.md`](../runbooks/C3-deploy.md).

> **Status up front (honest):** the deployment was **configured and built**, the
> model `.bin` was **copied to the board**, but **live verification was
> interrupted** by a serial-port issue and is **not yet confirmed streaming
> predictions**. C3-verify, C4, and C5 are presented below as **TO-DO** with
> **EXPECTED** results.

### Step 1 -- Configure the deployment

In Studio: **Impulse design -> Deployment.**

| Setting | OBSERVED value | Why |
|---|---|---|
| Deployment target | **Thunderboard Sense 2** (changed from the default **C++ library**) | The default `C++ library` is the Option-B / Run path (you build it yourself). **Thunderboard Sense 2** builds the ready-to-flash `.bin` = Option-A. |
| Inference engine | **EON Compiler** (default) | Studio shows *"Same accuracy, 55% less RAM, 63% less ROM"* -- correct for this RAM-constrained, no-NPU board. |
| Optimization | **Quantized (int8)** selected | Matches the int8 model trained in C2. |
| Run model testing before build | **skipped (optional)** | It is optional and does **not** gate or change the build -- skipped for momentum. |

> **Cloud-not-on-device note.** The Deployment page also offers a **QR code +
> "Launch in browser"** to test the model from a phone browser. That runs in the
> **cloud / on the phone**, **not on the board**. It is a nice sanity check but it
> is **not** on-device inference -- you still must do the real flash below.

### Step 2 -- Build, unzip, and flash

**OBSERVED commands:**

```bash
# Studio "Build" produced a .zip download containing the firmware.
unzip <downloaded-deployment>.zip
# Flash by COPYING the .bin onto the bootloader drive (do NOT execute it):
cp <unzipped>/*.bin /Volumes/TB004/
```

> ### ⚠ ERROR CALLOUT -- TB004 drive disappears right after copying = SUCCESS
> **Symptom:** The `TB004` drive vanishes from Finder immediately after you copy
> the `.bin`.
> **Cause:** **EXPECTED behavior** -- the bootloader accepted the firmware, wrote
> flash, and **rebooted**; the USB mass-storage drive unmounts during/after the
> reboot.
> **Fix:** This is **SUCCESS, not an error.** The board now runs your model
> firmware and presents a **serial port** (drive it with `edge-impulse-run-impulse`).
> To get `TB004` back later (e.g. to reflash), press **RESET** or unplug/replug.

> ### ⚠ ERROR CALLOUT -- do NOT use `himax-flash-tool` for this board
> **Symptom:** You spot `~/.vite-plus/bin/himax-flash-tool` and wonder if it
> applies here.
> **Cause:** That tool flashes **HIMAX** boards (WE-I / Grove Vision AI cameras),
> **not** Silicon Labs.
> **Fix:** Do **not** use it. Correct flash methods for this board are the
> **TB004 drag-and-drop** (above), **Simplicity Studio "Upload application"**, or
> **Simplicity Commander** (`commander flash`). See
> [`../runbooks/FLASHING.md`](../runbooks/FLASHING.md).

### Step 3 -- Live verify (INTERRUPTED -- TO-DO)

This is where the session stopped. While tearing down the data-acquisition daemon
to switch into inference mode, two issues hit back to back.

> ### ⚠ ERROR CALLOUT -- daemon won't quit on Ctrl+C
> **Symptom:** `edge-impulse-daemon` would not quit on the first `Ctrl+C`; it
> printed *"Received stop signal, stopping application... Press CTRL+C again to
> force quit"* with many queued `^C`.
> **Cause:** The daemon catches the first `Ctrl+C` to shut down cleanly and asks
> for a second to force-quit; it can wedge mid-upload.
> **Fix:** Press `Ctrl+C` **once more (decisively)** and wait, **or** force-kill
> from another terminal:
> ```bash
> pkill -f edge-impulse-daemon
> pgrep -f edge-impulse-daemon || echo 'daemon stopped'
> ```

> ### ⚠ ERROR CALLOUT -- serial port lost after `pkill`
> **Symptom:** After the `pkill`, `edge-impulse-run-impulse --continuous` looped:
> *"Could not find any devices connected over serial port. Retrying in 5 seconds"*.
> **Cause:** Abruptly killing the daemon left the USB serial port in a
> **half-open / dropped** state, so the board's `/dev/cu.usbmodem*` was not cleanly
> available.
> **Fix:**
> ```bash
> # 1. Ctrl+C to stop the retry loop.
> # 2. Press the physical RESET button on the board; wait ~5s (re-enumerates).
> ls /dev/cu.usbmodem*
> # 3. Re-run once the port reappears:
> edge-impulse-run-impulse --continuous
> ```
> If still missing, unplug/replug + RESET.

**Status: C3-verify is TO-DO.** Once the serial port re-enumerates, re-running the
command above should stream live predictions.

**EXPECTED output** (from the runbook -- *not yet observed this session*):

```text
Edge Impulse impulse runner v1.39.1
[SER] Connecting to /dev/cu.usbmodem0004401586811
[SER] Connected to Silicon Labs Thunderboard Sense 2
Starting inferencing, press Ctrl+C to stop...
Predictions (DSP: 3 ms., Classification: 1 ms., Anomaly: 1 ms.):
    Circle:    0.04
    LeftRight: 0.02
    Random:    0.01
    UpDown:    0.05
    ZigZag:    0.88
    anomaly:   0.12
```

To confirm C3 complete, you want to see the predicted class track the gesture you
physically perform, and the `anomaly` score stay low for known gestures (and spike
for genuinely novel motion).

---

## What's next (TO-DO with EXPECTED results)

| Phase | Status | What it is | EXPECTED result (not yet observed) |
|---|---|---|---|
| **C3-verify** | TO-DO | Re-run `edge-impulse-run-impulse --continuous`, perform gestures | Live `Predictions` block tracks the gesture; `anomaly` low for known motion |
| **C4** | NOT done | Capture **real on-device latency** at 38.4MHz | ~2x the 80MHz Studio estimate (~17 ms est. -> ~30+ ms real); record actual DSP/classify/anomaly ms from the live `Predictions` header |
| **C5** | NOT done | Offline **BLE demo** -- predictions with USB serial unplugged, over BLE | Board advertises (BLE addr `08:6B:D7:FE:16:6D`), streams the same class predictions wirelessly with no host tether |

See [`../runbooks/C4-verify-benchmark.md`](../runbooks/C4-verify-benchmark.md) and
[`../runbooks/C5-ble-demo.md`](../runbooks/C5-ble-demo.md) for the prescriptive
steps.

---

## Deviations summary (real vs plan), C2 + C3

| Area | Plan said | As-built REALITY |
|---|---|---|
| Spectral features | ~33 features | **18 features** (FFT length 16) |
| Anomaly K-means | 32 components | **5 components** (default) |
| Negative class label | `none` | **`Random`** (case-sensitive set: `Circle`/`LeftRight`/`Random`/`UpDown`/`ZigZag`) |
| EON Tuner objective | "Maximize accuracy" | no such option -> **Minimize validation loss + Sort=Accuracy** |
| Studio target | the real board | **Cortex-M4F 80MHz reference** (real board is 38.4MHz, ~2x latency) |
| EON Tuner runtime | "up to 32 hours" | tiny dataset, but **ran overnight** (23:58 -> next morning) |

> **Secret-handling reminder.** Nowhere in this guide is a real Edge Impulse API
> key written. The daemon is authenticated with `edge-impulse-daemon --api-key
> ei_YOUR_KEY_HERE`, where `ei_YOUR_KEY_HERE` is a **placeholder**. Real keys are
> secrets -- never paste one into a file or commit it.
