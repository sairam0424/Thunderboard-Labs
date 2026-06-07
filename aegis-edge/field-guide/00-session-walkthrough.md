# Aegis Edge — As-Built Field Guide (Session Walkthrough)

> This is the **lived, as-built record** of actually bringing up a Silicon Labs
> Thunderboard Sense 2 and building the Aegis Edge gesture model end-to-end on
> macOS. It records the **real values used**, the **exact outputs observed**,
> **every error hit**, and **how each was fixed** — a screenshot-of-reality, not a
> plan.

> **Update (2026-06-08):** Since this session, C3 and C4 were confirmed on-device —
> the 85% model streams live predictions and measured latency is ~87.5 ms total /
> ~86 ms DSP @ 38.4 MHz. Only C5 (offline BLE demo) remains. See
> [`01-results-and-readings.md`](01-results-and-readings.md) and
> [`../benchmark/BENCHMARK.md`](../benchmark/BENCHMARK.md).

## What this is (and how it differs from the runbooks)

The prescriptive **runbooks** (`../runbooks/C0-setup.md` .. `../runbooks/C5-ble-demo.md`)
say what **SHOULD** happen — they are the recipe. This field guide says what
**ACTUALLY** happened when the recipe was followed for real, including the
deviations from the plan and the dead-ends. Read the runbook for the *procedure*;
read this guide for the *reality* — the exact numbers, the literal command output,
and the troubleshooting that the clean runbook hides.

Throughout this guide:

- **OBSERVED** = what really happened in this session (the as-built truth).
- **EXPECTED** = what should happen per the runbooks but was not yet observed
  this session (clearly labelled so you never mistake a prediction for a fact).
- **> NOTE / > DEVIATION / > ERROR** callouts flag secret-handling, real-vs-plan
  differences, and the errors hit + their fixes.

> **Secret-handling rule (applies to the whole guide):** API keys, passwords, and
> tokens are **secrets**. This guide uses the literal placeholder
> `ei_YOUR_KEY_HERE` everywhere a key would appear. **Never** write a real key
> into any file, and never commit one.

## Host environment (as-built)

| Component | Value (OBSERVED this session) |
|-----------|-------------------------------|
| OS / shell | macOS, `zsh` (MacBook Pro) |
| Node.js | `v24.16.0` |
| npm | `11.13.0` |
| Python | `3.14.4` |
| Edge Impulse CLI | `v1.39.1` |

> **DEVIATION (Node version):** the runbook (`../runbooks/C0-setup.md`,
> prerequisites) recommends **Node 22 LTS** and warns against older versions. This
> session ran **Node v24.16.0** and the EI CLI worked fine — install, daemon
> pairing, and data acquisition all succeeded. The Node-22 recommendation is a
> known-good baseline, not a hard requirement; v24 was the as-built reality.

## Target hardware (as-built)

| Property | Value |
|----------|-------|
| Board | Silicon Labs **Thunderboard Sense 2**, BRD4166A |
| SoC | bare **EFR32MG12P332F1024GL125**, Cortex-M4F @ **38.4 MHz** |
| Memory | 256 KB RAM, 1 MB flash, **no NPU** |
| Bootloader drive | USB mass-storage **`TB004`** -> mounts at `/Volumes/TB004` |
| Debug chip | on-board **SEGGER J-Link OB** (triggers a macOS "Allow accessory" prompt) |
| Serial port | `/dev/cu.usbmodem0004401586811` (also `/dev/tty.usbmodem...`) |

> **DEVIATION (reference target vs real silicon):** Edge Impulse Studio shows the
> target as **"Cortex-M4F 80MHz"**. That is EI's **reference** target for on-device
> *estimates* — it is **NOT** the real board, which runs at **38.4 MHz**. Treat
> every Studio latency/RAM estimate as an 80 MHz figure; the real 38.4 MHz number
> is roughly **~2x** and must be measured on-device (a C4 item, not yet captured).

<!-- =============================================================== -->

## C0 — Tooling, firmware flash, and daemon pairing

**Goal:** working toolchain on the Mac, EI ingestion firmware flashed to the board,
and the board showing up live in the Studio **Devices** tab.
Prescriptive procedure: `../runbooks/C0-setup.md`.

### C0.1 — Install the Edge Impulse CLI

```bash
npm install -g edge-impulse-cli
```

Confirm the version:

```bash
edge-impulse-daemon --version
# OBSERVED: 1.39.1
```

### C0.2 — Download the prebuilt EI ingestion firmware

The firmware is the official Edge Impulse ingestion build for this exact board.

```bash
curl -L -o silabs-thunderboard-sense2.bin \
  https://cdn.edgeimpulse.com/firmware/silabs-thunderboard-sense2.bin
```

OBSERVED result: a `silabs-thunderboard-sense2.bin` of **~457 KB** in the working
directory.

