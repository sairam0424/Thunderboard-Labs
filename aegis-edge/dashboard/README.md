# Aegis Edge - Web Bluetooth Dashboard

A browser-based alternative to the phone app for reading **live, on-device
TinyML gesture inference** streamed over Bluetooth Low Energy from a
**Silicon Labs Thunderboard Sense 2** (BRD4166A / EFR32MG12) running the
Edge Impulse gesture-classification firmware.

It shows a big live gesture name, an animated confidence bar, a Start/Stop
inference toggle, and an event log - all running entirely in your browser.

---

## Offline / airplane-mode framing

Everything here is **on-device**. The model runs on the EFR32MG12; this page
just reads the results. The only radio in use is **Bluetooth LE to the board**.
You can (and arguably should) run this with **Wi-Fi off / in airplane mode** -
no data leaves your machine, nothing is sent to any server, there is no
backend. The page is three static files served locally.

---

## Tested against a live board? **NO.**

> This dashboard was written from **primary-source verified BLE UUIDs** taken
> from the Edge Impulse firmware GATT config. It has **not** been run against a
> physical Thunderboard Sense 2 in this environment.
>
> In particular, the **notify payload byte layout is NOT fully documented**.
> `app.js` parses it **defensively**: it assumes `{byte0 = class index,
> byte1 = confidence}`, falls back to single-byte and ASCII-label frames, and
> **always shows the raw hex** of the last frame in the UI so you can confirm /
> reverse the true format on a real board. Nothing crashes on an unexpected
> frame - it degrades to "Unknown frame" plus hex.
>
> **Verify on-device** and adjust `parseResult()` if the real layout differs.

---

## Verified BLE identifiers

| Role             | UUID                                   | Notes                                  |
| ---------------- | -------------------------------------- | -------------------------------------- |
| Service          | `DDA4D145-FC52-4705-BB93-DD1F295AA522` | Filtered on in `requestDevice`         |
| Control (write)  | `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2` | Write `0x01` = start, `0x00` = stop    |
| Results (notify) | `61A885A4-41C3-60D0-9A53-6D652A70D29C` | Subscribe via `startNotifications()`   |

Class index -> gesture (and the board's suggested LED color):

| Index | Gesture        | LED color |
| ----- | -------------- | --------- |
| 0     | circle         | blue      |
| 1     | zigzag         | green     |
| 2     | updown         | red       |
| 3     | leftright      | purple    |
| 4     | none           | off       |

---

## How to run it

Web Bluetooth requires a **secure context**: either `https://` or
`http://localhost`. Opening the file directly with a `file://` URL will **not**
work. Serve the folder over localhost with any static server, for example:

```bash
# from inside aegis-edge/dashboard/
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

Other equivalents that also work:

```bash
npx serve .        # Node
php -S localhost:8000
```

### Using it

1. Power the Thunderboard Sense 2 over **USB** (note: the on-board RGB LEDs are
   dead on a CR2032 coin cell - they need USB power) and make sure the EI
   gesture firmware is flashed and advertising.
2. Click **Connect to board** and pick the device in the browser's chooser.
3. Click **Start inference** - this writes `0x01` to the control characteristic
   and subscribes to results notifications.
4. Perform gestures; the live name + confidence bar update from the notify
   stream. The raw hex of the last frame is shown under the bar.
5. Click **Stop inference** (writes `0x00`) or **Disconnect** when done.

---

## Browser support

| Browser                     | Supported? |
| --------------------------- | ---------- |
| Chrome (desktop / Android)  | Yes        |
| Edge (desktop)              | Yes        |
| Opera / other Chromium      | Generally yes |
| **iOS Safari**              | **No** - Web Bluetooth is not implemented |
| **Firefox** (any platform)  | **No** - Web Bluetooth is not enabled |

> Web Bluetooth is a Chromium feature. **iOS Safari and Firefox do not support
> it at all** - there is no flag to enable it on stock iOS. Use Chrome or Edge.

The dashboard feature-detects `navigator.bluetooth` on load and disables the
Connect button with a clear message on unsupported browsers.

---

## Files

| File         | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| `index.html` | UI shell: connect button, status pill, gesture display, confidence bar, log |
| `app.js`     | Web Bluetooth logic, defensive notify parser, start/stop control   |
| `style.css`  | Dark theme; large gesture display; animated confidence bar         |
| `README.md`  | This file                                                          |

No build step, no dependencies, no secrets.
