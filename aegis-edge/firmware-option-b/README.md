# Option B - C++ Library Integration (Gecko SDK)

> **Optional for CRAWL.** The Crawl-phase gesture recognizer ships fine with
> **Option A** (Edge Impulse prebuilt/Studio-built `.bin`, drag-to-flash). Reach
> for Option B only when you outgrow what the EI firmware gives you for free.

This directory is the home for the **portfolio / sensor-fusion path**: export the
trained impulse as a **C++ library** and call it from a Simplicity Studio 5 /
Gecko SDK (GSDK) project, where you own the sensor loop, the BLE GATT table, and
the RGB LED feedback.

See the integration mechanics in [`integration-notes.md`](./integration-notes.md).
For the conceptual background, see the guide at
[`../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md`](../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md).

---

## When you actually need Option B

Use Option B (typically the **RUN** phase, not Crawl) when you need:

- **Multi-sensor fusion** - combining the ICM-20648 IMU with other on-board
  sensors in one inference path, beyond the stock EI accelerometer loop.
- **A custom BLE GATT table** - your own services/characteristics and notify
  cadence, instead of the fixed EI results characteristic.
- **Custom on-device feedback** - e.g. driving the RGB LED per predicted class
  (see the class -> color table in `integration-notes.md`).
- **Application logic on-device** - thresholds, debouncing, state machines that
  live in firmware rather than on a host.

For **Crawl**, prefer **Option A**. It is the shortest path to a working,
demoable on-device classifier and to the headline `@38.4 MHz` benchmark.

---

## The TWO reference repos - PIN THE VERSIONS

There are two upstream Silicon Labs / Edge Impulse repos for this board, and they
target **different GSDK versions**. Mixing a repo with the wrong GSDK is the
number-one source of build failures. **Pin the version explicitly.**

| Repo | GSDK | Toolchain | What it gives you | Use for |
|------|------|-----------|-------------------|---------|
| `edgeimpulse/firmware-silabs-thunderboard-sense-2` (fork this) | **GSDK 4.0.2** | **GNU Arm 10-2020-q4-major** | Full firmware: sensor acquisition loop **+ BLE already wired**. The richest starting point. | The real Option B base - fork it, drop in your exported model, extend the sensor/BLE/LED code. |
| `example-standalone-inferencing-silabs-tb-sense-2` | **GSDK 3.2.x** | (legacy) | Minimal `features[]`-paste demo only - you hardcode one feature buffer; no live sensor loop. | Quick smoke test that the model compiles and classifies a known buffer. Not a product base. |

Recommendation: **fork `firmware-silabs-thunderboard-sense-2` (GSDK 4.0.2)** as
your Option B base - it already has the sensor loop and BLE, so you are extending
working code rather than building the I/O from scratch.

> The build-from-source firmware output is named
> **`firmware-silabs-thunderboard-sense-2.bin`** (hyphenated). The Edge Impulse
> **prebuilt** download is **`silabs-thunderboard-sense2.bin`** (no hyphens,
> `sense2`). Do not confuse the two - see the gotchas in the runbooks.

---

## Deprecated repo - DO NOT USE

- **Avoid** `SiliconLabs/tflite-micro-efr32-examples` - deprecated.
- **Use instead** the current **SiliconLabsSoftware** ML application repos /
  examples. They track the maintained GSDK + machine-learning component set.

---

## Arduino is NOT viable

There is **no supported Arduino core** for the bare EFR32MG12 on the Thunderboard
Sense 2 (BRD4166A) for this workflow. Do **not** plan an Arduino path. Option B is
**Simplicity Studio 5 + Gecko SDK only**, with the application file written as
**C++ (`.cpp`, C++14)** because the Edge Impulse SDK is C++.

---

## Hardware power caveat (applies to both options)

- The **RGB LEDs and the CCS811 are DEAD when running on the CR2032 coin cell** -
  there is not enough current. **Demo and develop on USB power.** If your Option B
  feature set includes LED feedback, USB is mandatory for it to be visible.

---

## At a glance: Option A vs Option B

| | Option A (Crawl default) | Option B (Run / portfolio) |
|---|---|---|
| Artifact | EI-built `.bin`, drag to TB004 | Your GSDK project + EI C++ library |
| Sensor loop | Provided by EI firmware | You own it (fork has a working one) |
| BLE | Fixed EI results characteristic | Custom GATT table you define |
| LED feedback | None (stock) | Custom class -> color (USB only) |
| Effort | Minutes | Hours - days |
| Use when | First on-device classifier + benchmark | Fusion, custom BLE/LED, app logic |
