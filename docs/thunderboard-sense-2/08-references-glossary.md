# References & Glossary

> Permanent reference appendix for the **Silicon Labs Thunderboard Sense 2** (kit `SLTB004A`, board `BRD4166A`). This page collects every authoritative link, part number, and acronym used across the doc set so you never have to re-derive them.

**Part of the Thunderboard Sense 2 documentation set.** Return to the [documentation hub](./README.md).

---

## Table of contents

- [How to read this page](#how-to-read-this-page)
- [Critical fact reminder](#critical-fact-reminder)
- [1. Primary Silicon Labs references](#1-primary-silicon-labs-references)
- [2. Hardware documentation (user guides & schematics)](#2-hardware-documentation-user-guides--schematics)
- [3. SoC & silicon references](#3-soc--silicon-references)
- [4. Software toolchains & SDKs](#4-software-toolchains--sdks)
- [5. Third-party platform support](#5-third-party-platform-support)
- [6. Mobile & companion apps](#6-mobile--companion-apps)
- [7. Replacement / successor hardware](#7-replacement--successor-hardware)
- [8. Part-number cheat sheet](#8-part-number-cheat-sheet)
- [9. Document-number cheat sheet](#9-document-number-cheat-sheet)
- [10. Glossary of acronyms](#10-glossary-of-acronyms)
- [11. Sibling documents](#11-sibling-documents)

---

## How to read this page

- Links are grouped by purpose. **Primary Silicon Labs sources are preferred** and are listed first in each group.
- Every part number in the [cheat sheet](#8-part-number-cheat-sheet) is cross-referenced to the doc that explains it in depth.
- All acronyms used anywhere in this doc set are defined in the [glossary](#10-glossary-of-acronyms).
- Where a Silicon Labs URL slug has changed over the years, the canonical landing path is given; if it 404s, search the term in the [Silicon Labs Technical Library](https://www.silabs.com/support/resources).

---

## Critical fact reminder

> **The Thunderboard Sense 2 carries a _bare_ EFR32MG12 SoC (`EFR32MG12P332F1024GL125`), soldered directly to the PCB — NOT an MGM12P pre-certified radio module.**

This is the single most-confused fact about the board. Many community write-ups, forum posts, and even some third-party tutorials incorrectly call it an "MGM12P module" board. It is not. The radio front-end (matching network, antenna, RF shielding) is implemented on `BRD4166A` itself around the bare SoC. See [SoC & Radio](./02-hardware-soc-radio.md) for the full explanation and its implications for RF certification and design re-use.

---

## 1. Primary Silicon Labs references

| Resource | Link | Notes |
|----------|------|-------|
| Thunderboard Sense 2 product / kit page | [silabs.com — Thunderboard Sense 2 Kit (SLTB004A)](https://www.silabs.com/development-tools/thunderboard/thunderboard-sense-two-kit) | Canonical kit landing page. Now flags the kit as **NRND** and points to the EFR32xG24 Dev Kit as the recommended replacement. |
| Thunderboard product family | [silabs.com — Thunderboard family](https://www.silabs.com/development-tools/thunderboard) | Overview of all Thunderboard boards. |
| Silicon Labs Technical Library (doc search) | [silabs.com/support/resources](https://www.silabs.com/support/resources) | Search here by document number (UG309, UG313, etc.) if a direct link rots. |
| Silicon Labs Developer Documentation portal | [docs.silabs.com](https://docs.silabs.com/) | Entry point for all SDK / API documentation. |
| Silicon Labs Community (forums & KB) | [community.silabs.com](https://community.silabs.com/) | Peer + FAE support, application notes, errata discussion. |
| Silicon Labs GitHub | [github.com/SiliconLabs](https://github.com/SiliconLabs) | Example repos, the `IoT-Developer-Boot-Camp`, and demo source. |

---

## 2. Hardware documentation (user guides & schematics)

These are the load-bearing hardware documents for the board. Cite the **document number** (UGxxx) when searching — it is more stable than any URL.

| Doc # | Title | Link | Covers |
|-------|-------|------|--------|
| **UG309** | *Thunderboard Sense 2 User's Guide* | [Search UG309 in the Technical Library](https://www.silabs.com/support/resources?query=UG309) | The definitive board manual: block diagram, sensor list, header pinout, power tree, AEM, on-board debugger, demo firmware. The backbone of [Overview](./01-overview.md), [Sensors & Peripherals](./03-sensors-and-peripherals.md), and [Pinout / Power / Connectors](./04-pinout-power-connectors.md). |
| **UG313** | *Thunderboard Sense 2 Bluetooth Mobile App* | [Search UG313 in the Technical Library](https://www.silabs.com/support/resources?query=UG313) | The companion-app and out-of-box demo guide. Backbone of [Getting Started](./06-getting-started.md). |
| **BRD4166A schematic & assembly** | *Thunderboard Sense 2 (BRD4166A) schematic, BOM, assembly drawing, layout* | [Search BRD4166A in the Technical Library](https://www.silabs.com/support/resources?query=BRD4166A) | Net-level wiring, the bare-SoC RF front-end, sensor I²C/SPI bus assignments, GPIO-to-sensor mapping. Primary source for the pin tables in [Pinout / Power / Connectors](./04-pinout-power-connectors.md). |

> **Board revision note:** the kit ordering code is `SLTB004A`; the board inside is `BRD4166A`. Newer manufactured units may silently use a later board silkscreen revision (for example `BRD4166C`) with the same form factor and the same EFR32MG12 SoC. Always match the schematic revision letter printed on **your** board to the schematic PDF you download. See [Overview -> Identity & revisions](./01-overview.md).

---

## 3. SoC & silicon references

| Resource | Link | Notes |
|----------|------|-------|
| EFR32MG12 device page | [silabs.com — EFR32MG12 Series 1 SoCs](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) | Family landing page for the Mighty Gecko Series 1 multiprotocol SoCs. |
| EFR32MG12 datasheet | [Search "EFR32MG12 datasheet" in the Technical Library](https://www.silabs.com/support/resources?query=EFR32MG12+datasheet) | Electrical characteristics, peripheral list, RF performance, package/pinout for `...GL125` (BGA125). |
| EFR32xG12 Wireless Gecko Reference Manual | [Search "EFR32xG12 Reference Manual" in the Technical Library](https://www.silabs.com/support/resources?query=EFR32xG12+Reference+Manual) | Register-level peripheral reference (the "RM"). |
| Series 1 / EFR32 family overview | [silabs.com — Wireless SoCs](https://www.silabs.com/wireless) | Where Series 1 vs Series 2 positioning lives. |
| AEM / energy profiling background (AN) | [Search "Advanced Energy Monitor" in the Technical Library](https://www.silabs.com/support/resources?query=Advanced+Energy+Monitor) | How the on-board AEM measures current; feeds the Energy Profiler in Simplicity Studio. |

**Confirmed SoC specs** (see [SoC & Radio](./02-hardware-soc-radio.md) for the full treatment):

- Core: ARM **Cortex-M4F** (with FPU + DSP), up to **40 MHz**.
- Memory: **1024 KB flash**, **256 KB RAM**.
- Package: **BGA125** (the `GL125` suffix = 125-ball BGA; per the EFR32MG12 ordering-code key `L` = BGA).
- Multiprotocol radio: 2.4 GHz, supporting **Bluetooth LE**, **Zigbee**, **Thread/OpenThread**, and proprietary stacks. Wi-SUN is a Series-1/Series-2 multiprotocol option more strongly associated with later parts; on MG12 it is protocol-stack dependent.
- Security/RNG: hardware crypto accelerator and a **TRNG** (exposed in Zephyr as `silabs,gecko-trng`).

---

## 4. Software toolchains & SDKs

Deep coverage of each of these lives in [Development Toolchain](./07-development-toolchain.md).

| Tool | Link | Notes |
|------|------|-------|
| Simplicity Studio 5 | [silabs.com — Simplicity Studio](https://www.silabs.com/developers/simplicity-studio) | Primary IDE: project wizard, Energy Profiler, Network Analyzer, flashing via the on-board J-Link. |
| Gecko SDK Suite (GSDK) | [docs.silabs.com — Gecko SDK](https://docs.silabs.com/) / [github.com/SiliconLabs/gecko_sdk](https://github.com/SiliconLabs/gecko_sdk) | The historical superset SDK (Bluetooth, EmberZNet Zigbee, OpenThread, RAIL, Platform). Succeeded by the Simplicity SDK for newer parts; GSDK remains the right SDK for Series 1 / EFR32MG12. |
| Bluetooth SDK (BLE stack) | [docs.silabs.com — Bluetooth](https://docs.silabs.com/bluetooth/latest/) | The stack behind the out-of-box demo. |
| OpenThread on EFR32 | [github.com/SiliconLabs/ot-efr32](https://github.com/SiliconLabs/ot-efr32) | Silicon Labs' OpenThread platform port. |
| EmberZNet (Zigbee) | [docs.silabs.com — Zigbee](https://docs.silabs.com/zigbee/latest/) | Zigbee PRO stack for EFR32MG parts. |
| RAIL (Radio Abstraction Interface Layer) | [docs.silabs.com — RAIL](https://docs.silabs.com/rail/latest/) | Low-level / proprietary radio API. |
| Simplicity Commander | [Search "Simplicity Commander" in the Technical Library](https://www.silabs.com/support/resources?query=Simplicity+Commander) | CLI flashing / device-info / GBL generation tool. |

---

## 5. Third-party platform support

| Platform | Link | Status / notes |
|----------|------|----------------|
| **Zephyr RTOS** board page | [docs.zephyrproject.org — `sltb004a`](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html) | Board ID `sltb004a`, target `sltb004a/efr32mg12p332f1024gl125`. **Maintained.** Upstream support includes ADC, BLE HCI, I²C, SPI, PWM, RTCC, **TRNG**, watchdog, the on-board CCS811 (`ams,ccs811`), and the external SPI-NOR flash (`jedec,spi-nor`). Flash/debug via the `jlink` runner. |
| **Edge Impulse** board page | [docs.edgeimpulse.com — SiLabs Thunderboard Sense 2](https://docs.edgeimpulse.com/docs/development-platforms/officially-supported-mcu-targets/silabs-thunderboard-sense-2) | **Fully supported** for TinyML data capture, training, and deployment (motion, sound, keyword spotting). Flash by drag-dropping `silabs-thunderboard-sense2.bin` onto the `TB004` USB mass-storage drive. Edge Impulse flags it "not recommended for new designs," suggesting the EFR32xG24 Dev Kit. |
| **Arm Mbed OS** platform page | [os.mbed.com — Thunderboard Sense 2 / SLTB004A](https://os.mbed.com/platforms/Thunderboard-Sense-2/) | Community/legacy Mbed platform entry. Mbed OS itself is in maintenance; usable for older projects. |
| **Arduino** | (community core) | No official Silicon Labs Arduino core targets the EFR32MG12; Arduino support is community/experimental. See [Development Toolchain -> Arduino](./07-development-toolchain.md). |
| **Matter** | [github.com/SiliconLabs/matter](https://github.com/SiliconLabs/matter) | Matter runs over Thread/Wi-Fi on Silicon Labs parts; for EFR32MG12 it is supported via the GSDK/Matter extension but is far better provisioned on Series-2 parts. |

---

## 6. Mobile & companion apps

| App | Link | Notes |
|-----|------|-------|
| Simplicity Connect (formerly EFR Connect) | [silabs.com — Simplicity Connect mobile app](https://www.silabs.com/developer-tools/simplicity-connect-mobile-app) | The BLE companion app used by the out-of-box demo (per [UG313](#2-hardware-documentation-user-guides--schematics)). Reads sensor data over Bluetooth and exposes a board-specific demo view. Covered in [Getting Started](./06-getting-started.md). |
| Simplicity Connect — Apple App Store | [apps.apple.com — Simplicity Connect](https://apps.apple.com/app/simplicity-connect/id1030932759) | iOS download. |
| Simplicity Connect — Google Play | [play.google.com — Simplicity Connect](https://play.google.com/store/apps/details?id=com.siliconlabs.bledemo) | Android download (legacy package id `com.siliconlabs.bledemo` from the EFR Connect era). |

> **Naming history:** this app has shipped as *Blue Gecko*, then *EFR Connect*, now *Simplicity Connect*. Older guides (including the original UG313 text) may use the earlier names — they refer to the same app.

---

## 7. Replacement / successor hardware

The Thunderboard Sense 2 is **NRND (Not Recommended for New Designs)**. For new projects, Silicon Labs steers you to the Series-2 EFR32xG24 platform.

| Successor | Link | Notes |
|-----------|------|-------|
| **EFR32xG24 Dev Kit** (`xG24-DK2601B` / board `BRD2601B`) | [silabs.com — xG24 Dev Kit](https://www.silabs.com/development-tools/wireless/efr32xg24-dev-kit) | The officially recommended replacement. Carries the Series-2 `EFR32MG24B310F1536IM48` SoC (Cortex-M33, 1536 KB flash, AI/ML matrix accelerator), a comparable sensor suite (Si7021 RHT, IMU, microphones, pressure, ambient light, Hall), and a superset of Thunderboard Sense 2 use cases. The same kit Edge Impulse names as the migration target. |
| EFR32MG24 SoC family | [silabs.com — EFR32MG24](https://www.silabs.com/wireless/zigbee/efr32mg24-series-2-socs) | Series-2 multiprotocol SoC family page (Matter/Thread/Zigbee/BLE + on-die AI/ML accelerator). |

See [Use Cases & Applications](./05-use-cases-applications.md) for guidance on whether to start a new design on the Sense 2 (almost never) versus the xG24 Dev Kit.

---

## 8. Part-number cheat sheet

Authoritative part numbers for the kit, board, SoC, and every populated component. Sensor part numbers are documented in depth in [Sensors & Peripherals](./03-sensors-and-peripherals.md); the SoC in [SoC & Radio](./02-hardware-soc-radio.md).

### Kit, board, and SoC

| Item | Part number | Notes |
|------|-------------|-------|
| **Kit** (orderable) | `SLTB004A` | Thunderboard Sense 2 Kit. **NRND.** |
| **Board** (PCB) | `BRD4166A` | The PCB inside the kit. Later silkscreen revisions (e.g. `BRD4166C`) exist; same form factor, same SoC. |
| **SoC** | `EFR32MG12P332F1024GL125` | **Bare** EFR32MG12 "Mighty Gecko" Series-1 multiprotocol SoC — **NOT** an MGM12P module. Cortex-M4F, 1024 KB flash, 256 KB RAM, BGA125. |

#### Decoding `EFR32MG12P332F1024GL125`

| Field | Value | Meaning |
|-------|-------|---------|
| `EFR32` | — | EFR32 Wireless Gecko family. |
| `MG` | Mighty Gecko | Multiprotocol (BLE + Zigbee/Thread/proprietary) line. |
| `12` | Series 1, config 2 | The "12" generation within Series 1. |
| `P` | Performance grade | Higher-spec variant tier. |
| `332` | — | Feature/peripheral configuration code. |
| `F1024` | 1024 KB | Flash size. |
| `G` | — | Temperature/grade qualifier. |
| `L125` | BGA, 125 balls | Package and ball count (`L` = BGA in the ordering-code key). |

### On-board sensors

| Sensor | Manufacturer part # | Measures | Bus |
|--------|--------------------|----------|-----|
| Relative humidity & temperature | `Si7021-A20` | RH + temperature | I²C |
| UV index & ambient light | `Si1133` | UV index, visible/IR light | I²C |
| Barometric pressure | `BMP280` (Bosch Sensortec) | Atmospheric pressure | I²C |
| Air quality — TVOC & eCO₂ | `CCS811` (ams) | TVOC, equivalent CO₂ | I²C (`ams,ccs811` in Zephyr) |
| 6-axis IMU (accel + gyro) | `ICM-20648` (InvenSense/TDK) | 3-axis accel + 3-axis gyro | SPI |
| Hall-effect sensor | `Si7210` | Magnetic field / open-close | I²C |
| Digital MEMS microphone | `ICS-43434` (TDK InvenSense) | Acoustic / sound | I²S |

> Exact silkscreen part suffixes can vary by board revision; treat the manufacturer base part (Si7021, Si1133, BMP280, CCS811, ICM-20648, Si7210) as authoritative and confirm the suffix against your `BRD4166A` BOM. Full per-sensor detail (registers, GPIO mapping, enable pins) is in [Sensors & Peripherals](./03-sensors-and-peripherals.md).

### Other populated components

| Component | Part / spec | Notes |
|-----------|-------------|-------|
| External SPI flash | `MX25R8035F` (Macronix, 8 Mbit / 1 MB, ultra-low-power SPI-NOR) | OTA image storage / data logging. In Zephyr: `jedec,spi-nor`. |
| RGB LED(s) | `4 x` addressable/driven RGB LEDs (e.g. Broadcom/Inolux-class `PLCC` RGB) | Driven for the demo light show; mapped to GPIO/PWM. |
| Push buttons | `2 x` momentary tactile (`BTN0`, `BTN1`) | User input; `gpio-keys` in Zephyr. |
| On-board debugger | SEGGER **J-Link** (integrated) | Provides flashing + debug + Virtual COM + AEM over a single USB. |
| Crystals | `HFXO` (high-freq) + `LFXO` 32.768 kHz | Radio/CPU reference and low-power RTC reference. |
| USB connector | Micro-USB (Mini-Simplicity / debug + power) | Enumerates the `TB004` mass-storage drive for drag-drop flashing. |

> The exact RGB LED and microphone manufacturer part suffixes vary by board revision; the **BRD4166A BOM** (see [hardware docs](#2-hardware-documentation-user-guides--schematics)) is the final authority. The MX25R8035F external flash and the integrated J-Link are stable across revisions.

---

## 9. Document-number cheat sheet

| Doc # | Type | Title | Primary consumer doc |
|-------|------|-------|----------------------|
| `UG309` | User Guide | Thunderboard Sense 2 User's Guide | [Overview](./01-overview.md), [Sensors & Peripherals](./03-sensors-and-peripherals.md), [Pinout / Power / Connectors](./04-pinout-power-connectors.md) |
| `UG313` | User Guide | Thunderboard Sense 2 Bluetooth Mobile App | [Getting Started](./06-getting-started.md) |
| `BRD4166A` | Schematic/BOM | Thunderboard Sense 2 board design files | [Pinout / Power / Connectors](./04-pinout-power-connectors.md) |
| (datasheet) | Datasheet | EFR32MG12 datasheet | [SoC & Radio](./02-hardware-soc-radio.md) |
| (RM) | Reference Manual | EFR32xG12 Wireless Gecko Reference Manual | [SoC & Radio](./02-hardware-soc-radio.md) |

---

## 10. Glossary of acronyms

Every acronym used anywhere in this doc set, defined.

| Term | Expansion | Meaning in context |
|------|-----------|--------------------|
| **AEM** | Advanced Energy Monitor | On-board circuit that measures the SoC's supply current in real time; visualized by Simplicity Studio's Energy Profiler. See [Pinout / Power / Connectors](./04-pinout-power-connectors.md). |
| **BGA** | Ball Grid Array | The SoC package; `GL125` = 125-ball BGA (`L` = BGA in the ordering-code key). |
| **BLE** | Bluetooth Low Energy | The Bluetooth profile used by the out-of-box demo and Simplicity Connect app. |
| **BOM** | Bill of Materials | The component list in the `BRD4166A` design files. |
| **eCO₂** | equivalent CO₂ | Air-quality metric estimated by the CCS811 from sensed gases; not a true CO₂ measurement. |
| **EFR32** | Energy Friendly Radio 32-bit | Silicon Labs' family of 32-bit wireless SoCs ("Wireless Gecko"). |
| **FPU** | Floating-Point Unit | Hardware float support in the Cortex-M4F core. |
| **GBL** | Gecko Bootloader image | Firmware-update image format used for OTA/serial updates. |
| **GPIO** | General-Purpose Input/Output | Configurable digital pins on the SoC. |
| **GSDK** | Gecko SDK (Suite) | The historical superset SDK (Bluetooth, Zigbee, OpenThread, RAIL, Platform) for Series-1 parts like EFR32MG12. |
| **HFXO** | High-Frequency Crystal Oscillator | High-speed external crystal reference for the CPU/radio. |
| **I²S** | Inter-IC Sound | Digital serial audio interface used by the on-board `ICS-43434` MEMS microphone. |
| **IMU** | Inertial Measurement Unit | The 6-axis ICM-20648 (3-axis accelerometer + 3-axis gyroscope). |
| **J-Link** | SEGGER J-Link | The on-board debug probe providing flash/debug/Virtual COM/AEM over USB. |
| **LFXO** | Low-Frequency Crystal Oscillator | 32.768 kHz crystal reference for the low-power RTC. |
| **MG12** | Mighty Gecko 12 | The EFR32**MG**12 multiprotocol SoC line (Series 1) on this board. |
| **NRND** | Not Recommended for New Designs | Lifecycle status of the Sense 2 kit; still sold/supported, but new designs should use the xG24 Dev Kit. |
| **OpenThread** | Open-source Thread implementation | The Thread networking stack Silicon Labs ports to EFR32 (`ot-efr32`). |
| **OTA** | Over-The-Air (update) | Wireless firmware updates; image stored in the external `MX25R8035F` flash. |
| **PWM** | Pulse-Width Modulation | Used to drive the RGB LEDs and other analog-like outputs. |
| **RAIL** | Radio Abstraction Interface Layer | Silicon Labs' low-level/proprietary radio API. |
| **RHT** | Relative Humidity & Temperature | The Si7021 sensor's measurands. |
| **RM** | Reference Manual | Register-level peripheral documentation for the EFR32xG12. |
| **RTCC** | Real-Time Clock and Calendar | Low-power timekeeping peripheral (uses the LFXO). |
| **SoC** | System on Chip | The single-die EFR32MG12 (CPU + radio + peripherals) — here a **bare** SoC, not a module. |
| **SPI** | Serial Peripheral Interface | Bus used by the IMU and the external flash. |
| **SWD** | Serial Wire Debug | The 2-wire ARM debug interface the J-Link uses to program/debug the SoC. |
| **Thread** | Thread (802.15.4 mesh IP) | Low-power mesh networking protocol; runs via OpenThread on this SoC. |
| **TRNG** | True Random Number Generator | Hardware entropy source in the SoC (`silabs,gecko-trng` in Zephyr); used for crypto. |
| **TVOC** | Total Volatile Organic Compounds | Air-quality metric from the CCS811 sensor. |
| **USART/LEUART** | (Low-Energy) Universal Sync/Async Receiver-Transmitter | Serial peripherals (UART/SPI/Virtual COM). |
| **Wi-SUN** | Wireless Smart Utility Network | Sub-GHz/2.4 GHz FAN mesh standard; a multiprotocol option more strongly associated with later EFR32 parts. |
| **WSTK** | Wireless Starter Kit | Silicon Labs' larger mainboard dev platform; the Sense 2 integrates an equivalent on-board debugger/AEM so it does **not** require a WSTK. |
| **Zigbee** | Zigbee (802.15.4 mesh) | Low-power mesh protocol supported via EmberZNet on this SoC. |

---

## 11. Sibling documents

- [README](./README.md) — documentation hub / index
- [01 — Overview](./01-overview.md) — identity, lifecycle, at-a-glance specs
- [02 — Hardware: SoC & Radio](./02-hardware-soc-radio.md) — the bare EFR32MG12, radio, protocols
- [03 — Sensors & Peripherals](./03-sensors-and-peripherals.md) — sensor suite, LEDs, buttons, flash
- [04 — Pinout, Power & Connectors](./04-pinout-power-connectors.md) — headers, power tree, AEM
- [05 — Use Cases & Applications](./05-use-cases-applications.md) — domains and example projects
- [06 — Getting Started](./06-getting-started.md) — out-of-box demo + mobile app
- [07 — Development Toolchain](./07-development-toolchain.md) — Studio, GSDK, Zephyr, Mbed, Edge Impulse, Matter, Arduino
- **08 — References & Glossary** (this document)

---

*Lifecycle note: the Thunderboard Sense 2 (`SLTB004A` / `BRD4166A`) is **NRND**. For new designs use the [EFR32xG24 Dev Kit](https://www.silabs.com/development-tools/wireless/efr32xg24-dev-kit). The board's SoC is a **bare `EFR32MG12P332F1024GL125`**, not an MGM12P module.*
