# Option B - C++ Integration Notes

> **Optional for CRAWL.** Read [`README.md`](./README.md) first for when Option B
> is worth it and which repo/GSDK to pin.

This file is the concrete how-to for wiring an exported Edge Impulse C++ library
into a Gecko SDK (GSDK) C++ application on the Thunderboard Sense 2.

Legend used below:
- **[VERIFIED PATTERN]** - the Edge Impulse C++ SDK calling convention; stable
  across boards.
- **[CONFIRM-ON-DEVICE]** - board-/pin-/GSDK-specific detail to validate against
  your pinned SDK version and on real hardware.

---

## 1. Export the C++ library from Edge Impulse [VERIFIED PATTERN]

In Studio: **Deployment -> "C++ library" -> Build**. You get a `.zip` containing
**three folders**:

```
edge-impulse-sdk/      # the inference engine (C++)
model-parameters/      # generated model + DSP config headers
tflite-model/          # the quantized (int8) model as a C array
```

Unzip all three into your GSDK project's source tree and add them to the build
include paths. The application file that calls the classifier **must be C++**
(`.cpp`, **C++14**) because the SDK is C++.

---

## 2. The `run_classifier` calling convention [VERIFIED PATTERN]

You feed the classifier through a **signal_t** with a callback that yields raw
sensor samples on demand (this avoids copying the whole window):

```cpp
#include "edge-impulse-sdk/classifier/ei_run_classifier.h"

// Your captured window of interleaved accel samples lives here.
// Layout MUST match how the impulse was trained: accX, accY, accZ, accX, ...
// (3-axis accelerometer-only - the proven Crawl recipe, NOT 6-axis.)
static float g_features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];

// Callback: copy `length` floats starting at `offset` into out_ptr.
// EI calls this to pull the window without you handing over a giant buffer.
static int get_signal_data(size_t offset, size_t length, float *out_ptr) {
    for (size_t i = 0; i < length; i++) {
        out_ptr[i] = g_features[offset + i];
    }
    return EIDSP_OK;
}

void classify_window(void) {
    signal_t signal;
    // CRITICAL: total_length MUST EXACTLY equal the frame size the model
    // was generated for. A mismatch returns EI_IMPULSE_INVALID_SIZE.
    signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data    = &get_signal_data;

    ei_impulse_result_t result = { 0 };

    // 3rd arg = debug flag. false = no per-stage debug prints.
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
    if (err != EI_IMPULSE_OK) {
        // log err and bail - do not act on a failed inference
        return;
    }

    // --- read the winning class -----------------------------------------
    // result.classification[ix] has .label (const char*) and .value (float).
    // Order matches your trained classes (circle/zigzag/updown/leftright/none).
    int best = 0;
    for (size_t ix = 1; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
        if (result.classification[ix].value > result.classification[best].value) {
            best = (int)ix;
        }
    }
    const char *label = result.classification[best].label;
    float       conf  = result.classification[best].value;

#if EI_CLASSIFIER_HAS_ANOMALY == 1
    float anomaly = result.anomaly;   // K-means anomaly score
#endif

    // --- timing (the benchmark deliverable) -----------------------------
    // result.timing.dsp / .classification / .anomaly are in milliseconds.
    // Capture these for ../benchmark/BENCHMARK.md.
    int dsp_ms  = result.timing.dsp;
    int clf_ms  = result.timing.classification;
    int ano_ms  = result.timing.anomaly;

    on_classification(label, conf);   // your handler: LED + BLE notify
}
```

### Window-size rule [VERIFIED PATTERN]

- **One-shot** (`run_classifier`): `signal.total_length` **must equal**
  `EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE`.
- **Continuous** (`run_classifier_continuous`): feed slices of
  `EI_CLASSIFIER_SLICE_SIZE` instead. Pick one model and stick to its constant -
  do not hardcode a magic number.

---

## 3. RGB LED feedback - class -> color [CONFIRM-ON-DEVICE pins]

> The LED **API call order is the trap**: you MUST power the RGB rail on **before**
> setting a color, or nothing lights. And the **RGB LEDs are DEAD on the CR2032
> coin cell** - run on **USB power** for any LED demo.

