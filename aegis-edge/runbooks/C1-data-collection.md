# Milestone C1 — Labeled Gesture Data Collection

> Goal: build a clean, balanced, 5-class gesture dataset in Edge Impulse Studio,
> recorded live from the board you paired in [C0](./C0-setup.md). This dataset is the
> single biggest lever on final accuracy — **data quality sets the ceiling, not the
> silicon** (gotcha 10). A perfect model on bad data is still a bad demo.

**Prerequisite:** [C0](./C0-setup.md) complete — board online in the Studio
**Devices** tab, `edge-impulse-daemon` running.

**Conceptual background:** [../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md](../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)

---

## Classes and gesture motions

Five labels. Hold the board in a consistent grip (see "Mounting & orientation"
below) and perform each motion for the full sample window.

| Label | Physical motion |
|-------|-----------------|
| `circle` | Trace a circle in the air, board roughly face-up, ~hand-sized loops, continuous. |
| `zigzag` | Sharp left-right "W/M" sawtooth strokes in a horizontal plane. |
| `updown` | Vertical lift-and-drop, board moving up then down repeatedly along one axis. |
| `leftright` | Horizontal side-to-side sweeps, board translating left then right. |
| `none` | The negative/idle class: board still, plus *random* non-gesture motion (see do/don't). |

> `none` is the most important and most often under-built class. A weak `none` makes
> the model fire on everything. Treat it as a first-class gesture, not an afterthought.

---

## Capture settings (Studio -> Data acquisition)  `[HUMAN]` (browser)

| Setting | Value | Note |
|---------|-------|------|
| Sensor | **Built-in accelerometer** | 3-axis accel only — **not** the 6-axis path (gotcha 9). |
| Sample length | **10000 ms (10 s)** | One gesture repeated for the full 10 s. |
| Frequency | **62.5 Hz** | Board offers {20, 62.5, 100} Hz; 100 Hz is the 10 ms floor. **`confirm-on-device`** — the default Studio Hz preselect is unverified; pick 62.5 Hz regardless and confirm it sticks on the board. |
| Axes | `accX` / `accY` / `accZ` (m/s^2) | Gyro is only present on the 6-axis path; we do not use it. |

> The IMU hardware is configured at 200 Hz internally via `sl_imu_configure(200)`, but
> that is **not** your ingestion rate — ingest at **62.5 Hz** (gotcha 3). 200 Hz HW
> != 62.5 Hz ingestion.

---

## The recipe (~6 minutes of recording)

Per gesture and the totals:

| Label | Samples x length | Total |
|-------|------------------|-------|
| `circle` | 8 x 10 s | 80 s |
| `zigzag` | 8 x 10 s | 80 s |
| `updown` | 8 x 10 s | 80 s |
| `leftright` | 8 x 10 s | 80 s |
| `none` | 4 x 10 s | 40 s |
| **Total** | | **~360 s (~6 min)** |

Workflow for each sample  `[HUMAN]`:

1. In Data acquisition, set **Label** to the gesture, length **10000 ms**, freq **62.5 Hz**.
2. Click **Start sampling**, immediately begin the motion, keep going for the full 10 s.
3. Repeat until you have the per-label counts above.

---

## Mounting & orientation guidance  `[HUMAN]`

- Pick ONE grip and keep the USB cable exit and board face consistent across all
  samples (the model learns axis directions; inconsistent orientation pollutes them).
- Keep the board on **USB power** throughout (gotcha 7) — do not switch to CR2032.
- Keep the cable slack so it does not yank or add its own motion signature.

---

## Do / Don't

**Do**
- Vary **speed** and **size** of each gesture across its 8 samples (slow + fast, big + small).
- Vary your **orientation/grip slightly** within reason so the model generalizes.
- Make `none` genuinely varied: include **dead-still** segments AND **random
  non-gesture motion** (setting the board down, picking it up, idle hand jitter, walking).
- **Hold out one unseen recording per class** for the test set (see split below) —
  record it in a separate session/grip so it truly tests generalization.

**Don't**
- Don't record all 8 reps identically — that overfits to one tempo/orientation.
- Don't let `none` be only "perfectly still" — the model will then flag any motion.
- Don't switch sensors mid-dataset (stay on 3-axis accelerometer — gotcha 9).
- Don't trust the on-board freq blindly — **confirm 62.5 Hz on device**.

---

## Train/test split  `[HUMAN]` (browser)

- Use Studio's **Train / Test split** (target **80/20**). Studio can auto-split, but
  prefer **explicitly assigning your held-out per-class recordings to Test** so the
  test set reflects unseen sessions, not just random frames from training takes.
- Verify in the Data acquisition view that both Training and Test buckets show all 5
  labels and that `none` is present in both.

---

## Acceptance criteria (C1 done when)

- [ ] **>= 5 classes** present: `circle`, `zigzag`, `updown`, `leftright`, `none`.
- [ ] Per-label counts roughly match the recipe; **`none` is balanced** (not starved,
      not dominating), with both still and random-motion content.
- [ ] An **80/20 train/test split is visible** in Studio, with held-out per-class
      recordings in the Test bucket.
- [ ] All samples are 3-axis accelerometer @ 62.5 Hz (`confirm-on-device`).

**Next:** [C2 — Design & Train the Impulse](./C2-train.md)
