/*
 * aegis_inference.h - Aegis Edge on-device gesture inference (Option B)
 * ---------------------------------------------------------------------
 * Target : Silicon Labs Thunderboard Sense 2 (BRD4166A), EFR32MG12P332F1024GL125
 *          Cortex-M4F @ 38.4 MHz, 256 KB RAM, NO NPU.
 * SDK    : Gecko SDK (GSDK) 4.0.2 + GNU Arm 10-2020-q4-major.
 * Lang   : C++14 (the Edge Impulse SDK is C++; this file is included from a .cpp).
 *
 * Purpose
 *   Public surface for the Option-B integration: the gesture enum, the
 *   class -> RGB color table, the function prototypes the firmware shell calls,
 *   and the GATT characteristic-handle externs the linker resolves from the
 *   generated GATT DB (gattdb_*).
 *
 * BUILD STATUS: *** NOT COMPILED in this environment. ***
 *   There is no GSDK / ARM toolchain here. This header is written to be correct
 *   and well-commented; it must be compiled inside Simplicity Studio 5 with
 *   GSDK 4.0.2 against your forked firmware project. See ./README.md.
 *
 * Legend (matches ../integration-notes.md):
 *   [VERIFIED]          - EI C++ SDK / sl_bt API convention, stable across boards.
 *   [CONFIRM-ON-DEVICE] - board/pin/GSDK/GATT-DB-specific; validate on hardware.
 */

#ifndef AEGIS_INFERENCE_H
#define AEGIS_INFERENCE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

/*
 * The EI SDK is C++. If this header is ever pulled into a C translation unit
 * (e.g. the GSDK app_init.c shell), keep the prototypes C-linkage-safe so the
 * names are not mangled and the linker still finds them.
 */
