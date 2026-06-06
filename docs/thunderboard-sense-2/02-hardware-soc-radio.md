# 02 — SoC & Radio Deep-Dive

> The compute and wireless heart of the Thunderboard Sense 2 (SLTB004A / board revision BRD4166A): a **bare** Silicon Labs **EFR32MG12P332F1024GL125** "Mighty Gecko" Wireless System-on-Chip, its integrated 2.4 GHz multiprotocol radio, the on-board antenna and matching network, clocking, hardware security, and the full picture of which wireless protocols it does — and does not — support.

**Navigation:** [Docs Hub](./README.md) · [Overview](./01-overview.md) · **SoC & Radio (this doc)** · [Sensors & Peripherals](./03-sensors-and-peripherals.md) · [Pinout, Power & Connectors](./04-pinout-power-connectors.md) · [Use Cases](./05-use-cases-applications.md) · [Getting Started](./06-getting-started.md) · [Toolchain](./07-development-toolchain.md) · [References & Glossary](./08-references-glossary.md)

---

## Table of Contents

1. [The headline correction: SoC, not module](#1-the-headline-correction-soc-not-module)
2. [Part number decoded](#2-part-number-decoded)
3. [The MCU core: ARM Cortex-M4F](#3-the-mcu-core-arm-cortex-m4f)
4. [Memory: flash and RAM](#4-memory-flash-and-ram)
5. [Package, GPIO, and temperature range](#5-package-gpio-and-temperature-range)
6. [Clock sources (HFXO / LFXO and the RC oscillators)](#6-clock-sources-hfxo--lfxo-and-the-rc-oscillators)
7. [The 2.4 GHz radio](#7-the-24-ghz-radio)
8. [Antenna and RF matching network](#8-antenna-and-rf-matching-network)
9. [Hardware crypto, TRNG, and security](#9-hardware-crypto-trng-and-security)
10. [SWD debug, the on-board J-Link, and VCOM](#10-swd-debug-the-on-board-j-link-and-vcom)
11. [Wireless protocols supported](#11-wireless-protocols-supported)
12. [Multiprotocol concurrency](#12-multiprotocol-concurrency)
13. [Why Z-Wave is NOT supported](#13-why-z-wave-is-not-supported)
14. [Comparison: EFR32MG12 SoC (this board) vs MGM12P module](#14-comparison-efr32mg12-soc-this-board-vs-mgm12p-module)
15. [Source documents](#15-source-documents)

---

## 1. The headline correction: SoC, not module

The single most important fact to get right about this board's radio subsystem:

> **The Thunderboard Sense 2 carries a *bare* EFR32MG12 System-on-Chip (SoC) — a raw BGA-packaged (BGA125) silicon die soldered directly to the PCB. It does NOT use the pre-certified MGM12P module.**

This distinction matters and is frequently gotten wrong, because the MGM12P module is *built on the exact same EFR32MG12 silicon*. They are easy to conflate. The difference is one of **packaging and certification scope**, not core silicon:

| Aspect | Bare SoC (on this board) | MGM12P module |
| --- | --- | --- |
| What it physically is | A BGA-packaged (BGA125) EFR32MG12 die soldered to the host PCB | A shielded module containing the same EFR32MG12 die + RF matching + antenna + can shield |
| RF design responsibility | The board designer (Silicon Labs, for BRD4166A) lays out the matching network and antenna | Pre-designed and frozen inside the module |
| Regulatory certification | The *finished product* must be certified (the BRD4166A radio board carries its own FCC/CE/IC test data in [UG309](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf)) | The module ships **pre-certified** (FCC/IC/CE/MIC modular approval), so a product reusing it can inherit certification |
| Why Silicon Labs chose it here | The Thunderboard Sense 2 is a *reference / inspiration kit* — exposing the bare SoC plus a documented, copyable RF layout teaches customers how to do their own design | Modules are aimed at customers who want to skip RF engineering and certification entirely |

So when you read this board's marketing — "EFR32MG12 Mighty Gecko Wireless SoC" — that is literal. The board's design files (the BRD4166A schematic and layout) are published precisely *so you can copy the bare-SoC RF design into your own product*. See [Antenna and RF matching network](#8-antenna-and-rf-matching-network) for the actual matching circuit Silicon Labs used.

For the full side-by-side, jump to [section 14](#14-comparison-efr32mg12-soc-this-board-vs-mgm12p-module).

---

## 2. Part number decoded

The exact device on the BRD4166A is:

```
EFR32MG12 P 332 F 1024 G L 125
│         │ │   │ │    │ │ │
│         │ │   │ │    │ │ └── 125 = ball count -> BGA125
│         │ │   │ │    │ └──── L    = package code (BGA — NOT QFN)
│         │ │   │ │    └────── G    = temperature grade
│         │ │   │ └─────────── 1024 = 1024 kB flash
│         │ │   └───────────── F    = flash memory MCU
│         │ └───────────────── 332  = Feature Set Code (r2 r1 r0): r2=3 Reserved, r1=3 RF Type = TRX (transceiver), r0=2 Frequency Band = 2.4 GHz
│         └─────────────────── P    = Performance grade (one of P / B / V — means Performance, NOT "Premium"; not a band or PA indicator)
└───────────────────────────── EFR32MG12 = EFR32 Wireless Gecko family, Mighty Gecko (MG), Series 1 (1) + device config (2) -> "xG12"
```

| Field | Meaning |
| --- | --- |
| **EFR32** | EFR32 Wireless Gecko family |
| **MG** | **M**ighty **G**ecko — the 2.4 GHz multiprotocol line (BLE / Zigbee / Thread / proprietary), as opposed to BG = Blue Gecko, FG = Flex Gecko, ZG = Zen Gecko |
| **12** | "xG12" — Series 1 (the `1` digit) plus device configuration (the `2` digit); the high-end Series 1 part with the most flash/RAM and full peripheral set |
| **P** | **Performance** grade (the grade is one of P / B / V). It denotes *Performance*, not "Premium", and is **not** a band or PA indicator |
| **332** | Feature Set Code r2 r1 r0: **r2=3** (Reserved), **r1=3** (RF Type = TRX / transceiver), **r0=2** (Frequency Band = 2.4 GHz). Because **r0=2**, this exact part is **2.4 GHz-only transceiver silicon** |
| **F1024** | 1024 kB (1 MB) on-chip flash |
| **GL125** | G = temperature grade; L = **BGA** package (not QFN — QFN is the 48/68-pin parts only); 125 = ball count -> **BGA125** (a 7x7 mm BGA) |

> **This SKU is 2.4 GHz-only silicon.** Because the Feature Set Code's frequency-band digit is **r0=2**, the EFR32MG12P332F1024GL125 is a 2.4 GHz-only transceiver. Sub-GHz on the EFR32MG12 family is SKU-specific (r0=1 parts only, e.g. P431/P231); the P332 fitted here does **not** have a sub-GHz path. The "P" grade means *Performance* and says nothing about band.

> **Note on the "Series" label.** The EFR32MG12 is a **Series 1** Mighty Gecko. This is occasionally mislabeled "Series 2" in third-party board-support files (e.g. some Zephyr device-tree compatibles tag the BLE HCI block as "Series 2"); the *silicon family* is Series 1. The EFR32MG21/MG24 are the Series 2 successors and are **not** what is on this board.

---

## 3. The MCU core: ARM Cortex-M4F

| Parameter | Value | Source |
| --- | --- | --- |
| CPU | ARM **Cortex-M4** with FPU (M4F) | [EFR32MG12 datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| Floating-point | Single-precision **FPU** (hardware float) | datasheet |
| DSP | DSP instruction set (SIMD, single-cycle MAC) | datasheet |
| Max system clock (datasheet rating) | **40 MHz** | [SoC product page](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) |
| Operating frequency *on this board* | **38.4 MHz** (clocked from the on-board HFXO) | [UG309](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf); [Zephyr SLTB004A board doc](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html) |
| MPU | ARM Memory Protection Unit present | datasheet |
| Debug | Serial Wire Debug (SWD) + ETM trace | datasheet |

**Key nuance to remember:** the *die* is rated to 40 MHz, but on the Thunderboard Sense 2 the core runs at **38.4 MHz**, because the board provides a 38.4 MHz crystal as the HFXO reference and the SoC clocks the core directly from it. The 38.4 MHz figure is what you will see reported by the Zephyr, Gecko SDK, and Simplicity Studio toolchains for this board.

The core includes:

- Single-cycle hardware multiply and hardware divide.
- Nested Vectored Interrupt Controller (NVIC) for low-latency interrupt handling.
- Wake-up Interrupt Controller (WIC) allowing the core to wake from deep-sleep energy modes.
- Energy-mode architecture (EM0 active down to EM4 shutoff) — central to the board's low-power story, covered in the [Power & AEM section](./04-pinout-power-connectors.md).

The **70 µA/MHz** active-mode efficiency and **~2.6 µA EM2 deep-sleep** current (with 256 kB RAM retention + RTCC running off the LFXO) figures are what make this part suitable for coin-cell-powered IoT sensors — directly relevant to the CR2032 holder on this board.

---

## 4. Memory: flash and RAM

| Memory | Size | Notes |
| --- | --- | --- |
| **Flash (program)** | **1024 kB (1 MB)** | Non-volatile, in-system programmable; holds firmware, the wireless stack, and the bootloader |
| **RAM (data)** | **256 kB** | SRAM; retainable in low-energy modes (EM2/EM3) for state preservation |

These are the **top-of-stack** memory sizes for the EFR32MG12 family (the family also ships 512 kB-flash / 64 kB-RAM variants — this board uses the max). The generous 1 MB / 256 kB pairing is what makes the part comfortable for:

- **Zigbee + BLE concurrent multiprotocol** stacks, which are RAM-hungry.
- **Thread / OpenThread** with full mesh routing tables.
- **Matter (CHIP)** over Thread, which layers a heavyweight application/data model on top of Thread and needs both flash and RAM headroom.
- Over-the-air (OTA) update **dual-bank** / slot schemes that need room for a downloaded image alongside the running one.

> Do not confuse the SoC's internal 1 MB flash with the board's **external** 8-Mbit (1 MB) Macronix MX25R8035F SPI NOR flash. The external flash is a *separate* device used for OTA image staging and data logging — it is covered in [Sensors & Peripherals](./03-sensors-and-peripherals.md), not here.

---

## 5. Package, GPIO, and temperature range

| Parameter | Value | Source |
| --- | --- | --- |
| Package | **BGA125** (7x7 mm, 125-ball BGA) bare package soldered to the BRD4166A — package code **L** = BGA per the datasheet ordering nomenclature | [datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| GPIO | **Up to 65 general-purpose I/O** (full-pin-count variants) | [SoC product page](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) |
| Operating temperature | **-40 °C to +85 °C** (G grade) | datasheet |
| Supply voltage | **1.8 V to 3.8 V** single supply | datasheet |
| APORT analog pins | Up to 25 pins shareable across analog peripherals | datasheet |

The EFR32MG12 family spans QFN48 (up to 31 GPIO, SKU-dependent), QFN68 (up to 46 GPIO), and BGA125 / 125-pad (65 GPIO) packages. The Thunderboard Sense 2 uses the **125-pad, full-GPIO variant**, which is why the board can wire up seven sensors, four RGB LEDs, the MEMS microphone, the external SPI flash, the buttons, and still expose breakout pads — all from the SoC's own pins. The full mapping of these pins to the board's breakout headers and Mini Simplicity connector is in [Pinout, Power & Connectors](./04-pinout-power-connectors.md).

---

## 6. Clock sources (HFXO / LFXO and the RC oscillators)

The EFR32MG12 supports **two crystal oscillators** and integrates **four RC oscillators**. On the BRD4166A, the two external crystals are populated:

| Oscillator | On-board frequency | Role | Source |
| --- | --- | --- | --- |
| **HFXO** (High-Frequency Crystal Oscillator) | **38.4 MHz** | Primary precise reference for the MCU core and the radio. Tunable in small steps via integrated load caps. The radio *requires* a crystal reference for its frequency synthesis. | [datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf); [UG309](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) |
| **LFXO** (Low-Frequency Crystal Oscillator) | **32.768 kHz** | Accurate timing for low-energy modes — drives the RTCC (real-time clock & calendar) so it keeps running during EM2 deep sleep. | datasheet |

The HFXO supports crystals in the **38–40 MHz** range; this board uses **38.4 MHz**, which is why the core runs at 38.4 MHz rather than the 40 MHz die maximum. An external TCXO can be applied to the HFXO input for improved frequency accuracy over temperature, though the board uses a standard crystal.

The four integrated RC oscillators (no external parts needed) are:

- **HFRCO** — high-frequency RC for the MCU when crystal accuracy is not required (fast wake-up).
- **AUXHFRCO** — auxiliary high-frequency RC (e.g. for the ADC and flash programming independent of the main clock tree).
- **LFRCO** — low-frequency 32.768 kHz RC for low-energy timing when a crystal is overkill.
- **ULFRCO** — ultra-low-frequency RC (~1 kHz) for the watchdog and the deepest sleep wake timers.

This hierarchy is what enables the board's energy-mode story: the radio and tight-timing peripherals lock to the crystals; everything else can drop to RC sources to save power.

---

## 7. The 2.4 GHz radio

The EFR32MG12P332F1024GL125 integrates a single, highly configurable 2.4 GHz transceiver shared by all supported protocols. (This SKU is **2.4 GHz-only silicon** — its Feature Set Code band digit is r0=2 — and on this board only the 2.4 GHz path is matched and antenna-connected — see [section 8](#8-antenna-and-rf-matching-network).)

### Frequency and band

| Parameter | Value |
| --- | --- |
| Band | 2.4 GHz ISM — **2400 to 2483.5 MHz** |
| Balun | Integrated 2.4 GHz balun on-die |
| Modulations | Shaped O-QPSK (DSSS), 2-FSK / 4-FSK with configurable shaping, GFSK |

### TX output power — the silicon rating

The fitted **EFR32MG12P332F1024GL125 is natively a +10 dBm-rated 2.4 GHz SKU.** The +10 dBm maximum is the *silicon specification* (POUTMAX +10 dBm per the datasheet Ordering Table 2.1 / Table 4.12) — it is **not** a board-imposed de-rating. Re-tuning the antenna match cannot make a P332 reach higher than its rated PA ceiling.

| Figure | Value | Meaning | Source |
| --- | --- | --- | --- |
| **Rated max TX power (2.4 GHz)** | **+10 dBm max** (POUTMAX, the silicon spec for this P332 SKU) | The rated output-power ceiling of the EFR32MG12P332's PA at 2.4 GHz, conducted, with the appropriate matching network | [datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) (Ordering Table 2.1; Table 4.12) |
| **On-board radiated TX power (BRD4166A)** | the +10 dBm conducted ceiling at the antenna port, with radiated power further bounded by ETSI EN 300-328 and FCC 15.247 limits | The Thunderboard Sense 2's matching network and antenna deliver the part's rated 2.4 GHz output within the regulatory radiated-power ceilings | [UG309](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) (Radio section: radiated power measurements + EMC compliance) |

> **Note on the +19 dBm figure.** A +19 dBm 2.4 GHz maximum belongs to *different* EFR32MG12 SKUs (e.g. P432/P232), **not** to the P332 fitted here — it is wrong to attribute +19 dBm to this part's die. The P332's rated ceiling is +10 dBm; that is the silicon specification, not a board de-rating. The board is matched for a compliant operating point against ETSI EN 300-328 / FCC 15.247 for the 2400–2483.5 MHz band; the exact radiated-power and antenna-pattern measurements are tabulated in UG309 §5.3.

### RX sensitivity (die figures, 2.4 GHz)

Receive sensitivity determines range and link robustness. The EFR32MG12 publishes these conducted-mode figures (typical, 25 °C, 3.3 V):

| Mode / PHY | Sensitivity | Source |
| --- | --- | --- |
| **Bluetooth LE 1 Mbit/s** (GFSK, 1M PHY) | **-94.8 dBm** | [datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| Bluetooth LE 2 Mbit/s (GFSK, 2M PHY) | **-91.3 dBm** | datasheet |
| **Bluetooth LE 125 kbit/s** (LE Coded, S=8 long-range PHY) | approx. **-103 to -106 dBm** (coded-PHY gain over 1M) | Silicon Labs BLE characterization; see datasheet RX sensitivity tables |
| **IEEE 802.15.4 / Zigbee / Thread** — 250 kbit/s O-QPSK DSSS | **-102.7 dBm** | datasheet; [SoC product page](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) |

Practical reading:

- The **-94.8 dBm @ 1 Mbps BLE** and **-102.7 dBm @ 250 kbps 802.15.4** are the two numbers you will quote most often — they are the headline sensitivities for the two dominant protocol classes on this board.
- BLE **Coded PHY (125 kbps, S=8)** trades data rate for roughly **+8–10 dB** of link budget over the 1M PHY, which is how "Bluetooth 5 long range" achieves several-hundred-meter links. Treat the ~-103…-106 dBm figure as approximate and protocol-config-dependent; consult the datasheet's coded-PHY rows for the exact value for your stack version.
- These are *die / conducted* sensitivities. On the real board, the antenna efficiency (a ceramic chip antenna with finite gain/efficiency) reduces effective system sensitivity at the air interface.

### RX current (for power budgeting)

| Mode | Current |
| --- | --- |
| RX @ 1 Mbps GFSK, 2.4 GHz | **~10.0 mA** |
| RX @ 250 kbps DSSS-O-QPSK, 2.4 GHz | **~11 mA** |
| TX @ 0 dBm output, 2.4 GHz | **~8.5 mA** |

These feed directly into the coin-cell battery-life math discussed in the [Power tree / AEM doc](./04-pinout-power-connectors.md).

---

## 8. Antenna and RF matching network

The BRD4166A RF front-end is fully documented in [UG309 §5 (Radio)](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf), and is the canonical reference design you are meant to copy.

### Antenna

| Parameter | Value |
| --- | --- |
| Antenna type | **2.4 GHz ceramic chip antenna** (surface-mount) |
| Target impedance | matched to **50 Ω** |

The board uses an on-board **ceramic chip antenna**, matched to 50 Ω by its own impedance-matching components and connected to the EFR32MG12 through an **optional 0 Ω resistor** (which lets you cut the trace and inject an external/conducted source for lab measurement).

### RF matching topology

From UG309 §5.1.1 (Description of the RF Matching):

- The EFR32MG12's RF port is matched to **50 Ω**.
- The **`2G4RF_ION`** pin is **tied to ground**.
- The **`2G4RF_IOP`** pin drives a **two-element impedance-matching network** out to the 50 Ω antenna feed.
- This is a **single-ended** 2.4 GHz match (the on-die balun makes the single-ended port possible).

> Because the BRD4166A's board size and ground plane differ significantly from the antenna vendor's evaluation board, Silicon Labs **fine-tuned** the antenna matching network away from the vendor's stock recommendation to bring the antenna impedance close to 50 Ω *on this specific PCB*. UG309 §5.1.5 gives the exact antenna-matching bill of materials. This is the key lesson of a bare-SoC reference design: the antenna match is layout-dependent and must be tuned in-situ.

### RF section power supply

On the BRD4166A, the radio supply (**RFVDD**) and the PA supply (**PAVDD**) are fed from the SoC's on-chip **DC-DC converter**, which by default provides **1.8 V** to the RF section. This integrated DC-DC is part of why the EFR32MG12 achieves its low active-radio currents.

### Regulatory framing

UG309 §5.2–5.4 documents the board's compliance posture for the 2400–2483.5 MHz band against **ETSI EN 300-328** (Europe) and **FCC 15.247** (US), including applied emission limits, maximum radiated-power measurements, and antenna-pattern plots. This is exactly the data a module would hide inside its pre-certification — exposed here because the board is a teaching reference, not a drop-in certified module ([see the SoC-vs-module distinction](#1-the-headline-correction-soc-not-module)).

---

## 9. Hardware crypto, TRNG, and security

The EFR32MG12P's **Performance** grade brings the full security block — important for Matter, Zigbee 3.0, Thread commissioning, and BLE Secure Connections, all of which require real cryptography.

| Feature | Detail | Source |
| --- | --- | --- |
| **Crypto accelerator (CRYPTO)** | Autonomous hardware accelerator — offloads symmetric/asymmetric crypto from the CPU | [datasheet §3.8.2](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| **AES** | **AES-128 and AES-256** in hardware | datasheet |
| **Hashing** | **SHA-1, SHA-2 (SHA-224 and SHA-256)** | datasheet |
| **Asymmetric** | **ECC** (Elliptic Curve Cryptography) acceleration | datasheet |
| **TRNG** | **True Random Number Generator** — output "suitable for use in cryptographic applications" | [datasheet §3.8.3](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| **CRC** | General-purpose hardware CRC | datasheet |

What this enables in practice:

- **BLE LE Secure Connections** (ECDH key agreement using P-256) run on the ECC hardware rather than bit-banging in software.
- **Zigbee 3.0 / Thread** network-layer AES-CCM* encryption uses the AES hardware.
- **Matter** device attestation and commissioning lean on ECC + SHA-256 + the TRNG for nonce/key generation.
- The TRNG seeds key generation and protocol nonces without a predictable software PRNG.

> **Series-1 caveat:** the EFR32MG12 is a Series 1 part and predates the dedicated **Secure Vault** hardware security subsystem found on Series 2 EFR32 parts (MG21/MG24). It has strong crypto acceleration and a TRNG, but it does **not** offer Secure Vault's tamper protection, secure key storage with key wrapping, or anti-rollback in hardware. For products needing those, the Series 2 parts (not on this board) are the upgrade path.

---

## 10. SWD debug, the on-board J-Link, and VCOM

You do **not** need an external debug probe to use this board — it has one built in.

| Element | Detail | Source |
| --- | --- | --- |
| SoC debug interface | **Serial Wire Debug (SWD)** + ETM instruction trace | [datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| On-board debugger | **SEGGER J-Link** debugger integrated on the board | [UG309](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) |
| Connection to host | Single **USB** connection (also powers the board) | UG309 |
| Virtual COM port | The J-Link presents a **USB Virtual COM Port (VCOM)** for serial application data | UG309; [Zephyr SLTB004A doc](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html) |
| Console UART | **USART0** is wired to the on-board J-Link VCOM (Zephyr console default; general-purpose serial) | Zephyr board doc |
| Advanced debug | **Mini Simplicity connector** exposes energy profiling (AEM) + Packet Trace Interface (PTI) for wireless network debugging | UG309 |

How it fits together:

1. Plug the board into a host via USB. The on-board SEGGER J-Link enumerates as a debug probe **and** a VCOM serial port simultaneously.
2. Simplicity Studio (or any J-Link-aware toolchain — Ozone, GDB, Zephyr's `west flash`/`west debug`) flashes and debugs over SWD with **no external probe**.
3. Application `printf`/log output flows over USART0 to the VCOM, visible in any serial terminal.
4. The **Mini Simplicity connector** is the port for *external* tooling: it carries the SWD lines, the **PTI** (Packet Trace Interface, for capturing over-the-air radio packets in Network Analyzer), and the **AEM** energy-measurement lines. This is how you do production-grade wireless protocol debugging — covered further in the [toolchain doc](./07-development-toolchain.md).

The interplay of the J-Link, VCOM, and the USB-vs-battery power switchover (the board auto-switches between USB and CR2032/external battery power) is detailed in [Pinout, Power & Connectors](./04-pinout-power-connectors.md).

---

## 11. Wireless protocols supported

The single 2.4 GHz radio in the EFR32MG12, paired with Silicon Labs' wireless stacks, supports a broad set of protocols. What you can actually run depends on the **stack/SDK** you load (see the [toolchain doc](./07-development-toolchain.md)), but the *silicon* supports all of the following:

| Protocol | Supported? | Notes |
| --- | --- | --- |
| **Bluetooth Low Energy (Bluetooth 5.x)** | ✅ Yes | 1M, 2M, and Coded (125 kbps long-range) PHYs; LE Secure Connections via on-die ECC. The out-of-box demo and the [mobile app walkthrough](./06-getting-started.md) use BLE. |
| **Bluetooth Mesh** | ✅ Yes | Mesh networking over BLE advertising bearer. |
| **Zigbee (Zigbee 3.0)** | ✅ Yes | IEEE 802.15.4 PHY/MAC; full mesh. A core target of the Mighty Gecko line. |
| **Thread (OpenThread)** | ✅ Yes | IEEE 802.15.4-based IPv6 mesh; the transport layer beneath Matter-over-Thread. |
| **Matter** | ✅ Yes (over Thread or with BLE commissioning) | Runs on top of OpenThread; uses the crypto block. See [toolchain](./07-development-toolchain.md). |
| **Proprietary 2.4 GHz** | ✅ Yes | Silicon Labs Connect / RAIL custom radio profiles; FSK/OQPSK; fully tunable. |
| **Wi-SUN** | ⚠️ Primarily a sub-GHz FAN protocol | Wi-SUN is a sub-GHz FAN protocol, supported on *sub-GHz* EFR32 hardware. The P332 fitted here is **2.4 GHz-only silicon** (Feature Set Code r0=2) **and** this board only matches/antennas the 2.4 GHz path, so a Wi-SUN deployment is **not possible on the BRD4166A**. Treat Wi-SUN as an EFR32-*family* capability (sub-GHz SKUs only), not a *this-board* capability. |
| **Wireless M-Bus** | ⚠️ Sub-GHz metering protocol | Same caveat as Wi-SUN: Wireless M-Bus is a sub-GHz (e.g. 868 MHz) protocol. The P332 is 2.4 GHz-only silicon and the Thunderboard Sense 2's antenna and matching are 2.4 GHz only, so Wireless M-Bus is **not deployable on this board**. |
| **Z-Wave** | ❌ **No** | Not supported by this silicon. See [section 13](#13-why-z-wave-is-not-supported) for the detailed reason. |

> **Critical board-vs-silicon distinction for sub-GHz protocols.** The fitted **EFR32MG12P332F1024GL125 is 2.4 GHz-only transceiver silicon** — its Feature Set Code frequency-band digit is r0=2, so the die has **no** sub-GHz path. (Sub-GHz on the EFR32MG12 family is a property of *other* SKUs, the r0=1 parts such as P431/P231 — not the "P" grade, which only means *Performance*.) **On top of that, the Thunderboard Sense 2 (BRD4166A) only implements a 2.4 GHz ceramic antenna and 2.4 GHz matching network.** Therefore, on *this board*, you have **2.4 GHz protocols only**: BLE, Bluetooth Mesh, Zigbee, Thread, Matter-over-Thread, and proprietary 2.4 GHz. Wi-SUN and Wireless M-Bus (sub-GHz) require different silicon **and** different RF hardware, and are listed above for completeness of the *family's* capabilities, not as deployable on this PCB.

---

## 12. Multiprotocol concurrency

The Mighty Gecko name is, in large part, about **multiprotocol** operation. There are three meaningfully different modes, and the distinction matters for what your firmware can do:

| Mode | What it means | Example |
| --- | --- | --- |
| **Dynamic Multiprotocol (DMP)** | A single radio is **time-sliced** between two stacks running concurrently, with a priority/scheduler arbitrating air-time. Both protocols appear "always on." | **Zigbee + BLE** concurrently — a Zigbee light bulb that is simultaneously BLE-commissionable from a phone. The [SoC product page](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) explicitly calls out "Multiprotocol Zigbee BLE: Yes." |
| **Switched Multiprotocol** | The device runs one protocol, then **switches** its entire stack to another (not simultaneous, but reconfigurable at runtime). | Boot in BLE for commissioning, then switch to Thread for operation. |
| **Concurrent Multiprotocol** | Multiple instances of the *same* PHY family (e.g. Thread + Zigbee, both 802.15.4) sharing the radio. | A Zigbee + OpenThread coexistence gateway. |

Enabling hardware:

- The radio scheduler / RAIL (Radio Abstraction Interface Layer) arbitrates air-time between stacks.
- **PTA (Packet Traffic Arbitration)** is present for **Wi-Fi coexistence** — letting the EFR32MG12 coordinate 2.4 GHz access with a co-located Wi-Fi radio.
- The generous 1 MB flash / 256 kB RAM ([section 4](#4-memory-flash-and-ram)) is what makes running two full stacks at once feasible.

The classic DMP demo for this exact part is **Zigbee + BLE** — and it is one of the headline reasons a designer picks an EFR32MG12 over a single-protocol BLE-only or Zigbee-only chip.

---

## 13. Why Z-Wave is NOT supported

> **Z-Wave is NOT supported on the Thunderboard Sense 2, nor on any EFR32MG12 part.** This is a hard hardware/PHY limitation, not a software gap, and the reasons are worth understanding.

**1. Z-Wave is a sub-GHz protocol on a proprietary PHY.** Z-Wave operates in regional sub-GHz ISM bands (e.g. ~908.42 MHz in the US, ~868.42 MHz in the EU) using a **proprietary, Silicon Labs-owned Z-Wave PHY/MAC** — *not* IEEE 802.15.4 and *not* the generic FSK profiles the EFR32MG12's radio exposes. The EFR32MG12 has no Z-Wave PHY/protocol engine.

**2. This board has no sub-GHz RF path anyway.** Even setting the PHY aside, the BRD4166A only implements a **2.4 GHz** antenna and matching network ([section 8](#8-antenna-and-rf-matching-network)). Z-Wave's ~900 MHz band is physically unreachable through this board's RF front-end.

**3. Z-Wave lives on a *different product line*.** Silicon Labs delivers Z-Wave through its dedicated **Z-Wave 700/800 series** SoCs — the **EFR32ZG14 (Z-Wave 700)** and **EFR32ZG23 / ZGM230 (Z-Wave 800)** "Zen Gecko" devices. These are purpose-built parts with the licensed Z-Wave protocol engine and sub-GHz radios. The "ZG" in those part numbers (vs "MG" Mighty Gecko here) is the giveaway. Z-Wave is a single-vendor (Silicon Labs) ecosystem precisely because the PHY is proprietary.

**Bottom line:** to do Z-Wave you need EFR32**ZG** silicon (Zen Gecko) with a sub-GHz design — categorically different hardware from the EFR32**MG**12 Mighty Gecko on this board. No firmware or SDK can add Z-Wave to this board.

---

## 14. Comparison: EFR32MG12 SoC (this board) vs MGM12P module

Both are built on the **same EFR32MG12 silicon**. The difference is integration, RF design ownership, and certification. The Thunderboard Sense 2 uses the **bare SoC** (left column).

| Attribute | **EFR32MG12 bare SoC** (on this board, BRD4166A) | **MGM12P module** (NOT on this board) |
| --- | --- | --- |
| Physical form | BGA125 (7x7 mm, 125-ball) die soldered to the host PCB | Shielded SiP module (~12.9 × 17.8 × ~2.3 mm), drops onto a host PCB as one component |
| Underlying silicon | EFR32MG12 (Series 1 Mighty Gecko) | **Same** EFR32MG12 die inside |
| CPU | ARM Cortex-M4F @ up to 40 MHz (38.4 MHz on this board) | ARM Cortex-M4F @ 38.4 MHz |
| Flash / RAM | **1024 kB / 256 kB** (this board's variant) | 1024 kB / 256 kB (e.g. MGM12P32F1024GA) |
| Antenna | **External** — board designer provides it (this board: 2.4 GHz ceramic chip antenna + tuned match) | **Integrated** — chip antenna built in (`-GA`) **or** U.FL external option (`-GE`) |
| RF matching | Designer's responsibility (BRD4166A: 2-element 50 Ω match, documented in UG309) | Pre-designed and frozen inside the module |
| Max TX power (2.4 GHz) | **+10 dBm max** — the P332's rated silicon spec (POUTMAX), not a board de-rating; +19 dBm belongs to other SKUs (P432/P232), not this part | **+10 dBm** (MGM12P22) or **+17 dBm** (MGM12P32) depending on SKU |
| RX sensitivity (250 kbps O-QPSK) | **-102.7 dBm** (die) | **-105.7 dBm** on MGM12P22/32 (module's optimized match nets extra sensitivity) |
| RX sensitivity (1 Mbps BLE) | **-94.8 dBm** (die) | **-94.4 dBm**; **-100.3 dBm** on MGM12P22/32 |
| Crypto / TRNG | AES-128/256, SHA-1/2, ECC, TRNG | **Same** (AES-128/256, SHA-1/2, ECC, TRNG) |
| Certification | The *finished board/product* must be certified; BRD4166A carries its own FCC/CE/IC data in UG309 | **Pre-certified** (FCC/IC/CE/MIC modular approval) — inheritable by the end product |
| Supply / temp | 1.8–3.8 V, -40 to +85 °C | 1.8–3.8 V, -40 to +85 °C |
| Best for | Reference designs, cost-optimized high-volume products willing to do their own RF + certification | Fast time-to-market, skipping RF engineering and certification effort |
| Used on Thunderboard Sense 2? | ✅ **Yes — this is what the board uses** | ❌ No |

**Reading the table:** notice the module's *better* published RX sensitivity (-105.7 vs -102.7 dBm @ 250 kbps; -100.3 vs -94.4 dBm @ 1 Mbps for the MGM12P22/32 SKUs). That improvement is not new silicon — it comes from the module's professionally optimized, frozen RF matching and antenna. On the bare-SoC board you get the die's baseline numbers and the freedom (and responsibility) to tune the RF yourself. That trade-off — flexibility and unit cost vs. ready-made performance and certification — *is* the SoC-vs-module decision.

Module source figures: [MGM12P datasheet](https://www.silabs.com/documents/public/data-sheets/mgm12p-datasheet.pdf). SoC source figures: [EFR32MG12 datasheet](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf).

---

## 15. Source documents

| Document | What it covers | Link |
| --- | --- | --- |
| **EFR32MG12 Datasheet** | The authoritative SoC spec: core, memory, radio, crypto, electrical characteristics, RX/TX figures | [silabs.com/.../efr32mg12-datasheet.pdf](https://www.silabs.com/documents/public/data-sheets/efr32mg12-datasheet.pdf) |
| **UG309: Thunderboard Sense 2 User's Guide** | The board (BRD4166A) itself: RF matching, antenna, EMC/regulatory, J-Link, connectors | [silabs.com/.../ug309-sltb004a-user-guide.pdf](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) |
| **EFR32MG12 Series 1 SoC product page** | Family overview, output-power range, multiprotocol matrix, part-number comparison table | [silabs.com/wireless/zigbee/efr32mg12-series-1-socs](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) |
| **MGM12P Module Datasheet** | The module built on the same silicon — for the SoC-vs-module comparison | [silabs.com/.../mgm12p-datasheet.pdf](https://www.silabs.com/documents/public/data-sheets/mgm12p-datasheet.pdf) |
| **Zephyr SLTB004A board doc** | Independent confirmation of the `efr32mg12p332f1024gl125` target, 38.4 MHz clock, USART0/VCOM | [docs.zephyrproject.org/.../sltb004a](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html) |
| **EFR32xG12 Wireless Gecko Reference Manual** | Register-level detail on the radio, crypto, clock tree, and peripherals | See [References & Glossary](./08-references-glossary.md) for the doc number |

For datasheet doc numbers, ordering codes, and the full glossary of terms (HFXO, LFXO, RAIL, PTI, AEM, DMP, etc.), see [08 — References & Glossary](./08-references-glossary.md). For how these radio capabilities translate into actual applications, see [05 — Use Cases & Applications](./05-use-cases-applications.md).
