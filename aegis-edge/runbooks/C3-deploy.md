# Milestone C3 — Deploy the Trained Impulse (Option A: prebuilt .bin drag-drop)

> **Goal:** Take the impulse you trained in Edge Impulse Studio (milestone C2),
> build it into a Thunderboard Sense 2 firmware binary, flash it by dragging the
> `.bin` onto the board's USB mass-storage drive, and reboot the board so it runs
> *your* on-device gesture classifier.
>
> **Path:** This is **Option A** — the fastest, lowest-friction path. The Studio
> builds a complete firmware image (sensor loop + DSP + neural net + serial
> output) for you; you only have to flash it. The C++ library / Gecko SDK route
> is **Option B** (see [`../firmware-option-b/`](../firmware-option-b/) and the
> conceptual guide).

**Board:** Silicon Labs Thunderboard Sense 2 (BRD4166A, bare
EFR32MG12P332F1024GL125, Cortex-M4F @ 38.4 MHz, 256 KB RAM, 1 MB flash, no NPU).
**USB mass-storage volume name:** `TB004`.

---

## Prerequisites

- [ ] **C2 complete:** impulse trained, Model-testing accuracy >= 95% on the
      held-out test set, no single class < 90% (see the impulse spec in the
      conceptual guide). Do **not** deploy a model you have not test-set
      validated — training accuracy alone is not acceptance.
- [ ] `edge-impulse-cli` installed and working (`edge-impulse-daemon --version`
      prints a version). See [`B1-tooling.md`](./B1-tooling.md) if it does not.
- [ ] The board enumerates as the `TB004` USB drive when plugged in (it ships
      with stock firmware that exposes this; the EI prebuilt firmware also
      exposes it). Confirm the drive mounts before you start.
- [ ] USB cable that carries **data**, not charge-only.

---

## Step 1 [HUMAN — browser] — Build the firmware in Studio

1. In Edge Impulse Studio, open your project and go to **Deployment**.
2. Under **"Build firmware"**, select the target **`Thunderboard Sense 2`**.
   - This produces the *complete, ready-to-run* firmware — it bundles the sensor
     sampling loop, your DSP block, your quantized (int8) neural network, and the
     serial classifier output. You do not write any code on this path.
3. Leave the optimization at the default the EON Tuner recommended (int8 /
   quantized). Quantized is what you validated in C2 — ship what you tested.
4. Click **Build**.
5. When the build finishes, the browser downloads a `.zip`. Unzip it.

### The `.bin` filename — read this carefully

| Source | Binary filename | Notes |
|--------|-----------------|-------|
| **Studio "Build firmware" download (this step)** | contains the prebuilt-style image | The canonical prebuilt name has **no hyphens**: `silabs-thunderboard-sense2.bin` |
| Build-from-source (Option B repo) | `firmware-silabs-thunderboard-sense-2.bin` | **Hyphenated** — different artifact, do not confuse the two |

> **Gotcha (verified):** The prebuilt artifact uses `thunderboardsense2`
> (no hyphens in `thunderboard`/`sense`/`2`); the from-source build output is
> fully hyphenated. If you ever pull the stock prebuilt directly instead of
> building, it is at
> `https://cdn.edgeimpulse.com/firmware/silabs-thunderboard-sense2.bin` — but for
> C3 you want **your** build from the Deployment tab, not the stock one.

---

## Step 2 [HUMAN — hardware] — Flash by drag-drop onto `TB004`

1. Plug the board into USB. Confirm the **`TB004`** drive appears
   (macOS: `/Volumes/TB004`; Linux: e.g. `/media/<user>/TB004`; Windows: a new
   removable drive).
2. **Drag the `.bin` onto the `TB004` drive root.** Do not put it in a subfolder.
3. **Wait ~30 seconds.** The bootloader writes flash and reboots the board. The
   drive will disappear and re-appear — that is normal.

> **If you see `FAIL.TXT` appear on the drive:** the drag-drop write failed
> (common causes: copied a `.hex`/`.s37` onto a raw-`.bin` slot, partial write,
> or a flaky enumeration). Open `FAIL.TXT` to read the reason, then fall back to
> a deterministic flash path in [`FLASHING.md`](./FLASHING.md) (Simplicity
> Studio "Upload application" or `commander flash <file> --address 0x0`).

---

## Step 3 [HUMAN — hardware] — Reboot into your impulse

The board reboots itself after the ~30 s flash. If it does not start running, or
to be sure you are on a clean boot:

- Press the **RESET** button on the board, **or** unplug/replug USB.

The board is now running *your* trained classifier. Nothing else is required for
the firmware to be live.

---

## Step 4 [HUMAN — terminal] — Acceptance: stream live predictions

> **CRITICAL — single serial port:** The board exposes **one** serial port.
> `edge-impulse-daemon` and `edge-impulse-run-impulse` will fight over it. **Stop
> the daemon first** (Ctrl-C the terminal running `edge-impulse-daemon`, or close
> it). Running both at once gives a "port busy" / "cannot open serial port"
> error.

```bash
# Make sure no edge-impulse-daemon is running, then:
edge-impulse-run-impulse --continuous
```

Perform each gesture (circle / zigzag / updown / leftright) and hold the board
still for `none`. You should see a continuous stream like:

```
Predictions (DSP: 19 ms., Classification: 1 ms., Anomaly: 0 ms.):
    circle:     0.94531
    zigzag:     0.01172
    updown:     0.02344
    leftright:  0.00781
    none:       0.01172
    anomaly score: 0.12
```

(Exact timings and scores vary — the numbers above are illustrative.
Reference on-board figures: **DSP ~17-21 ms, classify ~1 ms** — these are the
numbers you will formally capture in [C4](./C4-verify-benchmark.md).)

### Acceptance criteria (all must hold)

- [ ] `--continuous` streams without serial/port errors.
- [ ] Each of the 4 gestures lights up its **correct** label as the top class
      with clearly dominant confidence (eyeball it now; rigor is C4's job).
- [ ] Holding still classifies as `none` (and/or low anomaly score).
- [ ] No class is *systematically* mislabelled (e.g. `circle` always reading
      `zigzag` means a data/label problem — go back to C2, not the firmware).

When all four hold, **C3 is done.** Proceed to
[**C4 — verify & benchmark**](./C4-verify-benchmark.md) to formally capture
the latency numbers, then [**C5 — BLE demo**](./C5-ble-demo.md).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No `TB004` drive | Charge-only cable, or board in a bad state | Swap cable; press RESET; try another USB port |
| `FAIL.TXT` after drag | Write failed / wrong file type for slot | See [`FLASHING.md`](./FLASHING.md) recovery flow |
| `run-impulse` says port busy | `edge-impulse-daemon` still holding the port | Stop the daemon; only one process per serial port |
| Wrong class always wins | Model/label issue, not deploy issue | Re-check C2 data quality + labels; retrain |
| Board reboots into mass-storage but never classifies | Stale/partial flash | Reflash via [`FLASHING.md`](./FLASHING.md) Path B or C |

> **Reminder:** Data quality sets the accuracy ceiling, not the silicon. If the
> live stream is noisy or confused, the fix is almost always in the dataset
> (more/cleaner samples per class), not in the deployment step.
