# Pinout, Power & Connectors — Thunderboard Sense 2 (BRD4166A)

> Reference for the 20-pad breakout header, the multi-source power tree (USB / coin cell / Mini Simplicity), and on-board energy profiling via the Advanced Energy Monitor (AEM).

This page documents the physical I/O and power interfaces of the **Thunderboard Sense 2** (orderable kit **SLTB004A**, board **BRD4166A**), which carries a **bare Silicon Labs EFR32MG12 Mighty Gecko SoC** (38.4 MHz, 1024 kB flash, 256 kB RAM) — *not* a pre-certified MGM12P radio module. Because the SoC is bare, GPIO routing is fully under your firmware's control via the EFR32's flexible peripheral routing (PRS/route registers), which is exactly why the breakout pads are useful.

**Authoritative sources for this page:**
- [UG309: Thunderboard Sense 2 User's Guide](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) (Rev. 1.1) — §3.2 Power Supply, §3.8 Connectors, §4.1–4.3 Debugging.
- [BRD4166A / BRD4166C schematic & assembly drawings](https://www.silabs.com/documents/public/schematic-files/BRD4166C-A00-schematic.pdf) — the definitive net-to-pad map.
- [AN958: Debugging and Programming Interfaces for Custom Designs](https://www.silabs.com/documents/public/application-notes/an958-mcu-stk-wstk-guide.pdf) — Mini Simplicity / WSTK debug interfaces.

> [!IMPORTANT]
> **Do not trust any specific GPIO-to-pad mapping you find online — including this page — over the schematic.** Per-pin assignments on the breakout header are documented in **UG309 §3.8.1 (Breakout Pads)** and are fixed authoritatively only by the **BRD4166 schematic**. The few concrete pin examples below are flagged as *verified examples*; treat everything else as "verify in UG309 / schematic."

See also: [Overview](./01-overview.md) · [SoC & Radio](./02-hardware-soc-radio.md) · [Sensors & Peripherals](./03-sensors-and-peripherals.md) · [Development Toolchain](./07-development-toolchain.md) · [References & Glossary](./08-references-glossary.md).

---

## 1. Connector & Pad Inventory (at a glance)

The board exposes its electrical interfaces on the **top side**. UG309 §3.8 lists exactly four connector groups:

| Connector | Type | Purpose | UG309 § |
|-----------|------|---------|---------|
| **Breakout pads** | 20 through-hole pads, 2.54 mm pitch, EXP-header pinout | GPIO / I2C / SPI / UART access + power rails (VMCU, 3V3, 5V0) | §3.8.1 |
| **Mini Simplicity connector** | 10-pin, 1.27 mm pitch | External debug (SWD), VCOM, Packet Trace, **and AEM energy profiling** via an external WSTK | §3.8.2 / §4.3 |
| **USB Micro-B connector** | USB Micro-B | Power + on-board J-Link debugger + virtual COM port | §3.8.3 |
| **Battery connector** | Hirose DF13C-2P-1.25V, 1.25 mm pitch crimp (secondary side, above the coin-cell holder) | External battery input (alternative to CR2032) | §3.8.4 |
| **CR2032 coin-cell holder** | CR2032 retainer | Primary low-power battery option | §3.2 |

---

## 2. The Breakout Header (EXP / GPIO Breakout)

### 2.1 What it is

The **20 breakout pads** are the Thunderboard Sense 2's general-purpose I/O breakout. Per UG309 §1 and §3.8.1:

- There are **20 pads labeled EXP1 through EXP20 (1-based; 10 left, 10 right)** — there is no EXP0 — following the standard expansion-header numbering, split **10 on the left edge** and **10 on the right edge** of the board.
- They **follow the same pinout as the EXP (expansion) headers on other Silicon Labs Starter Kits** (e.g. the Wireless Starter Kit mainboard EXP header). This is deliberate: add-on boards designed for the WSTK EXP header are pad-compatible, so you can wire the Thunderboard Sense 2 into the same ecosystem.
- The pads "present peripherals from the EFR32MG12 Mighty Gecko such as **I2C, SPI, UART and GPIOs**."
- In addition to signal pins, the pads also **export power rails**: **VMCU** (main board power rail), **3V3** (LDO regulator output), and **5V0** (USB VBUS). See [§4 Power Tree](#4-the-power-tree) for what is and isn't present on each rail per power source.

### 2.2 Pin routing is firmware-defined — this is the key concept

Because the board carries a **bare EFR32MG12** (not a fixed-function module), the SoC's peripheral routing is highly flexible: *most peripherals can be routed to almost any pin* through the EFR32 route/location registers. The silkscreen and EXP convention give a *default/typical* function per pad, but your application decides the actual routing.

> [!WARNING]
> **Some breakout pads are shared with on-board functions** (sensors, the SPI flash, LEDs, buttons, the debugger's SWD/VCOM lines). Driving a shared pad from an external add-on while the corresponding on-board peripheral is also active causes contention. UG309 §3.8.1 contains the shared-pin table (referenced as "Table 3.x"). **Verify shared-pin conflicts in UG309 §3.8.1 and against the BRD4166 schematic before wiring anything.**

### 2.3 Verified example pin assignments

The following concrete assignments are **verified** against the EFR32MG-SLTB004A board port (Silicon Labs BSP / [Zephyr board definition](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html)). They illustrate *how the pads map* — they are **not** the complete header table. For the full, authoritative per-pad list, **see UG309 §3.8.1 and the BRD4166 schematic.**

| EFR32MG12 pin | Default function | Notes / EXP role |
|---------------|------------------|------------------|
| `PA0` | `US0_TX #0` | VCOM_TX (UART TX to on-board debugger console) |
| `PA1` | `US0_RX #0` | VCOM_RX (UART RX from on-board debugger console) |
| `PF3` | `LEU0_TX #27` | `EXP12_UART_TX` — UART TX on the EXP header |
| `PF4` | `LEU0_RX #27` | `EXP14_UART_RX` — UART RX on the EXP header |
| `PC10` | `I2C0_SDA #15` | `EXP16_I2C_SDA` — I2C SDA on the EXP header |
| `PC11` | `I2C0_SCL #15` | `EXP15_I2C_SCL` — I2C SCL on the EXP header |
| `PD8` | GPIO | LED0 (red of the bi-color LED) |
| `PD9` | GPIO | LED1 (green of the bi-color LED) |
| `PD14` | GPIO | Push button PB0 (left) |
| `PD15` | GPIO | Push button PB1 (right) |

> The `#NN` suffix is the EFR32 *location bitfield* (route location), as used in the EFR32MG12 datasheet and reference manual. The `EXPnn_` prefixes (e.g. `EXP12`, `EXP15`, `EXP16`) are the standard Silicon Labs EXP-header pin labels — `EXP15`/`EXP16` are the conventional I2C pair and `EXP12`/`EXP14` the conventional UART pair on the EXP standard.

> [!NOTE]
> Several sensor and flash signals (e.g. CCS811 on `I2C1` via `PB6`/`PB7`, the MX25R8035F SPI flash on `US2`) also live on EFR32 pins. Some of these are bonded to breakout pads and some are dedicated. Confirm which pads are free vs. shared in **UG309 §3.8.1**. See [Sensors & Peripherals](./03-sensors-and-peripherals.md) for the on-board peripheral pin usage.

---

## 3. Power Connectors

### 3.1 USB Micro-B

- Supplies **5 V VBUS** (the `5V0` rail) and powers the board through the on-board LDO (regulated to 3.3 V → drives `VMCU`/`3V3`).
- Also activates the **on-board SEGGER J-Link debugger** (running on an EFM32 Giant Gecko) and the **USB virtual COM port** (CDC). The debugger automatically takes control of the SWD + VCOM lines whenever USB is plugged in. See [§5 AEM](#5-the-advanced-energy-monitor-aem) for why this matters for energy profiling.

### 3.2 CR2032 coin-cell holder

- Accepts a **CR2032** coin cell. Per UG309 §3.2: *"A CR2032 coin cell is sufficient for low-power operation that does not require high peak current."*
- The coin cell drives **VMCU directly at battery voltage** — there is **no boost/regulation** of the battery rail (the LDO and `3V3` rail are turned off and isolated on battery power; see [§4](#4-the-power-tree)).

### 3.3 External battery connector

- A **Hirose DF13C-2P-1.25V** 1.25 mm-pitch crimp connector on the secondary side of the board, above the coin-cell holder. Use this for **higher-capacity batteries** when peak current (e.g. RGB LEDs at high intensity) exceeds what a CR2032 can deliver.

> [!CAUTION]
> **Never connect batteries to both the CR2032 holder and the external battery connector at the same time.** UG309 §3.2 states there are **no protection mechanisms between the two battery connectors** — simultaneous connection can cause cross-conduction between the two sources.

---

## 4. The Power Tree

### 4.1 Architecture

There are **three** ways to power the kit (UG309 §3.2 / Figure 3.2):

1. **USB** → 5 V VBUS → on-board **LDO** → 3.3 V → `VMCU` / `3V3`.
2. **Battery** (CR2032 **or** external) → battery voltage applied **directly to `VMCU`**.
3. **Mini Simplicity connector** → external Silicon Labs debugger (WSTK) injects power **directly onto the `VMCU` net** (used for AEM profiling — see [§5](#5-the-advanced-energy-monitor-aem)).

```
  Battery ─────┐
               │
  USB micro-B ─┤  ┌─────────────────────┐      ┌──────────┐
   (5V0/VBUS)  ├─►│ Automatic switchover ├──────► VMCU      ├──► EFR32MG12 + peripherals
               │  └─────────────────────┘      └────┬─────┘
  Mini         │        ▲                            │
  Simplicity ──┘        │  USB path also feeds:      │
   (-> VMCU)            └─ LDO (IN 5V -> OUT 3.3V) ──► 3V3 rail (LDO output; off on battery)
                                                       5V0 rail (USB VBUS only)
```

### 4.2 Automatic switchover

The board has an **automatic switchover circuit** between battery and USB:

- When the **USB cable is inserted**, the switchover circuit moves the main system power **from battery to USB**, and **prevents charging of the battery** (the CR2032 is non-rechargeable).
- When **USB is removed**, the board falls back to whichever battery is connected.
- The on-board debugger drops into a deep low-power shutoff (**EM4S, ~20 nA typ.**) when USB is unplugged, so it does not meaningfully load a battery-powered application. Its I/O rail stays powered to keep SWD/VCOM pins properly isolated (preventing leakage).

### 4.3 Default boot = lowest power, all sensors off

> [!IMPORTANT]
> Per UG309 §1: *"By default, the board starts up in the lowest power operating mode, with all sensors disabled."* Sensors and the RGB-LED DC/DC are gated behind **power-enable signals** and must be explicitly enabled in firmware (e.g. `ENV_SENSE_ENABLE` / `PF9`, `CCS811_ENABLE` / `PF14`, `RGB_LED_ENABLE`, etc.). See [Sensors & Peripherals](./03-sensors-and-peripherals.md) for the enable-signal map. This is intentional for battery-friendly IoT prototyping — you pay for power only on the domains you turn on.

### 4.4 Power supply summary (UG309 Table 3.1)

| Supply Mode | VIN | VMCU | 3V3 rail | 5V0 rail |
|-------------|-----|------|----------|----------|
| **USB power** | 4.5 – 5.5 V | On-board regulator | On-board regulator | USB VBUS |
| **CR2032 battery** | 2.0 – 3.3 V | Battery voltage | **Turned off & isolated** | No voltage present |
| **External battery** | 2.0 – 3.3 V | Battery voltage | **Turned off & isolated** | No voltage present |
| **Mini Simplicity** | 2.0 – 3.3 V | Debugger-dependent | **Turned off & isolated** | No voltage present |

**Reading the table:** the `3V3` and `5V0` breakout rails are **only live on USB power**. If your add-on board needs 3.3 V or 5 V from the breakout pads, you must power the Thunderboard over USB — a coin cell or external battery will leave those pads dead.

### 4.5 The coin-cell gotcha — RGB LEDs and CCS811 are disabled on CR2032

> [!WARNING]
> **On a CR2032 coin cell, the stock demo firmware disables the RGB LEDs and the CCS811 air-quality sensor.** This is the single most common "why doesn't my board light up / read air quality on battery?" surprise.

Per **UG313 §3.1** (the BLE demo guide): the firmware *estimates the source impedance of its power source*. If the source is classified as a CR2032 coin cell, it **disables the following to conserve power and avoid brown-out**:

- **RGB LEDs** (the four high-brightness Broadcom ASMT-YTB7-0AA02 LEDs — driven by a 3.5 V DC/DC that draws high peak current).
- **CCS811 indoor air-quality sensor** (its heater/measurement cycle is power-hungry).

Hardware rationale (UG309 §3.2): a CR2032 simply can't supply the peak current the RGB LED DC/DC and the CCS811 demand without browning out `VMCU`. For full functionality on battery, use a **higher-capacity external battery** (via the DF13 connector) or run on **USB**.

> [!NOTE]
> Source classification is heuristic. UG313 notes that *some external batteries — especially when nearly discharged — may be misclassified as CR2032 coin cells* and have these features disabled even though they are not coin cells. If you've wired your own firmware, you control this policy yourself; the auto-disable behavior is a property of the Silicon Labs demo firmware, not a hard hardware lock.

---

## 5. The Advanced Energy Monitor (AEM)

### 5.1 What AEM is and where it lives

The **Advanced Energy Monitor (AEM)** is the energy-profiling feature that lets you see your firmware's real-time current draw in Simplicity Studio's Energy Profiler — correlated with code execution.

> [!IMPORTANT]
> **The AEM is NOT on the Thunderboard Sense 2 itself.** Unlike the larger Wireless Starter Kit mainboards (BRD4001A WSTK), the Thunderboard Sense 2 has **no on-board AEM**. To profile energy you must connect an **external Silicon Labs debugger that provides AEM — i.e. a WSTK** — through the **Mini Simplicity connector**. The AEM circuitry and the **VAEM supply** live on the *WSTK*, not on the Thunderboard.

This is a frequent point of confusion: the on-board SEGGER J-Link gives you SWD + VCOM over USB, but it **does not** give you current measurement. Energy profiling requires the external WSTK path.

### 5.2 How AEM profiling works on this board

1. Connect a **WSTK** (e.g. BRD4001A mainboard) to the Thunderboard's **Mini Simplicity connector** via the appropriate debug adapter.
2. Power the Thunderboard **from the WSTK's AEM supply (VAEM)** — set the WSTK power switch to **"AEM"**. The WSTK then meters every milliamp flowing into `VMCU` and streams it to Simplicity Studio's Energy Profiler.
3. The WSTK's on-board level shifters interface its logic to the Thunderboard's `VMCU` voltage, so the SWD / VCOM / PTI debug channels work alongside the current measurement.

**Power-cycling under AEM:** flip the WSTK power switch to **"BAT"** and back to **"AEM"** to cycle the target cleanly (UG309 §4.3).

### 5.3 The critical AEM constraint — you cannot profile while USB powers the board

> [!CAUTION]
> **You cannot run AEM energy profiling while the on-board USB debugger is powering the board.** When the USB cable is plugged in:
> - the on-board J-Link **automatically seizes the SWD + VCOM interfaces**, so the external WSTK cannot drive them at the same time; and
> - the on-board LDO powers `VMCU`, so a second supply on `VMCU` (from the WSTK AEM) creates a **regulator conflict and erroneous AEM current readings**.

UG309 §3.2 and §4.1/§4.3 are explicit:

- *"This option requires that no other power sources are present on the kit, as the power is injected directly to the VMCU net. Doing so will cause conflict between the two regulators and erroneous AEM measurements."*
- *"When powering the board through the Mini Simplicity connector, the USB and battery power sources must be removed."*
- *"The Mini Simplicity Connector cannot be used at the same time as the on-board debugger is active (USB cable is plugged in)."*

**Practical rule:** for AEM profiling — **unplug USB, remove the battery, and power exclusively from the WSTK AEM supply via Mini Simplicity.**

> [!NOTE]
> There is a middle-ground mode: you *can* keep the Thunderboard powered from a **battery** while using the Mini Simplicity connector for SWD/VCOM debugging — but then set the WSTK power switch to **"BAT"** to avoid a power conflict. In that mode the WSTK is *not* sourcing power and AEM current figures will not be valid; it's for debug/comms only, not energy profiling.

### 5.4 Mini Simplicity connector — pinout reference

The Mini Simplicity connector is a **10-pin, 1.27 mm-pitch** connector (UG309 §3.8.2 / §4.3). It carries, referenced from the EFR32MG12:

- Target power (VMCU / VAEM path), GND
- **SWD** debug — SWCLK, SWDIO (+ SWO/reset as applicable)
- **VCOM** UART — VCOM_TX / VCOM_RX
- **PTI** — Packet Trace Interface (PTI_DATA, PTI_SYNC/FRAME) for wireless network analysis

> [!IMPORTANT]
> The **exact pad-by-pad pin numbering** of the 10-pin Mini Simplicity connector is given in **UG309 §3.8.2 (Table) and §4.3**, and is fixed by the **BRD4166 schematic** (search the "Mini Simplicity Connector" / "Debug MCU Connections to Mini Simplicity Header" sheet). The standard Silicon Labs Mini Simplicity pinout is also documented in [AN958](https://www.silabs.com/documents/public/application-notes/an958-mcu-stk-wstk-guide.pdf). **Do not hand-wire a custom adapter from memory — verify pin-1 orientation and each signal against UG309 §3.8.2 / the schematic.**

### 5.5 Capabilities over Mini Simplicity (with an external WSTK)

| Capability | Available over Mini Simplicity? | Notes |
|-----------|-------------------------------|-------|
| SWD debug | Yes | Requires on-board debugger inactive (USB unplugged) |
| VCOM (serial) | Yes | 115200 8-N-1; baud rate fixed in firmware |
| Packet Trace Interface (PTI) | Yes | Wireless network analysis / Network Analyzer |
| **Advanced Energy Monitor** | **Yes** | Power from WSTK **"AEM"**; USB + battery must be removed |

---

## 6. Quick Decision Guide

| You want to... | Power source | Debug/profile path | Watch out for |
|----------------|--------------|--------------------|---------------|
| Flash & debug quickly | USB Micro-B | On-board J-Link + VCOM | Simplest path; **no** energy data |
| Run fully battery-powered demo | **External battery** (DF13) or USB | — | CR2032 disables RGB LEDs + CCS811 |
| Lowest-power sensor logging | CR2032 | — | RGB LEDs + CCS811 auto-disabled by demo FW |
| **Profile energy consumption** | **WSTK AEM supply** via Mini Simplicity | External WSTK (AEM + SWD + VCOM + PTI) | **Remove USB and battery first** |
| Use 3.3 V / 5 V on breakout pads | **USB** (required) | any | `3V3`/`5V0` rails are dead on battery |
| Wire an EXP add-on board | per add-on needs | any | Check shared-pin table in UG309 §3.8.1 |

---

## 7. Verification Checklist (always confirm in UG309 / schematic)

- [ ] **Exact breakout pad → EFR32 pin map** → **UG309 §3.8.1** + **BRD4166 schematic** (do not infer from this page).
- [ ] **Shared-pin conflicts** (pad also used by a sensor / flash / debugger) → **UG309 §3.8.1 shared-pin table**.
- [ ] **Mini Simplicity 10-pin numbering & orientation** → **UG309 §3.8.2 / §4.3** + schematic + [AN958](https://www.silabs.com/documents/public/application-notes/an958-mcu-stk-wstk-guide.pdf).
- [ ] **Whether your sensor/feature is power-gated** → **UG309 §3.4** + [Sensors & Peripherals](./03-sensors-and-peripherals.md).
- [ ] **Battery vs USB rail availability** → **UG309 Table 3.1** (reproduced in [§4.4](#44-power-supply-summary-ug309-table-31)).

---

### Sources

- [UG309: Thunderboard Sense 2 User's Guide (Rev. 1.1)](https://www.silabs.com/documents/public/user-guides/ug309-sltb004a-user-guide.pdf) — §1, §3.2 (Power Supply / Table 3.1), §3.8 (Connectors), §4.1–4.3 (Debugging, Mini Simplicity, AEM).
- [UG313: Thunderboard Sense 2 Bluetooth Low Energy Demo User's Guide](https://www.silabs.com/documents/public/user-guides/ug313-sltb004a-app-user-guide.pdf) — §3.1 (coin-cell source classification; RGB LED + CCS811 disable).
- [BRD4166C-A00 schematic](https://www.silabs.com/documents/public/schematic-files/BRD4166C-A00-schematic.pdf) — authoritative breakout pad and Mini Simplicity net map.
- [AN958: Debugging and Programming Interfaces for Custom Designs](https://www.silabs.com/documents/public/application-notes/an958-mcu-stk-wstk-guide.pdf) — Mini Simplicity / WSTK / AEM interfaces.
- [Zephyr / EFR32MG-SLTB004A board port](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html) — verified example pin assignments (LEDs, buttons, VCOM, EXP I2C/UART, flash SPI).

*Cross-references: [Overview](./01-overview.md) · [SoC & Radio](./02-hardware-soc-radio.md) · [Sensors & Peripherals](./03-sensors-and-peripherals.md) · [Use Cases & Applications](./05-use-cases-applications.md) · [Getting Started](./06-getting-started.md) · [Development Toolchain](./07-development-toolchain.md) · [References & Glossary](./08-references-glossary.md) · [Docs Hub](./README.md)*