#ifdef __cplusplus
extern "C" {
#endif

/* =====================================================================
 * 1. Gesture classes
 *
 * IMPORTANT: the *authoritative* class ordering is the one baked into the
 * exported model (result.classification[ix].label, ix in
 * 0 .. EI_CLASSIFIER_LABEL_COUNT-1). This enum is a convenience for firmware
 * code and for packing a stable index on the BLE wire. We do NOT assume this
 * enum order matches the model order -- aegis_inference.cpp resolves the model
 * label string back to this enum via aegis_gesture_from_label(), so the two can
 * never silently drift. [CONFIRM-ON-DEVICE: that your trained labels are exactly
 * these five strings, lower-case.]
 * ===================================================================== */
typedef enum {
    AEGIS_GESTURE_CIRCLE    = 0,
    AEGIS_GESTURE_ZIGZAG    = 1,
    AEGIS_GESTURE_UPDOWN    = 2,
    AEGIS_GESTURE_LEFTRIGHT = 3,
    AEGIS_GESTURE_NONE      = 4,
    AEGIS_GESTURE_COUNT     = 5,   /* number of named classes */
    AEGIS_GESTURE_UNKNOWN   = 0xFF /* label did not match any known class */
} aegis_gesture_t;

/* =====================================================================
 * 2. Class -> RGB color table
 *
 * Suggested colors per the Aegis Edge spec:
 *   circle = blue, zigzag = green, updown = red, leftright = purple, none = off.
 *
 * NOTE / DISCREPANCY [CONFIRM-ON-DEVICE]:
 *   ../integration-notes.md (section 3) shows an *earlier* mapping
 *   (zigzag=red, updown=green, leftright=orange). This header uses the
 *   spec mapping above (zigzag=green, updown=red, leftright=purple). Pick ONE
 *   and make the dashboard's legend agree. RGB byte values are taste/visibility
 *   and should be tuned on real hardware under USB power.
 *
 *   The RGB LEDs are DARK on the CR2032 coin cell -- not enough current. LED
 *   feedback is only visible on USB power.
 * ===================================================================== */
typedef struct {
    uint8_t r;
    uint8_t g;
    uint8_t b;
} aegis_rgb_t;

/* Look up the LED color for a gesture. Always returns a valid color
 * (UNKNOWN / out-of-range -> off). Defined in aegis_inference.cpp. */
aegis_rgb_t aegis_color_for_gesture(aegis_gesture_t gesture);

/* =====================================================================
 * 3. BLE results payload
 *
 * On-wire layout we EMIT from this firmware (2 bytes, little-endian trivial):
 *     byte 0 : class_index  (uint8)  -- the aegis_gesture_t value, 0..4
 *     byte 1 : confidence   (uint8)  -- 0..100 (percent), saturated
 *
 * This is the format the Aegis Edge dashboard parses defensively. Keep it
 * tiny and stable. [CONFIRM-ON-DEVICE] that the dashboard's parser expects
 * exactly these two bytes in this order.
 * ===================================================================== */
#define AEGIS_RESULTS_PAYLOAD_LEN  ((size_t)2)

/* =====================================================================
 * 3b. Tunables [CONFIRM-ON-DEVICE]
 *
 * Both are taste/quality knobs you should tune on real hardware, not magic
 * numbers buried in the .cpp. Override at compile time (-D...) if you want.
 *
 *  - AEGIS_CONFIDENCE_GATE: below this top-1 probability we report NONE/off
 *    instead of flickering between low-confidence classes.
 *  - AEGIS_ANOMALY_THRESHOLD: if the model exports a K-means anomaly score and
 *    it exceeds this, force NONE (the motion is out-of-distribution). Only used
 *    when EI_CLASSIFIER_HAS_ANOMALY == 1.
 * ===================================================================== */
#ifndef AEGIS_CONFIDENCE_GATE
#define AEGIS_CONFIDENCE_GATE     (0.60f)
#endif
#ifndef AEGIS_ANOMALY_THRESHOLD
#define AEGIS_ANOMALY_THRESHOLD   (0.30f)
#endif

/* =====================================================================
 * 4. GATT characteristic handle externs
 *
 * Simplicity Studio's GATT Configurator generates a header (typically
 * gatt_db.h) that #defines gattdb_<id> integer handles for every
 * characteristic you declare. We declare them extern here so this file can
 * reference them without pulling the whole generated header into the public
 * surface.
 *
 * [CONFIRM-ON-DEVICE] Rename these to match the exact <id> attributes you give
 * the characteristics in your GATT Configurator. The names below are the
 * Aegis-Edge convention; the generated symbols MUST match 1:1 or the build
 * fails to link.
 *
 * If you instead REUSE the stock Edge Impulse firmware GATT (Option A
 * territory), the VERIFIED UUIDs are:
 *   service  DDA4D145-FC52-4705-BB93-DD1F295AA522
 *   control  02AA6D7D-23B4-4C84-AF76-98A7699F7FE2  (write 0x01 start / 0x00 stop)
 *   results  61A885A4-41C3-60D0-9A53-6D652A70D29C  (notify)
 * ...but a *custom* table (Option B's whole point) gets its own UUIDs +
 * gattdb_* handles.
 *
 * NOTE on the gattdb_* handles: Simplicity Studio's GATT Configurator GENERATES
 * `gatt_db.h` with these handles as preprocessor macros (e.g.
 * `#define gattdb_aegis_results 17`), NOT as linker symbols. So do NOT declare
 * them `extern` here -- instead `#include "gatt_db.h"` in aegis_inference.cpp
 * and use the macros directly. The `id` attribute you set on each characteristic
 * in the GATT Configurator becomes the `gattdb_<id>` macro name; match these:
 *     results notify char -> id "aegis_results" -> gattdb_aegis_results
 *     control write char  -> id "aegis_control" -> gattdb_aegis_control
 * [CONFIRM-ON-DEVICE: the macro names must match your GATT Configurator ids 1:1.]
 * ===================================================================== */

/* =====================================================================
 * 5. Lifecycle + main-loop hooks (called from the GSDK app shell)
 * ===================================================================== */

/* Call ONCE at startup (e.g. from app_init): powers the RGB rail and runs
 * run_classifier_init() so the continuous DSP state is allocated. Returns true
 * on success. [VERIFIED: run_classifier_init() is called exactly once before
 * the first run_classifier_continuous() slice.] */
bool aegis_inference_init(void);

/* Call repeatedly from the super-loop / a timer task once a fresh slice of
 * EI_CLASSIFIER_SLICE_SIZE accelerometer values is available. Pulls the slice,
 * runs continuous inference, drives the LED, and (if a client is subscribed)
 * notifies the result. Safe to call when no IMU data is ready -- it will simply
 * return without acting. */
void aegis_inference_step(void);

/* Map a model label string ("circle"/"zigzag"/...) back to our enum.
 * Returns AEGIS_GESTURE_UNKNOWN if it matches none. */
aegis_gesture_t aegis_gesture_from_label(const char *label);

/* =====================================================================
 * 6. BLE event-handler hooks
 *
 * Forward these from your single sl_bt_on_event() dispatcher (the GSDK app
 * generates one). Keeping the Aegis-specific handling here keeps the generated
 * app shell thin and lets this module own its own connection/CCCD state.
 * The argument is the opaque sl_bt_msg_t* (declared void* to avoid forcing
 * sl_bt_api.h into this header's consumers). aegis_inference.cpp casts it back.
 * ===================================================================== */
void aegis_ble_on_event(void *evt /* sl_bt_msg_t* */);

/* True once a BLE central has subscribed (CCCD == notifications) to the
 * results characteristic AND a connection is open. Exposed mainly for tests /
 * diagnostics. */
bool aegis_ble_results_subscribed(void);

#ifdef __cplusplus
}  /* extern "C" */
#endif

#endif /* AEGIS_INFERENCE_H */
