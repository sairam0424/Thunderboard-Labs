# Thunderboard Sense 2 — Reference Documentation Set

> A complete, permanent technical reference for the **Silicon Labs Thunderboard Sense 2** multi-sensor, multi-protocol wireless development board. This page is the **documentation hub** — start here, then follow the cross-links into the eight detailed chapters below.

The **Thunderboard Sense 2** (orderable kit **SLTB004A**, board/PCB **BRD4166A**) is Silicon Labs' compact, battery-friendly "sensor-to-cloud inspiration kit." It pairs a single **EFR32MG12 Mighty Gecko** wireless System-on-Chip (`EFR32MG12P332F1024GL125`, ARM Cortex-M4F) with **seven onboard environmental and motion sensors**, four high-brightness RGB LEDs, an onboard SEGGER J-Link debugger, and a companion mobile app plus cloud back end. Out of the box it streams live sensor data over **Bluetooth Low Energy** to a phone within minutes, and the EFR32MG12 additionally supports **Zigbee, Thread, and proprietary 2.4 GHz** protocols. It targets developers building energy-friendly, battery-operated IoT edge devices — wireless sensor nodes, environmental monitors, asset trackers, and the like.

**Navigation:**
[Overview](./01-overview.md) ·
[SoC & Radio](./02-hardware-soc-radio.md) ·
[Sensors & Peripherals](./03-sensors-and-peripherals.md) ·
[Pinout, Power & Connectors](./04-pinout-power-connectors.md) ·
[Use Cases](./05-use-cases-applications.md) ·
[Getting Started](./06-getting-started.md) ·
[Toolchain](./07-development-toolchain.md) ·
[References & Glossary](./08-references-glossary.md)

---

## ⚠️ Critical Correction — Bare EFR32MG12 SoC, NOT an MGM12P Module

> **This is the single most important fact in this entire documentation set. Read it before anything else.**

**The Thunderboard Sense 2 (BRD4166A) carries a _bare_ EFR32MG12 SoC soldered directly to the PCB. It does _NOT_ carry an MGM12P pre-certified radio module.**

It is extremely common — in forum posts, parts databases, blog write-ups, and AI-generated summaries — to see this board described as "based on the **MGM12P** module." **That is wrong.** The board uses a *discrete* `EFR32MG12P332F1024GL125` chip with discrete RF matching components and a discrete ceramic chip antenna laid out directly on the BRD4166A PCB. There is no module can, no module part number, and no module-level FCC/CE modular certification mediating the radio.

The trap is the **silkscreen string itself**:

```
EFR32MG12P332F1024GL125
        ^^
        the "P" here is part of the SoC ordering code.
        It does NOT mean "module" and is unrelated to "MGM12P".
```

The eye reads **"MG12P"** and pattern-matches it to the unrelated **module** family **"MGM12P."** They are different products. If any source tells you BRD4166A "uses the MGM12P module," treat that source as incorrect. The full decode lives in [SoC & Radio](./02-hardware-soc-radio.md), with the misidentification analysis in [Overview](./01-overview.md).

---

## At-a-Glance Specifications

A condensed snapshot. For the authoritative deep dives, follow the linked sibling docs.

| Category | Specification |
|---|---|
| **Product name** | Thunderboard Sense 2 (Generation 2; successor to the original Thunderboard Sense) |
| **Kit / orderable part number** | **SLTB004A** (what you order) |
| **Board / PCB part number** | **BRD4166A** (silkscreened on the PCB; the kit contains one BRD4166A) |
| **SoC** | **EFR32MG12 Mighty Gecko**, exact part `EFR32MG12P332F1024GL125`, ARM Cortex-M4F @ 38.4 MHz — a **bare SoC, not a module** |
| **On-chip memory** | 1024 kB Flash, 256 kB RAM |
| **External storage** | Macronix **MX25R8035F** ultra-low-power **8-Mbit (1 MB) SPI NOR flash** — OTA images + data logging |
| **Radio** | 2.4 GHz, integrated ceramic chip antenna, 50 Ω matched, fed from on-chip DC-DC converter |
| **Wireless protocols** | Bluetooth Low Energy, Zigbee, Thread, proprietary 2.4 GHz (multi-protocol capable) |
| **Sensors (7)** | Si7021 (RH/Temp), Si1133 (UV/Ambient Light), Si7210 (Hall effect), BMP280 (barometric pressure), CCS811 (indoor air quality / gas), ICM-20648 (6-axis IMU), ICS-43434 (MEMS microphone) |
| **LEDs** | Four high-brightness **RGB LEDs** + one bi-color user LED |
| **User input** | Two push buttons + a reset button |
| **Debugger** | Onboard **SEGGER J-Link**, USB virtual COM port (VCOM), SWD to target, Packet Trace Interface (PTI) |
| **Connectors** | USB Micro-B, **Mini Simplicity** connector, **20-pin 2.54 mm breakout pads** |
| **Power sources** | USB, CR2032 coin cell holder, external battery connector; automatic USB/battery switchover |
| **Power philosophy** | Fine-grained per-domain power control; boots in lowest-power mode with all sensors disabled by default |
| **USB enumeration** | Mass Storage volume **`TB004`** + USB serial port |
| **Toolchain** | Simplicity Studio + Gecko SDK (1st-party); Zephyr, Mbed, Edge Impulse, Matter (3rd-party). NOT on the official Silicon Labs Arduino core. |
| **Out-of-box experience** | Pre-loaded BLE demo -> Thunderboard / Simplicity Connect mobile app (iOS/Android) -> ThunderCloud |
| **Approx. price (MSRP)** | ~$36 USD (historical MSRP; approximate — board is NRND and the product page now redirects to the xG24 kit) |
| **Lifecycle status** | **NRND — Not Recommended for New Designs** (still purchasable while stock lasts; replacement is the **EFR32xG24** family, e.g. `xG24-DK2601B` / `BRD2601B`) |
| **Primary docs** | **UG309** (User's Guide), **UG313** (BLE Demo User's Guide) |

