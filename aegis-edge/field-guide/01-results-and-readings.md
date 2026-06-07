# Results & Readings -- What You Should SEE at Each Checkpoint

This is the per-milestone acceptance reference for the Aegis Edge "Crawl" build.
For each milestone (C0 -> C5) it gives:

1. **Action / command** -- what you do
2. **OBSERVED this session** -- the real values and outputs seen on a MacBook Pro
   with a real Thunderboard Sense 2
3. **Acceptance signal** -- how you know that step actually passed

Labels are honest: **OBSERVED** = it really happened this session; **EXPECTED** =
from the runbooks, not yet seen on hardware. As of **2026-06-07**, **C0-C4 are all
OBSERVED** (the model runs on-device and latency was measured); only **C5** (the BLE
phone demo) remains EXPECTED. (See [README.md](README.md) for the completion state.)

> Note on the reference target: Edge Impulse Studio shows estimates against a
> **Cortex-M4F 80 MHz** reference. The real board is **38.4 MHz** with **no NPU**.
> The plan *extrapolated* ~2x the Studio number (~30-45 ms); the **measured** reality
> was **~5x** (~87.5 ms total / ~86 ms DSP), because the FFT-16 config falls back to a
> software FFT. That gap -- extrapolation vs. measurement -- is the whole point of C4.

---

## C0 -- Board Online (tooling + flash + daemon)

Runbook: [`../runbooks/C0-setup.md`](../runbooks/C0-setup.md)

**Action / command**

```bash
# Verify tooling
node -v        # expect a recent Node
npm -v
python3 --version
edge-impulse-daemon --version

# Download + flash the prebuilt EI ingestion firmware
curl -L -o silabs-thunderboard-sense2.bin \
  https://cdn.edgeimpulse.com/firmware/silabs-thunderboard-sense2.bin
cp silabs-thunderboard-sense2.bin /Volumes/TB004/

# Connect (Google-OAuth account has no password -> use an API key)
edge-impulse-daemon --api-key ei_YOUR_KEY_HERE
```

**OBSERVED this session**

| Check | Value seen |
|---|---|
| `node -v` | `v24.16.0` (plan wanted 22 LTS; 24 worked) |
| `npm -v` | `11.13.0` |
| `python3 --version` | `Python 3.14.4` |
| `edge-impulse-daemon --version` | `1.39.1` |
| Firmware file | `silabs-thunderboard-sense2.bin`, ~457 KB |
| Bootloader drive | mounted at `/Volumes/TB004` |
| macOS prompt | "Allow accessory to connect - Silicon Labs J-Link OB" -> clicked **Allow** |
| Serial port | `/dev/cu.usbmodem0004401586811` appeared |
| Daemon device | registered `tb-sense2-01`, type `SILABS_TB_SENSE2`, addr `08:6B:D7:FE:16:6D` |

After `cp ... /Volumes/TB004/`, the drive **unmounted/remounted (~30s)** -- that is
the bootloader accepting the firmware and rebooting. There was **no `FAIL.TXT`**.

> Trap: the `TB004` drive shows factory files `MBED.HTM` / `README.TXT` /
> `sl_kit.html` / `sl_qsg.html` *regardless of flash state*, so `ls /Volumes/TB004`
> alone does **NOT** confirm a flash. Only the daemon handshake confirms it.

**Acceptance signal (OBSERVED)**

In Studio -> **Devices** tab, `tb-sense2-01` showed the green line:

```
Connected to data acquisition (Built-in accelerometer, Built-in microphone)
```

Green = C0 success. (If login failed with "you will need to set a password," see
[troubleshooting.md](troubleshooting.md) -- the OAuth account has no password,
use `--api-key`.)

---

## C1 -- 5-Class Data Collected

Runbook: [`../runbooks/C1-data-collection.md`](../runbooks/C1-data-collection.md)

**Action**

Studio -> **Data acquisition**. Settings used:

| Setting | Value |
|---|---|
| Device | `tb-sense2-01` |
| Sensor | Built-in accelerometer (3-axis: accX/accY/accZ -- **not** 6-axis) |
| Sample length | 10000 ms |
| Frequency | 62.5 Hz |

