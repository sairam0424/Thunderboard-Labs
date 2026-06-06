# Thunderboard Sense 2 — Overview

> Part of the [Thunderboard Sense 2 reference documentation set](./README.md). This page establishes the board's identity, lifecycle, and at-a-glance specifications, and resolves the single most common misidentification (the bare SoC vs. the MGM12P module). For deeper dives, follow the cross-references throughout.

---

## What Is the Thunderboard Sense 2?

The **Thunderboard Sense 2** is a compact, battery-friendly, multi-sensor, multi-protocol wireless development and prototyping board from **Silicon Labs**, marketed as a "sensor-to-cloud inspiration kit." It pairs a single **EFR32MG12 Mighty Gecko** wireless System-on-Chip (SoC) with **seven onboard sensors**, four high-brightness RGB LEDs, an onboard SEGGER J-Link debugger, and a companion mobile app plus cloud back end, so a developer can go from an unopened box to live sensor data streaming to a phone (and to the cloud) in minutes. It is designed to inspire and accelerate the development of energy-friendly, battery-operated IoT devices — wireless sensor nodes, environmental monitors, asset trackers, and similar edge devices — across **Bluetooth Low Energy, Zigbee, Thread, and proprietary 2.4 GHz** protocols. See [Sensors & Peripherals](./03-sensors-and-peripherals.md) for the full sensor suite and [Use Cases & Applications](./05-use-cases-applications.md) for what it is actually built for.

The board's full role inside the documentation set:

- It is the **brain + sensors + radio** of the kit. The radio and SoC are detailed in [SoC & Radio](./02-hardware-soc-radio.md).
- It exposes a **20-pin breakout** and **Mini Simplicity** connector — see [Pinout, Power & Connectors](./04-pinout-power-connectors.md).
- It ships with an **out-of-box BLE demo** and mobile app — see [Getting Started](./06-getting-started.md).
- It is fully supported by **Simplicity Studio / Gecko SDK** and several third-party toolchains — see [Development Toolchain](./07-development-toolchain.md).

---

## Identity Table

This is the canonical "what exactly am I holding" table. Memorize the distinction between the **kit** part number (what you order) and the **board** part number (silkscreened on the PCB).

| Attribute | Value | Notes |
|---|---|---|
| **Product (marketing) name** | Thunderboard Sense 2 | Sometimes written "Thunderboard™ Sense 2". Successor to the original Thunderboard Sense. |
| **Kit / orderable part number** | **SLTB004A** | This is what you buy/order. Also appears as `EFR32MG-SLTB004A` in some toolchains (e.g., older Zephyr/Nordic board names). |
| **Board / PCB part number** | **BRD4166A** | Silkscreened on the PCB itself. The kit (SLTB004A) contains one BRD4166A board. |
| **Board revision (silkscreen)** | **Rev. varies by unit** (e.g. D01 on a representative board); **D03 is the latest documented revision** | Per UG309 Table 8.1 the BRD4166A revisions run C00 -> D00 -> D01 -> D02 -> D03 (laser-printed on the board). No single rev is "typical". D03 is the latest documented rev (the baseline the de-populated BRD4166C forked from). The exact rev letter is printed on the silkscreen of your specific unit — record your own. |
| **Brain (SoC)** | **EFR32MG12** Mighty Gecko Wireless SoC | Exact orderable part: **`EFR32MG12P332F1024GL125`**. ARM Cortex-M4F core. See [SoC & Radio](./02-hardware-soc-radio.md). |
| **SoC memory** | 1024 kB Flash / 256 kB RAM | On-chip. Operating frequency 38.4 MHz. |
| **Board type** | Multi-sensor, multi-protocol wireless dev / prototyping board ("inspiration kit") | Sensor-to-cloud reference design. |
| **Generation** | Generation 2 (vs. the original "Gen 1" Thunderboard Sense) | The "2" in the name is a hardware generation, not a software version. |
| **Era / vintage** | ~2017-era design | Contemporary with the EFR32MG12 Series 1 family. |
| **Approx. price (MSRP)** | **~$36 USD** | Original Silicon Labs MSRP. Distributor street prices vary (often lower as stock clears due to lifecycle status — see below). |
| **Lifecycle status** | **NRND — Not Recommended for New Designs** | Still purchasable from distributors while stock lasts; not recommended to start a *new* design on it. |
| **Recommended replacement** | **EFR32xG24 family dev kits** (e.g., the **EFR32xG24 Dev Kit, `xG24-DK2601B` / `BRD2601B`**) | The xG24 generation supersedes the MG12-class boards, adding Cortex-M33, SecureVault, and an AI/ML hardware accelerator. MSRP $79. See [Development Toolchain](./07-development-toolchain.md) and [Use Cases](./05-use-cases-applications.md). |
| **USB Mass-Storage Device (MSD) name** | **`TB004`** | When you plug the board into a host over USB, the onboard debugger enumerates a Mass Storage volume labeled **TB004** plus a USB virtual COM port. Drag-and-drop a `.bin`/`.hex` here to flash. See [Getting Started](./06-getting-started.md). |
| **Primary doc — Kit User's Guide** | **UG309** — *Thunderboard Sense 2 User's Guide* | The authoritative hardware reference for BRD4166A. |
| **Primary doc — BLE Demo User's Guide** | **UG313** — *Thunderboard Sense 2 Bluetooth Low Energy Demo User's Guide* | Covers the out-of-box demo, mobile app, and ThunderCloud. |

