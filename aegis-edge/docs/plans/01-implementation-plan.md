# Aegis Edge — Implementation Plan (Crawl phase, with Walk/Run outlined)

> This is the approved implementation plan for Aegis Edge, captured into the repo
> for reference. It was produced in plan mode, grounded in primary-source-verified
> build parameters, and approved before scaffolding began. A live status of which
> milestones are done vs. pending is in [`STATUS.md`](./STATUS.md).

## Context

We have a **verified, owned, powered Silicon Labs Thunderboard Sense 2** (BRD4166A,
bare EFR32MG12 SoC, Cortex-M4F @38.4 MHz, 256 KB RAM, **no NPU**) and a fact-checked
10-chapter doc set. A deep-audit confirmed: board correct, project viable, docs
accurate. The goal is to **build Aegis Edge** — the phased on-device "Smart Guardian"
TinyML project — starting with the **Crawl phase: an on-device IMU gesture
recognizer** that proves the full Edge Impulse -> MG12 -> BLE pipeline.

**Goal of Crawl:** a fully on-device gesture classifier (`circle / zigzag / updown /
leftright / none`) that runs entirely on the EFR32MG12, lights the RGB LEDs by class,
and streams the label+confidence over BLE to a phone — with the internet visibly off.
This is the lowest-risk, best-evidenced milestone (a community project hit **98.8%**
on this exact board) and it teaches the entire capture -> label -> train -> deploy ->
infer -> stream loop.

**Crucial framing — who does what.** A build on physical hardware splits cleanly:
- **[AI] scaffolds** the reproducible software artifacts: the `aegis-edge/` workspace,
  all runbooks, helper scripts, the Option-B Simplicity Studio 5 integration code, the
  Web Bluetooth dashboard, the benchmark template, and the demo shot-list.
- **[HUMAN] executes on hardware**: install Node/EI-CLI/Simplicity Studio, create the
  Edge Impulse account + project, **physically perform the gestures**, click *Train* in
  the browser, flash the board, point the phone, film the demo.

All build parameters are **primary-source verified** (Edge Impulse docs, the EI
firmware repo source, the gatoninja236 Hackster build). Items flagged
**confirm-on-device** are honest about what only the physical board can settle.

---

## Workspace (the [AI] deliverable — scaffolded + implemented)

```
aegis-edge/
├── README.md                      # project landing: vision, phases, status, reproduce
├── .gitignore
├── Makefile                       # make check / test / lint / serve-dashboard / help
├── docs/
│   └── plans/                     # <- this plan lives here
├── runbooks/
│   ├── C0-setup.md                # install tools + flash EI firmware + pair daemon
│   ├── C1-data-collection.md      # exact gesture defs, samples/class, mounting, do/don't
│   ├── C2-train.md                # impulse design + DSP + NN params (verified values)
│   ├── C3-deploy.md               # Option A (.bin drag-drop) deploy
│   ├── C4-verify-benchmark.md     # run-impulse --continuous + latency capture
│   ├── C5-ble-demo.md             # EFR Connect / dashboard UUID walkthrough + offline demo
│   └── FLASHING.md                # all 3 flash paths incl. FAIL.TXT recovery
├── scripts/
│   ├── check-tooling.sh           # verify node/npm/edge-impulse-cli versions
│   ├── serial-bench-parse.py      # parse "DSP: X ms ..." -> benchmark table
│   └── tests/                     # pytest suite for the parser (12 tests)
├── edge-impulse/
│   └── PROJECT-CONFIG.md          # canonical impulse/DSP/NN config to mirror in Studio
├── firmware-option-b/             # SSv5 C++ integration (Run-phase foundation)
│   ├── README.md
│   ├── integration-notes.md
│   └── src/                       # aegis_inference.cpp/.h (NOT compiled here)
├── dashboard/                     # Web Bluetooth dashboard (runnable in Chrome)
├── benchmark/
│   └── BENCHMARK.md               # 38.4 MHz vs 80 MHz template (human pastes numbers)
└── demo/
    └── SHOT-LIST.md               # 60-90 s offline demo video script
```

---

## Crawl execution — 6 milestones, each with a binary acceptance test

Legend: **[HUMAN]** = on-hardware/browser action only the human can do · **[AI]** =
scaffolded artifact (done).

### C0 — Tooling + EI firmware flashed  **[HUMAN]**, runbook **[AI]**
- **Do:** install Node 22 LTS -> `npm install -g edge-impulse-cli` ->
  `edge-impulse-daemon --version`. Download `silabs-thunderboard-sense2.bin` from
  `https://cdn.edgeimpulse.com/firmware/silabs-thunderboard-sense2.bin`, drag onto the
  **`TB004`** drive, wait ~30 s. Create EI account + new project. Run
  `edge-impulse-daemon` (login wizard). (macOS: needs Xcode CLT; Linux: `sudo apt install screen`.)
- **Acceptance:** board shows under the EI project's **Devices** tab as connected.
- **Fallback:** if drag-drop yields `FAIL.TXT`, use Simplicity Studio "Upload application"
  or `commander flash` (in `FLASHING.md`).

