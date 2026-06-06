# Use Cases & Applications — Thunderboard Sense 2 (SLTB004A)

> Part of the [Thunderboard Sense 2 reference set](./README.md). This document explains **what the board is for**: the core purpose, the application domains it targets, and a catalog of concrete project ideas that map directly to the onboard sensors and the EFR32MG12 multiprotocol radio. For the silicon behind these use cases, see [SoC & Radio](./02-hardware-soc-radio.md); for the exact sensors referenced here, see [Sensors & Peripherals](./03-sensors-and-peripherals.md).

---

## 1. What This Board Is For (Core Purpose)

The Thunderboard Sense 2 is a **compact, battery-capable, sensor-rich evaluation and prototyping platform** built around a **bare Silicon Labs EFR32MG12 Wireless Gecko SoC** (an ARM Cortex-M4F running the 2.4 GHz multiprotocol radio directly — **not** a pre-certified MGM12P module). It exists to let developers go from "I have an idea for a wireless sensor product" to "I have a working, measurable prototype talking to a phone or a cloud" in an afternoon, without designing a PCB or sourcing parts.

Its purpose breaks down into five overlapping missions:

| Purpose | What you actually do with it | Why this board fits |
|---------|------------------------------|---------------------|
| **Sensor-to-cloud IoT prototyping** | Read environmental/motion/sound data, transmit it over BLE to a phone, then bridge to a cloud dashboard | A full sensor suite plus a radio in one package; the demo firmware already streams to a mobile app |
| **Battery-powered node evaluation** | Measure real current draw of a sensing + advertising workload and project battery life | Energy profiling via an external WSTK (**Advanced Energy Monitor, AEM**) over the Mini Simplicity connector measures current in real time; a CR2032 coin-cell holder lets you run it untethered (see [Power & AEM](./04-pinout-power-connectors.md)) |
| **Multiprotocol radio demos** | Run the same hardware as a BLE peripheral, then reflash it as a Zigbee or OpenThread or proprietary node | The EFR32MG12 radio is multiprotocol-capable; you evaluate stacks without changing boards |
| **SoC evaluation** | Benchmark the EFR32MG12's Cortex-M4F, peripherals, low-energy modes, and radio link budget against your application's needs | Bare SoC (not a module) exposes the chip's true behavior, energy modes, and GPIO directly |
| **Education & TinyML** | Teach embedded/IoT concepts, or capture labeled sensor/audio data and deploy a tiny ML model back to the device | Rich, diverse sensors plus a microphone make it a natural data-capture and on-device-inference target (e.g., Edge Impulse) |