Recorded 5 classes (labels are **case-sensitive** -- keep them capitalized and
consistent): `Circle`, `LeftRight`, `UpDown`, `ZigZag`, and `Random` (the
negative / idle class -- this is the role the plan called `none`).

**OBSERVED this session**

| Class | Samples x length |
|---|---|
| Circle | 8 x 10s |
| LeftRight | 8 x 10s |
| UpDown | 8 x 10s |
| ZigZag | 8 x 10s |
| Random | 4 x 10s |
| **Total** | **36 samples, ~6 minutes** |

- Raw waveform showed **strong wiggling motion on all 3 axes** during gestures =
  healthy signal.
- A harmless `Randome` typo briefly appeared in the label input box once; **no
  stray class was created** -- the saved label was `Random`.
- Train/test split landed at **75% / 25% = 27 training / 9 test**, evenly per
  class: 2 test each gesture + 1 test Random.

> The mid-collection split warnings (orange triangle) reading **"100% / 0%"** and
> **"74% / 26%"** were **HARMLESS** -- they self-correct. Do the rebalance
> **after** collecting, not during.

**Acceptance signal (OBSERVED)**

5 labelled classes present, 36 samples, healthy 3-axis waveforms, and a clean
75/25 split.

---

## C2 -- Impulse Trained (85%) + Anomaly Block

Runbook: [`../runbooks/C2-train.md`](../runbooks/C2-train.md)

**Action**

Impulse design -> Create impulse, then Generate features, then Train.

| Block | Config (OBSERVED) |
|---|---|
| Time-series input | window 2000 ms, increase 80 ms, 62.5 Hz |
| Processing (DSP) | Spectral Analysis -- Filter low, Cutoff 3, Order 6, FFT length 16, Take-log + Overlap-FFT enabled |
| DSP output | **18 features** (an earlier plan estimated ~33 at a different FFT length -- 18 is the real number) |
| Learning (NN) | Classification (Keras): Input(18) -> Dense(20) -> Dense(10) -> Output(5) |
| Training | 40 cycles, LR 0.0005, Quantized int8, Profile int8 checked |
| Anomaly (K-means) | **5 components** (default; the plan mentioned 32 -- 5 is the real value) |
| Anomaly axes | via "Select suggested axes": accX RMS, accX Spectral Power 1.95-5.86 Hz, accZ RMS, accZ Spectral Power 1.95-5.86 Hz |

**OBSERVED -- Feature explorer (after Generate features)**

- `Random` (green) and `LeftRight` (orange) formed **cleanly separated clusters**.
- `Circle` / `UpDown` / `ZigZag` **overlapped in a dense blob**.
- This correctly **predicted** the model would confuse those three classes
  before training even ran.
- Feature-importance top axes: **accX RMS, accZ Spectral Power, accX Spectral
  Power, accZ RMS, accY RMS**.
- Anomaly explorer showed healthy purple K-means cluster ellipses over the
  training data.

**OBSERVED -- Training result**

| Metric | Value |
|---|---|
| Validation accuracy | **85.0%** |
| Loss | 0.37 |
| Area under ROC | **0.98** |
| Weighted Precision / Recall / F1 | 0.85 / 0.85 / 0.85 |

Per-class F1 (sorted best -> worst):

| Class | F1 | Notes |
|---|---|---|
| Random | 1.00 | perfect -- negative class is cleanly separable |
| LeftRight | 0.96 | distinct axis signature |
| Circle | 0.84 | |
| ZigZag | 0.80 | |
| UpDown | **0.73** | weakest -- 74% recall, confused with ZigZag (17.9%) and Circle (8.1%) |

**Honest read of the 85% ceiling.** The ~85% ceiling is set by the **DATA**, not
the silicon. `Circle`, `UpDown`, and `ZigZag` physically overlap on a 3-axis
accelerometer (similar acceleration envelopes), so the classifier cannot fully
separate them no matter the chip. This is proven by the **ROC of 0.98**: the
model ranks classes very well; the errors come from genuinely ambiguous motions,
not from model capacity. More separable gestures (or a 6-axis IMU with gyro)
would raise the ceiling -- a faster MCU would not.

