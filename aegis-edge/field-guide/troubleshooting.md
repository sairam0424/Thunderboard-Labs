# Aegis Edge -- Troubleshooting (As-Built Error Catalog)

> **What this is:** The single most valuable file for anyone reproducing this build.
> Every entry below is a **real** error hit during the live macOS bring-up of the
> Thunderboard Sense 2 + Edge Impulse Crawl gesture model -- with the exact symptom
> observed, the actual root cause, and the fix that actually worked.
>
> This is the AS-BUILT counterpart to the prescriptive runbooks. When a runbook step
> goes sideways, look here first.
>
> **Related runbooks:** [../runbooks/C0-setup.md](../runbooks/C0-setup.md) (tooling +
> flash + daemon) and [../runbooks/FLASHING.md](../runbooks/FLASHING.md) (all flash
> methods).

---

## Quick diagnostic commands

Keep these four in your back pocket. Most issues in this catalog are diagnosed in
under a minute by running them in order.

```bash
# 1. Did the USB mass-storage bootloader drive mount?  (expect /Volumes/TB004)
ls /Volumes/

# 2. Did the board enumerate a serial port?  (expect /dev/cu.usbmodem...)
ls /dev/cu.usbmodem*

# 3. Is the data path alive? Look for the J-Link OB debug chip on USB.
system_profiler SPUSBDataType | grep -i -A3 -E 'silicon|segger|j-link'

# 4. Is the Edge Impulse daemon running? (and how to stop it cleanly)
pgrep -f edge-impulse-daemon || echo 'daemon stopped'
pkill -f edge-impulse-daemon          # force-stop a wedged daemon
```

**Reading the results:**

| Command | Healthy output | What it tells you |
|---------|----------------|-------------------|
| `ls /Volumes/` | `Macintosh HD  TB004` | Bootloader drive mounted -> ready to flash by copy |
| `ls /dev/cu.usbmodem*` | `/dev/cu.usbmodem0004401586811` | Board presents a serial port -> ready for `run-impulse` |
| `system_profiler ... grep j-link` | shows `J-Link OB` / `Silicon Labs` | USB **data** lines reach the Mac (not charge-only) |
| `pgrep -f edge-impulse-daemon` | a PID, or `daemon stopped` | Whether a daemon is holding the serial port |

---

## 1. TB004 drive does not appear / LED is lit but no drive

This was the **first and most time-consuming** issue of the whole session -- the "dongle saga".

| Field | Detail |
|-------|--------|
| **Symptom** | `TB004` drive does not appear; `ls /Volumes/` shows only `Macintosh HD`; but an LED **is** lit on the board (so it clearly has power). |
| **Cause** | **Power-but-no-data.** The board has power (LED on) but the USB **data** lines are not reaching the Mac. Almost always a **charge-only micro-USB cable**, or a flaky **USB-A <-> USB-C dongle/adapter** that eats the data lines. A lit LED proves power, *not* a working data path. |
| **Fix** | Use a **data-capable** cable -- best is a single **USB-C -> micro-USB cable plugged DIRECTLY into the Mac** (no dongle). The session's actual fix: swapped the cable + reseated the dongle, after which macOS popped *"Allow accessory to connect - Silicon Labs J-Link OB?"* -> clicked **Allow**, and `TB004` mounted. |

**Diagnose it (run all three):**

```bash
ls /Volumes/                # is TB004 there?
ls /dev/cu.usbmodem*        # is a serial port there?
system_profiler SPUSBDataType | grep -i -A3 -E 'silicon|segger|j-link'
```

**Decision tree from the diagnostics:**

