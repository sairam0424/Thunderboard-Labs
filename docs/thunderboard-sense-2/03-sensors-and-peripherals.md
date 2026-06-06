# 03 - Sensors & Peripherals

> The Thunderboard Sense 2 (SLTB004A, board **BRD4166A**) is, above all
> else, a *sensor* board. It carries **seven distinct environmental and motion
> sensors**, four high-brightness RGB LEDs, a bi-color status LED, two user
> buttons plus a reset button, an 8-Mbit SPI flash for over-the-air (OTA)
> firmware storage, a micro-USB connector, and an on-board SEGGER J-Link
> debugger. This document is the exhaustive reference for every one of those
> components: what it is, what it measures, how it connects to the
> [EFR32MG12 SoC](./02-hardware-soc-radio.md), and — critically — which parts
> are *disabled* when the board runs from a CR2032 coin cell instead of USB.

**Navigation:** [README](./README.md) ·
[Overview](./01-overview.md) ·
[SoC & Radio](./02-hardware-soc-radio.md) ·
**Sensors & Peripherals** ·
[Pinout, Power & Connectors](./04-pinout-power-connectors.md) ·
[Use Cases](./05-use-cases-applications.md) ·
[Getting Started](./06-getting-started.md) ·
[Toolchain](./07-development-toolchain.md) ·
[References & Glossary](./08-references-glossary.md)

---

## 1. The big picture: power domains and "off by default"

Before listing the parts, understand the single most important design decision
on this board:

> **By default, the board boots in its lowest-power mode with all sensors
> powered down.** The sensors and LEDs are grouped into **power domains**, each
> gated by a dedicated GPIO enable signal on the EFR32MG12. Your application
> code must explicitly raise the relevant enable pin (and wait for the part to
> settle) before the sensor responds on its bus.

This is what makes the Thunderboard Sense 2 a credible *battery-operated IoT*
reference design rather than a power-hungry eval board — nothing draws current
until you ask for it. The trade-off is that every "my sensor reads zero / does
not ACK on I2C" bug almost always traces back to a missing or too-early enable.

