# 07 - Development Toolchain

> How to write, build, flash, and debug firmware for the **Silicon Labs Thunderboard Sense 2 (SLTB004A)** — covering the first-party Silicon Labs stack (Simplicity Studio + Gecko SDK) and the alternative ecosystems (Zephyr RTOS, Arm Mbed, Edge Impulse, Matter-over-Thread).

**Part of the Thunderboard Sense 2 reference set.** See also: [Overview](./01-overview.md) · [SoC & Radio](./02-hardware-soc-radio.md) · [Sensors & Peripherals](./03-sensors-and-peripherals.md) · [Pinout, Power & Connectors](./04-pinout-power-connectors.md) · [Use Cases & Applications](./05-use-cases-applications.md) · [Getting Started](./06-getting-started.md) · [References & Glossary](./08-references-glossary.md) · [Docs hub](./README.md)

---

## 0. The single most important fact for tooling

The Thunderboard Sense 2 carries a **bare EFR32MG12 "Mighty Gecko" SoC** — specifically the `EFR32MG12P332F1024GL125` — soldered directly onto the board. **It is NOT an MGM12P module.** Every toolchain decision flows from this:

- When you pick a target in any IDE, SDK, or build system, you select the **SoC part `EFR32MG12P332F1024GL125`** (1024 kB flash, 256 kB RAM, ARM Cortex-M4F), not a module part number.
- The board belongs to **EFR32 Series 1**. Newer tooling, AI/ML accelerators, and Matter/Thread reference designs increasingly target **EFR32 Series 2** (xG24/MG24). Where a choice exists, this board uses the Series 1 / Mighty Gecko path. See [SoC & Radio](./02-hardware-soc-radio.md) for the full silicon breakdown.

> **Lifecycle note:** Silicon Labs classifies the Thunderboard Sense 2 as **"Not recommended for new designs,"** pointing new projects at the EFR32xG24 Dev Kit. The board remains fully usable, fully documented, and fully supported by the toolchains below — but expect newer ecosystems (notably the official Arduino core and current Matter hardware tables) to omit it. See [Overview - Lifecycle](./01-overview.md).

---

## 1. Toolchain landscape at a glance

| Ecosystem | Target identifier | Status for this board | Best for |
|-----------|-------------------|-----------------------|----------|
| **Simplicity Studio + Gecko SDK (GSDK)** | SoC `EFR32MG12P332F1024GL125` / board `SLTB004A` | First-class, fully supported | Bluetooth LE, Zigbee, OpenThread, proprietary RAIL, production firmware |
| **Zephyr RTOS** | board `sltb004a` | Supported, upstream board | Portable RTOS apps, vendor-neutral drivers |
| **Arm Mbed OS** | target `TB_SENSE_12` | Supported but **Mbed is EOL** (site archived July 2026) | Legacy/teaching projects only |
| **Edge Impulse (TinyML)** | `edgeimpulse/firmware-silabs-thunderboard-sense-2` | Supported, prebuilt firmware | On-device ML on the sensor suite + mic |
| **Matter-over-Thread** | via GSDK / OpenThread | Technically buildable on Series 1, **MG24 strongly preferred** | Smart-home interop demos (use MG24 for real work) |
| **Official Silicon Labs Arduino core** | — | **NOT supported** (Series 2 only) | N/A for this board |

ASCII model of the typical first-party flow:

```
[ Your PC: Simplicity Studio 5 ]
            |  USB Micro-B (J connector)
            v
[ On-board SEGGER J-Link ]  --SWD-->  [ EFR32MG12P332F1024GL125 ]
            |                                 ^
            +-- Virtual COM (VCOM/CDC) -------> UART console / logs
            +-- USB Mass Storage ("TB004") --> drag-drop .bin / .hex
```

---

## 2. Simplicity Studio (the primary IDE)