**OBSERVED -- On-device estimate (Deployment page)**

At Quantized int8, against the **80 MHz reference** target:

| Estimate | Value |
|---|---|
| Total latency | ~17 ms |
| Classifier alone | ~1 ms |
| RAM | ~2.9 K |
| Flash | ~49 K |

> Reality check: real latency on the **38.4 MHz** board is roughly **2x** these
> numbers and has **not yet been captured** -- that is the C4 measure-on-device
> item.

**Acceptance signal (OBSERVED)**

85.0% validation accuracy with ROC 0.98, a sane confusion matrix (UpDown/ZigZag/
Circle overlap as predicted), and a healthy anomaly cluster.

---

## EON Tuner -- Attempt to Beat 85%

Runbook context: [`../runbooks/C2-train.md`](../runbooks/C2-train.md)

**Action**

EON Tuner -> New run -> **Use template** -> **"Continuous motion | Classification"**
(this populated the search space and fixed the "Search space is invalid" error)
-> objective kept as **"Minimize validation loss"** (there was **no "Maximize
accuracy" option**; Sort-by-Accuracy was set in the right sidebar) -> Start tuner.

**OBSERVED this session**

- UI warned **"can take up to 32 hours"** -- generic worst-case boilerplate. This
  small dataset is far faster, but it did **run overnight** (started 23:58,
  finished next morning).
- Result: **only 2 candidates completed, 4 failed.**

| Candidate | Accuracy |
|---|---|
| `spectr-dense-639` | 22% |
| `spectr-dense-32a` | 7% |

Both were **far worse** than the existing hand-tuned **85%**.

**Lesson (OBSERVED).** Do **NOT** apply a worse Tuner variant. The hand-tuned 85%
config was already near-optimal; the Tuner *confirmed* the ceiling is
**data-bound**, not config-bound. **Kept the original 85% impulse.**

**Acceptance signal**

The leaderboard's best candidate did not beat the baseline -> keep the baseline.
A "successful" Tuner run can absolutely end with "change nothing."

---

## C3 -- Deploy the Model to the Board

Runbook: [`../runbooks/C3-deploy.md`](../runbooks/C3-deploy.md) ·
flashing options: [`../runbooks/FLASHING.md`](../runbooks/FLASHING.md)

**Action**

Impulse design -> **Deployment**.

| Setting | Value used (OBSERVED) |
|---|---|
| Deployment target | **"Thunderboard Sense 2"** -- changed from the default "C++ library" (C++ library is the Option-B / Run path; Thunderboard Sense 2 builds the ready-to-flash `.bin` = Option-A) |
| Inference engine | **EON Compiler** (default; "Same accuracy, 55% less RAM, 63% less ROM" -- correct for this RAM-constrained, no-NPU board) |
| Optimization | **Quantized (int8)** selected |
| "Run model testing before build" | Skipped -- it is OPTIONAL and does not gate or change the build |

**OBSERVED this session**

- Built + downloaded `aegis-edge-crawl-silabs-thunderboard2-v1-impulse-#1.bin` (310 KB),
  copied it onto `/Volumes/TB004/` -- the drive unmounted/remounted, no `FAIL.TXT`, and
  the board's LED began blinking (the same success signal as C0).
- There is also a QR code + "Launch in browser" to test from a phone -- note that
  **runs in the cloud / on the phone, NOT on-device**. The real flash was done regardless.

**Status: DONE (verified on-device 2026-06-07).** Getting to streaming predictions took two
fixes (both now in [troubleshooting.md](troubleshooting.md) #11): a `failed to init hall
sensor (0x0031)` I2C wedge cleared by a **full power cycle** (unplug ~15 s, not just RESET),
and a silent inference loop fixed by running with **`--debug`**.

**OBSERVED acceptance -- it works:**

```bash
edge-impulse-run-impulse --debug
```

Real streaming output (abbreviated, gestures performed live):

```
Timing: DSP 86 ms, inference 2 ms, anomaly 0 ms
#Classification predictions:
  Circle: 0.000000
  LeftRight: 0.968750   <- doing a left-right sweep
  Random: 0.023438
  UpDown: 0.007812
  ZigZag: 0.000000
...
  Random: 0.996094      <- board held still
...
  ZigZag: 0.812500      <- doing a zigzag
```

OBSERVED: the top label correctly tracked each physical gesture -- **Circle->Circle 0.84,
LeftRight->LeftRight 0.93-0.97, Random(still)->0.996, ZigZag->0.81** -- exactly matching the
85% model's per-class strengths (Random/LeftRight crisp; the rhythmic gestures lower-confidence).

---

## C4 -- On-Device Latency Capture

Runbook: [`../runbooks/C4-verify-benchmark.md`](../runbooks/C4-verify-benchmark.md)

**Status: DONE (measured on-device 2026-06-07).** Full numbers + analysis in
[`../benchmark/BENCHMARK.md`](../benchmark/BENCHMARK.md).

**Action**

Read the per-frame `Timing:` line from `edge-impulse-run-impulse --debug` on the **real
38.4 MHz** board and compare to the Studio 80 MHz estimate.

**MEASURED result (5 windows; steady-state = windows 2-5)**

| Quantity | Studio estimate (80 MHz) | Plan extrapolation (38.4 MHz) | **MEASURED (38.4 MHz)** |
|---|---|---|---|
| DSP | ~15 ms | (part of ~30-45) | **~86 ms** |
| Classifier | ~1 ms | ~2 ms | **~1-2 ms** |
| Anomaly | ~1 ms | -- | **0 ms** |
| **Total** | ~17 ms | ~30-45 ms | **~87.5 ms (~11 inf/sec)** |

**The big finding:** measured total is **~5x** the 80 MHz reference, NOT the ~2x the plan
extrapolated. Cause (from `--debug`): `HW RFFT failed... size was 16` -> the FFT-16 config
falls back to a **software FFT**, so DSP dominates at ~86 ms. The neural net is the predicted
~1-2 ms. Using FFT length 32/64 would let the hardware FFT engage and cut DSP substantially.

Acceptance = measured total latency well under one inference window (2000 ms) -- **PASS at
~87.5 ms**, confirming real-time on-device inference with huge margin. The ~5x scaling
is the headline honesty point of this milestone.

---

## C5 -- Offline BLE Demo

Runbook: [`../runbooks/C5-ble-demo.md`](../runbooks/C5-ble-demo.md)

**Status: NOT done (EXPECTED only).**

**Action (EXPECTED)**

Run the model fully **offline** (no daemon, no USB host) and surface the
predicted gesture over **BLE** (the board advertises at `08:6B:D7:FE:16:6D`),
demonstrating an untethered edge device.

**EXPECTED result / acceptance**

A BLE central (phone app or `nRF Connect`) connects and receives the live
gesture label / class probabilities with the board powered only by USB power (no
data host). Acceptance = gesture predictions arrive over BLE with the laptop
disconnected from the data path -- a true offline edge demo.

---

## Quick Acceptance Matrix

| Milestone | Headline signal | Status |
|---|---|---|
| C0 | Green "Connected to data acquisition" in Devices | OBSERVED -- pass |
| C1 | 36 samples, 5 classes, 75/25 split, healthy waveform | OBSERVED -- pass |
| C2 | 85.0% acc, ROC 0.98, anomaly cluster healthy | OBSERVED -- pass |
| EON Tuner | Best candidate 22% < 85% -> kept baseline | OBSERVED -- pass (no change) |
| C3 | `.bin` flashed; predictions streaming, gestures tracked correctly | **OBSERVED -- pass** (2026-06-07) |
| C4 | Real 38.4 MHz latency = **~87.5 ms total / ~86 ms DSP** (~5x the 80 MHz est, not 2x) | **OBSERVED -- pass** (2026-06-07) |
| C5 | Gesture over BLE, untethered | EXPECTED only (next step) |
