# Milestone C5 — BLE Result Streaming to a Phone (Offline)

> **Goal:** Stream live classification results from the board to a phone over
> Bluetooth Low Energy, with **the phone in airplane mode (fully offline)** — the
> demo that proves on-device, edge, no-cloud inference. You connect with the
> Silicon Labs Simplicity Connect app, write a start byte to the control
> characteristic, and watch labels arrive as BLE notifications.

**Prereq:** [C3](./C3-deploy.md) flashed and [C4](./C4-verify-benchmark.md)
verified. The Edge Impulse prebuilt Thunderboard Sense 2 firmware exposes the EI
GATT service — no extra firmware work for Option A.

---

## Hardware power note (read first)

> **Run this demo on USB power.** The board's **RGB LEDs are DEAD on a CR2032
> coin cell** (verified) — and the CCS811 air-quality sensor is also disabled on
> coin-cell power. The LEDs that blink to indicate classification activity only
> work when the board is **USB-powered**. BLE itself works on either, but you
> lose the visual LED feedback on CR2032.

For the cleanest demo: board on USB, phone offline. The point of airplane mode is
the phone, not the board.

---

## Step 1 [HUMAN — phone] — Install Simplicity Connect

Silicon Labs **Simplicity Connect** (formerly *EFR Connect*) is the BLE
explorer/reader app.

- **iOS:** https://apps.apple.com/us/app/id1030932759
- **Android:** https://play.google.com/store/apps/details?id=com.siliconlabs.bledemo

Install it **before** going offline (the install needs the network; the demo does
not).

---

## Step 2 [HUMAN — phone] — Go offline

1. Enable **Airplane mode** on the phone.
2. Re-enable **Bluetooth** only (airplane mode usually turns BT off; toggle BT
   back on while leaving Wi-Fi/cellular off).

The phone now has no internet path. Anything it displays came from the board over
BLE — that is the offline-edge claim, demonstrated.

---

## Step 3 [HUMAN — hardware] — Power the board

- Plug the board into USB (for LED feedback + stable power). It boots running
  your impulse from C3.
- The board advertises its BLE name. It should appear in Simplicity Connect's
  scan list.

---

## Step 4 [HUMAN — phone] — Connect and use the EI GATT service

> **VERIFIED UUIDs** from the Edge Impulse firmware GATT config. Use these
> exactly — do not substitute.

| Role | UUID | Operation |
|------|------|-----------|
| **Service** | `DDA4D145-FC52-4705-BB93-DD1F295AA522` | container |
| **Control** (write) | `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2` | write `0x01` = **start**, `0x00` = **stop** |
| **Results** (notify) | `61A885A4-41C3-60D0-9A53-6D652A70D29C` | enable **Notify** to receive predictions |

Walkthrough in Simplicity Connect:

1. **Scan** and tap your board to **connect**.
2. Expand the service **`DDA4D145-FC52-4705-BB93-DD1F295AA522`**.
3. On the **results** characteristic
   `61A885A4-41C3-60D0-9A53-6D652A70D29C`, tap **Notify** (the bell / "enable
   notifications" toggle) so the phone subscribes.
   - Subscribing sets the CCCD (Client Characteristic Configuration Descriptor).
     Notifications only flow when this is enabled.
4. On the **control** characteristic
   `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2`, **write the single byte `0x01`** to
   **start** streaming inference results.
5. Perform gestures (circle / zigzag / updown / leftright) and hold still for
   `none`. The **results** characteristic now pushes notifications carrying the
   predicted **label + confidence** on each inference.
6. To **stop**, write **`0x00`** to the control characteristic
   `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2`.

> In Simplicity Connect, write the byte in **hex** (`01` / `00`), not decimal
> text. The control characteristic expects a single raw byte.

---

## Step 5 — LED feedback (USB power only)

When USB-powered, the board's LEDs react to classification activity, giving an
at-a-glance "it's inferring" signal during the demo. On CR2032 you will not see
this — the BLE notifications are still the source of truth.

> **confirm-on-device:** exact LED color/blink mapping per class is firmware-build
> dependent — verify what your flashed firmware actually does rather than assuming
> a fixed color-to-gesture mapping.

---

## Acceptance criteria (C5 done when all hold)

- [ ] Phone is in **airplane mode** (no internet), Bluetooth on.
- [ ] Simplicity Connect connects to the board and shows service
      `DDA4D145-FC52-4705-BB93-DD1F295AA522`.
- [ ] **Notify** enabled on results char `61A885A4-41C3-60D0-9A53-6D652A70D29C`.
- [ ] Writing `0x01` to control `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2` starts a
      live stream of **label + confidence** notifications.
- [ ] Performed gestures show the **correct** label on the offline phone in real
      time; writing `0x00` stops the stream.

That completes the CRAWL phase end-to-end: **train (C1/C2) -> deploy (C3) ->
benchmark (C4) -> offline BLE demo (C5)**.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Board not in scan list | Off / not advertising / BT off on phone | Press RESET; confirm BT (not just airplane mode) is on |
| Service not visible | Connected before services resolved | Disconnect/reconnect; let GATT discovery finish |
| No notifications after `0x01` | CCCD not subscribed | Enable **Notify** on `61A885A4-...` *before* writing `0x01` |
| `0x01` write rejected | Wrote to wrong characteristic / wrong format | Write hex `01` to control `02AA6D7D-...`, not to results |
| Connects but no labels | Daemon/serial tool holding the board | A serial session does not block BLE, but a board mid-reflash will — finish [C3](./C3-deploy.md) cleanly |
| No LED blink | Board on CR2032 | Switch to USB power; LEDs are dead on coin cell |

> Custom GATT / notifying your own characteristic is an **Option B** topic
> (`sl_bt_gatt_server_send_notification(...)`, gated on CCCD `client_config_flags == 2`)
> — see [`../firmware-option-b/`](../firmware-option-b/). For C5 on Option A you
> use the EI firmware's built-in service above; no firmware changes needed.