[Simplicity Studio](https://www.silabs.com/developer-tools/simplicity-studio) is Silicon Labs' all-in-one development environment. **For the Thunderboard Sense 2, use Simplicity Studio 5 (SSv5).**

### 2.1 Simplicity Studio 5 vs. Simplicity Studio 6

There are two generations, and the distinction matters for an EFR32MG12 board:

| | **Simplicity Studio 5 (SSv5)** | **Simplicity Studio 6 (SSv6)** |
|---|---|---|
| Foundation | **Eclipse-based** IDE | **Visual Studio Code-based** ("next-generation") |
| Bundled SDK | **Gecko SDK (GSDK)** | **Simplicity SDK** (the GSDK successor) + Simplicity SDK for Zephyr / Simplicity AI SDK |
| Series coverage | Series 0, Series 1 **and** Series 2 | Oriented toward Series 2 and current parts |
| Recommendation for SLTB004A | **Use this** — full, mature EFR32MG12 support | Verify EFR32MG12 example coverage before relying on it |
| OS support | Windows, macOS (x64/ARM), Linux | Windows, macOS (x64/ARM), Linux |

**Why SSv5 for this board:** The Thunderboard Sense 2 is a Series 1 / Mighty Gecko part. SSv5 + GSDK is the combination against which the board's `EFR32MG12P332F1024GL125` examples (Bluetooth SoC Thunderboard, sensor demos, RAIL, Zigbee, OpenThread) were authored and tested. SSv6/Simplicity SDK is the forward-looking environment built around VS Code and aimed primarily at current Series 2 silicon; the legacy GSDK and SSv5 remain available (there is an explicit "Looking for Simplicity Studio 5" path on the Studio download page).

> Both are free. Download from the [Simplicity Studio page](https://www.silabs.com/developer-tools/simplicity-studio). A free Silicon Labs developer account is required to log in and install SDKs.

### 2.2 What Simplicity Studio gives you

- **Launcher / device auto-detection** — plug in a kit over USB and Studio reads its J-Link, identifies the board (SLTB004A) and SoC (EFR32MG12), and surfaces matching docs, demos, and examples.
- **Example/Demo browser** — one-click clone of curated projects (e.g., *Bluetooth - SoC Thunderboard Sense 2*).
- **Project Configurator + Pin Tool** — graphical component/peripheral configuration that generates init code (GPIO, I2C, USART, etc.; see [Pinout](./04-pinout-power-connectors.md)).
- **Flash Programmer** — write `.hex`/`.s37`/`.bin` images and bootloaders over SWD.
- **Energy Profiler** — live current capture via the board's on-board **Advanced Energy Monitor (AEM)**. See [Power tree & AEM](./04-pinout-power-connectors.md).
- **Network Analyzer** — over-the-air packet capture/decode for Bluetooth/Zigbee/Thread/proprietary traffic.
- **Simplicity Commander** — CLI companion (`commander`) for scripted flashing, locking, OTA file generation, and J-Link firmware updates (see [§4.4](#44-simplicity-commander-cli-flashing)).

### 2.3 Gecko SDK (GSDK)

The [**Gecko SDK**](https://github.com/SiliconLabs/gecko_sdk) is the integrated software suite SSv5 installs and manages. Key facts:

- It "combines Series 0 and Series 1 IoT product SDKs based on the **Gecko Platform** into a single, integrated SDK," and (in later releases) Series 2 as well.
- It is mirrored open on GitHub (`SiliconLabs/gecko_sdk`); the latest GSDK line is **v4.5.0 (Oct 2025)**. SSv5 normally installs it for you and walks you through setup; manual install is possible.
- **Default license: the Silicon Labs Master Software License Agreement (MSLA)**, with some components under other licenses (see each `License.txt`).
- It bundles the protocol stacks and frameworks this board uses: **Bluetooth LE**, **Bluetooth Mesh**, **EmberZNet (Zigbee)**, **OpenThread**, **Connect / Flex with RAIL** (proprietary sub-GHz/2.4 GHz), plus the **Gecko Bootloader**, **emlib/emdrv** peripheral libraries, **Platform/RTOS** glue (Micrium OS / FreeRTOS), and the **hardware/board support** for SLTB004A.

> The GSDK's successor is **Simplicity SDK**, shipped with Simplicity Studio 6. For the EFR32MG12 Thunderboard Sense 2, GSDK on SSv5 remains the recommended, best-tested path.

---

## 3. The typical first-party workflow (Bluetooth SoC example)

This is the canonical "zero to blinking radio" loop for the Thunderboard Sense 2 in Simplicity Studio 5.

### Step 1 — Install Simplicity Studio 5

1. Download SSv5 for your OS (Windows / macOS x64 / macOS ARM / Linux) from the [Simplicity Studio page](https://www.silabs.com/developer-tools/simplicity-studio).
2. Run the installer, log in with a free Silicon Labs account.
3. When prompted for an install profile, install at least the **32-bit / Wireless MCU** content (this pulls in the GSDK + GNU Arm Embedded toolchain). Studio also installs the **SEGGER J-Link** drivers.

### Step 2 — Connect the board over USB

Plug a USB Micro-B cable into the board's debug USB connector (the **J-Link USB**, labeled on the silkscreen — see [Connectors](./04-pinout-power-connectors.md)). The board powers up and enumerates as a J-Link debug probe, a virtual COM port, and a `TB004` mass-storage drive.

### Step 3 — Board auto-detection via J-Link

In the Studio **Launcher**, the board appears under **Connected Devices / Debug Adapters** identified as **Thunderboard Sense 2 (SLTB004A)** with SoC **EFR32MG12P332F1024GL125**. Select it.

> **First-run tip:** Studio (or Simplicity Commander) may prompt you to **update the on-board J-Link firmware**. Accept it — Zephyr, Mbed, and Edge Impulse workflows all rely on a current J-Link, and a stale adapter is the most common cause of `Error while connecting to CPU` during drag-drop flashing.

### Step 4 — Create the example project

1. With the board selected, open the **EXAMPLE PROJECTS & DEMOS** tab.
2. Filter for the board; locate **"Bluetooth - SoC Thunderboard Sense 2"** (the BLE demo that exposes the board's sensors over GATT — the same firmware the EFR Connect / Simplicity Connect mobile app drives; see [Getting Started](./06-getting-started.md)).
3. Click **CREATE**. Studio clones the example into your workspace, pre-targeted at the EFR32MG12 SoC, with the matching GSDK components resolved.

> You can also start from generic templates like **Bluetooth - SoC Empty** or **Platform - Blink** and add components via the Project Configurator.

### Step 5 — Build

- Click the **Build** (hammer) toolbar button, or right-click the project -> **Build Project**.
- Studio compiles with the bundled **GNU Arm Embedded** toolchain and produces artifacts in the build output folder, typically:
  - `*.out` (ELF, used for debug)
  - `*.bin` / `*.hex` / `*.s37` (flashable images)

### Step 6 — Flash via Run / Debug

- Press **Run** (the green play button) or **Debug** (the bug icon).
- Studio flashes the image to the EFR32MG12 over **SWD through the on-board J-Link**, resets the part, and (in Debug) drops you into the source-level debugger with breakpoints, watch/locals, registers, and peripheral views.
- Open the **Console -> Serial 1 (VCOM)** or any terminal at **115200 8-N-1** to see `printf`/log output over the virtual COM port.

```
Edit -> Build (hammer) -> Run (play, flashes over SWD)  ->  app runs on EFR32MG12
                       -> Debug (bug, flashes + halts at main) -> step / breakpoints
```

---

## 4. Flashing & debugging via the on-board SEGGER J-Link

The Thunderboard Sense 2 integrates a **SEGGER J-Link** debugger on-board — there is **no external probe required**. Over a single USB Micro-B connection it presents three logical interfaces:

| Interface | Purpose |
|-----------|---------|
| **SWD debug** | Program + debug the EFR32MG12 (flash, halt, step, breakpoints, RTT) |
| **Virtual COM port (VCOM / CDC)** | UART bridge to the SoC for console/logs (115200 8-N-1 by default) |
| **USB Mass Storage ("TB004")** | Drag-and-drop programming — copy a `.bin`/`.hex` to flash the part |

### 4.1 SWD programming/debugging
Used by Simplicity Studio (Run/Debug), Simplicity Commander, Zephyr's `jlink` runner, and any SEGGER tool (J-Link Commander, Ozone, J-Flash). This is the most reliable path and the one to use when scripting or doing source-level debug.

### 4.2 Virtual COM port (VCOM)
The J-Link relays a hardware UART from the EFR32MG12 to a USB CDC serial device. Use it for `printf`-style logging and CLIs:

- **Settings:** 115200 baud, 8 data bits, no parity, 1 stop bit, no flow control.
- macOS: `/dev/cu.usbmodem*` · Linux: `/dev/ttyACM*` · Windows: `COMx` (JLink CDC UART Port).
- On Linux, some workflows (e.g., Edge Impulse) need `screen`: `sudo apt install screen`.

### 4.3 USB Mass Storage drag-and-drop
The simplest flashing method and the one used by Zephyr's MSD fallback, Mbed, and Edge Impulse:

1. Board mounts as a drive named **`TB004`**.
2. Drag a `.bin` (or `.hex`) onto the drive.
3. Wait ~30 seconds; the J-Link writes it to the EFR32MG12 and resets.

> If the drive shows a `FAIL.TXT` containing `Error while connecting to CPU`, the J-Link firmware is likely stale or the part is in a bad state — update J-Link firmware in Simplicity Studio and flash via SWD ("Upload application…" under Debug Adapters / Simplicity Commander) instead.

### 4.4 Simplicity Commander (CLI flashing)
`commander` is the scriptable CLI bundled with Studio. Representative commands:

```bash
# Identify the connected part
commander device info

# Flash an application image over SWD via the on-board J-Link
commander flash app.hex

# Erase (mass erase) the device
commander device masserase

# Update the on-board J-Link/adapter firmware
commander adapter dfu --help

# Read out chip part/serial for verification (EFR32MG12P332F1024GL125 expected)
commander device info --verbose
```

> Because the part is a **bare EFR32MG12** (not a pre-provisioned module), `commander device info` should report the SoC `EFR32MG12P332F1024GL125` directly — a quick sanity check that you are on the right hardware.

---

## 5. Alternative ecosystem: Zephyr RTOS

Zephyr ships **upstream board support** for the Thunderboard Sense 2.

- **Board target:** **`sltb004a`**
- **SoC in the devicetree:** `efr32mg12p332f1024gl125` (Cortex-M4F, 1024 kB flash, 256 kB RAM)
- **Default runner:** `jlink` (flash, debug, reset, debugserver, attach, rtt)
- **Docs:** [Zephyr `sltb004a` board page](https://docs.zephyrproject.org/latest/boards/silabs/dev_kits/sltb004a/doc/index.html)

### 5.1 Build & flash

```bash
# From the root of the zephyr repository (after a standard west init/update)
west build -b sltb004a samples/hello_world

# Flash over the on-board J-Link (default runner)
west flash

# Or debug
west build -t debug          # if configured, or:
west debug
```

Serial console at **115200 8-N-1** on the VCOM port; after reset you should see:

```
Hello World! sltb004a
```

**MSD fallback:** Instead of `west flash`, you can copy the generated `build/zephyr/zephyr.bin` onto the `TB004` mass-storage drive.

### 5.2 Peripheral & sensor support in Zephyr

| Category | Supported in upstream Zephyr |
|----------|------------------------------|
| **On-chip** | ADC, Bluetooth HCI (`silabs,bt-hci-efr32`), Flash controller, GPIO, I2C, SPI (via USART), PWM, RNG/TRNG, RTC/RTCC, Watchdog, USART/LEUART, Cortex-M4F core / NVIC / SysTick |
| **On-board I/O** | GPIO LEDs, PWM LEDs, GPIO input keys (buttons) |
| **Serial flash** | Macronix **MX25R8035F** SPI-NOR (`jedec,spi-nor`) |
| **Sensor (DT binding)** | ams **CCS811** air-quality sensor (`ams,ccs811`) |

> **Caveat — sensor coverage gap:** The board physically carries **Si7021** (humidity/temp), **Si1133** (UV/ambient light), **Si7210** (Hall), **BMP280** (pressure), **ICM-20648** (6-axis IMU), and **ICS-43434** (MEMS mic) — see [Sensors & Peripherals](./03-sensors-and-peripherals.md). Of these, only the **CCS811** appears in Zephyr's "Supported Features" table with a ready devicetree binding. The others are reachable over the I2C/SPI buses but may need a Zephyr sensor driver (some exist generically) and your own devicetree node. Verify driver availability for your Zephyr version before relying on a given sensor.

> Update the J-Link firmware in Simplicity Studio before first use, per the Zephyr board docs.

---

## 6. Alternative ecosystem: Arm Mbed OS

Arm Mbed lists the board as **Mbed Enabled** (Advanced + Baseline), historically supporting **Mbed OS 2 through 6.15**.

- **Mbed target name:** **`TB_SENSE_12`** (use this with Mbed CLI)
- **SoC:** EFR32MG12P Mighty Gecko, Cortex-M4 up to 40 MHz, 256 kB RAM, 1024 kB flash
- **Programming:** integrated SEGGER **J-Link** + **MSD** drag-and-drop; interface firmware ships Mbed-compatible
- **Platform page:** [Mbed `Thunderboard-Sense-2`](https://os.mbed.com/platforms/Thunderboard-Sense-2/)

```bash
# Build an Mbed program for the Thunderboard Sense 2
mbed compile -m TB_SENSE_12 -t GCC_ARM

# Flash by copying the resulting .bin onto the TB004 mass-storage drive,
# or use a J-Link/SWD flow.
```

> **⚠️ Mbed is end-of-life.** Arm has announced an End-of-Life timeline for Mbed, and the `os.mbed.com` site **will be archived in July 2026.** Treat Mbed support as legacy/educational only. For new RTOS work choose **Zephyr** ([§5](#5-alternative-ecosystem-zephyr-rtos)) or the Silicon Labs **Platform/RTOS** layer in the GSDK.

---

## 7. Alternative ecosystem: Edge Impulse (TinyML)

The Thunderboard Sense 2 is a **fully supported, officially listed** Edge Impulse development target — its sensor suite plus the ICS-43434 microphone make it a natural TinyML demo board. Open-source firmware lives at **[`edgeimpulse/firmware-silabs-thunderboard-sense-2`](https://github.com/edgeimpulse/firmware-silabs-thunderboard-sense-2)**.

> Edge Impulse also tags this board **"Not recommended for new designs,"** suggesting the EFR32xG24 Dev Kit as the modern replacement (the xG24 has a dedicated AI/ML hardware accelerator; the EFR32MG12 does not — inference runs on the Cortex-M4F + DSP/FPU).

### 7.1 Flash the Edge Impulse firmware

1. Download the latest prebuilt image (`silabs-thunderboard-sense2.bin`) from the firmware repo / Edge Impulse docs.
2. Connect over USB Micro-B; the board mounts as the `TB004` mass-storage drive.
3. Drag the `.bin` onto `TB004`; wait ~30 seconds for it to flash and reset.

### 7.2 Connect to your Edge Impulse project

```bash
# Requires the Edge Impulse CLI (npm i -g edge-impulse-cli) and Node.js
edge-impulse-daemon

#   -> log in, then select/create a project; the board appears under "Devices"
#   -> use --clean to switch to a different project
```

- On Linux, install GNU Screen: `sudo apt install screen`.
- Recent **Chrome/Edge** browsers can collect data directly via WebUSB/WebSerial, no CLI required.

### 7.3 Data -> model -> deploy loop

1. **Collect** data from on-board sensors — **motion** (IMU) for gesture/motion recognition, **audio** (mic) for sound classification / keyword spotting; external sensors via the **Data forwarder**.
2. **Design & train** an impulse in the Edge Impulse Studio.
3. **Deploy** the trained model back onto the board from the Studio.
4. **Run inference** locally:
   ```bash
   edge-impulse-run-impulse
   ```

### 7.4 BLE inference demo (with EFR Connect / Simplicity Connect)

The firmware includes a BLE demo you can drive from the **EFR Connect / Simplicity Connect** mobile app (see [Getting Started](./06-getting-started.md)):

| Item | Value |
|------|-------|
| Advertised name | `Edge Impulse` |
| Service UUID | `DDA4D145-FC52-4705-BB93-DD1F295AA522` |
| Control characteristic | `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2` — write `01` to start inference, `00` to stop |
| Results characteristic | `61A885A4-41C3-60D0-9A53-6D652A70D29C` — enable **Notify** to stream results |

---

## 8. Matter-over-Thread (supported, but MG24 strongly preferred)

Matter runs over Thread on Silicon Labs silicon, and the Thunderboard Sense 2's EFR32MG12 has the 802.15.4 radio + OpenThread support in the GSDK to participate. **In practice, however, MG12 is not the platform you want for Matter:**

- **Current Silicon Labs Matter hardware tables list Series 2 only** — Matter-over-Thread SoCs are documented as **EFR32 MG24 / MG26 / MG301** (and RCP roles add MG21). The **EFR32MG12 does not appear in the current supported-device list**. See the [Silicon Labs Matter docs](https://docs.silabs.com/matter/latest/matter-overview/).
- **Why MG24 is preferred:**
  - **Memory headroom.** A Matter + OpenThread (FTD) image plus the Gecko Bootloader and OTA storage is large; MG24 parts ship with up to **1536 kB flash / 256 kB RAM** and Matter reference designs are sized for them. The MG12's **1024 kB flash / 256 kB RAM** leaves little margin once Matter, Thread, BLE commissioning, and OTA coexist.
  - **Security.** MG24 includes **Secure Vault (High)** for hardware key storage and attestation — increasingly expected for Matter device certification. The MG12 lacks Secure Vault.
  - **AI/ML + radio improvements** on Series 2 that Matter ecosystems are built around.

**Bottom line:** You *can* experiment with Matter-over-Thread building blocks (OpenThread, the Matter SDK) against the EFR32MG12 via the GSDK/[`SiliconLabs/matter`](https://github.com/SiliconLabs/matter) flow, but for anything beyond a learning exercise, target an **EFR32xG24** board (e.g., xG24 Dev Kit BRD2601B). The Thunderboard Sense 2 is best used for its native strengths — **Bluetooth LE + the rich sensor suite** (see [Use Cases](./05-use-cases-applications.md)).

---

## 9. NOT supported: the official Silicon Labs Arduino core

> **The Thunderboard Sense 2 is NOT a target in the official [Silicon Labs Arduino core](https://github.com/SiliconLabs/arduino).**

The Silicon Labs Arduino core is built exclusively for **EFR32 Series 2 / MGM240** silicon. As of current releases it officially supports:

- Arduino **Nano Matter**
- SparkFun **Thing Plus Matter MGM240P**
- Silicon Labs **xG24 Explorer Kit**
- Silicon Labs **xG24 Dev Kit**
- Silicon Labs **xG27 Dev Kit**
- Silicon Labs **BGM220 Explorer Kit**
- Ezurio **Lyra 24P 20 dBm Dev Kit**
- Seeed Studio **XIAO MG24 (Sense)**

The board's **EFR32MG12 (Series 1)** part is **absent** from this list, and the core's internal MCU references are all MG24/BG2x family. **If you want an Arduino-style experience, use a supported Series 2 board** (e.g., the xG24 Dev Kit) — do not expect the Thunderboard Sense 2 to work with the Silicon Labs Arduino core.

> (Unofficial/community board packages occasionally add older EFR32 parts, but they are not maintained or supported by Silicon Labs and are out of scope for this reference.)

---

## 10. Open-source firmware, apps, and cloud

| Component | Where | Notes |
|-----------|-------|-------|
| **Gecko SDK (GSDK)** | [`SiliconLabs/gecko_sdk`](https://github.com/SiliconLabs/gecko_sdk) | Open mirror of the full SDK incl. SLTB004A board support; MSLA-licensed (mixed). |
| **Simplicity SDK** (GSDK successor) | [`SiliconLabs/simplicity_sdk`](https://github.com/SiliconLabs/simplicity_sdk) | The SSv6 SDK; verify EFR32MG12 example coverage. |
| **Application examples** | [`SiliconLabs/application_examples`](https://github.com/SiliconLabs/application_examples) | Engineer-authored EFM32/EFR32 demos across bluetooth/matter/openthread/zigbee/zephyr/etc. Marked "experimental quality, as-is." |
| **Edge Impulse firmware** | [`edgeimpulse/firmware-silabs-thunderboard-sense-2`](https://github.com/edgeimpulse/firmware-silabs-thunderboard-sense-2) | Open-source TinyML firmware for this exact board. |
| **TFLite Micro examples** | [`SiliconLabs/tflite-micro-efr32-examples`](https://github.com/SiliconLabs/tflite-micro-efr32-examples) | **DEPRECATED / ARCHIVED** (read-only since ~2026-05-29). Historical TensorFlow Lite for Microcontrollers examples on EFR32. Successor: [`SiliconLabsSoftware/machine_learning_applications`](https://github.com/SiliconLabsSoftware/machine_learning_applications) — but it is xG24 / Series 2-leaning and **not** a like-for-like MG12 path. For current TinyML on this EFR32MG12 board, use **Edge Impulse** ([§7](#7-alternative-ecosystem-edge-impulse-tinyml)). |
| **Matter** | [`SiliconLabs/matter`](https://github.com/SiliconLabs/matter) | Silicon Labs Matter SDK fork (target MG24 for real work — see [§8](#8-matter-over-thread-supported-but-mg24-strongly-preferred)). |

**Mobile companion app:** The board's out-of-box BLE demo is driven by Silicon Labs' free mobile app, historically **Thunderboard** and now consolidated into **EFR Connect / Simplicity Connect** (iOS + Android). The original standalone open-source `thunderboard-android` / `thunderboard-ios` / cloud repos that accompanied the first-generation Thunderboard kits are **no longer present as discoverable repos in the SiliconLabs GitHub org** (the demo functionality moved into the maintained EFR Connect / Simplicity Connect apps). For the app-side walkthrough see [Getting Started](./06-getting-started.md).

> **Verify before you cite:** Repo names and SDK branding shift over time (GSDK -> Simplicity SDK; Thunderboard app -> EFR Connect -> Simplicity Connect). Always confirm the current canonical repo and app name on [github.com/SiliconLabs](https://github.com/SiliconLabs) and the Silicon Labs app stores listing.

---

## 11. Quick reference

### Identifiers per ecosystem

| Tool | Target string |
|------|---------------|
| Simplicity Studio / Commander | SoC `EFR32MG12P332F1024GL125` · board `SLTB004A` |
| Zephyr (`west build -b`) | `sltb004a` |
| Mbed (`mbed compile -m`) | `TB_SENSE_12` |
| Edge Impulse firmware | `silabs-thunderboard-sense2.bin` / repo `firmware-silabs-thunderboard-sense-2` |
| Mass-storage drive label | `TB004` |
| Serial console | 115200 baud, 8-N-1, VCOM/CDC over J-Link |

### Decision guide

- **Bluetooth LE / Zigbee / Thread / proprietary RAIL production firmware ->** Simplicity Studio 5 + GSDK.
- **Portable, vendor-neutral RTOS app ->** Zephyr (`sltb004a`).
- **On-device ML on the sensors/mic ->** Edge Impulse.
- **Legacy/teaching only ->** Mbed (`TB_SENSE_12`), aware it is EOL.
- **Matter, Arduino, or AI-accelerated work ->** switch to an **EFR32xG24** board; this board is not the right target.

### Common gotchas

- **Update the on-board J-Link firmware** first — fixes most flashing failures across Studio, Zephyr, Mbed, and Edge Impulse.
- A `FAIL.TXT` with `Error while connecting to CPU` on the `TB004` drive means: update J-Link and flash via **SWD** instead of drag-drop.
- Confirm you're on the right hardware with `commander device info` -> it must report **`EFR32MG12P332F1024GL125`** (a **bare SoC**, not an MGM12P module).

---

*See [References & Glossary](./08-references-glossary.md) for datasheets, document numbers, and the full link index. Back to the [docs hub](./README.md).*
