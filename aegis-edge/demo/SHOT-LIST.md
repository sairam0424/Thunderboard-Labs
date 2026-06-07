# Aegis Edge - Offline Demo Shot List (60-90 s)

> **All shots are `[HUMAN films]`** on real hardware. The whole point of the demo
> is to prove the gesture recognizer runs **on the MCU itself** - **no cloud, no
> Wi-Fi** - so the offline setup is part of the story, on camera.

---

## Recorded demo videos (the deliverables)

Two demo videos were recorded and live **in this folder locally** (`aegis-edge/demo/`):

| File | Length | Audio | Use |
|------|--------|-------|-----|
| `Aegis-edge-demo.mp4` | ~68 s | with sound | original recording |
| `Aegis-Edge-Demo-2.mp4` | ~36 s | with sound | original recording |
| `Aegis-edge-demo-no-audio.mp4` | ~68 s | **silent** | **demo cut** (audio stripped losslessly) |
| `Aegis-Edge-Demo-2-no-audio.mp4` | ~36 s | **silent** | **demo cut** (audio stripped losslessly) |

> **The `-no-audio` files are the intended demo cuts.** Audio was removed losslessly
> (`ffmpeg -c:v copy -an` - video bitstream untouched: same H.264, 848x478, 30 fps,
> identical duration). The originals were kept intact.

> **These `.mp4` files are intentionally NOT committed to git** (see the repo
> `.gitignore`). Large binaries bloat git history forever; demo media is kept out
> and this SHOT-LIST documents it. To share them, attach the `-no-audio` cuts as
> **GitHub Release assets** (or use Git LFS) rather than committing raw.

### Image assets in this folder (committed)

```
demo/
├── screenshots/   <- Edge Impulse Studio captures (the numbers)
├── frames/        <- stills pulled from the demo video (proof it runs live)
└── *.mp4          <- raw videos (gitignored; share via Release assets)
```

**Edge Impulse Studio screenshots** (`screenshots/`, the crisp readable evidence):

| File | Shows |
|------|-------|
| `screenshots/ei-01-impulse-design.png` | The impulse pipeline: Time-series -> Spectral Analysis -> Classification + Anomaly -> 6 outputs |
| `screenshots/ei-02-spectral-dsp.png` | Spectral DSP block: raw 3-axis waveform, low-pass filter response, spectral power (~14 ms processing) |
| `screenshots/ei-03-classifier-85pct-confusion-matrix.png` | **The headline result** - 85% accuracy, ROC 0.98, per-class F1, confusion matrix, data explorer, on-device 1 ms / 3.1K RAM / 34.5K flash |
| `screenshots/ei-04-anomaly-explorer.png` | K-means anomaly clusters + on-device 3 ms / 6.3K RAM |
| `screenshots/ei-05-deployment.png` | Deployment page: Thunderboard Sense 2 target, EON Compiler, int8, perf table |

**Video frames** (`frames/`, stills pulled from the demo `.mp4` via ffmpeg):

| File | Shows |
|------|-------|
| `frames/demo-hero-board-terminal-studio.png` | **Hero shot** - board in hand + live terminal predictions + EI Studio on the laptop, all in one frame |
| `frames/demo-board-led-inferring.png` | Board with the blue LED lit while inferencing |
| `frames/demo-live-predictions.png` | Clean shot of the terminal streaming live gesture predictions |

> Why this split: **screenshots** carry the precise numbers (the 85% matrix, on-device
> timings); the **video frames** prove it runs live on real hardware. PNGs are committed;
> the raw `.mp4` videos are gitignored (see repo `.gitignore`) - share those as GitHub
> Release assets or via Git LFS.

- **Total runtime target:** 60-90 seconds.
- **Hardware:** Thunderboard Sense 2 on **USB power** (the RGB LEDs are **dead on
  the CR2032 coin cell** - USB is required for the LED to be visible).
- **Reader app:** Silicon Labs **Simplicity Connect** (formerly EFR Connect):
  - iOS: https://apps.apple.com/us/app/id1030932759
  - Android: https://play.google.com/store/apps/details?id=com.siliconlabs.bledemo