- **Nothing shows in any of the three** -> dead data path. Replace the cable (charge-only
  is the #1 culprit), drop the dongle, plug USB-C -> micro-USB straight into the Mac.
- **`j-link` shows in `system_profiler` but `TB004` is not in `/Volumes/`** -> the data
  path is **fine**; the drive just needs a nudge. Press the physical **RESET** button on
  the board, wait ~5s, re-check `ls /Volumes/`.

**How to confirm it's fixed:** `ls /Volumes/` lists `TB004`, and/or macOS shows the
*"Allow accessory to connect - Silicon Labs J-Link OB?"* prompt (which only fires for a
real **data** device). Click **Allow**.

> See [../runbooks/C0-setup.md](../runbooks/C0-setup.md) for the first-connect sequence.

---

## 2. macOS popups: "Allow accessory to connect" and "Disk Not Ejected Properly"

| Field | Detail |
|-------|--------|
| **Symptom** | Two macOS popups: (a) *"Allow accessory to connect - Silicon Labs J-Link OB?"* and (b) *"Disk Not Ejected Properly - Eject TB004 before disconnecting."* |
| **Cause** | (a) macOS USB **device authorization** for the J-Link OB debug chip -- it only fires for genuine **data** devices (so seeing it is actually good news). (b) macOS noticing `TB004` mounted and then briefly dropped -- this is **normal** during connect, flash, and reboot. |
| **Fix** | **Click ALLOW** on the J-Link prompt -- **denying it blocks the drive** from ever mounting. The *"Disk Not Ejected"* warning during connect/flash/reboot is **harmless** -- ignore it. (For a clean detach later, eject `TB004` in Finder first.) |

**How to confirm it's fixed:** After clicking **Allow**, `ls /Volumes/` shows `TB004`.
The *"Disk Not Ejected"* toast needs no action -- it self-resolves.

> **Golden note:** the J-Link prompt is a *signal*, not a problem. No prompt at all
> usually means you're back at Issue #1 (charge-only cable / no data path).

---

## 3. "permission denied" when running the .bin

| Field | Detail |
|-------|--------|
| **Symptom** | `zsh: permission denied: /Users/.../silabs-thunderboard-sense2.bin` |
| **Cause** | The bare `.bin` path was typed as a **command**, so the shell tried to **execute** the firmware as a program. A `.bin` is **data** (a firmware image), not an executable -- it is never meant to be run on the host. |
| **Fix** | **Never run the `.bin`.** You **flash** it by **copying it onto the bootloader drive**, which the on-board bootloader then writes to flash. |

**What NOT to do:**

```bash
# WRONG -- this tries to execute the firmware on your Mac
/Users/.../silabs-thunderboard-sense2.bin
```

**What to do instead:**

```bash
# RIGHT -- copy the firmware onto the TB004 bootloader drive
cp ./silabs-thunderboard-sense2.bin /Volumes/TB004/
# (or just drag the file onto the TB004 drive in Finder)
```

**How to confirm it's fixed:** After the copy, the `TB004` drive unmounts/remounts
within ~30s (that reboot is success -- see Issue #9). No `FAIL.TXT` appears on the drive.

> See [../runbooks/FLASHING.md](../runbooks/FLASHING.md) for all three flash methods
> (TB004 drag-drop, Simplicity Studio "Upload application", Simplicity Commander).

---

## 4. Daemon login fails: "you will need to set a password" (Google sign-in)

| Field | Detail |
|-------|--------|
| **Symptom** | `edge-impulse-daemon` login prints: `WARN To use the CLI you will need to set a password.` |
| **Cause** | The Edge Impulse account was created via **Google OAuth**, so it has **no password**. The CLI cannot perform an OAuth flow -- it needs either a password **or** an API key. |
| **Fix** | Authenticate with an **API key** instead of email/password. In Studio: open your project -> **Keys** tab -> copy the `ei_...` key -> pass it to the daemon. (Alternative: set a password under Studio profile settings.) |

```bash
# Authenticate the daemon with an API key (recommended for Google-sign-in accounts)
edge-impulse-daemon --api-key ei_YOUR_KEY_HERE
```

> **SECURITY -- do not skip:** `ei_YOUR_KEY_HERE` is a **placeholder**. A real key is a
> **secret**: never paste it into a file, a commit, a screenshot, or this repo. If a real
> key ever lands in version control, treat it as compromised and **rotate it** in the
> Studio **Keys** tab immediately.

**How to confirm it's fixed:** The daemon proceeds past auth and prints the connection
handshake, ending in the board showing up green under Studio -> **Devices** as
`tb-sense2-01`.

---

## 5. EON Tuner: "Search space is invalid"

| Field | Detail |
|-------|--------|
| **Symptom** | EON Tuner refuses to start: *"Search space is invalid"*, with red **X** marks on empty `inputBlocks` / `dspBlocks` / `learnBlocks`. |
| **Cause** | The search space is **empty** -- the Tuner has nothing to search over, so it cannot start a run. |
| **Fix** | Populate the search space from a template. In the EON Tuner: **New run -> Use template -> "Continuous motion \| Classification"**. This matches sustained gestures + a classification head and fills the space with FFT + wavelet DSP blocks, multiple window sizes, and Dense models. |

**How to confirm it's fixed:** The red **X** marks clear, the `inputBlocks` /
`dspBlocks` / `learnBlocks` show populated candidates, and the **Start** button becomes
active.

> **As-built note:** for a *pure accuracy chase*, do **not** add anomaly-detection
> variants to the search space -- keep it to classification blocks.

---

## 6. EON Tuner has no "Maximize accuracy" objective

| Field | Detail |
|-------|--------|
| **Symptom** | The EON Tuner **run objective** dropdown has no *"Maximize accuracy"* option -- only **Minimize validation loss**, Minimize latency, Minimize RAM, Minimize ROM. |
| **Cause** | This version of the EON Tuner frames the **primary objective** as *loss*; latency / RAM / ROM are the alternative primary objectives. There simply is no accuracy objective in this UI. |
| **Fix** | Keep **"Minimize validation loss"** as the objective (lower loss tracks higher accuracy closely enough), and set **Sort = Accuracy** in the right-hand sidebar so the results **leaderboard** ranks candidates by accuracy. |

**How to confirm it's fixed:** The run starts with *Minimize validation loss*, and the
results table is sorted top-to-bottom by accuracy once candidates complete.

> **As-built reality:** in this session the Tuner ran overnight (UI warned *"can take up
> to 32 hours"* -- generic boilerplate; this small dataset finished by morning). Only 2
> of 6 candidates completed: best `spectr-dense-639` at **22%** and `spectr-dense-32a` at
> **7%** -- **both far worse** than the hand-tuned **85%**. **Lesson: do not apply a worse
> Tuner variant.** The original 85% impulse was kept; the Tuner merely confirmed the
> ceiling is **data-bound**, not silicon-bound.

---

## 7. Daemon will not quit on Ctrl+C

| Field | Detail |
|-------|--------|
| **Symptom** | `edge-impulse-daemon` won't exit on Ctrl+C; it prints *"Received stop signal, stopping application... Press CTRL+C again to force quit"* with a backlog of queued `^C`. |
| **Cause** | The daemon **catches the first Ctrl+C** to attempt a clean shutdown and asks for a **second** to force-quit. It can **wedge** mid-upload, ignoring the queued signals. |
| **Fix** | Press **Ctrl+C once more, decisively**, and wait. If it stays wedged, force-kill it from **another terminal**. |

```bash
# In a second terminal: force-kill the wedged daemon, then verify it's gone
pkill -f edge-impulse-daemon
pgrep -f edge-impulse-daemon || echo 'daemon stopped'
```

**How to confirm it's fixed:** `pgrep -f edge-impulse-daemon` prints nothing (or you see
`daemon stopped`), and your shell prompt returns.

> **Caution:** an abrupt `pkill` can leave the USB serial port half-open -- see Issue #8,
> which is the direct sequel to this one.

---

## 8. run-impulse: "Could not find any devices" after pkill

| Field | Detail |
|-------|--------|
| **Symptom** | After a `pkill`, `edge-impulse-run-impulse --continuous` loops: *"Could not find any devices connected over serial port. Retrying in 5 seconds."* |
| **Cause** | Abruptly killing the daemon left the USB **serial port in a half-open / dropped state**, so the board's `/dev/cu.usbmodem*` is not cleanly available to a new process. |
| **Fix** | Stop the retry loop, **physically RESET the board** to re-enumerate the serial port, confirm it's back, then re-run. |

```bash
# 1. Ctrl+C to stop the retry loop
# 2. Press the physical RESET button on the board, wait ~5s (re-enumerates the port)
ls /dev/cu.usbmodem*          # confirm the port is back, e.g. /dev/cu.usbmodem0004401586811
# 3. Re-run continuous inference
edge-impulse-run-impulse --continuous
```

If `/dev/cu.usbmodem*` is **still** missing after the reset: **unplug / replug** the
board, then press **RESET** again.

**How to confirm it's fixed:** `ls /dev/cu.usbmodem*` lists the port, and `run-impulse`
gets past the retry loop into streaming inference output.

> **As-built note:** this exact issue **interrupted C3 live-verification** in the session
> -- the flash succeeded, but streaming predictions were not yet confirmed when the serial
> port dropped. C3-verify remains a **to-complete** item.

---

## 9. TB004 disappears after copying the .bin -- this is SUCCESS, not an error

| Field | Detail |
|-------|--------|
| **Symptom** | The `TB004` drive **disappears** from Finder right after you copy the `.bin` onto it. |
| **Cause** | **Expected behavior.** The bootloader **accepted** the firmware, **wrote it to flash**, and **rebooted** the board. The mass-storage drive unmounts during/after that reboot. |
| **Fix** | **None needed -- this is the success signal**, not a failure. The board is now running the new firmware and presents a **serial port** instead of a drive. |

```bash
# After the drive vanishes, the board should now expose a serial port:
ls /dev/cu.usbmodem*
# Then drive inference:
edge-impulse-run-impulse --continuous
```

**To get `TB004` back** (e.g. to re-flash): press the physical **RESET** button, or
**unplug / replug** the board.

> **Why `ls` alone can't confirm a flash:** the `TB004` bootloader drive always shows the
> factory files `MBED.HTM`, `README.TXT`, `sl_kit.html`, `sl_qsg.html` **regardless of
> flash state**. So listing the drive proves nothing about your firmware. The real
> confirmation is the **daemon handshake** (board appears green under Studio -> Devices)
> or a successful `run-impulse` stream.

**How to confirm it's fixed / succeeded:** No `FAIL.TXT` was written to the drive, the
drive unmounted, and a `/dev/cu.usbmodem*` serial port is now present.

---

## 10. himax-flash-tool is the WRONG tool for this board

| Field | Detail |
|-------|--------|
| **Symptom** | While hunting for a flash method, opened `~/.vite-plus/bin/himax-flash-tool` wondering whether it applies to the Thunderboard. |
| **Cause** | `himax-flash-tool` is a flashing utility for **Himax** boards (WE-I Plus / Grove Vision AI cameras), **not** Silicon Labs. Wrong vendor, wrong SoC, wrong flash protocol. |
| **Fix** | **Do not use `himax-flash-tool` for the Thunderboard Sense 2.** Use one of the three correct methods: (1) **TB004 drag-and-drop** (copy the `.bin` onto the drive), (2) **Simplicity Studio "Upload application"**, or (3) **Simplicity Commander** (`commander flash`). |

```bash
# The correct, simplest flash path for this board:
cp ./silabs-thunderboard-sense2.bin /Volumes/TB004/
```

**How to confirm it's fixed:** You flashed via a Silicon Labs method (drive copy /
Simplicity Studio / Commander) and the board rebooted into the new firmware (Issue #9).

> See [../runbooks/FLASHING.md](../runbooks/FLASHING.md) for the full step-by-step of all
> three Silicon Labs flash methods.

---

## The one golden rule

> **LED on but no `TB004` drive == it's the data path, not the board.**
> A lit LED only proves **power**. A missing drive almost always means a **charge-only
> cable** or a **flaky dongle** eating the USB data lines. Swap to a data-capable
> **USB-C -> micro-USB cable plugged straight into the Mac** before suspecting anything
> else, and click **Allow** when macOS asks about the *Silicon Labs J-Link OB*.