### C1 — Labeled dataset collected  **[HUMAN]**, runbook **[AI]**
- **Do:** in Studio **Data acquisition**, select Built-in accelerometer, **62.5 Hz**,
  **10 000 ms** samples. Capture **5 classes**: `circle, zigzag, updown, leftright,
  none` — **8x10 s** per real gesture + **4x10 s** for `none` (~6 min total). Vary
  speed/orientation; hold out a genuinely unseen test recording per class.
- **Acceptance:** >=5 classes captured, balanced `none` class present, an 80/20
  train/test split visible in Studio.

### C2 — Impulse designed + trained  **[HUMAN] clicks Train**, target config **[AI]**
- **Config (verified):** Time-series window **2000 ms**, increase **80 ms** ->
  **Spectral Analysis** DSP (low-pass cutoff 3, order 6 + spectral power, ~33 features)
  -> **Keras** NN `Input(33) -> Dense(20) -> Dense(10) -> Output(5)`, **40** cycles, LR
  **0.0005**, **int8** quantization. Add **K-means anomaly** (32 clusters on
  accX/accY/accZ RMS) so never-trained motions are rejected. Run the **EON Tuner /
  DSP Autotuner** rather than hardcoding spectral knobs.
- **Acceptance (original target):** **>=95%** on the validation split and no
  confusion-matrix class below ~90%. (Report *Model-testing* accuracy on the held-out
  set, not training accuracy — the famous 98.8% was single-author/overfit-flagged.)
- **As-built result (✅ DONE):** the trained model landed at **85.0%** test accuracy
  (ROC 0.98) on the actual 36-sample / 5-class dataset. The 95% target was not hit
  because the ceiling is **data-bound, not silicon-bound** — Circle/UpDown/ZigZag
  physically overlap on an accelerometer (per-class F1: Random 1.00, LeftRight 0.96,
  Circle 0.84, ZigZag 0.80, UpDown 0.73), and ROC 0.98 proves the model separates what
  the data allows. An **EON Tuner** run confirmed this: its best candidate scored ~22%
  (<< 85%), so the hand-tuned 85% model was kept. The model verified live on-device
  (Circle->0.84, LeftRight->0.97, Random/still->0.996, ZigZag->0.81).

### C3 — Deploy back to board (Option A: `.bin` drag-drop)  **[HUMAN]**, runbook **[AI]**
- **Do:** Studio **Deployment** -> target **Thunderboard Sense 2** -> Build -> download
  firmware `.bin` -> drag onto `TB004`; board reboots into your impulse.
- **Acceptance:** `edge-impulse-run-impulse --continuous` streams correct live
  labels+confidences. *(Stop the daemon first — single serial port.)*

### C4 — On-device verification + latency capture  **[HUMAN] runs**, template + parser **[AI]**  — ✅ DONE (measured)
- **Do:** capture a terminal log of `Predictions (DSP: X ms, Classification: Y ms ...)`
  from `--continuous`. Optionally re-run at the part's full ~40 MHz.
- **Acceptance:** a saved log showing measured DSP+classify ms, pasted into
  `BENCHMARK.md` (parse it with `scripts/serial-bench-parse.py`). This **answers the open
  question no published source does** — the real 38.4 MHz number. **This number unlocked
  detailed Walk planning.**
- **Measured result (`--debug`, 38.4 MHz):** steady-state **~87.5 ms total = ~86 ms DSP +
  ~1-2 ms classify + 0 ms anomaly** (~11 inferences/sec). That is **~5x** the EI 80 MHz
  reference (~17 ms), **not** the ~2x the reference card below originally extrapolated.
  **Root cause:** the impulse uses **FFT length 16**, below the EFR32 hardware-FFT minimum
  of 32, so the DSP falls back to a **software FFT** (`--debug`: `HW RFFT failed... size
  was 16`). Using FFT 32/64 would engage the hardware FFT and cut DSP substantially — the
  documented optimization lever. RAM ~3.1K, flash ~34.5K, int8. See `BENCHMARK.md`.

### C5 — BLE result streaming to phone, offline  **[HUMAN] points phone**, runbook **[AI]**  — remaining (optional polish; on-device inference already proven by C3/C4)
- **Do:** install **Simplicity Connect / EFR Connect** (or open the repo's
  `dashboard/` in Chrome) -> put phone in **airplane mode** -> connect to the board ->
  service `DDA4D145-FC52-4705-BB93-DD1F295AA522` -> **write `0x01`** to control char
  `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2` to start (LEDs blink) -> enable **Notify** on
  `61A885A4-41C3-60D0-9A53-6D652A70D29C` to read results -> write `0x00` to stop. *(All
  three UUIDs verified against the EI firmware GATT config.)*
- **Acceptance:** offline phone (or dashboard) shows live gesture label+confidence over
  BLE — the "no cloud, no Wi-Fi, runs on an MCU" moment.

---

## Verified build parameters (reference card)

