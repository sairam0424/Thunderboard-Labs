# Milestone C0 — Tooling Setup, Firmware Flash, and Daemon Pairing

> Goal: a working toolchain on your laptop, the Edge Impulse (EI) ingestion firmware
> flashed to the board, and the board showing up live in your EI project's **Devices**
> tab. After C0 you can collect data ([C1](./C1-data-collection.md)).

**Board:** Silicon Labs Thunderboard Sense 2 (BRD4166A, bare EFR32MG12P332F1024GL125,
Cortex-M4F @38.4MHz, 256KB RAM, 1MB flash, **no NPU**). USB mass-storage drive
enumerates as **`TB004`**. IMU is the ICM-20648 (6-axis); the proven recipe uses the
**3 accelerometer axes only** (see [C1](./C1-data-collection.md) and gotcha 9 below).

**Conceptual background:** [../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md](../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)

---

## Prerequisites checklist

| Item | Requirement | Notes |
|------|-------------|-------|
| Node.js | **22 LTS** (NOT 18 — gotcha 1) | The EI CLI is validated on Node 22 LTS. |
| OS toolchain (macOS) | Xcode Command Line Tools | Native `node-gyp` build of serial deps fails without it (gotcha 5). |
| OS toolchain (Linux) | `screen` | `sudo apt install screen` — required by the daemon's serial layer. |
| USB cable | Data-capable micro-USB | Power-only cables will not enumerate `TB004`. |
| Power | **USB (not CR2032)** | Coin cell disables RGB LEDs + CCS811; keep USB attached (gotcha 7). |
| Serial | 115200 baud | Used by the daemon and AT fallback. |

---

## Step C0.1 — Install Node 22 LTS  `[HUMAN]`

Confirm or install Node 22 LTS. Any install method is fine; verify the major version:

```bash
node --version
# expect: v22.x.x   (NOT v18 — see gotcha 1)
npm --version
```

If you use `nvm`:

```bash
nvm install 22
nvm use 22
```

## Step C0.2 — Install OS prerequisites  `[HUMAN]`

**macOS** — install Xcode Command Line Tools (skips if already present):

```bash
xcode-select --install
```

> If `edge-impulse-cli` install later throws a `gyp`/`node-gyp` error, the CLT are
> missing or stale — install/repair them, then retry the npm install (gotcha 5).

**Linux (Debian/Ubuntu):**

```bash
sudo apt update && sudo apt install -y screen
```

## Step C0.3 — Install the Edge Impulse CLI  `[HUMAN]`

The single global package bundles every command you need
(`edge-impulse-daemon`, `edge-impulse-data-forwarder`, `edge-impulse-run-impulse`,
`edge-impulse-uploader`):

```bash
npm install -g edge-impulse-cli
```

**Sanity check** (run exactly this):

```bash
edge-impulse-daemon --version
```

You should get a version string and no stack trace. If this errors, fix the OS
prerequisite for your platform (C0.2) before continuing.

## Step C0.4 — Create the EI account and project  `[HUMAN]` (browser)

1. Go to <https://studio.edgeimpulse.com/> and create a free account (or sign in).
2. Create a **new project** named e.g. `aegis-edge-crawl`.
3. Leave the project open — you'll need it logged in for the daemon wizard (C0.6)
   and for [C1](./C1-data-collection.md)/[C2](./C2-train.md).

## Step C0.5 — Flash the prebuilt EI firmware  `[HUMAN]` (on-hardware)

Download the **prebuilt** ingestion firmware. Note the filename has **no hyphens**
in `thunderboardsense2` (gotcha 2) — this is the prebuilt artifact, not a source build:

```bash
curl -L -o silabs-thunderboard-sense2.bin \
  https://cdn.edgeimpulse.com/firmware/silabs-thunderboard-sense2.bin
```

> The build-from-source output is named `firmware-silabs-thunderboard-sense-2.bin`
> (hyphenated). For C0 you want the **non-hyphenated prebuilt** above.

Flash by drag-and-drop:

1. Connect the board via USB. A drive named **`TB004`** mounts.
2. Drag `silabs-thunderboard-sense2.bin` onto the `TB004` drive.
3. **Wait ~30 seconds.** The drive will unmount/remount as the bootloader writes flash.
   Do not unplug during this window.

> **If you see `FAIL.TXT` on the drive** (drag-drop write rejected — gotcha 6):
> stop here and use the fallback procedure in
> [../FLASHING.md](../FLASHING.md) (Simplicity Studio "Upload application", or
> `commander flash` with raw `.bin` at `--address 0x0`).

## Step C0.6 — Run the daemon and complete the login wizard  `[HUMAN]`

With the board still on USB:

```bash
edge-impulse-daemon
```

The wizard will:

1. Prompt for your EI email/password (the account from C0.4).
2. Ask which project to attach the device to — pick `aegis-edge-crawl`.
3. Ask you to name the device (any label, e.g. `tb-sense2-01`).

Leave the daemon **running** during data collection.

> **One serial port only.** The daemon owns the single serial port. Before you later
> run `edge-impulse-run-impulse` (in [C2](./C2-train.md)/deploy-verify), you MUST stop
> the daemon first or you'll hit port contention (gotcha 8).

## Step C0.7 — Re-pair to a different project (only if needed)  `[HUMAN]`

If the board is bound to the wrong project, or you want a clean re-pair:

```bash
edge-impulse-daemon --clean
```

> `--clean` **wipes** the saved daemon + on-device config and restarts the wizard
> (gotcha 4). Use it deliberately, not as a routine restart.

**Serial fallback** if `--clean` cannot reach the device config, clear it directly
over serial at **115200** baud:

```
AT+CLEARCONFIG
```

(Open the port with `screen <port> 115200` on macOS/Linux, send the command, then exit.)

---

## Acceptance criteria (C0 done when)

- [ ] `node --version` reports **v22.x** and `edge-impulse-daemon --version` runs clean.
- [ ] `silabs-thunderboard-sense2.bin` flashed to `TB004` with **no `FAIL.TXT`**.
- [ ] EI account + `aegis-edge-crawl` project created.
- [ ] Daemon running and the board appears **online** in Studio under
      **Devices** (green/connected).

## Common gotchas (subset relevant to C0)

1. **Node 22 LTS**, not 18.
2. Prebuilt `.bin` filename has **no hyphens**; source build is hyphenated.
4. `--clean` wipes daemon + device config; serial fallback is `AT+CLEARCONFIG` @115200.
5. macOS `gyp` error = Xcode CLT missing.
6. Drag-drop can yield `FAIL.TXT` -> see [../FLASHING.md](../FLASHING.md).
7. CR2032 disables RGB LEDs + CCS811 -> run on USB.
8. Stop the daemon before `edge-impulse-run-impulse` (single serial port).

**Next:** [C1 — Data Collection](./C1-data-collection.md)