> Sources: [UG313 (BLE Demo User's Guide, PDF)](https://cw.fel.cvut.cz/b232/_media/courses/b0b37nsi/hw/ug313-sltb004a-app-user-guide.pdf); [UG309 (User's Guide, mirror)](https://manuals.plus/m/ffc4636020e7938a5e79c17d34ba40c7a275b00ec52bd712d3f83d8bf297c7ac); [Zephyr SLTB004A board doc](https://docs.zephyrproject.org/3.6.0/boards/arm/efr32mg_sltb004a/doc/index.html); [BRD4166C schematic (cites BRD4166A Rev. D03 base + the `EFR32MG12P332F1024GL125` part)](https://www.silabs.com/documents/public/schematic-files/BRD4166C-A00-schematic.pdf). See [References & Glossary](./08-references-glossary.md) for the full citation list and doc numbers.

---

## At-a-Glance Specifications

A condensed snapshot. For the authoritative deep dives, follow the linked sibling docs.

| Category | Specification |
|---|---|
| **SoC** | EFR32MG12 Mighty Gecko (`EFR32MG12P332F1024GL125`), ARM Cortex-M4F @ 38.4 MHz |
| **On-chip memory** | 1024 kB Flash, 256 kB RAM |
| **External storage** | Macronix **MX25R8035F** ultra-low-power **8-Mbit (1 MB) SPI NOR flash** — for OTA images and data logging |
| **Radio** | 2.4 GHz, integrated **ceramic chip antenna**, 50 Ω matched, fed from on-chip DC-DC converter (1.8 V default) |
| **Wireless protocols** | Bluetooth Low Energy, Zigbee, Thread, proprietary 2.4 GHz (multi-protocol capable) — see [SoC & Radio](./02-hardware-soc-radio.md) |
| **Sensors (7)** | Si7021 (RH/Temp), Si1133 (UV/Ambient Light), Si7210 (Hall effect), BMP280 (barometric pressure), CCS811 (indoor air quality / gas), ICM-20648 (6-axis IMU), ICS-43434 (MEMS microphone) — see [Sensors & Peripherals](./03-sensors-and-peripherals.md) |
| **LEDs** | Four high-brightness **RGB LEDs** (Broadcom ASMT-YTB7-0AA02) + one bi-color user LED |
| **User input** | Two push buttons + a reset button |
| **Debugger** | Onboard **SEGGER J-Link** (separate non-user-programmable MCU), with USB **virtual COM port (VCOM)**, SWD to target, Packet Trace Interface (PTI) |
| **Connectors** | USB Micro-B, **Mini Simplicity** connector (for WSTK/external debugger + energy profiling), **20-pin 2.54 mm breakout pads** — see [Pinout, Power & Connectors](./04-pinout-power-connectors.md) |
| **Power sources** | USB, CR2032 coin cell holder, external battery connector; automatic switchover between USB and battery |
| **Power philosophy** | Fine-grained per-domain power control; boots in lowest-power mode with all sensors disabled by default |
| **USB enumeration** | Mass Storage volume **`TB004`** + USB serial port |
| **Toolchain** | Simplicity Studio + Gecko SDK (1st-party); Zephyr, Mbed, Edge Impulse, Matter, Arduino (NOT officially supported for EFR32MG12 — the official Silicon Labs Arduino core is Series-2 only) (3rd-party) — see [Development Toolchain](./07-development-toolchain.md) |
| **Out-of-box experience** | Pre-loaded BLE demo → Thunderboard mobile app (iOS/Android) → ThunderCloud (Firebase) — see [Getting Started](./06-getting-started.md) |

---

## ⚠️ Common Misidentification: Bare EFR32MG12 SoC, NOT an MGM12P Module

> **This is the single most important correction in this entire documentation set. Read it carefully.**

**The Thunderboard Sense 2 (BRD4166A) carries a *bare* EFR32MG12 SoC soldered directly to the PCB — it does NOT carry an MGM12P pre-certified radio module.**

### What people get wrong

It is extremely common to see the Thunderboard Sense 2 described — in forum posts, blog write-ups, parts databases, and even some AI-generated summaries — as being "based on the **MGM12P** module" (the MGM12P is a separate, RF-certified Silicon Labs *module* product that internally uses an MG12-class die). **That is incorrect for this board.** The Thunderboard Sense 2 uses a *discrete* EFR32MG12 chip together with discrete RF matching components and a discrete ceramic chip antenna laid out directly on the BRD4166A PCB. There is no module can/shield, no module part number, and no module-level FCC/CE modular certification mediating the radio — the RF front end is part of the board design itself.

### Why the confusion happens — the "MG12**P**" silkscreen

The root cause is the **part-number string itself**. The exact SoC on the board is:

```
EFR32MG12P332F1024GL125
        ^^
        the "P" here is part of the SoC ordering code,
        it does NOT mean "module" and is unrelated to "MGM12P"
```

When you read the chip silkscreen / package marking you will see a string beginning **`EFR32MG12P...`**. The human eye latches onto **"MG12P"** and pattern-matches it to the **module** family name **"MGM12P."** They look almost identical, but they are different products:

| You see / read | What it actually is | What it is NOT |
|---|---|---|
| `EFR32MG12P332F1024GL125` on the chip | A **bare EFR32MG12 SoC** (Series 1 Mighty Gecko). The `P` is a feature/protocol designator within the SoC ordering nomenclature. | It is **not** a module. |
| `MGM12P` (a different Silicon Labs product) | A **pre-certified radio module** (chip + RF + antenna in a shielded module package). | It is **not** what's on BRD4166A. |

The `P` in `EFR32MG12**P**...` and the `P` in `MGM12**P**` are unrelated coincidences of nomenclature. The decode of the SoC part number is covered in detail in [SoC & Radio](./02-hardware-soc-radio.md).

### Why it matters practically

- **RF certification:** Because the radio is a *bare-SoC + discrete-antenna* design (not a modular-approved module), the BRD4166A is an evaluation/prototyping board — it is **not** a drop-in pre-certified module you can place into a product and inherit modular FCC/CE/IC certification from. If you productize, you certify your own design (or pick a real module like MGM12P/MGM21 for your *product*, not for this board).
- **BSP / SDK targets:** Toolchains target the chip, e.g., Zephyr's board target is `sltb004a/efr32mg12p332f1024gl125` and the Gecko BSP is `BRD4166A`. There is no MGM12P BSP involved.
- **Schematic confirmation:** The board schematic explicitly labels the main IC as **`EFR32MG12P332F1024GL125`** (`U1`), confirming a discrete SoC plus discrete RF matching and antenna — not a module footprint.

> **Bottom line:** If any source tells you the Thunderboard Sense 2 / BRD4166A "uses the MGM12P module," treat that source as wrong. The board is a **bare EFR32MG12 SoC** design. The MG12**P** silkscreen is the trap.

---

## How to Physically Identify Your Board

Use these silkscreen and physical markings to confirm in hand that you are holding a genuine Thunderboard Sense 2 (BRD4166A) and not a sibling board (e.g., the closely related but de-populated BRD4166C, or an entirely different Thunderboard/dev kit).

### 1. The `BRD4166A` board number + revision

- Look for the silkscreen string **`BRD4166A`** printed directly on the PCB (commonly on the underside or near a board edge), often immediately followed by a revision marker such as **`Rev D01`/`Rev D03`**-style text.
- `BRD4166A` is the definitive board identifier. (Beware **`BRD4166C`** — a related variant whose schematic notes several components *not mounted*, including the MEMS microphone, RGB LEDs, pressure, UV/ALS, Hall, gas, and IMU sensors. If your board is missing the sensor cluster, double-check the silkscreen — it may be a BRD4166C, not a fully-populated BRD4166A.)
- Record the **revision letter** printed on *your* unit; D03 is the latest documented revision (used by reference docs as a baseline), but yours may differ — no single rev is "typical". This matters for schematic cross-referencing.

### 2. The Silicon Labs "gecko" logo

- Genuine Silicon Labs boards carry the **stylized gecko/lizard logo** silkscreened on the PCB, alongside the "Silicon Labs" wordmark.
- Its presence (plus the BRD4166A number) is a quick authenticity and family check — this is a first-party Silicon Labs board, not a clone.

### 3. The gold sensor icons (the dead giveaway)

- The Thunderboard Sense 2 is visually distinctive: the **sensor positions are marked with small gold (ENIG-finish) icons / pictograms** silkscreened next to each sensor — little glyphs indicating temperature/humidity, light/UV, pressure, air-quality/gas, motion (IMU), Hall/magnet, and the microphone.
- Counting and locating these gold sensor icons is the fastest visual confirmation that you have the **fully-populated multi-sensor BRD4166A** (versus a stripped variant where those positions are unpopulated).

### 4. Connector & component cross-check (secondary confirmation)

If silkscreen is ambiguous, confirm via the physical hardware layout:

| Look for | Confirms |
|---|---|
| A single **USB Micro-B** connector | Power + onboard J-Link + VCOM |
| A small **Mini Simplicity** (10-pin) connector | External WSTK debug / energy profiling — see [Pinout, Power & Connectors](./04-pinout-power-connectors.md) |
| **20 breakout pads** along the board edge (2.54 mm pitch) | Expansion-header-compatible GPIO breakout |
| A **CR2032 coin-cell holder** (on the underside) + an external battery connector | Battery operation with auto-switchover |
| **Four RGB LEDs** clustered together + a small **ceramic chip antenna** at a board edge | Confirms the populated RGB + integrated-antenna BRD4166A |
| Chip marking reading **`EFR32MG12P...`** | The bare SoC (see the misidentification callout above — this is NOT an MGM12P module) |

### 5. Confirm over USB (software check)

Plug the board into a host via USB Micro-B. A genuine, healthy BRD4166A enumerates a **USB Mass Storage volume named `TB004`** plus a USB virtual COM port. Seeing the **`TB004`** drive label is a definitive software-side confirmation of board identity. See [Getting Started](./06-getting-started.md) for the full first-plug-in walkthrough.

---

## See Also

- [README — Documentation Hub](./README.md)
- [02 — Hardware: SoC & Radio](./02-hardware-soc-radio.md) — EFR32MG12 part-number decode, radio, protocols
- [03 — Sensors & Peripherals](./03-sensors-and-peripherals.md) — full sensor suite, LEDs, buttons, flash
- [04 — Pinout, Power & Connectors](./04-pinout-power-connectors.md) — header pinout, power tree, AEM/energy profiling
- [05 — Use Cases & Applications](./05-use-cases-applications.md)
- [06 — Getting Started](./06-getting-started.md) — out-of-box demo + mobile app
- [07 — Development Toolchain](./07-development-toolchain.md) — Simplicity Studio, Gecko SDK, Zephyr, Mbed, Edge Impulse, Matter, Arduino
- [08 — References & Glossary](./08-references-glossary.md) — datasheets, doc numbers (UG309/UG313), part numbers, links