The enable signals at a glance. The **power-domain grouping** (which sensors
share a switch) is documented in
[UG309: Thunderboard Sense 2 User's Guide](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf);
the **specific GPIO net names** below are *illustrative — confirm each against
UG309 §3.4 and the BRD4166A schematic before relying on them in code* (do not
trust any specific GPIO-to-net mapping you find online, including this page,
over the schematic):

| Power domain | Enable signal (illustrative — verify in UG309 §3.4 / BRD4166A schematic) | Members |
|---|---|---|
| **Environmental sensor group** | `PF9` high (`ENV_SENSE_ENABLE`) | Si7021 (RH/Temp), Si1133 (UV/ALS), BMP280 (pressure) — all share one isolation switch **and** one I2C bus |
| **Hall-effect sensor** | `PB10` high | Si7210 |
| **Air-quality (gas) sensor** | `PF14` high to power (`CCS811_ENABLE`), `PF15` low to wake (`nWAKE`) | CCS811 |
| **Inertial sensor** | `PF8` high | ICM-20648 (uses SPI on this board) |
| **Microphone** | enable + I2S master clock | ICS-43434 |
| **RGB LEDs** | LED power-domain enable (`RGB_LED_ENABLE`) | 4x ASMT-YTB7-0AA02 |

> **Tip:** The Gecko SDK's Thunderboard Sense 2 Board Support Package (BSP)
> wraps these raw GPIO toggles in friendly calls such as
> `BOARD_envSensEnable(true)` (powers the Pressure/RH-Temp/UV-Light/Hall group),
> `BOARD_rhtempEnable()`, `BOARD_bapEnable()`, `BOARD_gasSensorEnable()`,
> `BOARD_imuEnable()`, and the RGB LED helpers. See the
> [development toolchain doc](./07-development-toolchain.md) for the BSP. Source:
> [Silicon Labs TBSense BSP docs](https://docs.silabs.com/mcu/latest/efr32mg22/group-TBSense-BSP).

---

## 2. Sensor suite at a glance

All seven sensors and their primary characteristics. The "silkscreen icon" is
the pictogram printed next to each sensor on the board to help you locate it
physically.

| # | Sensor (part) | Manufacturer | Measures | Silkscreen icon | Typical bus | What you'd use it for |
|---|---|---|---|---|---|---|
| 1 | **Si7021** | Silicon Labs | Relative humidity + temperature | Droplet / thermometer | I2C | Indoor comfort & climate logging; dew-point / HVAC sensing |
| 2 | **Si1133** | Silicon Labs | UV index + ambient light (ALS) | Sun | I2C | UV exposure alerts; auto-brightness / daylight harvesting |
| 3 | **BMP280** | Bosch Sensortec | Barometric (absolute) pressure | Gauge / barometer | I2C | Altitude estimation, weather trend, indoor floor detection |
| 4 | **Si7210** | Silicon Labs | Magnetic field (hall effect) | Magnet | I2C | Door/lid open-close detection; tamper & proximity sensing |
| 5 | **CCS811** | ams (AMS/ScioSense) | Indoor air quality: eCO2 + TVOC | Gas cloud / leaf | I2C | Air-quality monitor; ventilation control; CO2 proxy |
| 6 | **ICM-20648** | TDK InvenSense | 6-axis motion: 3-axis gyro + 3-axis accel | Motion / arrows | **SPI** (on this board) | Orientation, gesture, tilt, step/activity, free-fall |
| 7 | **ICS-43434** | TDK InvenSense | Sound / acoustic level (MEMS mic) | Microphone | **I2S** | Sound-level metering, noise events, simple audio capture |

> **Bus note:** The Si7021, Si1133, BMP280, Si7210, and CCS811 are all **I2C**
> devices. The ICM-20648 supports both SPI and I2C but is wired for **SPI** on
> the Thunderboard Sense 2. The ICS-43434 is a **digital I2S** microphone (it is
> NOT an analog mic — the earlier Thunderboard Sense used an analog SPV1840
> read via ADC; Sense 2 upgraded to the digital I2S ICS-43434). Sources:
> [UG309 User's Guide](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf),
> [TBSense BSP](https://docs.silabs.com/mcu/latest/efr32mg22/group-TBSense-BSP).

---

## 3. Sensors in detail

### 3.1 Si7021 — Relative Humidity & Temperature

- **Vendor / part:** Silicon Labs **Si7021**.
- **Function:** Combined relative-humidity (RH) and temperature sensor with a
  factory-calibrated, fully digital **I2C** output.
- **Power domain:** Part of the **environmental sensor group**. Powered down by
  default; raise the environmental-group enable (illustrated as `PF9` /
  `ENV_SENSE_ENABLE` — *verify in UG309 §3.4 / the BRD4166A schematic*) high to
  enable the shared isolation switch. Because the Si7021, Si1133, and BMP280
  share *one* switch *and* one I2C bus, enabling that signal brings up all three
  at once.
- **Typical accuracy class:** RH around +/-3% RH and temperature around
  +/-0.4 °C over the normal operating range (consult the
  [Si7021 datasheet](https://www.silabs.com/documents/public/data-sheets/Si7021-A20.pdf)
  for exact tolerances and conditions).
- **Use it for:** Room comfort dashboards, greenhouse/HVAC monitoring, dew-point
  computation, condensation warnings, and any IoT "indoor climate" sensor node.
- **Gotchas:** Self-heating from nearby components can bias temperature upward;
  give it time to settle after power-up. The RGB LEDs and the EFR32 radio are
  the main local heat sources — keep them quiet when you need an accurate
  ambient reading.

### 3.2 Si1133 — UV Index & Ambient Light Sensor

- **Vendor / part:** Silicon Labs **Si1133**.
- **Function:** Ambient-light sensor (ALS, lux) plus computed **UV index**,
  using multiple photodiode channels and on-chip processing over **I2C**.
- **Power domain:** Environmental sensor group — same enable signal (illustrated
  as `PF9` / `ENV_SENSE_ENABLE`; *verify in UG309 §3.4 / the BRD4166A schematic*)
  and same I2C bus as the Si7021 and BMP280.
- **Use it for:** UV-exposure alerts (wearables, outdoor sensors), automatic
  display/backlight brightness, daylight-harvesting lighting control, and
  presence-of-light heuristics.
- **Gotchas:** Readings depend heavily on what (if anything) covers the sensor
  window — an enclosure or a finger over the part will skew lux and UV. UV index
  is only meaningful outdoors under sunlight; indoor artificial light yields a UV
  index near zero by design.

### 3.3 BMP280 — Barometric Pressure Sensor

- **Vendor / part:** Bosch Sensortec **BMP280**.
- **Function:** Absolute barometric pressure sensor (also provides a temperature
  channel used for internal compensation) over **I2C**.
- **Power domain:** Environmental sensor group — same enable signal (illustrated
  as `PF9` / `ENV_SENSE_ENABLE`; *verify in UG309 §3.4 / the BRD4166A schematic*)
  and shared I2C bus as the Si7021 and Si1133.
- **Use it for:** Altitude estimation (pressure-to-altitude), weather-trend
  ("is the pressure falling?") monitoring, indoor floor/level detection, and
  drone/altimeter experiments.
- **Gotchas:** Absolute altitude requires a known reference pressure (QNH) —
  *relative* altitude changes are far more reliable than absolute. The BMP280's
  built-in temperature channel is for pressure compensation, not for ambient
  room-temperature reporting; use the Si7021 for that.

### 3.4 Si7210 — Hall-Effect (Magnetic Field) Sensor

- **Vendor / part:** Silicon Labs **Si7210**.
- **Function:** Digital **I2C** hall-effect magnetic-field sensor — reports
  magnetic flux density and can act as a programmable magnetic switch.
- **Power domain:** Its **own** isolation switch, separate from the
  environmental group. Powered down by default; raise its dedicated enable
  (illustrated as `PB10`; *verify in UG309 §3.4 / the BRD4166A schematic*) high
  before accessing it over I2C.
- **Use it for:** Door/window/lid open-close detection (pair with a small
  magnet), tamper detection, rotation counting, proximity, and contactless
  push-button style inputs.
- **Gotchas:** Range and polarity depend on magnet strength and orientation.
  Because it lives on a *different* enable signal (illustrated as `PB10`) than
  the environmental group (illustrated as `PF9`), it is easy to forget to power
  it when you "enabled the sensors." Confirm both net assignments in UG309 §3.4 /
  the BRD4166A schematic.

### 3.5 CCS811 — Indoor Air-Quality (Gas) Sensor

- **Vendor / part:** ams **CCS811** (a metal-oxide / MOX digital gas sensor).
- **Function:** Reports **equivalent CO2 (eCO2)** in ppm and **total volatile
  organic compounds (TVOC)** in ppb over **I2C**, derived from a heated
  metal-oxide element.
- **Power domain:** Dedicated domain with a two-step bring-up (the GPIO net names
  below are *illustrative — verify in UG309 §3.4 / the BRD4166A schematic*):
  1. **Power** the sensor by setting its enable (illustrated as `PF14` /
     `CCS811_ENABLE`) high.
  2. **Wake** it by pulling its dedicated `nWAKE` pin (illustrated as `PF15`)
     **low**.
  It also exposes an interrupt line that can fire when a new sample is ready.
- **Burn-in / conditioning is REQUIRED.** A MOX gas sensor is *not* accurate the
  instant you turn it on:
  - The Silicon Labs BLE demo explicitly reports **0 ppm / 0 ppb during a
    start-up period** while the heater stabilizes
    ([UG313 BLE Demo Guide](https://cw.fel.cvut.cz/b232/_media/courses/b0b37nsi/hw/ug313-sltb004a-app-user-guide.pdf)).
  - ams specifies a **48-hour initial burn-in** for a brand-new device, plus a
    shorter (~20-minute) run-in each power cycle before readings are
    trustworthy. Plan your firmware and expectations accordingly.
  - The CCS811 also has a **baseline** that should be saved/restored across power
    cycles for stable long-term readings.
- **Use it for:** Indoor air-quality monitors, demand-controlled ventilation,
  "open a window" prompts, and CO2-proxy comfort indices.
- **CRITICAL power note:** The CCS811's heater is a relatively heavy load, so
  **it is one of the two items disabled when the board runs from a CR2032 coin
  cell** (see [Section 5](#5-coin-cell-vs-usb-what-gets-disabled)).

### 3.6 ICM-20648 — 6-Axis Inertial Sensor (IMU)

- **Vendor / part:** TDK InvenSense **ICM-20648**.
- **Function:** A **6-axis** inertial measurement unit = **3-axis gyroscope +
  3-axis accelerometer**, with integrated 16-bit ADCs and programmable digital
  filters.
  > **Do not over-claim:** the ICM-20648 is **6-axis**, not 9-axis. It has *no*
  > magnetometer. (The hall sensor is a separate part and is not a substitute for
  > a 3-axis magnetometer.) Some legacy Silicon Labs BSP comments loosely label
  > it "nine-axis" in figure captions — the part itself is gyro + accel only.
- **Bus:** Wired for **SPI** on the Thunderboard Sense 2 (the chip also supports
  I2C, but the board uses SPI). It additionally provides an **interrupt** pin
  for "new sample ready" / motion events.
- **Power domain:** Powered down by default; raise its enable (illustrated as
  `PF8`; *verify in UG309 §3.4 / the BRD4166A schematic*) high before accessing
  it over SPI.
- **Location & coordinate frame:** Physically placed in the **center of the
  board**; its X/Y/Z axes follow the right-hand rule, matching the spatial
  orientation diagram in UG309.
- **Use it for:** Orientation/attitude estimation, gesture and tap detection,
  tilt and free-fall, step counting / activity classification, and
  motion-triggered wake. It is the workhorse sensor for **TinyML / Edge Impulse**
  motion-recognition demos (see [Use Cases](./05-use-cases-applications.md) and
  [Toolchain](./07-development-toolchain.md)).
- **Gotchas:** The gyroscope must be **calibrated** (the board held still on a
  level surface) at start-up; the Silicon Labs motion view re-zeroes orientation
  on launch. Gyro bias drifts with temperature — recalibrate when accuracy
  matters.

### 3.7 ICS-43434 — MEMS Microphone (I2S)

- **Vendor / part:** TDK InvenSense **ICS-43434**.
- **Function:** A **digital MEMS microphone with a direct I2S output** — the PCM
  audio is delivered over the **I2S** serial-audio interface, so no external ADC
  is needed.
  > This is a notable upgrade over the original Thunderboard Sense, which used an
  > **analog** SPV1840 microphone read through the MCU's ADC. On Sense 2 the mic
  > is fully digital I2S. Source:
  > [TBSense BSP docs](https://docs.silabs.com/mcu/latest/efr32mg22/group-TBSense-BSP).
- **Bus:** **I2S** (the EFR32MG12 acts as the I2S master providing the bit clock
  and word-select; the mic streams 24-bit PCM samples).
- **Use it for:** Sound-pressure-level (SPL) metering, ambient-noise monitoring,
  acoustic-event detection (glass break, alarms), clap/whistle triggers, and —
  combined with the IMU — multi-sensor TinyML classifiers.
- **Gotchas:** I2S timing and L/R channel selection must be configured
  correctly or you will capture silence or noise. There is an acoustic port
  (hole) over the MEMS element — keep it unobstructed.

---

## 4. On-board peripherals

Beyond the sensors, the board carries the I/O and support hardware you need to
program, power, and interact with it.

### 4.1 RGB LEDs (4x) — Broadcom ASMT-YTB7-0AA02

- **Part:** Four **high-brightness RGB LEDs** from Broadcom Limited, part
  **ASMT-YTB7-0AA02**. Source:
  [UG309 User's Guide](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf).
- **What they do:** Full-color status / visualization output, individually
  addressable for color and intensity. The Silicon Labs mobile app exposes color
  and brightness sliders that drive these LEDs live over BLE.
- **Driving them:** They sit in their own LED **power domain** with an enable
  signal, and are driven for PWM color mixing. Because they can sink significant
  peak current at full brightness, they are deliberately isolated from the
  always-on rail.
- **CRITICAL power note:** The RGB LEDs are the **second item disabled when the
  board is powered from a CR2032 coin cell** (a coin cell cannot reliably supply
  their peak current without browning out). See
  [Section 5](#5-coin-cell-vs-usb-what-gets-disabled).

### 4.2 Bi-color status LED

- A single **bi-color LED** used for board/system status indication (for
  example, debugger or activity state). Distinct from the four RGB LEDs.

### 4.3 Buttons: BTN0, BTN1, and RESET

| Control | Purpose |
|---|---|
| **BTN0** (left push button) | General-purpose user input. In the BLE demo, used to re-enter Bluetooth advertisement mode (30-second window) and as an app-controllable input. |
| **BTN1** (right push button) | General-purpose user input — toggles / triggers in demo firmware and your own apps. |
| **RESET** | Dedicated **reset** button that resets the EFR32MG12 SoC. |

- The two user buttons (BTN0/BTN1) are standard momentary push buttons routed to
  EFR32 GPIOs; debounce in firmware as needed.
- See [Pinout & Connectors](./04-pinout-power-connectors.md) for the exact GPIO
  assignments.

### 4.4 8-Mbit SPI flash (for OTA) — Macronix MX25R8035F

- **Part:** Macronix **MX25R8035F**, an **8-Mbit (1 MB)** ultra-low-power serial
  **SPI** NOR flash.
- **Primary purpose:** **Over-the-air (OTA) firmware update storage.** The
  incoming firmware image is staged in this external flash and then applied,
  which is essential for fielded, battery-powered wireless nodes that cannot be
  reached with a debug cable. It can also hold sensor logs, configuration, or
  other application data.
- **Why "ultra-low-power" matters:** On a battery-operated board, even the flash
  must have a tiny deep-power-down current so it does not drain the cell while
  idle — the MX25R family is specifically chosen for this.

### 4.5 Micro-USB connector

- A **micro-USB** connector provides:
  - **Power** (the preferred source for full-feature operation),
  - the connection to the **on-board SEGGER J-Link debugger**, and
  - a **USB Virtual COM Port (VCOM)** for serial console / printf-style debug
    output from the application.
- See the power tree and AEM (Advanced Energy Monitor) details in
  [Pinout, Power & Connectors](./04-pinout-power-connectors.md).

### 4.6 On-board SEGGER J-Link debugger

- The board integrates a **SEGGER J-Link** debugger so you can **flash and debug
  the EFR32MG12 directly over the micro-USB cable** — no external programmer
  required.
- It also provides the **USB Virtual COM port** (serial console) and is the
  bridge used by **Simplicity Studio** for programming, debugging, and energy
  profiling. A **Mini Simplicity connector** additionally exposes energy
  profiling and advanced wireless-network debug to an *external* Silicon Labs
  debugger when needed.
- For the full toolchain (Simplicity Studio, Gecko SDK, AEM energy profiling)
  see [Development Toolchain](./07-development-toolchain.md).

---

## 5. Coin-cell vs USB: what gets disabled

This is the single most consequential operational fact about the board's
peripherals, so it gets its own section.

The Thunderboard Sense 2 supports **automatic switchover between USB and battery
power** and can run from a **CR2032 coin cell**, an external battery (via the
Hirose `DF13C-2P-1.25V` connector), or USB. The firmware **estimates the source
impedance** of whatever is powering it. If it classifies the source as a
**CR2032 coin cell**, it deliberately **disables the two highest peak-current
features** to conserve power and avoid brown-out / reset:

| Disabled on CR2032 coin cell | Reason |
|---|---|
| **RGB LEDs** (all four, ASMT-YTB7-0AA02) | High peak current at brightness would brown out a coin cell |
| **CCS811** indoor air-quality gas sensor | Its MOX heater is a sustained heavy load a coin cell can't support |

Source:
[UG313: Thunderboard Sense 2 Bluetooth LE Demo User's Guide, Section 3.1 Power Supply](https://cw.fel.cvut.cz/b232/_media/courses/b0b37nsi/hw/ug313-sltb004a-app-user-guide.pdf).

Key implications and caveats:

- **All other sensors remain available on coin cell:** Si7021, Si1133, BMP280,
  Si7210, the ICM-20648 IMU, and the ICS-43434 microphone all still work from a
  CR2032 (they are low-current). Only the RGB LEDs and CCS811 are gated off.
- **Want LEDs + air quality on battery?** Use **USB power** or a **higher-capacity
  external battery** (connected to the external battery connector) instead of a
  coin cell.
- **Mis-classification can happen:** Some external batteries — especially nearly
  discharged ones — present a high enough source impedance that the firmware
  *mistakes them for a coin cell* and disables the RGB LEDs and CCS811 even
  though a different battery is attached. If your LEDs/gas sensor unexpectedly
  go dark on battery, suspect this.
- **Never connect two batteries at once:** Do **not** populate the CR2032 holder
  and the external battery connector simultaneously — there is no protection
  circuitry between the two and it can cause damage.

> **Mental model:** On USB you get the full board. On a coin cell you get a
> quiet, low-power *sensing* node (everything except the two power-hungry
> features). This is the behavior of the **stock Silicon Labs demo firmware**;
> in your own application you control the enable pins directly, but the same
> physical limitation applies — a coin cell cannot source the RGB LEDs at full
> brightness or run the CCS811 heater for long without sagging.

---

## 6. Quick-reference cheat sheet

> **Enable-signal caveat:** The specific GPIO net names in the "Enable / wake"
> column are *illustrative* and must be confirmed against **UG309 §3.4** and the
> **BRD4166A schematic** before you wire or program against them. The
> *power-domain grouping* (which sensors share a switch) is authoritative; the
> exact pin numbers are not asserted here as definitive.

| Component | Part | Bus | Enable / wake (illustrative — verify in UG309 §3.4 / BRD4166A schematic) | Disabled on coin cell? |
|---|---|---|---|---|
| RH / Temp | Si7021 | I2C | env-group enable (illus. `PF9`) | No |
| UV / Ambient light | Si1133 | I2C | env-group enable (illus. `PF9`) | No |
| Barometric pressure | BMP280 | I2C | env-group enable (illus. `PF9`) | No |
| Hall effect | Si7210 | I2C | dedicated enable (illus. `PB10`) | No |
| Air quality (gas) | CCS811 | I2C | power (illus. `PF14`) + `nWAKE` low (illus. `PF15`) | **Yes** |
| 6-axis IMU | ICM-20648 | SPI | dedicated enable (illus. `PF8`) | No |
| MEMS microphone | ICS-43434 | I2S | enable + I2S master clock | No |
| 4x RGB LED | ASMT-YTB7-0AA02 | PWM/GPIO | LED power domain | **Yes** |
| Bi-color LED | — | GPIO | — | No |
| User buttons | BTN0 / BTN1 | GPIO | — | No |
| Reset | RESET button | — | — | No |
| OTA / data flash | MX25R8035F (8 Mbit) | SPI | — | No |
| Debug / power / VCOM | micro-USB + SEGGER J-Link | USB | — | n/a |

---

## 7. See also

- [02 - Hardware: SoC & Radio](./02-hardware-soc-radio.md) — the EFR32MG12 that
  reads all these sensors (bare SoC, not a module), plus radio and protocols.
- [04 - Pinout, Power & Connectors](./04-pinout-power-connectors.md) — exact GPIO
  assignments for every enable/interrupt signal, the power tree, AEM, and the
  external-battery connector.
- [05 - Use Cases & Applications](./05-use-cases-applications.md) — how the
  sensor mix maps to real projects (air-quality nodes, motion TinyML, etc.).
- [06 - Getting Started](./06-getting-started.md) — the out-of-box demo and
  mobile app that exercise these sensors.
- [07 - Development Toolchain](./07-development-toolchain.md) — Simplicity
  Studio, the Gecko SDK BSP `BOARD_*Enable()` helpers, and Edge Impulse.
- [08 - References & Glossary](./08-references-glossary.md) — datasheet links,
  document numbers (UG309, UG313), and part numbers.

### Primary sources

- [UG309: Thunderboard Sense 2 User's Guide (Silicon Labs)](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf)
- [UG313: Thunderboard Sense 2 Bluetooth LE Demo User's Guide (Silicon Labs)](https://cw.fel.cvut.cz/b232/_media/courses/b0b37nsi/hw/ug313-sltb004a-app-user-guide.pdf)
- [Thunderboard Sense / Sense 2 Board Support Package (BSP) API docs](https://docs.silabs.com/mcu/latest/efr32mg22/group-TBSense-BSP)
- [BRD4166C schematic (Silicon Labs)](https://www.silabs.com/documents/public/schematic-files/BRD4166C-A00-schematic.pdf) — **NOTE: BRD4166C is a depopulated/sensorless sibling variant, NOT this board.** On BRD4166C every sensor and the RGB LEDs are explicitly "Not Mounted". It is referenced only because its schematic enumerates the populated-vs-unpopulated parts; for the fully-populated BRD4166A described here, always verify against the **BRD4166A schematic** and **UG309** instead.