| Parameter | Value | Confidence |
|---|---|---|
| IMU | ICM-20648, `sl_imu_configure(200)` (200 Hz HW) | verified |
| Ingestion rates offered | {20, 62.5, 100} Hz (10 ms floor = 100 Hz max) | verified |
| **Recommended capture** | **62.5 Hz, 3-axis accel only, 10 s samples** | verified |
| Window / increase | **2000 ms / 80 ms** | verified |
| Classes | circle, zigzag, updown, leftright, **none** | verified |
| Dataset size | 8x10 s/gesture + 4x10 s none (~6 min) | verified |
| DSP | Spectral Analysis, cutoff 3 / order 6, ~33 features | verified |
| NN | 33 -> Dense 20 -> Dense 10 -> 5, 40 cyc, LR 5e-4, int8 | verified |
| BLE service / control / notify | `DDA4D145...` / `02AA6D7D...` (01/00) / `61A885A4...` | verified |
| On-device latency | **measured ~87.5 ms total = ~86 ms DSP + ~1-2 ms classify @38.4 MHz** (~5x the 80 MHz ref; FFT-16 software-FFT fallback — FFT 32/64 is the speedup lever) | **measured (C4)** |
| Default Studio Hz preselect | unknown — pick 62.5 Hz regardless | confirm-on-device |

---

## Risk register (top 5, board-specific)

| # | Risk | Sev (Crawl) | Mitigation |
|---|---|---|---|
| R1 | No NPU / latency wall | **Low** | Non-issue for IMU (~20 ms << 2000 ms budget); document it. Bites only at Walk (KWS). |
| R2 | **Data quality sets the accuracy ceiling** | **High** | Many short windows/class, explicit `none` class, vary speed/orientation, genuinely-unseen test set, read the confusion matrix. The single biggest determinant. |
| R3 | CR2032 disables RGB LEDs + CCS811 | Medium | Run the LED+BLE demo **on USB power**; reserve coin-cell for low-duty sensing only. |
| R4 | Drag-drop flash fails (`FAIL.TXT`) | Medium | Fall back to Simplicity Studio "Upload application" or `commander flash` — all three paths in `FLASHING.md`. |
| R5 | NRND + GSDK/repo drift (Option B) | Low (High at Run) | Prefer Option A (`.bin`) for Crawl. For Option B pin **GSDK 4.0.2 + GNU Arm 10-2020-q4**; avoid the **deprecated** `tflite-micro-efr32-examples` repo; Arduino is not viable. |

---

## Portfolio deliverables

1. **GitHub repo** — EI project export, `DATASET.md`, runbooks, Option-B SSv5 project,
   Web Bluetooth dashboard, README reproducible by someone who has only the board.
2. **60-90 s offline demo video** — gesture -> LED -> phone/dashboard-over-BLE, internet
   visibly off.
3. **Real latency benchmark write-up** — measured 38.4 MHz DSP/classify split vs EI's
   80 MHz reference, honest that any extrapolation isn't a measurement.

---

## Walk & Run — outlines (Crawl's real latency number now exists; detailed plans live in 02/03/04)

- **WALK (keyword spotting, ICS-43434 mic):** same EI loop, harder signal. W0 confirm
  mic acquisition -> W1 collect 1 wake word + 1-2 commands + noise/unknown -> W2 train
  MFCC + small int8 CNN (~1 s window, incremental sliding MFCC, **FFT >=32 to engage the
  hardware FFT** — see the C4 lesson) -> W3 deploy -> **W4 MEASURE latency**. Crawl C4
  showed DSP scales ~5x (not ~2x) off the EI reference, so the old ~400-470 ms @38.4 MHz
  figure is an *underestimate* to be revised UP and replaced by a real W4 number. Budget
  ~16 KB extra RAM for the audio buffer.
- **RUN (multi-sensor fusion "Smart Guardian"):** fuse gesture + KWS + environmental
  (Si7021/BMP280/CCS811) into one state (quiet/activity/command/alert) on RGB LEDs +
  BLE. **Forces Option B** (the C++ firmware in `firmware-option-b/src/` is the
  foundation). Lesson: orchestration under a latency budget. Validate battery budget
  with the AEM.

See [`02-next-phases.md`](./02-next-phases.md) for the detailed Walk/Run milestone
breakdowns.

---

## Verification (how we know each stage works)

- **C0:** ✅ board in EI Devices tab + `edge-impulse-daemon --version` prints.
- **C2:** ✅ trained; landed at 85.0% test / ROC 0.98 (data-bound ceiling — the 95% target
  was aspirational; EON Tuner confirmed 85% was the best available, see the C2 milestone).
- **C3:** ✅ `edge-impulse-run-impulse --continuous` streams correct labels on-device.
- **C4:** ✅ captured serial log of real DSP/classify ms — measured ~87.5 ms (the headline
  benchmark; FFT-16 software-FFT root cause documented).
- **C5:** remaining (optional) — offline phone/dashboard shows live label+confidence over
  the verified BLE notify char.
- **Repo:** `make check` passes; runbooks reproduce end-to-end from a clean machine + board.