> **NOTE (filename has NO hyphens in "thunderboardsense2"):** the file is
> `silabs-thunderboard-sense2.bin` — hyphens separate `silabs`, `thunderboard`,
> `sense2`. Type it exactly; a wrong name yields a 404 from the CDN.

### C0.3 — Flash by COPYING the .bin onto the TB004 drive

The Thunderboard's bootloader is a USB mass-storage device. You flash by **copying
the firmware onto the drive** — the bootloader writes it to flash and reboots. You
do **not** run the `.bin`.

```bash
cp silabs-thunderboard-sense2.bin /Volumes/TB004/
# (or drag the .bin onto the TB004 drive in Finder)
```

Then **wait ~30 seconds**. OBSERVED success signals:

- The `TB004` drive **unmounts / remounts** (it briefly disappears from Finder).
- **No `FAIL.TXT`** appears on the drive. (A `FAIL.TXT` would indicate a rejected
  image.)

> **ERROR — `permission denied` when you try to "run" the .bin**
> **Symptom:** `zsh: permission denied: /Users/.../silabs-thunderboard-sense2.bin`
> **Cause:** the bare `.bin` path was typed as a **command**, so the shell tried to
> **execute** the firmware as a program. A `.bin` is data, not an executable.
> **Fix:** never run the `.bin`. Flash it by copying onto the drive:
> `cp <path>/silabs-thunderboard-sense2.bin /Volumes/TB004/` (or drag in Finder).

> **NOTE (`ls` alone does NOT confirm a flash):** the `TB004` bootloader drive shows
> the factory files `MBED.HTM`, `README.TXT`, `sl_kit.html`, `sl_qsg.html`
> **regardless of flash state**. Seeing those files does not mean the firmware
> took. The only real confirmation is the **daemon handshake** in C0.5 (the board
> appearing green in **Devices**).

> **ERROR — `TB004` does not mount (no drive in `/Volumes/`) but an LED is lit**
> **Symptom:** `ls /Volumes/` shows only `Macintosh HD`; the `TB004` drive never
> appears, yet a board LED is on.
> **Cause:** *power-but-no-data*. The board has power (LED on) but the USB **data**
> lines are not reaching the Mac — almost always a **charge-only micro-USB cable**,
> or a flaky USB-A<->USB-C **dongle/adapter** eating the data lines.
> **Fix:** use a **data-capable** cable; best is a single **USB-C -> micro-USB**
> cable plugged **directly** into the Mac (no dongle). The as-built fix this
> session: changed the cable + reseated the dongle, after which macOS popped the
> "Allow accessory to connect" prompt (below).
> **Diagnostics:**
> ```bash
> ls /Volumes/
> ls /dev/cu.usbmodem*
> system_profiler SPUSBDataType | grep -i -A3 -E 'silicon|segger|j-link'
> ```
> If J-Link shows in `system_profiler` but `TB004` does not mount, the data path is
> fine — a physical **RESET** press fixes the mount.

> **ERROR — macOS popups during connect/flash**
> **Symptom (1):** "Allow accessory to connect — Silicon Labs J-Link OB?"
> **Symptom (2):** "Disk Not Ejected Properly — Eject TB004 before disconnecting."
> **Cause:** (1) is macOS USB device authorization for the J-Link debug chip — it
> only fires for a real **data** device. (2) is macOS noticing `TB004` mounted then
> briefly dropped (normal during connect / flash / reboot).
> **Fix:** click **Allow** on the J-Link prompt — **denying it blocks the drive**.
> The "Disk Not Ejected" warning during connect/flash/reboot is **harmless** —
> ignore it. (For a clean detach later, eject `TB004` first.)

### C0.4 — Create / name the Edge Impulse project

In Edge Impulse Studio, create the project. OBSERVED as-built:

| Field | Value |
|-------|-------|
| Project ID | **1021910** |
| Project name | **aegis-edge-crawl** (auto-created as `Sairam0000-project-1`, then renamed) |
| Tier | Free Personal |
| Studio target shown | Cortex-M4F 80 MHz (reference only — see deviation above) |

### C0.5 — Pair the board with the daemon (API-key login workaround)

This is the step that **actually confirms the flash**. The first instinct is to run
`edge-impulse-daemon` and log in with email/password — but that failed here.

> **ERROR — daemon login: "you will need to set a password"**
> **Symptom:** `edge-impulse-daemon` login prints
> `WARN To use the CLI you will need to set a password.`
> **Cause:** the account was created via **Google OAuth (Google sign-in)**, so it
> has **no password**. The CLI cannot do OAuth — it needs a password **or** an API
> key.
> **Fix:** use an **API key**. In Studio: open the project -> **Keys** tab -> copy
> the `ei_...` key -> run:
> ```bash
> edge-impulse-daemon --api-key ei_YOUR_KEY_HERE
> ```
> (Alternative: set a password in Studio profile settings.)
> **Never commit a real key** — `ei_YOUR_KEY_HERE` is a placeholder.