> Sources are consolidated in [References & Glossary](./08-references-glossary.md). Primary references: [UG309 — Thunderboard Sense 2 User's Guide (PDF)](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) and [UG313 — BLE Demo User's Guide (PDF)](https://cw.fel.cvut.cz/b232/_media/courses/b0b37nsi/hw/ug313-sltb004a-app-user-guide.pdf).

### Use it from your phone (no code)

Install **Simplicity Connect** (formerly EFR Connect) — Silicon Labs' free app — to read the board's sensors live over Bluetooth: **[iOS](https://apps.apple.com/us/app/id1030932759)** · **[Android](https://play.google.com/store/apps/details?id=com.siliconlabs.bledemo)**. Scannable QR codes and the full walkthrough are in [Getting Started](./06-getting-started.md#4-install-the-simplicity-connect-app-ios--android).

---

## Documents in This Set

Read top-to-bottom for a guided tour, or jump straight to the chapter you need. Every page cross-links back here and to its siblings.

| # | Document | What it covers |
|---|---|---|
| 1 | [01-overview.md](./01-overview.md) | What the board is, its identity (SLTB004A / BRD4166A / EFR32MG12), lifecycle and NRND status, recommended replacement, at-a-glance specs, and the full bare-SoC-vs-MGM12P-module correction with physical board-identification tips. |
| 2 | [02-hardware-soc-radio.md](./02-hardware-soc-radio.md) | Deep dive on the **EFR32MG12** SoC: Cortex-M4F core, memory map, the `EFR32MG12P332F1024GL125` part-number decode, the 2.4 GHz radio front end and ceramic antenna, and the supported wireless protocols (BLE, Zigbee, Thread, proprietary). |
| 3 | [03-sensors-and-peripherals.md](./03-sensors-and-peripherals.md) | The complete **seven-sensor** suite (Si7021, Si1133, BMP280, Si7210, CCS811, ICM-20648, ICS-43434), their buses (I2C / SPI / I2S), the per-domain power-enable gating, plus the RGB/user LEDs, push buttons, and external SPI flash. |
| 4 | [04-pinout-power-connectors.md](./04-pinout-power-connectors.md) | The **20-pin breakout** header pinout, the USB Micro-B and **Mini Simplicity** connectors, the power tree (USB / CR2032 / external battery with auto-switchover), and the Advanced Energy Monitoring (AEM) energy-profiling path. |
| 5 | [05-use-cases-applications.md](./05-use-cases-applications.md) | What the board is actually for: target application domains (environmental monitoring, asset tracking, predictive maintenance, smart-home edge nodes), representative example projects, and where it fits in a sensor-to-cloud workflow. |
| 6 | [06-getting-started.md](./06-getting-started.md) | The **out-of-box BLE demo** walkthrough and the **Thunderboard / Simplicity Connect mobile app** (iOS/Android) + ThunderCloud experience — from unboxing and powering the board to viewing live sensor data on a phone. |
| 7 | [07-development-toolchain.md](./07-development-toolchain.md) | The full toolchain landscape: **Simplicity Studio + Gecko SDK** (first-party BSP for BRD4166A), plus third-party paths — **Zephyr, Mbed, Edge Impulse, and Matter** — and why it is NOT on the official Arduino core. |
| 8 | [08-references-glossary.md](./08-references-glossary.md) | The consolidated reference shelf: datasheets, document numbers (UG309, UG313, schematics), part numbers, official Silicon Labs links, and a glossary of acronyms used throughout this set. |
| 9 | [aegis-edge/aegis-edge-guide.md](./aegis-edge/aegis-edge-guide.md) | **Evidence-based TinyML project guide** (from a verified deep-research run): proof that on-device ML works on this no-NPU board, a ranked shortlist of 7 ML projects, the recommended phased "Smart Guardian" flagship, the full Edge Impulse -> MG12 -> BLE pipeline, board-specific gotchas, and stretch goals. |

---

## How to Use This Reference

- **New to the board?** Start with [Overview](./01-overview.md), then [Getting Started](./06-getting-started.md) to see it run.
- **Designing firmware?** Go to [SoC & Radio](./02-hardware-soc-radio.md), [Sensors & Peripherals](./03-sensors-and-peripherals.md), and [Pinout, Power & Connectors](./04-pinout-power-connectors.md).
- **Choosing it for a project?** Read [Use Cases](./05-use-cases-applications.md) and the lifecycle/NRND note in [Overview](./01-overview.md) first.
- **Setting up tooling?** Jump to [Development Toolchain](./07-development-toolchain.md).
- **Want to build an ML / TinyML project?** Go to the [ML Project Guide](./aegis-edge/aegis-edge-guide.md) — ranked projects + the recommended build.
- **Need a primary source or a definition?** Everything is indexed in [References & Glossary](./08-references-glossary.md).

---

_Last updated: **2026-06-06**. Based on verified Silicon Labs sources (UG309, UG313, the BRD4166A/BRD4166C schematics, and the Zephyr SLTB004A board documentation). The authoritative, repeatedly-confirmed correction throughout this set: the Thunderboard Sense 2 (BRD4166A) is a **bare EFR32MG12 SoC** design, **not** an MGM12P module._