- **Gestures (5 classes):** `circle`, `zigzag`, `updown`, `leftright`, `none`.
- LED colors below assume the Option B class -> color mapping. With **stock
  Option A firmware there may be no LED feedback** - in that case lean on the
  phone-screen label as the on-camera proof. **Confirm-on-device** which build you
  are filming.

---

## The "no internet" framing (show it, don't just say it)

Open with proof of offline operation, so viewers see the inference is local:

1. **Phone -> Airplane Mode ON** (Wi-Fi + cellular off). Show the airplane icon
   in the status bar on camera. (Re-enable Bluetooth only, which airplane mode
   allows, so Simplicity Connect can still read the BLE notifications.)
2. **Host laptop -> offline.** Toggle Wi-Fi off on the laptop too, on camera, if
   it appears in frame. Nothing here talks to a server.
3. Caption the takeaway: **"No cloud. No Wi-Fi. The model runs on the MCU."**

---

## Shot sequence

| # | Shot | Duration | On-screen caption |
|---|------|----------|-------------------|
| 1 | Close-up: phone status bar with **airplane mode ON** (BT only). | ~5 s | `Phone offline - airplane mode. No cloud.` |
| 2 | The Thunderboard Sense 2 on **USB power**, LED idle/off. | ~5 s | `Thunderboard Sense 2 - EFR32MG12, no NPU, 38.4 MHz.` |
| 3 | Open **Simplicity Connect**, connect to the board, subscribe to the results characteristic. | ~8 s | `BLE only - reading results over Bluetooth.` |
| 4 | Perform **circle** -> LED turns **blue** -> phone shows `circle` + confidence. | ~10 s | `circle -> on-device inference -> BLE notify.` |
| 5 | Perform **zigzag** -> LED **red** -> phone shows `zigzag` + confidence. | ~10 s | `zigzag` |
| 6 | Perform **updown** -> LED **green** -> phone shows `updown` + confidence. | ~10 s | `updown` |
| 7 | Perform **leftright** -> LED **orange** -> phone shows `leftright` + confidence. | ~10 s | `leftright` |
| 8 | Hold still (**none**) -> LED **off** -> phone shows `none`. | ~6 s | `none - it knows when nothing is happening.` |
| 9 | Cutaway: the measured inference time (from BENCHMARK.md), e.g. card overlay. | ~6 s | `~XX ms per inference @ 38.4 MHz (measured).` |
| 10 | Closing card. | ~5 s | `Aegis Edge - TinyML on a bare MCU. Offline.` |

> Adjust per-gesture duration to land inside 60-90 s. If LED feedback is absent
> (stock firmware), drop the color callouts and keep the phone-label beats.

---

## On-screen captions (copy-paste)

- `Phone offline - airplane mode. No cloud.`
- `Thunderboard Sense 2 - EFR32MG12, no NPU, 38.4 MHz.`
- `BLE only - reading results over Bluetooth.`
- `circle / zigzag / updown / leftright / none`
- `~XX ms per inference @ 38.4 MHz (measured)`  <!-- fill from BENCHMARK.md -->
- `No cloud. No Wi-Fi. The model runs on the MCU.`
- `Aegis Edge - TinyML on a bare MCU. Offline.`

---

## Pre-flight checklist [HUMAN]

Before you hit record:

- [ ] Board flashed with the working model `.bin` and verified classifying
      (run `edge-impulse-run-impulse --continuous` once to confirm - then
      **stop it** so it does not hold the single serial port during filming).
- [ ] Board on **USB power** (required for RGB LED; CR2032 will not drive it).
- [ ] Phone in **airplane mode** with **Bluetooth re-enabled**; Simplicity
      Connect installed and already paired/connected once.
- [ ] Laptop Wi-Fi **off** if the laptop is visible in frame.
- [ ] Each of the 5 gestures rehearsed so they classify reliably on camera
      (data quality sets the ceiling - practice the motion you trained).
- [ ] The measured inference number from
      [`../benchmark/BENCHMARK.md`](../benchmark/BENCHMARK.md) is ready for the
      Shot 9 overlay (do **not** quote the unmeasured ~30-45 ms estimate on camera).
- [ ] Good lighting on the LED (it is small; a tight close-up sells the color change).
- [ ] Storage/space on the recording device; do a 5 s test clip first.