When the daemon connects, name the device:

| Field | Value (OBSERVED) |
|-------|------------------|
| Device name | **tb-sense2-01** |
| Device type | **SILABS_TB_SENSE2** |
| MAC / BLE address | **08:6B:D7:FE:16:6D** |

**OBSERVED C0 success:** the Studio **Devices** tab showed a green
**"Connected to data acquisition (Built-in accelerometer, Built-in microphone)"**
status for `tb-sense2-01`. That green line — not `ls` — is the proof the firmware
flashed and the board is live.

> **NOTE (wrong-board flash tool — do not use):** during setup, the file
> `~/.vite-plus/bin/himax-flash-tool` was spotted and questioned. That is a flashing
> tool for **HIMAX** boards (WE-I / Grove Vision AI cameras), **NOT** Silicon Labs.
> Do **not** use it for the Thunderboard. The correct flash methods are the `TB004`
> drag-drop (above), Simplicity Studio "Upload application", or Simplicity Commander
> (`commander flash`) — see `../runbooks/FLASHING.md`.

**C0 status: DONE** — toolchain installed, firmware flashed, daemon paired, board
green in Devices.

<!-- =============================================================== -->

## C1 — Labeled gesture data collection

**Goal:** a clean, balanced, 5-class gesture dataset recorded live from the paired
board. Data quality sets the accuracy ceiling — not the silicon.
Prescriptive procedure: `../runbooks/C1-data-collection.md`.

### C1.1 — Data acquisition settings

In Studio -> **Data acquisition**, with `tb-sense2-01` selected. OBSERVED as-built
settings:

| Setting | Value |
|---------|-------|
| Device | **tb-sense2-01** |
| Sensor | **Built-in accelerometer** (3-axis: accX / accY / accZ) |
| Sample length | **10000 ms** (10 s) |
| Frequency | **62.5 Hz** |

> **NOTE (3-axis, not 6-axis):** the on-board IMU (ICM-20648) is 6-axis, but the
> proven recipe uses the **3 accelerometer axes only** — select **"Built-in
> accelerometer"** (accX/accY/accZ), **not** a 6-axis option. The whole downstream
> impulse (18 features, anomaly axes) assumes 3 accel axes.

### C1.2 — The five classes

| Label | Role |
|-------|------|
| **Circle** | gesture |
| **LeftRight** | gesture |
| **UpDown** | gesture |
| **ZigZag** | gesture |
| **Random** | **negative / idle class** (no deliberate gesture) |

> **DEVIATION (negative-class name):** the runbook plan called the negative class
> **`none`**; the as-built session used **`Random`** for that role. Same purpose
> (the "not a gesture" / idle catch-all) — just a different label string. The model
> in C2 reflects `Random` as the negative class.

> **NOTE (labels are case-sensitive):** EI treats labels as case-sensitive strings.
> Capitalized, consistent names were used throughout — `Circle`, `LeftRight`,
> `UpDown`, `ZigZag`, `Random`. A stray casing or typo creates a brand-new class.

> **NOTE (harmless "Randome" typo):** while typing into the label input box, a
> `Randome` typo briefly appeared — but **no stray `Randome` class was created**
> (the label was corrected before the sample committed). If you ever see an
> unexpected class in the Data acquisition class list, delete its samples and
> re-record under the correct label.

### C1.3 — Sample counts (as-built)

OBSERVED: **36 samples total, ~6 minutes** of recording.

| Class | Samples x length |
|-------|------------------|
| Circle | 8 x 10 s |
| LeftRight | 8 x 10 s |
| UpDown | 8 x 10 s |
| ZigZag | 8 x 10 s |
| Random | 4 x 10 s |
| **Total** | **36 samples (~6 min)** |

**OBSERVED data health:** the raw waveform showed **strong wiggling motion on all
three axes** for the gesture samples — exactly what a healthy accelerometer capture
looks like (not a flat line, not clipped rails).

### C1.4 — Train/test split

OBSERVED final split: **75% / 25% = 27 training / 9 test** samples, balanced evenly
per class (**2 test per gesture + 1 Random test**).

> **NOTE (mid-collection split warnings are HARMLESS):** while recording, Studio
> flashed an orange triangle with split warnings like **"100% / 0%"** and
> **"74% / 26%"**. These **self-correct** — the split rebalances as more samples
> land. **Do the rebalance AFTER collecting, not during.** Chasing the warning
> mid-collection wastes time; the end state settled cleanly at 75/25 (27/9).

**C1 status: DONE** — 5-class, 36-sample dataset, healthy 3-axis waveforms, balanced
75/25 split.

**Continued in [`00-session-walkthrough-part2.md`](./00-session-walkthrough-part2.md) — Part 2 (C2 + C3).**
