# Building an ML Project on the Thunderboard Sense 2

> An evidence-based guide distilled from a verified deep-research run, optimizing for learning, portfolio value, real-world usefulness, and novelty. The headline finding: on-device TinyML genuinely works on this no-NPU board — you just engineer around latency, not memory.

**Part of the Thunderboard Sense 2 documentation set.** Return to the [documentation hub](../README.md).

## Table of contents

- [Can This Board Actually Run ML? (The Honest Answer)](#can-this-board-actually-run-ml-the-honest-answer)
- [Ranked Shortlist: 7 ML Projects for This Board](#ranked-shortlist-7-ml-projects-for-this-board)
- [The Best of Best: the Phased "Smart Guardian" Flagship](#the-best-of-best-the-phased-smart-guardian-flagship)
- [End-to-End Build Pipeline (#1 Pick)](#end-to-end-build-pipeline-1-pick)
- [Gotchas, Tooling Path & Stretch Goals](#gotchas-tooling-path--stretch-goals)
- [Sibling documents](#sibling-documents)
- [Sources](#sources)

> **TL;DR** — The #1 pick is the phased on-device **"Smart Guardian"**: start with IMU gesture recognition, add keyword spotting, then fuse motion + sound + environmental sensors into a multi-sensor anomaly classifier. Build it with **Edge Impulse + Simplicity Studio 5**, run everything on-device, and stream results over **BLE**.

---

## Can This Board Actually Run ML? (The Honest Answer)

Yes. On-device TinyML on the Thunderboard Sense 2 (SLTB004A / BRD4166A, bare EFR32MG12 SoC) genuinely works, and it works well for the class of problems this board is built for: low-rate sensor inference at the edge. But the reasons it works — and the reasons it has hard ceilings — are not the ones most people assume. The short version:

- **Memory is not the wall.** The EFR32MG12 ships with 1 MB flash and 256 KB RAM. For the model sizes that make sense on a Cortex-M4F at this clock, you run out of *time* long before you run out of *bytes*. A well-quantized (int8) model for gesture or audio keyword spotting occupies tens of KB of flash and single-to-low-tens of KB of RAM — comfortably inside budget.
- **Latency is the wall.** The binding constraint is inference time (and, as we will see, feature-extraction time), driven by the core clock and the absence of any hardware ML accelerator.
- **There is no NPU.** The EFR32MG12 is a Series-1 part. Silicon Labs' hardware ML accelerator — the **MVP (Matrix Vector Processor)** — exists only on **Series-2 / xG24** devices. On this board, every multiply-accumulate runs on the Cortex-M4F (with the CMSIS-NN kernels using its DSP/SIMD instructions). That is fine for kHz-rate sensor models; it is not a substitute for an accelerator.
- **The DSP feature-extraction block, not the neural network, dominates latency.** For audio in particular, computing the MFCC/spectrogram features each inference window typically costs *more* than running the quantized neural net itself. When you budget latency, budget the front-end DSP first.

### The Deployment Model: Hybrid in Training, On-Device in Inference

The practical, verified workflow is **hybrid during training and fully on-device during inference**:

1. **Sample on the board.** Collect labeled sensor data (IMU, microphone, environmental sensors) directly from the Thunderboard's onboard sensors.
2. **Train in the cloud.** Upload samples to the Edge Impulse cloud (or equivalent), where feature extraction and model training run on real hardware.
3. **Deploy back to the board.** Compile the quantized model + DSP front-end into firmware and flash it to the EFR32MG12.
4. **Infer locally.** The board runs the full pipeline — sensor read -> DSP feature extraction -> int8 inference — entirely on-device, with no network round-trip in the inference loop.
5. **Stream results only over BLE.** The radio carries *classifications and confidences*, not raw data and not inference work. **The phone never infers.** It is a display/telemetry sink, not a compute offload target.

This distinction matters: the board is autonomous at inference time. BLE latency, phone availability, and connection drops do not affect whether or how fast the model runs.

### How to Read the Numbers (and Where the Verified Figures Live)

This chapter cites two board-specific *accuracy* figures from published TinyML work on this exact board: the verified **~98.8% IMU gesture accuracy** from a community Hackster.io project (gatoninja236), and a softer **~87% posture-classification accuracy** from an Edge Impulse expert-network "Posture Detection for Worker Safety" project (see the [Ranked Shortlist](#ranked-shortlist-7-ml-projects-for-this-board) below). Treat the 98.8% gesture figure as well-evidenced and the 87% posture figure as a single-project data point, not an equally-confident benchmark — and treat every *latency* figure as a planning estimate to be measured, not a benchmark.

The table below is the consolidated feasibility reference. **Read the "Where measured" column carefully:** most figures come from an 80 MHz reference core or *other* Cortex-M4 boards, not this board's 38.4 MHz EFR32MG12 — so they tell you *relative* model cost, not a measured prediction for your hardware.

| Workload | RAM | ROM/flash | Latency | Where measured | Fit on this board (256 KB RAM / 1 MB flash) |
|----------|-----|-----------|---------|----------------|---------------------------------------------|
| **IMU gesture (2 s window)** | ~6.4 KB | ~42.5 KB | ~17 ms (DSP 15 ms dominates) | Edge Impulse ref @ M4F **80 MHz** | ✅ Trivial fit; ~30–40 ms @ 38.4 MHz — real-time |
| **IMU gesture (5-class accel)** | small | small | DSP **29 ms** / classify **1 ms** | **Measured on THIS board** (EI workshop repo) | ✅ Confirmed real-time on-device |
| **Keyword spotting / scene (1 s audio, MFCC)** | ~19.6 KB (+~16 KB audio buffer) | ~47.3 KB | ~225 ms (MFCC DSP 168 ms dominates) | Edge Impulse ref @ M4F **80 MHz** | ✅ Fits; **~400–470 ms @ 38.4 MHz — EXTRAPOLATED, not measured** |
| **MLPerf Tiny KWS (DS-CNN)** | — | ~52.5 KB | — | Canonical ref (STM32L4 M4F) | ✅ Fits comfortably (90 % acc reference) |
| **MLPerf Tiny anomaly (FC-autoencoder)** | ~270 KB | — | — | Canonical ref | ⚠️ **270 KB approaches/exceeds 256 KB RAM — size the autoencoder down** |
| **Academic gesture CNN (int8)** | 192–275 KB | — | 9–30 ms | Other Cortex-M4 boards | ⚠️ Larger variants near the RAM ceiling — keep it small |
| **Academic wake-word CNN (int8)** | 247–288 KB | — | 193–211 ms | Other Cortex-M4 boards | ⚠️ Near/over the RAM ceiling — quantize aggressively |

Key reading of the table: for the *sensible* model sizes (gesture, KWS, small anomaly), **RAM and flash are comfortable** — the binding constraint is latency, and **the DSP feature-extraction block, not the neural net, dominates it in every row** (classification itself is ~1 ms). The anomaly/wake-word rows that approach 256 KB are a warning to size models down, not a typical case. Sources for every figure are linked in the [Sources](#sources) section.

Two cautions when you encounter quoted numbers elsewhere:

- **Canonical MLPerf Tiny results are a *different device*.** MLPerf Tiny reference figures are typically reported on faster Series-2-class or higher-clocked Cortex-M parts. Use them to understand *relative model cost* across workloads — keyword spotting vs. anomaly detection vs. image classification — not as a measured prediction for this board's 38.4–40 MHz clock and Series-1 core.
- **Memory budgets fit; latency budgets are the open question.** As covered above, int8 sensor models occupy tens of KB of flash and single-to-low-tens of KB of RAM, well inside the EFR32MG12's 1 MB / 256 KB envelope. The figure you must actually validate is per-inference *time*, and the only trustworthy source for that is a measurement on your own board (see the build pipeline's verify step).

### The Keyword-Spotting Latency Caveat (Important)

The frequently-quoted **~400-470 ms KWS inference latency at 38.4 MHz** for this board is an **extrapolation, not a measured number.** It is derived by scaling published reference latencies measured at **80 MHz** down to the Thunderboard Sense 2's lower operating clock. Treat it accordingly:

- It is a **first-order estimate** assuming latency scales roughly linearly with clock frequency.
- It does **not** account for memory-wait states, cache behavior, the exact DSP front-end configuration, or compiler/kernel differences between the reference and this board.
- The real figure on your hardware could land meaningfully above or below this range. **If KWS latency is on your critical path, measure it on the board before committing to it.**

The takeaway: the board is a capable TinyML inference device for low-rate sensor tasks, the engineering budget you must guard is *time* (dominated by DSP feature extraction), and any audio-latency figure you have seen quoted for this specific board is almost certainly extrapolated from faster silicon rather than measured.

---

## Ranked Shortlist: 7 ML Projects for This Board

This is the core recommendation of the chapter: a ranked, opinionated shortlist of the seven ML/TinyML projects best matched to the Thunderboard Sense 2's *actual* hardware — a bare EFR32MG12 (Cortex-M4F with FPU + DSP, up to 40 MHz, 256 kB RAM, 1024 kB flash), **no neural accelerator** (the MVP/NPU path exists only on EFR32 Series 2 / xG24), and the full onboard sensor suite plus an ICS-43434 I2S microphone. See [SoC & Radio](../02-hardware-soc-radio.md) and [Sensors & Peripherals](../03-sensors-and-peripherals.md) for the silicon and parts behind every entry.

Two framing facts drive the entire ranking:

1. **Vision is excluded.** The board has **no camera** and no camera interface broken out for ML use. Any project that needs image input is off the table on this hardware — point image/vision work at a board with a camera (e.g., an xG24 + Arducam or a different platform). Every project below uses **motion (IMU), audio (mic), or the environmental/hall sensors** as its input.
2. **Latency is the wall, not memory.** With 256 kB RAM and 1 MB flash, the typical TinyML models discussed here (a few tens of kB of weights, low-tens-of-kB tensor arena) fit comfortably — RAM/flash are *not* the binding constraint. The constraint is **inference time on a Series-1 Cortex-M4F with no NPU**, which is why audio keyword spotting (the heaviest model class here) sits low in the ranking. The xG24's MVP accelerator would change this calculus, but it is not present on this board.

### Summary comparison table

| # | Project | Primary sensor(s) | Where ML runs | Difficulty | RAM/flash feasibility | Why it's impressive |
|---|---------|-------------------|---------------|------------|----------------------|---------------------|
| 1 | **IMU gesture / motion recognition** | ICM-20648 (6-axis IMU) | Fully on-device | Intermediate | Easy fit (small model) | Proven ~**98.8%** gesture accuracy on this exact board |
| 2 | **Predictive-maintenance vibration anomaly** | ICM-20648 IMU (+ optional mic) | Fully on-device | Advanced | Easy fit | Canonical Industry-4.0 demo; runs untethered, privacy-preserving |
| 3 | **Wearable posture / activity classification** | ICM-20648 IMU | Fully on-device | Intermediate | Easy fit | Proven ~**87%** posture-classification accuracy on this board |
| 4 | **Acoustic event classification** (non-speech) | ICS-43434 mic | On-device (hybrid optional) | Intermediate–Advanced | Fits; latency-tolerant | Real edge audio AI without a network; LED/BLE feedback |
| 5 | **Audio keyword spotting (KWS)** | ICS-43434 mic | On-device (latency-bound) | Advanced | Model fits; **latency is the wall** | Voice-style control on an MCU — but slow on Series 1 (see caveat) |
| 6 | **Air-quality / environmental anomaly detection** | CCS811 + Si7021 + BMP280 + Si1133 | On-device or hybrid | Intermediate | Trivial fit | Learns a "normal room" baseline; no cloud rules needed |
| 7 | **Hall-based event/pattern recognition** | Si7210 hall (+ IMU corroboration) | On-device | Beginner–Intermediate | Trivial fit | Smart, ultra-low-power magnetic event classifier on a coin cell |

> Accuracy figures cited as "proven on this board" come from published TinyML work targeting the Thunderboard Sense 2: the ~98.8% gesture figure from a community Hackster.io project (gatoninja236), and the ~87% posture figure from an Edge Impulse expert-network "Posture Detection for Worker Safety" project. Treat them as representative of well-labeled datasets, not guarantees — your accuracy depends on your data quality and class separation, as discussed in [Use Cases](../05-use-cases-applications.md).

### #1 — IMU gesture / motion recognition

- **Sensors used:** ICM-20648 6-axis IMU (accelerometer + gyroscope) over SPI. No external hardware.
- **Where ML runs:** **Fully on-device.** The model runs on the EFR32MG12 Cortex-M4F; the recognized class is shown on the RGB LEDs and optionally announced over BLE (write `01` to the Edge Impulse control characteristic `02AA6D7D-23B4-4C84-AF76-98A7699F7FE2` to start inference — see [Toolchain §7.4](../07-development-toolchain.md)).
- **Difficulty:** Intermediate. The firmware is the easy part; data collection and clean class labeling drive results.
- **RAM/flash feasibility:** Easy fit. IMU gesture models are small (low tens of kB), so the 256 kB RAM / 1 MB flash budget is generous — RAM/flash are not a concern here.
- **Why it's impressive:** This is the **#1 recommendation** because it is the best-evidenced project on this hardware. A community Hackster.io project (gatoninja236) on the Thunderboard Sense 2 reports gesture-recognition accuracy around **98.8%** (built with the Edge Impulse loop and the board's listed firmware, [`edgeimpulse/firmware-silabs-thunderboard-sense-2`](https://github.com/edgeimpulse/firmware-silabs-thunderboard-sense-2)). Motion inference is light enough that latency is a non-issue even without an accelerator, so you get a crisp, reliable, fully on-device demo with immediate LED feedback.

### #2 — Predictive-maintenance vibration anomaly detection

- **Sensors used:** ICM-20648 IMU as a vibration sensor (RMS / FFT-bin features), optionally fused with the ICS-43434 microphone for an acoustic signature, plus Si7021 for thermal context.
- **Where ML runs:** **Fully on-device.** Strap the board to a motor/pump/fan; it computes features and flags "normal vs. abnormal" locally, reporting a health score or anomaly flag over BLE or a proprietary link. No network is required for the inference itself.
- **Difficulty:** Advanced. Sampling rate, windowing, and feature extraction (the DSP block) dominate the outcome — see the predictive-maintenance project in [Use Cases §4.6](../05-use-cases-applications.md).
- **RAM/flash feasibility:** Easy fit. Anomaly-detection models (e.g., a small autoencoder or K-means over spectral features) are compact; the FFT working buffers are the main RAM users and still fit comfortably.
- **Why it's impressive:** This is the textbook **Industry-4.0 / Industrial IoT** TinyML demo, and the board can do it standalone on a battery — privacy-preserving edge AI with no cloud round-trip. The IMU + mic combination on one board lets you build a richer vibration-plus-acoustic signature than most single-sensor demos.

### #3 — Wearable posture / activity classification

- **Sensors used:** ICM-20648 6-axis IMU. No external hardware.
- **Where ML runs:** **Fully on-device.** Classifies the wearer's posture or activity (e.g., sitting/standing/walking) from accelerometer + gyro windows, signaling locally via LED and/or BLE.
- **Difficulty:** Intermediate. Same toolchain pattern as #1; the harder part is collecting representative labeled data across people and mounting positions.
- **RAM/flash feasibility:** Easy fit. Activity/posture models are small; RAM/flash are not the constraint.
- **Why it's impressive:** An Edge Impulse expert-network "Posture Detection for Worker Safety" project on the Thunderboard Sense 2 reports posture-classification accuracy around **87%** — treat this as a single-project data point rather than a verified benchmark. It ranks just below gesture recognition because the lower accuracy reflects how much harder cross-subject generalization is than recognizing deliberate, well-separated gestures — an honest reminder that data quality, not the silicon, sets the ceiling here.

### #4 — Acoustic event classification (non-speech)

- **Sensors used:** ICS-43434 digital I2S MEMS microphone. No external hardware.
- **Where ML runs:** **On-device** is the default (classify events like clap / knock / glass-break / alarm / "silence" locally). A **hybrid** variant is reasonable: detect-on-device, then offload a clip or summary over BLE for a heavier second-stage model on a phone or cloud.
- **Difficulty:** Intermediate–Advanced. I2S configuration and audio framing add setup overhead versus IMU projects; correct L/R channel and clocking are common pitfalls (see [Sensors §3.7](../03-sensors-and-peripherals.md)).
- **RAM/flash feasibility:** Fits. Audio feature extraction (MFCC/MFE) plus a small classifier sits within budget; audio is more latency-tolerant than KWS because events are sparse, not continuous-stream-decoded.
- **Why it's impressive:** It turns the board into a genuine **edge audio sensor** — sound-event detection with no microphone data ever leaving the device, which is a real privacy and bandwidth win. It ranks above keyword spotting because non-speech event classification tolerates higher per-inference latency than always-on speech decoding.

### #5 — Audio keyword spotting (KWS)

- **Sensors used:** ICS-43434 I2S microphone.
- **Where ML runs:** **On-device**, but this is the **latency-bound** entry. KWS is the heaviest model class in this shortlist and the one most penalized by the absence of a neural accelerator.
- **Difficulty:** Advanced. MFCC feature pipeline + a larger neural net + continuous-stream inference is the most demanding combination here.
- **RAM/flash feasibility:** **The model fits — RAM/flash are not the wall; latency is.** A typical small KWS model's weights and tensor arena fit within 256 kB RAM / 1 MB flash. The problem is inference *time* on a Series-1 Cortex-M4F.
- **Why it's impressive (with a hard caveat):** Running voice-style keyword control on a bare MCU is a striking demo. **But be honest about the latency:** the figure of roughly **~400–470 ms per inference at 38.4 MHz is an extrapolation, not a measured benchmark on this board.** It is derived by scaling expected per-inference cost to the EFR32MG12's clock, and real-world latency depends on the exact model, the MFCC window/stride, the clock you actually run at (up to 40 MHz), and DSP usage. At that order of magnitude, KWS feels sluggish for snappy command-and-control — which is exactly why it ranks below the IMU and acoustic-event projects, and why an **xG24 with the MVP accelerator** is the right target if low-latency KWS is your goal. Do not present the ~400–470 ms number to stakeholders as a tested result.

### #6 — Air-quality / environmental anomaly detection

- **Sensors used:** CCS811 (eCO2/TVOC), Si7021 (RH/T), BMP280 (pressure), Si1133 (light/UV). Note the CCS811 requires burn-in/warm-up and is **disabled when the board runs from a CR2032 coin cell** — use USB or an external battery for this project (see [Sensors §5](../03-sensors-and-peripherals.md)).
- **Where ML runs:** **On-device or hybrid.** A small model can learn a "normal room" multi-sensor baseline and flag anomalies locally (LEDs + BLE), or you can stream features to a hub for a heavier model.
- **Difficulty:** Intermediate. The ML is light; the real work is handling the CCS811's warm-up/baseline behavior so early readings don't poison the model.
- **RAM/flash feasibility:** Trivial fit. Low-rate scalar sensor streams produce tiny feature vectors and tiny models.
- **Why it's impressive:** Instead of hand-tuned thresholds, the device *learns* what a normal environment looks like across several sensors at once and flags deviations — a more robust, self-calibrating take on the classic air-quality monitor in [Use Cases §4.3](../05-use-cases-applications.md). It ranks lower mainly because the input signals are slow-moving, so the ML payoff over simple rules is smaller than in the motion/audio projects.

### #7 — Hall-based event / pattern recognition

- **Sensors used:** Si7210 hall sensor (with a small external magnet), optionally corroborated by the IMU and Si1133.
- **Where ML runs:** **Fully on-device**, with extremely low duty cycle — ideal for coin-cell operation (the hall sensor stays enabled on a CR2032).
- **Difficulty:** Beginner–Intermediate. Closer to classic embedded than heavy ML; the "model" can be a tiny classifier or even a learned threshold pattern over the magnetic-field time series.
- **RAM/flash feasibility:** Trivial fit. Single-channel, low-rate data and a minimal model.
- **Why it's impressive:** It shows ML applied to an **ultra-low-power magnetic event stream** — distinguishing, say, open/close patterns, rotation counts, or tamper signatures — and it pairs naturally with the board's AEM power-profiling story (see [Pinout, Power & Connectors](../04-pinout-power-connectors.md)). It ranks last because the problem is simple enough that ML is often overkill versus the deterministic hall-switch approach in [Use Cases §4.7](../05-use-cases-applications.md) — include it when you specifically want a "tiny ML on a tiny signal at tiny power" demonstration.

> **One open question to flag honestly:** the precise on-device inference latency for the audio model classes (#4 and #5) on the EFR32MG12 at this board's clock is **not firmly measured in the source material** — the ~400–470 ms KWS figure is an extrapolation at 38.4 MHz. If latency matters to your decision, benchmark your specific model on the actual board (the Edge Impulse runtime reports per-inference timing), and treat the audio rankings as latency-sensitive rather than fixed.

---

## The Best of Best: the Phased "Smart Guardian" Flagship

If you build exactly one thing on this board, build the **Smart Guardian** — but build it in three stages, not all at once. The Smart Guardian is a single battery-capable node that watches a space across three independent sensing domains — **motion** (ICM-20648 6-axis IMU), **sound** (ICS-43434 MEMS microphone), and **environment** (Si7021 RH/T, BMP280 pressure, CCS811 air quality) — runs small on-device models against each, fuses their outputs into a contextual "state," and reports that state over BLE while signalling locally on the 4x RGB LEDs. It is the #1 recommendation in the research ranking, and the reason is structural: it is the only project that simultaneously **maximizes learning, portfolio value, real-world usefulness, and novelty** while spanning every sensor class the board was designed to show off.

The trick that makes it the *best* choice rather than the *riskiest* one is the **crawl -> walk -> run** phasing. Each phase is a complete, independently demoable project on its own. You are never one bug away from having nothing to show — at every checkpoint you have a working artifact you could hand to a recruiter, a teacher, or a customer.

### Why a phased flagship beats picking a single project

A single-project choice forces a bad trade. Pick the easy project (a beacon, a logger) and you cap your learning and your portfolio. Pick the ambitious one (full multi-model fusion) as your *first* move and you risk spending weeks with nothing demoable if any one piece stalls. The phased flagship removes that trade:

- **It maxes all four axes at once.** Learning: you touch the full TinyML pipeline (capture -> label -> train -> quantize -> deploy -> infer on-device), then do it a second time in a different sensor domain, then learn sensor fusion. Portfolio: three shippable demos that build to one impressive system. Usefulness: a guardian that reacts to motion, sound, and air quality is a genuinely plausible product. Novelty: multi-model fusion on a Series-1 SoC with **no NPU** is a more interesting story than yet another single-model classifier.
- **It spans all three sensor domains.** Most board projects exercise one sensor. The Smart Guardian deliberately uses motion, acoustics, and environment — the exact breadth the Thunderboard Sense 2's seven-sensor suite was built to demonstrate (see [Use Cases & Applications](../05-use-cases-applications.md) and [Sensors & Peripherals](../03-sensors-and-peripherals.md)).
- **It de-risks itself.** Because CRAWL, WALK, and RUN are each independently demoable, the project "never fails." A stall at RUN still leaves you with two finished, defensible projects (CRAWL and WALK). You bank a win at every stage.
- **It teaches the pipeline before it tests the architecture.** You learn the *mechanics* of TinyML on the simplest, most forgiving sensor (the IMU) before you spend any effort on the harder problems (audio latency, multi-model orchestration).

### The three phases

**CRAWL — IMU gesture recognition (learn the pipeline).**
Start with the #1-ranked standalone project: a gesture/motion classifier on the ICM-20648 IMU. Capture a few labeled classes (e.g., *wave*, *shake*, *tap*, *idle*), train a small neural network in [Edge Impulse](https://docs.edgeimpulse.com/) — which has [first-party support for the Thunderboard Sense 2](https://docs.edgeimpulse.com/hardware/boards/silabs-thunderboard-sense-2) — and deploy it back to the EFR32MG12. The IMU is the right *first* sensor on purpose: low, fixed sample rate; small feature windows; tolerant of imperfect labels; and **comfortably real-time** on the Cortex-M4F. The hard part here is data quality and labeling, not latency or firmware. By the end of CRAWL you understand the entire capture-to-on-device-inference loop, and you have a complete, demoable gesture classifier.

**WALK — add keyword spotting (a second domain, a harder constraint).**
Now add the #5-ranked project: keyword spotting (KWS) on the ICS-43434 microphone — for example, a wake word plus one or two commands. This is the same pipeline you just learned, applied to a fundamentally harder signal: audio runs at far higher sample rates, needs MFCC/spectrogram feature extraction, and the model is larger. This is where the board's defining constraint shows up. On the EFR32MG12, **RAM and flash are not the wall — latency is** (see [SoC & Radio](../02-hardware-soc-radio.md) for the 38.4 MHz clock and the lack of any ML accelerator).

> **Honest caveat on KWS latency.** The research estimates KWS inference at roughly **~400–470 ms per window at 38.4 MHz**. This figure is an **extrapolation**, not a measured benchmark on this board — treat it as a planning estimate, and **measure your own model on your own hardware** before quoting it. The implication is real either way: a KWS model that feels instant on a Series-2 part with an MVP/AI accelerator (xG24 and newer — *not available on this Series-1 SoC*) will feel noticeably laggy here. Keep the keyword set tiny, the model small and aggressively quantized, and set user expectations for "responsive," not "instant." If you need snappy KWS as a *product*, that is the clearest signal to graduate to an xG24 dev kit (see the lifecycle/replacement note in [Overview](../01-overview.md)).

By the end of WALK you have a second independently demoable project *and* a hard-won, concrete understanding of where a Series-1 MCU's compute ceiling actually bites.

**RUN — fuse into the multi-model Smart Guardian.**
Finally, run both models together and add the environmental trio as low-rate context, fusing their outputs into a single guardian state. The IMU model detects motion events, the KWS model listens for commands or alarm-like sounds, and the Si7021/BMP280/CCS811 readings supply slow context (e.g., air-quality or temperature excursions). A small fusion layer turns "motion + sound + bad air" into actionable states — *quiet*, *activity detected*, *spoken command*, *environmental alert* — surfaced on the RGB LEDs and reported over BLE. The engineering lesson of RUN is **orchestration under a latency budget**: because the KWS path is the slow one, you schedule the cheap IMU and environmental work around it, duty-cycle the audio inference, and use the LEDs and BLE for instant local feedback so the *system* feels responsive even when one model is not. This is also the natural place to bring in the AEM to prove the whole multi-model node still fits a battery budget (see [Pinout, Power & Connectors](../04-pinout-power-connectors.md)).

### Phase map

| Phase | Sensors | Model | What you demo |
|-------|---------|-------|---------------|
| **CRAWL** | ICM-20648 IMU (6-axis) | Single small NN — gesture/motion classifier (wave / shake / tap / idle) | A working on-device gesture recognizer; LED + BLE report of the recognized gesture. Proves you own the full Edge Impulse capture -> train -> deploy -> infer pipeline. |
| **WALK** | ICS-43434 MEMS microphone | Single small NN — keyword spotting (wake word + 1–2 commands) | An on-device KWS demo reacting to spoken keywords. Proves you can handle a harder, higher-rate signal *and* understand the board's latency ceiling (~400–470 ms/window, *extrapolated — measure your own*). |
| **RUN** | IMU + mic + environmental trio (Si7021 RH/T, BMP280 pressure, CCS811 air quality) | Multi-model fusion: gesture NN + KWS NN + environmental thresholds -> single guardian state | The full Smart Guardian: fuses motion + sound + environment into a contextual state, signals on 4x RGB LEDs, reports over BLE. Adds the AEM to validate the battery budget for a multi-model node. |

> Each row is shippable on its own. If you stop after CRAWL you have a finished project; if you stop after WALK you have two. RUN is the flagship — but the phasing guarantees you bank a demoable win at every stage, which is exactly why this beats committing to any single project up front.

---

## End-to-End Build Pipeline (#1 Pick)

This pipeline is the realistic, end-to-end path to a working audio/IMU classifier on the Thunderboard Sense 2 (BRD4166A, bare EFR32MG12). The good news: every stage has first-party tooling support, and the board is one of [Edge Impulse's officially supported targets](https://docs.edgeimpulse.com/hardware/boards/silabs-thunderboard-sense-2). The bad news: the EFR32MG12 is a Series-1 part with **no NPU** (the MVP/AI accelerator is xG24/Series-2 only), so the binding constraint is **inference latency, not RAM or flash**. Design the pipeline around that fact from day one.

### Pipeline at a Glance

```
+-------------------+     +--------------------+     +----------------------+
|   1. COLLECT      |     |   2. TRAIN (cloud) |     |   3. DEPLOY          |
|                   |     |                    |     |                      |
| mic / IMU:        |     | EI Studio:         |     | Option A: .bin       |
|  edge-impulse-    | --> |  - MFCC / spectral | --> |  drag-drop to TB004  |
|  daemon (native)  |     |    DSP block       |     |  USB mass-storage    |
|                   |     |  - small int8 CNN  |     |                      |
| env sensors:      |     |    (TFLite Micro)  |     | Option B: C++ SDK    |
|  EI data forwarder|     |                    |     |  lib in Simplicity   |
+-------------------+     +--------------------+     |  Studio 5            |
                                                     +----------+-----------+
                                                                |
            +-------------------------------------------------- +
            |
            v
+-------------------------+     +-----------------------------+
|  4. VERIFY (on-device)  |     |  5. STREAM                  |
|                         |     |                             |
| edge-impulse-run-       | --> | BLE GATT notify -> phone    |
| impulse --continuous    |     | (EFR Connect / web app);    |
| (real latency printed)  |     | label + confidence, NO net  |
+-------------------------+     +-----------------------------+
```

### Numbered Steps

1. **Set up tooling.** Install the Edge Impulse CLI (which bundles `edge-impulse-daemon`, `edge-impulse-data-forwarder`, and `edge-impulse-run-impulse`) and flash the prebuilt EI firmware onto the board so it is recognizable as a data source.

   ```bash
   # Edge Impulse CLI (Node 18+ recommended)
   npm install -g edge-impulse-cli

   # Sanity-check the install
   edge-impulse-daemon --version
   ```

   Flash the official Thunderboard Sense 2 EI firmware by dragging the provided `.bin` onto the `TB004` USB mass-storage drive that appears when the board is plugged in (see Step 3, Option A for the same mechanism). Follow the board-specific steps in the [Edge Impulse Thunderboard Sense 2 guide](https://docs.edgeimpulse.com/hardware/boards/silabs-thunderboard-sense-2).

2. **Collect data.** Choose the ingestion path by sensor type:

   - **Microphone and IMU (native sensors the EI firmware knows about):** use the daemon. It connects the board to your EI project and lets you record labeled samples straight from the Studio UI.

     ```bash
     # Pairs the board with your EI project and streams native sensors
     edge-impulse-daemon
     # Re-pair / switch projects later with:
     edge-impulse-daemon --clean
     ```

   - **Environmental sensors (humidity, pressure, air quality, etc.) or any custom signal the stock firmware does not expose:** use the **data forwarder**. You print comma-separated sensor readings over serial from your own firmware, and the forwarder turns each line into a labeled sample.

     ```bash
     # Forward custom sensor lines (e.g. "23.5,1013.2,402") to EI
     edge-impulse-data-forwarder
     ```

   Capture a balanced dataset across all classes, including a realistic "noise"/"unknown" class. Aim for many short windows per class rather than a few long recordings.

3. **Train in EI Studio.** Build the impulse in the browser:

   - **DSP block:** for audio keyword spotting use the **MFCC** block; for vibration/IMU or environmental signals use the **spectral features** block. The DSP block does the heavy lifting of turning raw windows into compact feature vectors and is where most of the per-inference cost on a Series-1 part actually lives.
   - **Learning block:** a **small int8-quantized CNN** exported to TensorFlow Lite for Microcontrollers (TFLM). Keep it small — you are optimizing for latency on a Cortex-M4F, not accuracy on a GPU.
   - Use the EON Tuner if you want EI to search DSP + model configurations for you, then train and review the on-device performance estimate. Treat that estimate as a starting point — see the latency caveat below.

4. **Deploy.** You have **two** first-party options; both produce a binary that runs the same impulse:

   - **Option A — `.bin` drag-and-drop (fastest path to a running demo).** In Studio, build for the Thunderboard Sense 2 target and download the ready-to-run firmware `.bin`. Plug in the board, and drag the file onto the `TB004` USB mass-storage drive. The board reflashes and reboots into your impulse. No toolchain, no IDE.

   - **Option B — C++ library in Simplicity Studio 5 (the portfolio/production path).** Export the impulse as a **C++ SDK library**, drop it into a Simplicity Studio 5 (Gecko SDK) project, and call the `run_classifier()` API from your own application code. This is the only route if you need to fuse multiple sensors, add custom BLE behavior, or control the inference loop yourself.

     ```c
     // Inside your Simplicity Studio 5 app, per the exported SDK
     ei_impulse_result_t result = { 0 };
     signal_t signal;
     // ... fill signal from your sensor buffer ...
     run_classifier(&signal, &result, false);
     // result.classification[ix].label / .value -> push over BLE
     ```

5. **Verify on-device.** Before trusting anything, run the live classifier and read the **actual** numbers off the hardware:

   ```bash
   # Streams live predictions AND prints real DSP + inference timing
   edge-impulse-run-impulse --continuous
   ```

   The `--continuous` flag runs a sliding window so you see a steady stream of labels and confidences, plus the measured DSP and classification latency per inference. This is your ground truth — not the cloud estimate.

6. **Stream results over BLE.** Expose the classification result (label + confidence) as a BLE GATT characteristic and `notify` it to a phone. Read it with Silicon Labs' **EFR Connect** app or a small Web Bluetooth page. The entire loop — sensing, DSP, inference, and result delivery — runs with **no internet connection**, which is the whole point of TinyML on this board and the single most compelling thing to demonstrate.

### Hard Parts & How to De-risk

| Hard part | Why it bites | How to de-risk |
|-----------|--------------|----------------|
| **Latency is the wall, not memory** | The EFR32MG12 has no NPU; MFCC + CNN inference on the Cortex-M4F is the bottleneck. RAM/flash are comfortable; wall-clock time per inference is not. | Use **~1 second windows** and an **incremental (sliding-window) MFCC** so you amortize DSP cost across overlapping frames instead of recomputing the full spectrogram every time. Keep the CNN tiny and int8. |
| **The ~16 KB audio buffer is "hidden" RAM** | EI's reported RAM figures **exclude** the audio sample buffer (~16 KB for KWS). If you size your firmware to the EI number alone, you will be short. | Budget an extra ~16 KB on top of EI's RAM estimate for audio projects. Verify free RAM on-device after integrating, not from the Studio estimate. |
| **Multi-sensor fusion needs custom firmware** | The drag-drop `.bin` only runs a single stock impulse on the sensors the firmware was built for. Fusing mic + IMU + environmental data is **not** possible from the no-code path. | This is the **main difficulty escalator**: the moment you want fusion, you are committed to **Option B** (C++ library in Simplicity Studio 5) and writing your own sensor-acquisition + buffering loop. Scope fusion as a deliberate phase 2, not a surprise. |

> **Honesty note on latency:** Edge Impulse's published on-device timings for this class of model are referenced against an **80 MHz** core clock. The Thunderboard Sense 2's EFR32MG12 runs at **38.4 MHz** by default. A naive scaling of the reference puts keyword-spotting end-to-end latency in the **~400-470 ms** range at 38.4 MHz — but that figure is an **extrapolation**, not a measured result. Do not quote it as fact. The whole reason Step 5 exists is to replace it with a real number from `edge-impulse-run-impulse --continuous` on your own board. (You can also raise the core clock toward the part's maximum to claw back latency, which is itself a great thing to benchmark and document.)

### Make It Portfolio-Grade

What separates a tutorial rerun from a portfolio piece is evidence and honesty. Do all three:

1. **Publish a GitHub repo.** Include the EI project export, the Simplicity Studio 5 project (Option B), wiring/flashing instructions, and a clear README with the labels, the model architecture, and the dataset description. Make the build reproducible by someone who has only the board.

2. **Record a 60-90 second demo video.** Show the full on-device loop end to end: speak the keyword (or trigger the IMU gesture), show the board classifying it, and show the **label + confidence appearing on a phone over BLE** — all with **the internet visibly off** (airplane mode on the phone, no network on the host). The "no cloud, no Wi-Fi, runs on a coin-cell-class MCU" moment is the entire pitch.

3. **Write up a real benchmark.** Report the **measured 38.4 MHz latency** from `edge-impulse-run-impulse --continuous` and compare it against the **80 MHz reference** Edge Impulse publishes. Be explicit that the 80 MHz number is a reference point and the ~400-470 ms figure is an extrapolation you set out to validate. Bonus credibility: also report latency after raising the core clock, and break the number into DSP time vs. inference time so readers see where the cost lives. This honest, instrumented comparison is exactly the kind of engineering judgment a portfolio is meant to show.

---

## Gotchas, Tooling Path & Stretch Goals

If you build the recommended on-device keyword-spotting (KWS) / audio-event project on this board, the things that will actually trip you up are not the things beginners expect. The RAM and flash are not the wall; **latency is**, and several board-specific quirks (lifecycle status, power source, missing accelerator) shape what is buildable. This section is the "read before you commit a weekend" list.

### Board-specific gotchas

| Gotcha | What it means in practice | Mitigation / honest take |
|--------|---------------------------|--------------------------|
| **No NPU / no AI accelerator** | The EFR32MG12 is **Series 1**. Silicon Labs' ML hardware accelerator (the MVP / matrix-vector processor) ships **only on Series 2 (xG24 / MG24)**. Inference here runs on the Cortex-M4F with FPU + DSP instructions only. | Expect roughly **~2x slower audio inference** than an xG24 running the same model. This is fine for a learning/demo KWS project — it just means you design for it rather than discovering it. See [Edge Impulse note in §07](../07-development-toolchain.md#7-alternative-ecosystem-edge-impulse-tinyml). |
| **Latency is the wall, not memory** | With 1024 kB flash / 256 kB RAM (see [SoC & Radio](../02-hardware-soc-radio.md)), a small KWS model fits comfortably. What does *not* fit comfortably is your real-time budget: per-inference time, not model size, decides whether you keep up with the audio stream. | Budget around **latency first**. The MG12 has neither the higher Series-2 core clock (78 MHz vs ~40 MHz) NOR the MVP accelerator, so the xG24 is faster on both counts; optimize window/stride and DSP feature extraction, not RAM. Do not assume "it fits, therefore it's fast." |
| **~400–470 ms KWS latency figure is an EXTRAPOLATION** | The often-quoted ~400–470 ms per-inference KWS latency at the lower **38.4 MHz** clock is **not a measured benchmark on this board** in the research — it is an extrapolation from Series-1 Cortex-M4F behavior. | Treat it as a planning estimate, **not measured fact**. At the EFR32MG12's full **40 MHz** core clock it will be somewhat better; the real number is something you should measure and report (see stretch goals). Do not cite the ~400–470 ms figure as a verified result. |
| **Coin-cell (CR2032) disables the RGB LEDs and the CCS811** | On CR2032 power the board cannot drive the **4x high-brightness RGB LEDs** or the **CCS811** air-quality sensor — both exceed what the coin cell can supply (see [Power & Connectors](../04-pinout-power-connectors.md)). | If your project uses LEDs for inference feedback **or** the CCS811 as an input, **run from USB power**. Untethered coin-cell operation is for low-duty sensing only — design your demo around that constraint up front. |
| **Board is NRND ("Not Recommended for New Designs")** | Silicon Labs classifies the Thunderboard Sense 2 as NRND and points new projects at the **EFR32xG24 Dev Kit** (which has the MVP accelerator and Secure Vault). See [Overview lifecycle](../01-overview.md) and [§07](../07-development-toolchain.md#0-the-single-most-important-fact-for-tooling). | If you already own this board, it remains fully usable, documented, and toolchain-supported — build on it. If you are **buying new hardware specifically to learn TinyML**, the **xG24 Dev Kit is the smarter purchase** (accelerator + actively recommended). Be deliberate about which situation you're in. |
| **Edge Impulse's stated RAM figure excludes the audio buffer** | The RAM estimate Edge Impulse reports for a deployed impulse does **not** include the **~16 KB audio capture/ring buffer** the firmware needs to feed the model. | Add roughly **~16 KB** on top of EI's reported RAM when you sanity-check headroom. It still fits on 256 kB RAM, but don't plan against EI's number alone. |
| **Vision is out of scope** | This board has **no camera**. Any image/vision TinyML idea is excluded — the sensor mix is environmental + motion + audio (see [Sensors & Peripherals](../03-sensors-and-peripherals.md)). | Pick audio (KWS / acoustic events) or motion (IMU gesture / vibration). Vision projects belong on a different board entirely. |

### Which tooling path to actually use

**The route: Edge Impulse + Simplicity Studio 5 + Simplicity Commander.** This is the path with the least friction and the most prior art for this exact board:

- **[Edge Impulse](https://github.com/edgeimpulse/firmware-silabs-thunderboard-sense-2)** for the data -> train -> optimize -> deploy loop. The board is an officially listed EI target with **prebuilt open-source firmware** for it.
- **Simplicity Studio 5 (SSv5) + Gecko SDK** as the first-party IDE/SDK if you need to integrate the model into your own BLE/sensor firmware rather than run the stock EI image. SSv5 is the right Studio generation for this Series-1 part (see [§07.2](../07-development-toolchain.md#2-simplicity-studio-the-primary-ide)).
- **Simplicity Commander (`commander`)** for scripted/reliable flashing over SWD when drag-drop misbehaves (see [§07.4.4](../07-development-toolchain.md#44-simplicity-commander-cli-flashing)).

There are **two deployment paths**, and the difference matters:

1. **Edge Impulse prebuilt firmware (fast path).** Flash the stock `silabs-thunderboard-sense2.bin` to the `TB004` mass-storage drive, then run `edge-impulse-daemon` / `edge-impulse-run-impulse`. You get the full train-and-deploy loop without writing firmware. This is the recommended starting point for the recommended project — fastest to "model running on hardware."
2. **Pure TFLite-Micro / library deployment (integration path).** Export the model as a C++ library from Edge Impulse (or hand-roll a TensorFlow Lite for Microcontrollers build) and link it into your own SSv5 + GSDK project. Choose this when you want the model **inside** your own application (e.g., reporting the predicted class over your own BLE GATT service, driving the RGB LEDs, sleeping between inferences).

> **DEPRECATED repo warning.** If you go the pure-TFLM route, **do NOT use [`SiliconLabs/tflite-micro-efr32-examples`](https://github.com/SiliconLabs/tflite-micro-efr32-examples) — it is deprecated.** Use the current Silicon Labs **"Machine Learning Applications"** material under the **[SiliconLabsSoftware](https://github.com/SiliconLabsSoftware)** GitHub org, or the **AI/ML extension** for the Simplicity SDK, instead. The old examples repo is referenced in [§07.10](../07-development-toolchain.md#10-open-source-firmware-apps-and-cloud) for completeness, but treat it as legacy.

> **Arduino is NOT a viable path.** The official Silicon Labs Arduino core targets **Series 2 / MGM240 only**; the EFR32MG12 (Series 1) is absent from its board list (see [§07.9](../07-development-toolchain.md#9-not-supported-the-official-silicon-labs-arduino-core)). Do not plan an Arduino-based ML workflow for this board — it will not target it.

**Repos to bookmark:**

- Edge Impulse firmware for this board: [`edgeimpulse/firmware-silabs-thunderboard-sense-2`](https://github.com/edgeimpulse/firmware-silabs-thunderboard-sense-2)
- Silicon Labs ML applications / AI-ML (current): [github.com/SiliconLabsSoftware](https://github.com/SiliconLabsSoftware)
- (Legacy, do not use) [`SiliconLabs/tflite-micro-efr32-examples`](https://github.com/SiliconLabs/tflite-micro-efr32-examples)

### Stretch goals / "ML taste" upgrades

Once the baseline KWS / audio-event classifier runs, these are the upgrades that turn a demo into something that demonstrates real embedded-ML judgment:

- **Multi-model on one device.** Run two small models (e.g., a cheap "wake" detector that gates a heavier classifier) to keep average inference time and energy down — a real-world pattern for latency-constrained edge ML.
- **Sensor fusion.** Combine audio with the **ICM-20648 IMU** (or environmental sensors) so the classifier uses multiple modalities — e.g., acoustic + vibration for predictive-maintenance, which is more robust than audio alone (see [Use Cases §3.7](../05-use-cases-applications.md#37-industrial--predictive-maintenance)).
- **Multiprotocol result reporting (Zigbee / Thread).** Report inference results not just over BLE but as a **Zigbee or OpenThread** attribute to a mesh hub — exercising the EFR32MG12's headline multiprotocol radio while showing the ML output landing in a real network (see [Use Cases Pattern B](../05-use-cases-applications.md#6-common-architecture-patterns)).
- **On-device latency benchmark write-up.** **Measure** real per-inference latency on this board at both **38.4 MHz and 40 MHz**, publish the numbers, and replace the extrapolated ~400–470 ms estimate with a measured figure. This is the single most valuable contribution you can make from building it (see open questions below).
- **On-device learning.** Experiment with on-device adaptation / incremental learning (e.g., a learned threshold or a lightweight on-device classifier update) — the most advanced upgrade, and a genuine "ML taste" signal because it pushes past static deploy-and-run inference.

### Open questions the research could not close

The research run could not verify the following on real hardware. Treat each as something you would **discover and contribute** by actually building the project — not as a settled fact:

- **Real KWS inference latency on the EFR32MG12.** The ~400–470 ms-at-38.4 MHz figure is an **extrapolation**, not a measured benchmark on this board. The actual per-inference time at both 38.4 MHz and the full 40 MHz core clock is unknown and should be measured.
- **The exact magnitude of the "~2x slower than xG24" gap.** That the MG12 is meaningfully slower than an MVP-accelerated xG24 is well-grounded; the precise multiplier for a *specific* KWS model on *this* board was not measured.
- **True end-to-end RAM headroom with the audio buffer included.** Edge Impulse's reported RAM excludes the ~16 KB audio buffer; the real peak working-set under continuous inference + BLE reporting was not measured.
- **Maximum sustainable audio sampling/inference duty cycle on a CR2032** (for the limited untethered-sensing case, given LEDs/CCS811 are off on coin-cell power) was not characterized — profile it with the AEM (see [Power & AEM](../04-pinout-power-connectors.md)).
- **Current-canonical Silicon Labs TFLM/AI-ML repo and example coverage for EFR32MG12.** Silicon Labs repo and SDK branding shifts over time (GSDK -> Simplicity SDK; the deprecated examples repo -> SiliconLabsSoftware "ML applications" / AI-ML extension). Confirm the live canonical repo and verify it still carries a Series-1 / EFR32MG12 example before relying on it (see the "verify before you cite" note in [§07.10](../07-development-toolchain.md#10-open-source-firmware-apps-and-cloud)).

---

## Sibling documents

- [Documentation hub (README)](../README.md)
- [01 — Overview](../01-overview.md)
- [02 — Hardware: SoC & Radio](../02-hardware-soc-radio.md)
- [03 — Sensors & Peripherals](../03-sensors-and-peripherals.md)
- [04 — Pinout, Power & Connectors](../04-pinout-power-connectors.md)
- [05 — Use Cases & Applications](../05-use-cases-applications.md)
- [06 — Getting Started](../06-getting-started.md)
- [07 — Development Toolchain](../07-development-toolchain.md) — **the natural companion to this chapter**: how to write, build, flash, and debug the firmware that runs your model.
- [08 — References & Glossary](../08-references-glossary.md)

---

### Sources

- Edge Impulse — [Thunderboard Sense 2 hardware support](https://docs.edgeimpulse.com/hardware/boards/silabs-thunderboard-sense-2) (officially supported target; data -> train -> deploy loop).
- Edge Impulse — [`edgeimpulse/firmware-silabs-thunderboard-sense-2`](https://github.com/edgeimpulse/firmware-silabs-thunderboard-sense-2) (prebuilt open-source firmware, BLE control characteristic).
- Hackster.io — community project (gatoninja236) on the Thunderboard Sense 2 reporting ~98.8% IMU gesture-recognition accuracy.
- Edge Impulse expert network — "Posture Detection for Worker Safety" project on the Thunderboard Sense 2 reporting ~87% posture-classification accuracy (single-project data point).
- Edge Impulse — [documentation home](https://docs.edgeimpulse.com/) (CLI: `edge-impulse-daemon`, `edge-impulse-data-forwarder`, `edge-impulse-run-impulse`; EON Tuner; C++ SDK export).
- Silicon Labs — [Machine Learning applications / AI-ML (current org)](https://github.com/SiliconLabsSoftware) (replacement for the deprecated `SiliconLabs/tflite-micro-efr32-examples` repo).
- Silicon Labs — *UG309: SLTB004A Thunderboard Sense 2 User's Guide* and the [EFR32MG12 Series 1 SoC family](https://www.silabs.com/wireless/zigbee/efr32mg12-series-1-socs) (bare `EFR32MG12P332F1024GL125`: Cortex-M4F, 1024 kB flash / 256 kB RAM, no MVP/NPU — accelerator is Series-2 / xG24 only).

*All load-bearing claims in this guide were adversarially verified (3-vote) in the deep-research run; the ~400–470 ms KWS latency figure is explicitly flagged throughout as an extrapolation from 80 MHz reference timings, not a measured result on this board.*

*Last updated: 2026-06-06*
