# Aegis Edge - Offline Demo Shot List (60-90 s)

> **All shots are `[HUMAN films]`** on real hardware. The whole point of the demo
> is to prove the gesture recognizer runs **on the MCU itself** - **no cloud, no
> Wi-Fi** - so the offline setup is part of the story, on camera.

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
