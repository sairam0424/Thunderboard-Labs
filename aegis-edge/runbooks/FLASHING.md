# FLASHING — Three Ways to Get a `.bin` onto the Thunderboard Sense 2

> Reference runbook for flashing firmware onto the board. Three paths, in order
> of preference:
>
> - **Path A — Drag-drop `.bin` onto `TB004`** (primary; what [C3](./C3-deploy.md) uses)
> - **Path B — Simplicity Studio "Upload application"** (GUI fallback)
> - **Path C — Simplicity Commander CLI** (`commander flash`) (scriptable fallback)
>
> If Path A produces `FAIL.TXT`, jump straight to Path B or C.

**Board:** Silicon Labs Thunderboard Sense 2 (BRD4166A, bare
**EFR32MG12P332F1024GL125**). **USB mass-storage volume:** `TB004`.

---

## The `.bin` filename distinction (prebuilt vs source) — read first

| Origin | Filename | When you have this |
|--------|----------|--------------------|
| **Prebuilt** EI firmware (CDN / Studio "Build firmware" download) | **`silabs-thunderboard-sense2.bin`** — **NO hyphens** in `thunderboard`/`sense`/`2` | Option A deploy, or the stock prebuilt from `https://cdn.edgeimpulse.com/firmware/silabs-thunderboard-sense2.bin` |
| **Build-from-source** (Option B full firmware repo) | **`firmware-silabs-thunderboard-sense-2.bin`** — **hyphenated** | You compiled the `edgeimpulse/firmware-silabs-thunderboard-sense-2` repo |

> **Gotcha:** These are different artifacts with intentionally different names.
> Don't assume one when you have the other. The prebuilt has no hyphens in the
> board-name segment; the source build is fully hyphenated.

### File-type vs flash address (matters for Path C)

| File type | Contains its own load address? | `--address` needed (Path C)? |
|-----------|-------------------------------|------------------------------|
| `.bin` (raw) | **No** | **Yes** — `--address 0x0` |
| `.hex` (Intel HEX) | Yes | No |
| `.s37` (Motorola S-record) | Yes | No |

---

## Path A — Drag-drop `.bin` onto `TB004` (PRIMARY)

[HUMAN — hardware]

1. Plug the board into USB with a **data** cable. Confirm the **`TB004`** drive
   mounts (macOS `/Volumes/TB004`, Linux `/media/<user>/TB004`, Windows a new
   removable drive).
2. **Drag the `.bin` onto the root of `TB004`** (not into a subfolder).
3. **Wait ~30 seconds.** The bootloader writes flash and reboots; the drive will
   disappear and reappear. Done.

This is the fastest path and needs no extra tools. Used by
[C3 — deploy](./C3-deploy.md).

### Recovery: `FAIL.TXT` appeared on `TB004`

If a `FAIL.TXT` file shows up after the drag, the write failed.

1. **Open `FAIL.TXT`** — it states the reason (bad CRC, wrong file type for the
   slot, partial transfer, etc.).
2. Common causes and quick checks:
   - Copied a `.hex`/`.s37` onto a slot expecting raw `.bin` (or vice versa).
   - Flaky USB enumeration / charge-only cable -> swap cable/port, press RESET,
     retry once.
   - Partial copy (drive ejected mid-write) -> retry once.
3. **If a retry of Path A still fails, switch to Path B or Path C** below —
   those are deterministic and report errors clearly. Do not keep re-dragging.

---

## Path B — Simplicity Studio "Upload application" (GUI fallback)

[HUMAN — desktop app]

Use when drag-drop fails or you want a GUI with explicit feedback.

1. Open **Simplicity Studio 5**.
2. Connect the board via USB. In the **Debug Adapters** view, the board appears
   as a connected J-Link / debug adapter.
3. Select the adapter, then use **"Upload application"** (Flash Programmer /
   right-click the adapter -> Upload application).
4. Browse to your firmware file (`.bin`, `.hex`, or `.s37`) and upload.
5. The board reboots into the new firmware when the upload completes.

This path goes through the on-board debugger rather than the mass-storage
bootloader, so it sidesteps the drag-drop `FAIL.TXT` failure mode entirely.

---

## Path C — Simplicity Commander CLI (`commander`) (scriptable fallback)

[HUMAN / AI-SCAFFOLDED — terminal]

Use for scripted/CI flashing or when you want a one-line command.

### Confirm the device first

```bash
commander device info
```

Expected: it identifies the part as **`EFR32MG12P332F1024GL125`** (and shows
flash/RAM). If it doesn't see the board, check the USB cable/port and that no
other tool holds the debug adapter.

### Flash a **raw `.bin`** — address is REQUIRED

```bash
commander flash silabs-thunderboard-sense2.bin --address 0x0
```

> A raw `.bin` carries **no** load address, so you **must** pass
> `--address 0x0`. Omitting it on a `.bin` will flash to the wrong place or
> error.

### Flash a `.hex` or `.s37` — NO address needed

```bash
commander flash firmware-silabs-thunderboard-sense-2.s37
# or
commander flash firmware.hex
```

`.hex`/`.s37` already encode their load addresses, so **do not** pass
`--address`.

---

## Which path should I use?

```
Have a .bin and TB004 mounts?  -> Path A (drag-drop). Fast, no tools.
   |
   +-- FAIL.TXT?  -> Path B (Studio Upload application)  or
                      Path C (commander flash):
                        .bin  -> --address 0x0
                        .hex / .s37 -> no --address
```

After any path, verify the board runs your firmware per
[C3 — Step 4](./C3-deploy.md) (`edge-impulse-run-impulse --continuous`, daemon
stopped first — single serial port).

---

## Quick reference

| Task | Command / action |
|------|------------------|
| Identify the SoC | `commander device info` -> `EFR32MG12P332F1024GL125` |
| Flash raw `.bin` | `commander flash <file>.bin --address 0x0` |
| Flash `.hex`/`.s37` | `commander flash <file>` (no `--address`) |
| Drag-drop | copy `.bin` to `TB004` root, wait ~30 s |
| Drag-drop failed | open `FAIL.TXT`, then Path B or C |
| Prebuilt name | `silabs-thunderboard-sense2.bin` (no hyphens) |
| Source-build name | `firmware-silabs-thunderboard-sense-2.bin` (hyphenated) |
