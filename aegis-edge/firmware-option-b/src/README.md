# Option B - `src/` (Aegis Edge inference integration)

> **Read first:** [`../README.md`](../README.md) (when Option B is worth it +
> which repo/GSDK to pin) and [`../integration-notes.md`](../integration-notes.md)
> (the concrete EI / sl_bt / LED calling conventions this code implements).

This folder holds the **Option-B C++ integration** that you drop into a forked
**`edgeimpulse/firmware-silabs-thunderboard-sense-2`** project. It is the
sensor -> inference -> feedback core: read an accelerometer slice, run the Edge
Impulse classifier continuously, drive the RGB LED per predicted class, and
notify a 2-byte result over a custom BLE characteristic.

```
src/
  aegis_inference.h     Public surface: gesture enum, class->color table,
                        BLE payload format, gattdb_* externs, tunables,
                        function prototypes.
  aegis_inference.cpp   The integration: IMU->signal_t bridge, argmax,
                        run_classifier_continuous() loop, LED driver,
                        CCCD-gated notify, BLE event handlers.
  README.md             This file.
```

---

```
+============================================================================+
|  BUILD STATUS:  NOT COMPILED HERE.                                         |
|                                                                            |
|  There is NO GSDK and NO ARM toolchain in this environment, so this code   |
|  was written correct + heavily commented but has NOT been compiled.        |
|                                                                            |
|  -> Build it in Simplicity Studio 5 with GSDK 4.0.2 +                      |
|     GNU Arm 10-2020-q4-major, inside your fork of                          |
|     edgeimpulse/firmware-silabs-thunderboard-sense-2.                      |
|                                                                            |
|  Anything tagged [CONFIRM-ON-DEVICE] in the source must be validated       |
|  against your pinned SDK and on real hardware (USB power for LEDs).        |
+============================================================================+
```

---

## What is verified vs confirm-on-device

| Tag | Meaning |
|-----|---------|
| `[VERIFIED]` | Edge Impulse C++ SDK calling convention or GSDK 4.x `sl_bt_*` API signature. Stable across boards. |
| `[CONFIRM-ON-DEVICE]` | Board/pin/GSDK/GATT-DB/IMU-specific detail to validate on your pinned SDK and on hardware. |

The code never hardcodes window sizes - it uses the EI macros
(`EI_CLASSIFIER_SLICE_SIZE`, `EI_CLASSIFIER_LABEL_COUNT`,
`EI_CLASSIFIER_HAS_ANOMALY`), so a model re-export stays correct.

---

## Exact integration steps

### 1. Fork + open the base firmware

Fork **`edgeimpulse/firmware-silabs-thunderboard-sense-2`** (the **GSDK 4.0.2**
repo - it already has a working sensor loop **and** BLE). Open it in
**Simplicity Studio 5**. Confirm the project's GSDK is pinned to **4.0.2** and
the toolchain to **GNU Arm 10-2020-q4-major** (wrong GSDK is the #1 build
failure - see `../README.md`).

### 2. Drop in the Edge Impulse C++ export

In Edge Impulse Studio: **Deployment -> "C++ library" -> Build**. Unzip the
three folders into the project source tree and add them to the include paths:

```
edge-impulse-sdk/      # inference engine (C++)
model-parameters/      # generated model + DSP config headers (the EI_CLASSIFIER_* macros)
tflite-model/          # quantized int8 model as a C array
```

### 3. Add these two files to the build

Copy `aegis_inference.h` and `aegis_inference.cpp` into the project (e.g. an
`app/` source folder) and add the `.cpp` to the build sources. The application
TU that includes the EI SDK **must be C++ (`.cpp`, C++14)** - that is why the
core is `.cpp`, not `.c`.

### 4. Define the custom GATT table

In Studio's **GATT Configurator**, add a service + two characteristics and give
them `id` attributes so the generated `gatt_db.h` produces the handles this code
externs:

| Symbol (`gattdb_*`) | Characteristic | Properties | Payload |
|---------------------|----------------|------------|---------|
| `gattdb_aegis_results` | results | **Notify** | 2 bytes: `[class_index][confidence 0..100]` |
| `gattdb_aegis_control` | control | Write | `0x01` start / `0x00` stop (optional) |

Rename the externs in `aegis_inference.h` if you use different `id`s - the
generated symbols must match 1:1 or the link fails.

> Reusing the **stock EI GATT** instead (Option A territory)? The VERIFIED
> UUIDs are service `DDA4D145-FC52-4705-BB93-DD1F295AA522`, control
> `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2`, results
> `61A885A4-41C3-60D0-9A53-6D652A70D29C`. A custom table (Option B's point) gets
> its own UUIDs + `gattdb_*` handles.

### 5. Wire the three hooks into the GSDK app shell

In the generated app (`app.c` / `app_init` + the super-loop) and the single
`sl_bt_on_event()` dispatcher:

```c
/* app_init() - once at startup */
aegis_inference_init();          /* powers RGB rail + run_classifier_init() */

/* super-loop / sensor-timer tick - repeatedly */
aegis_inference_step();          /* no-op until a full IMU slice is staged */

/* inside sl_bt_on_event(sl_bt_msg_t *evt) - forward EVERY event */
aegis_ble_on_event(evt);         /* tracks connection handle + CCCD subscribe */
```

### 6. Connect the IMU producer

`aegis_inference_step()` only runs an inference once a full
`EI_CLASSIFIER_SLICE_SIZE` slice of **interleaved 3-axis accel** (`accX, accY,
accZ, ...`) is staged. Replace the `[CONFIRM-ON-DEVICE]` stub
`aegis_imu_fill_slice()` in the `.cpp` with your real ICM-20648 FIFO drain
(reuse the fork's IMU driver). **3-axis accelerometer only** - the proven
recipe, not 6-axis. Keep the interleave order identical to how the impulse was
trained, and confirm the sample units match the training data.

### 7. Build, flash, validate

Build in Studio. If drag-to-flash yields `FAIL.TXT`, use **"Upload
application"** or `commander flash <file>.bin --address 0x0`. On hardware,
under **USB power** (LEDs/CCS811 are dead on the CR2032 coin cell), validate:

- LED lights the spec color per gesture (circle=blue, zigzag=green, updown=red,
  leftright=purple, none=off).
- A subscribed BLE central receives 2-byte notifications only after enabling
  notifications (CCCD).
- `signal.total_length == EI_CLASSIFIER_SLICE_SIZE` (re-check after every model
  re-export - the most common runtime failure).

---

## Color mapping discrepancy - pick ONE

This code uses the **Aegis Edge spec** mapping:

| Class | Color | RGB |
|-------|-------|-----|
| `circle` | blue | `(0, 0, 255)` |
| `zigzag` | green | `(0, 255, 0)` |
| `updown` | red | `(255, 0, 0)` |
| `leftright` | purple | `(128, 0, 128)` |
| `none` | off | `(0, 0, 0)` |

[`../integration-notes.md`](../integration-notes.md) section 3 shows an
**earlier** mapping (zigzag=red, updown=green, leftright=orange). They disagree.
Choose one and make the dashboard's legend agree with the firmware. RGB byte
values are taste/visibility - tune on hardware.

---

## What this code does NOT do

- It does not implement the ICM-20648 driver (use the fork's, via the producer
  hook).
- It does not define the GATT XML (you do that in the GATT Configurator).
- It does not handle the control char `0x01`/`0x00` start/stop by default - a
  `[CONFIRM-ON-DEVICE]` note in `aegis_ble_on_event()` shows where to add it.
- It has not been compiled (no toolchain here). See the banner above.