```cpp
#include "bsp.h"   // BOARD_* helpers (GSDK board support); confirm header for your SDK

void leds_init(void) {
    // [VERIFIED ORDER] power the rail FIRST, then you may set colors.
    BOARD_rgbledPowerEnable(true);
}

// [CONFIRM-ON-DEVICE] RGB byte values are taste/visibility; tune on hardware.
void on_classification(const char *label, float conf) {
    if (conf < 0.6f) {                         // confidence gate (tune)
        BOARD_rgbledSetColor(0, 0, 0);         // off / uncertain
        return;
    }
    if      (!strcmp(label, "circle"))    BOARD_rgbledSetColor(0,   0,   255); // blue
    else if (!strcmp(label, "zigzag"))    BOARD_rgbledSetColor(255, 0,   0);   // red
    else if (!strcmp(label, "updown"))    BOARD_rgbledSetColor(0,   255, 0);   // green
    else if (!strcmp(label, "leftright")) BOARD_rgbledSetColor(255, 128, 0);   // orange
    else /* "none" */                     BOARD_rgbledSetColor(0,   0,   0);   // off

    ble_notify_result(label, conf);
}
```

| Class       | Suggested color | RGB (confirm-on-device) |
|-------------|-----------------|-------------------------|
| `circle`    | blue            | `(0, 0, 255)`           |
| `zigzag`    | red             | `(255, 0, 0)`           |
| `updown`    | green           | `(0, 255, 0)`           |
| `leftright` | orange          | `(255, 128, 0)`         |
| `none`      | off             | `(0, 0, 0)`             |

---

## 4. Custom BLE notify - gated on CCCD subscribe [VERIFIED PATTERN]

If you define your own GATT table (Option B's whole point), send results with
`sl_bt_gatt_server_send_notification`. **Only notify after the client has
subscribed** - i.e. when the characteristic's CCCD client config equals
`sl_bt_gatt_notification` (value `2`). Notifying an unsubscribed client wastes
cycles and can error.

```cpp
#include "sl_bt_api.h"

static uint8_t  g_conn_handle   = 0;
static bool     g_results_subscribed = false;   // set from the CCCD event

// In your Bluetooth event handler:
void sl_bt_on_event(sl_bt_msg_t *evt) {
    switch (SL_BT_MSG_ID(evt->header)) {
        case sl_bt_evt_connection_opened_id:
            g_conn_handle = evt->data.evt_connection_opened.connection;
            break;

        case sl_bt_evt_gatt_server_characteristic_status_id: {
            // [CONFIRM-ON-DEVICE] match gattdb_<your_results_char> id
            uint16_t ch = evt->data.evt_gatt_server_characteristic_status.characteristic;
            uint16_t flags =
                evt->data.evt_gatt_server_characteristic_status.client_config_flags;
            if (ch == gattdb_aegis_results) {
                // client_config_flags == 2 means notifications enabled (CCCD)
                g_results_subscribed = (flags == sl_bt_gatt_notification); // == 2
            }
            break;
        }

        case sl_bt_evt_connection_closed_id:
            g_results_subscribed = false;
            break;
    }
}

void ble_notify_result(const char *label, float conf) {
    if (!g_results_subscribed) return;          // gate on CCCD subscribe

    // Pack however your reader app expects; keep it small.
    uint8_t buf[20];
    int n = snprintf((char *)buf, sizeof(buf), "%s:%d", label, (int)(conf * 100));

    // [VERIFIED PATTERN] notify on the connection + your gattdb id.
    sl_bt_gatt_server_send_notification(
        g_conn_handle,
        gattdb_aegis_results,                   // [CONFIRM-ON-DEVICE] your id
        (uint8_t)n,
        buf);
}
```

> If you instead reuse the **stock EI firmware GATT** (Option A territory) rather
> than a custom table, the verified UUIDs are: service
> `DDA4D145-FC52-4705-BB93-DD1F295AA522`, control (write `0x01`/`0x00`)
> `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2`, results (notify)
> `61A885A4-41C3-60D0-9A53-6D652A70D29C`. Those are for the prebuilt firmware,
> not your custom GATT.

---

## 5. Build / flash gotchas [CONFIRM-ON-DEVICE]

- **Pin the GSDK** to the repo's version (4.0.2 for the full firmware fork) and the
  toolchain (GNU Arm 10-2020-q4-major). Wrong GSDK = build breakage.
- App file is **`.cpp`, C++14** (the EI SDK is C++).
- If drag-to-flash yields `FAIL.TXT`, fall back to Simplicity Studio
  **"Upload application"** or `commander flash <file>.bin --address 0x0` (a raw
  `.bin` needs the `0x0` base address).
- `signal.total_length` mismatch is the most common runtime failure - re-check it
  equals `EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE` (or `EI_CLASSIFIER_SLICE_SIZE` for
  continuous) after every model re-export.