> **Positioning note (read this first):** The Thunderboard Sense 2 is an **evaluation and prototyping kit**, not a production module. There is no FCC/CE/IC modular grant attached to the board, the antenna and RF front-end are laid out for demonstration, and the form factor is optimized for breadth of sensors rather than cost or size. Use it to *prove your concept and measure your power budget*; when you move to production you graduate to a certified module (e.g., a BGM/MGM-series module) or your own EFR32MG12 layout. See [Use the Board for the Right Stage](#7-use-the-board-for-the-right-stage-eval-not-production).

---

## 2. The Onboard Capability Inventory (What You Have to Work With)

Every project idea below is built from the same fixed set of resources. Keeping this inventory in front of you is the fastest way to judge whether an idea is "buildable as-is" or "needs external hardware." Exact part numbers and electrical details live in [Sensors & Peripherals](./03-sensors-and-peripherals.md) and [SoC & Radio](./02-hardware-soc-radio.md); this is the quick map from *capability* to *use case*.

| Capability | Onboard source | Unlocks these use-case classes |
|------------|----------------|--------------------------------|
| Relative humidity + temperature | Si7021 RH/T sensor | Environmental monitoring, comfort/HVAC, cold-chain, greenhouse |
| Barometric pressure | BMP280 / pressure sensor | Weather sensing, altitude estimation, HVAC, leak/door detection |
| Ambient light + UV index | Si1133 (UV / ambient light) | Daylight harvesting, occupancy proxy, UV exposure, agriculture |
| Indoor air quality (eCO2 + TVOC) | CCS811 (or equivalent gas sensor) | Air-quality monitors, ventilation control, "stuffy room" alerts |
| 6-axis motion (accel + gyro) | ICM-20648 IMU | Motion/vibration logging, tilt/orientation, asset shock detection, gesture recognition |
| Hall effect (magnetic field) | Si7210 hall sensor | Door/window open-close, RPM/flow counting, tamper detection |
| Sound / acoustics | MEMS microphone (ICS-43434) | Sound-level meters, audio-event classification, keyword/clap detection (TinyML) |
| Visual output | 4x high-brightness RGB LEDs | Status, alerting, ambient-light feedback, simple light shows |
| Local storage | Onboard serial flash | Offline data logging, OTA image staging, model storage |
| User input | Push buttons (2) | Mode switching, calibration triggers, manual events |
| Wireless link | EFR32MG12 2.4 GHz multiprotocol radio | BLE / Zigbee / Thread / proprietary connectivity |
| Power & measurement | CR2032 + USB; AEM via external WSTK | Untethered runtime + real-time current/energy profiling |

---

## 3. Application Domains

The Thunderboard Sense 2 was built to demonstrate Silicon Labs' wireless IoT story, so its sensor mix deliberately spans the major IoT verticals. Below, each domain is paired with the **specific onboard sensors** that make it demonstrable today.

### 3.1 Smart Home
- **Sensors in play:** RH/T (Si7021), pressure (BMP280), air quality (CCS811), ambient light (Si1133), hall (Si7210), IMU, microphone.
- **What it demonstrates:** Room comfort monitoring, leak/door sensing (hall + pressure), occupancy hints (light + sound + motion), and a BLE or Zigbee link to a hub. Zigbee/Thread make it a believable stand-in for a smart-home sensor endpoint.

### 3.2 Smart Office / Smart Building
- **Sensors in play:** Air quality (eCO2/TVOC), RH/T, ambient light, sound level.
- **What it demonstrates:** Desk/room environmental quality dashboards, ventilation-on-demand triggers (high eCO2 -> notify BMS), daylight-harvesting input for lighting control, and meeting-room "in use" detection from sound + motion.

### 3.3 Smart Cities
- **Sensors in play:** Air quality, RH/T, pressure, light, sound (noise), IMU (vibration).
- **What it demonstrates:** Distributed micro-climate and air-quality sensing, street-noise monitoring, and structural/vibration sensing — all as low-power mesh nodes (Zigbee/Thread) or proprietary long-link demos.

### 3.4 Smart Grid / Energy
- **Sensors in play:** Hall (current/RPM proxy via magnetic field), IMU (vibration), RH/T (thermal context), AEM (the board's own consumption).
- **What it demonstrates:** Equipment-health monitoring (vibration + temperature), magnetic-field-based rotation/flow counting, and — crucially — using the AEM to **prove a node's own energy budget** so a grid sensor can run for years on a battery or harvested energy.

### 3.5 Transportation & Logistics / Asset Tracking
- **Sensors in play:** IMU (shock, tilt, orientation), pressure (altitude/cabin), RH/T (cargo condition), hall (door open), light (container opened).
- **What it demonstrates:** A condition-monitoring tag that records shocks, temperature/humidity excursions, and tamper/open events for in-transit goods, beaconing summaries over BLE at checkpoints.

### 3.6 Agriculture / Environmental
- **Sensors in play:** RH/T, light + UV (Si1133), pressure, air quality.
- **What it demonstrates:** Greenhouse/field micro-climate stations: humidity, light/UV dosage for crops, barometric trend for weather, and ventilation/air quality — reporting over a low-power mesh or to a gateway.

### 3.7 Industrial / Predictive Maintenance
- **Sensors in play:** IMU (vibration signature), microphone (acoustic signature), RH/T, hall (rotation).
- **What it demonstrates:** Capturing vibration and acoustic data from a motor/pump and classifying "normal vs. abnormal" — the canonical TinyML predictive-maintenance demo, runnable on-device thanks to the Cortex-M4F.

---

## 4. Concrete Example Projects

Each project below is **buildable from the onboard hardware alone** unless explicitly noted. Each entry lists the sensors used, the radio role, the rough difficulty, and what you would actually measure or observe. These map cleanly onto the toolchains in [Development & Toolchain](./07-development-toolchain.md) and the out-of-box flow in [Getting Started](./06-getting-started.md).

### 4.1 BLE Environmental Beacon
- **Onboard sensors:** Si7021 (RH/T), BMP280 (pressure), Si1133 (light/UV), CCS811 (air quality).
- **Radio role:** BLE peripheral / connectable advertiser.
- **What you build:** A node that periodically samples the environment and either advertises the values in a custom BLE advertisement (true beacon, no connection needed) or exposes them as GATT characteristics for a phone to read. This is effectively the out-of-box demo extended to your own service UUIDs.
- **Why this board:** This is the canonical "hello world" — the factory demo firmware already does a version of it and streams to the Simplicity Connect / Thunderboard mobile app (see [Getting Started](./06-getting-started.md)).
- **Difficulty:** Beginner. **Stretch goal:** add the AEM to measure how advertising interval trades off against battery life.

### 4.2 Motion-Activated Data Logger
- **Onboard sensors:** ICM-20648 IMU (accelerometer wake-on-motion), plus RH/T and pressure for context; onboard serial flash for storage.
- **Radio role:** BLE — connect on demand to offload the log.
- **What you build:** The SoC sleeps in a low-energy mode until the IMU's motion-detect interrupt wakes it; on wake, it timestamps and logs sensor readings to flash. A phone connects later to download the log.
- **Why this board:** Demonstrates **event-driven low power** — the exact pattern real battery products use — and the AEM lets you confirm sleep current is in the microamp range.
- **Difficulty:** Intermediate. Touches interrupts, energy modes (see [SoC & Radio](./02-hardware-soc-radio.md)), and flash I/O.

### 4.3 Indoor Air-Quality Monitor
- **Onboard sensors:** CCS811 (eCO2 / TVOC), Si7021 (RH/T for compensation), Si1133 (light), 4x RGB LEDs for visual feedback.
- **Radio role:** BLE to a phone, or Zigbee/Thread to a hub.
- **What you build:** A desk monitor that reads eCO2/TVOC, uses humidity/temperature for compensation, and drives the RGB LEDs green/amber/red as a glanceable air-quality indicator while also publishing values wirelessly. High-eCO2 events can push a notification.
- **Why this board:** All required sensors are present; the RGB LEDs make it a self-contained demo with no extra hardware.
- **Difficulty:** Beginner–Intermediate. Note the gas sensor's burn-in/warm-up behavior when interpreting early readings.

### 4.4 Zigbee or Thread Sensor Endpoint
- **Onboard sensors:** Any subset — typically RH/T, pressure, air quality (mapped to standard clusters / endpoints).
- **Radio role:** Zigbee (EmberZNet) **or** OpenThread node joining a mesh/border router.
- **What you build:** Reflash the same board as a mesh sensor that joins a Zigbee network (to a coordinator) or a Thread network (to a border router) and reports sensor readings as standard attributes. This is also the natural starting point for a **Matter-over-Thread** sensor device.
- **Why this board:** This is the headline **multiprotocol** demo — identical hardware, different stack — that justifies a *multiprotocol* SoC like the EFR32MG12. See the protocol matrix in [SoC & Radio](./02-hardware-soc-radio.md) and the Matter/Thread toolchain notes in [Development & Toolchain](./07-development-toolchain.md).
- **Difficulty:** Intermediate–Advanced. Requires a second device (coordinator/border router) to form the network.

### 4.5 TinyML Acoustic / Gesture Classifier (Edge Impulse)
- **Onboard sensors:** ICS-43434 MEMS microphone (audio events / keyword spotting) **or** ICM-20648 IMU (gesture / motion classification).
- **Radio role:** BLE to report the predicted class; LEDs for instant local feedback.
- **What you build:** Capture and label data (e.g., "clap" vs "knock" vs "silence", or wave/shake/tap gestures), train a small neural network in **Edge Impulse**, then deploy the optimized model back to the EFR32MG12 to run inference on-device. The board announces the recognized class over BLE and/or lights an LED.
- **Why this board:** The Cortex-M4F with FPU handles small NN inference, and the **diverse, high-quality sensors plus a high-quality MEMS microphone** are exactly what Edge Impulse's Thunderboard Sense 2 support targets. This is the flagship education/TinyML use case.
- **Difficulty:** Intermediate–Advanced. The hard part is data quality and labeling, not the firmware.

### 4.6 Predictive-Maintenance Vibration Monitor
- **Onboard sensors:** ICM-20648 IMU (vibration/FFT features), ICS-43434 microphone (acoustic signature), Si7021 (thermal context).
- **Radio role:** BLE or proprietary; reports a health score or anomaly flag.
- **What you build:** Strap the board to a fan, pump, or motor; sample the IMU at a fixed rate, compute vibration features (RMS, FFT bins), and either threshold them or run a TinyML anomaly model to flag "abnormal" operation. Combine with acoustic features for a richer signature.
- **Why this board:** Pairs the IMU + mic combo with on-device compute — the textbook Industry-4.0 condition-monitoring demo without external sensors.
- **Difficulty:** Advanced. Sampling rate, windowing, and feature extraction drive the result.

### 4.7 Magnetic Door / Open-Close & Tamper Sensor
- **Onboard sensors:** Si7210 hall sensor (with a small external magnet on the moving part), optionally Si1133 (light spike when opened) and IMU (movement) for corroboration.
- **Radio role:** BLE notification or Zigbee/Thread "contact sensor" attribute.
- **What you build:** A door/window or enclosure sensor: when the magnet moves away from the hall sensor, the field drops and the board wakes and reports "open." Light and motion add anti-tamper corroboration.
- **Why this board:** Hall-based contact sensing is a real smart-home/asset-security primitive, and it's a great low-duty-cycle power demo on the AEM.
- **Difficulty:** Beginner–Intermediate. Needs one cheap external magnet.

### 4.8 Multi-Sensor Weather & Light Station
- **Onboard sensors:** Si7021 (RH/T), BMP280 (pressure trend), Si1133 (ambient light + UV index).
- **Radio role:** BLE to a phone dashboard, or mesh to a gateway, or proprietary point-to-point to a base.
- **What you build:** A small outdoor/greenhouse-friendly station reporting temperature, humidity, barometric pressure trend (weather prediction), light level, and UV index. Push to a phone or bridge to a cloud time-series dashboard.
- **Why this board:** Exercises the full environmental trio in one cohesive, demo-able product, and is an easy on-ramp to a sensor-to-cloud pipeline.
- **Difficulty:** Beginner. **Stretch goal:** bridge BLE -> gateway -> cloud (e.g., MQTT) to complete the sensor-to-cloud story.

---

## 5. Quick Project Selector

Use this table to jump straight to a project that matches the sensor you want to exercise, the radio stack you want to evaluate, and your skill level.

| Project | Primary sensor(s) | Radio | Domain | Difficulty |
|---------|-------------------|-------|--------|------------|
| BLE Environmental Beacon | RH/T, pressure, light, air quality | BLE | Smart home / office | Beginner |
| Motion-Activated Logger | IMU + flash | BLE | Asset tracking | Intermediate |
| Indoor Air-Quality Monitor | CCS811 + RH/T + LEDs | BLE / Zigbee | Office / home | Beginner–Intermediate |
| Zigbee/Thread Endpoint | Any (mapped to clusters) | Zigbee / Thread / Matter | Smart home / cities | Intermediate–Advanced |
| TinyML Classifier (Edge Impulse) | Mic or IMU | BLE | Education / industrial | Intermediate–Advanced |
| Predictive-Maintenance Monitor | IMU + mic | BLE / proprietary | Industrial / grid | Advanced |
| Magnetic Door / Tamper Sensor | Si7210 hall | BLE / Zigbee | Home / security | Beginner–Intermediate |
| Weather & Light Station | RH/T, pressure, light/UV | BLE / mesh | Agriculture / cities | Beginner |

---

## 6. Common Architecture Patterns

Most projects above resolve into one of four wireless architectures. Recognizing which one your idea is helps you pick the right SDK in [Development & Toolchain](./07-development-toolchain.md).

```
Pattern A — BLE point-to-point (phone is the gateway)
  [Thunderboard Sense 2] --BLE GATT--> [Phone app] --internet--> [Cloud dashboard]
  Best for: demos, beacons, loggers offloaded on connect.

Pattern B — Mesh endpoint (Zigbee / Thread)
  [Thunderboard Sense 2] --mesh--> [Coordinator / Border Router] --> [Hub / Cloud]
  Best for: smart-home/city endpoints, Matter-over-Thread devices.

Pattern C — Proprietary point-to-point (Flex / RAIL / Connect)
  [Thunderboard Sense 2] <--custom 2.4 GHz--> [Custom base / second EFR32]
  Best for: range/throughput experiments, non-standard links.

Pattern D — Standalone edge inference (TinyML, no network needed)
  [Sensors] --> [EFR32MG12 on-device model] --> [LED / local action] (+ optional BLE report)
  Best for: gesture/audio/vibration classification, privacy-preserving edge AI.
```

Across all four, the **AEM** is the constant: whichever pattern you choose, profile its current draw to validate the battery budget before you commit to it. See [Power & AEM](./04-pinout-power-connectors.md).

---

## 7. Use the Board for the Right Stage (Eval, Not Production)

This is worth restating clearly because it is the single most common misuse of the kit:

- **It is for:** proving a concept, demonstrating a sensor-to-cloud flow, evaluating the EFR32MG12 SoC and its radio stacks, measuring real-world power, capturing data for TinyML, and teaching IoT fundamentals.
- **It is *not* for:** shipping in a product. The board carries a **bare EFR32MG12 SoC**, so there is **no modular wireless certification** to inherit, the RF layout and antenna are demonstration-grade, and the form factor prioritizes sensor breadth over cost, size, and ruggedness.
- **When you graduate:** Carry your validated firmware and power profile onto a **pre-certified module** (e.g., a Silicon Labs BGM/MGM-series module that wraps the same EFR32MG12 family) or your own custom EFR32MG12 board layout for production. Your application code and sensor-handling logic largely transfer; what changes is the RF certification path and the bill of materials.

> In short: **prototype and measure here; certify and ship elsewhere.** Treating the Thunderboard Sense 2 as a finished module is the mistake to avoid.

---

## See Also

- [01 — Overview](./01-overview.md) — board identity, lifecycle, at-a-glance specs
- [02 — SoC & Radio](./02-hardware-soc-radio.md) — EFR32MG12, energy modes, protocol matrix
- [03 — Sensors & Peripherals](./03-sensors-and-peripherals.md) — exact part numbers and electricals for every sensor cited above
- [04 — Pinout, Power & Connectors](./04-pinout-power-connectors.md) — power tree, CR2032, and the AEM used to validate battery budgets
- [06 — Getting Started](./06-getting-started.md) — the out-of-box demo and mobile app that implement Project 4.1
- [07 — Development & Toolchain](./07-development-toolchain.md) — Simplicity Studio, Gecko SDK, Zephyr, Mbed, Matter, and Edge Impulse for TinyML
- [08 — References & Glossary](./08-references-glossary.md) — datasheets, document numbers, and part numbers
