# Aegis Edge — START HERE

> **Status (2026-06-08): Crawl C0-C4 are DONE on this hardware.** The 85% gesture model
> runs on-device and latency is **measured: ~87.5 ms total / ~86 ms DSP @38.4 MHz** (see
> [`benchmark/BENCHMARK.md`](./benchmark/BENCHMARK.md)). The checklist below remains the
> turn-key path to **reproduce** C0-C4 from scratch; only **C5** (the optional offline BLE
> phone demo) is still open. C4's acceptance bar is already met.

You have the **Thunderboard Sense 2** in hand and want to build the Crawl phase: an
on-device IMU gesture recognizer that runs on the board, lights its LEDs by gesture, and
streams results to a phone over Bluetooth — **no cloud, no Wi-Fi**.

This is the one-page checklist. Each step links to its full runbook. Every parameter is
pre-filled and primary-source-verified; you supply the hardware actions.

> **Power note:** run everything on **USB** (not the CR2032 coin cell) — the coin cell
> disables the RGB LEDs and the air-quality sensor.

---

## Before you start (2 min)

```bash
cd aegis-edge
./scripts/check-tooling.sh        # must reach all-PASS before C0 is "done"
```
It will FAIL on `edge-impulse-cli` until you install it — that is literally step C0.

You will also need: a free **Edge Impulse** account, the **Simplicity Connect** app on
your phone (or use the `dashboard/` in Chrome), and a data-capable micro-USB cable.

---

## The 6 milestones (each has a binary "done" test)

| # | Do | Done when | Runbook |
|---|----|-----------|---------|
| **C0** | Install `edge-impulse-cli`, flash the EI firmware to the `TB004` drive, run `edge-impulse-daemon` | Board shows under your EI project's **Devices** tab | [`runbooks/C0-setup.md`](./runbooks/C0-setup.md) |
| **C1** | In Studio, record gestures: `circle / zigzag / updown / leftright / none` @ 62.5 Hz, 10 s samples (8 each + 4 none) | >=5 classes, balanced `none`, 80/20 split visible | [`runbooks/C1-data-collection.md`](./runbooks/C1-data-collection.md) |
| **C2** | Build the impulse (2000 ms window -> Spectral Analysis -> small Keras NN, int8 + anomaly) and click **Train** | >=95% on the held-out test set, no class < ~90% | [`runbooks/C2-train.md`](./runbooks/C2-train.md) |
| **C3** | Deploy: build the Thunderboard `.bin`, drag it onto `TB004` | `edge-impulse-run-impulse --continuous` streams correct labels | [`runbooks/C3-deploy.md`](./runbooks/C3-deploy.md) |
| **C4** | Capture the on-device latency from `--continuous` | A real DSP+classify-ms log saved to `benchmark/BENCHMARK.md` | [`runbooks/C4-verify-benchmark.md`](./runbooks/C4-verify-benchmark.md) |
| **C5** | Connect a phone (airplane mode) or the dashboard over BLE; write `0x01` to start | Live gesture + confidence shown offline | [`runbooks/C5-ble-demo.md`](./runbooks/C5-ble-demo.md) |

Flashing trouble (`FAIL.TXT`)? -> [`runbooks/FLASHING.md`](./runbooks/FLASHING.md) (3 paths).

**Hit a snag (dongle, drive won't mount, daemon won't quit, login fails)?** ->
[`field-guide/troubleshooting.md`](./field-guide/troubleshooting.md) is the as-built error
catalog — every problem from a real bring-up with its exact fix. The full lived walkthrough
(real values + observed outputs) is in [`field-guide/`](./field-guide/README.md).

---

## The one number that matters most

**C4's measured 38.4 MHz latency.** No published source has it for this board — measuring
it is the headline deliverable, *and* it is the gate that finalizes the (currently
provisional) Walk and Run plans. When you have it, paste it into
[`benchmark/BENCHMARK.md`](./benchmark/BENCHMARK.md).

---

## What you produce (the portfolio)

1. **Working on-device demo** — gesture -> LED -> phone/dashboard over BLE, internet off.
2. **Real latency benchmark** — measured vs. the 80 MHz reference (`benchmark/BENCHMARK.md`).
3. **A 60-90 s demo video** — shot list in [`demo/SHOT-LIST.md`](./demo/SHOT-LIST.md).

Drop your exported Edge Impulse project into [`edge-impulse/`](./edge-impulse/) so the
repo reproduces end to end.

---

## Where to read more

- **Why these exact settings:** [`docs/plans/01-implementation-plan.md`](./docs/plans/01-implementation-plan.md)
- **What comes after Crawl:** [`docs/plans/02-next-phases.md`](./docs/plans/02-next-phases.md) (Walk + Run)
- **Live status board:** [`docs/plans/STATUS.md`](./docs/plans/STATUS.md)
- **The board itself:** [`../docs/thunderboard-sense-2/README.md`](../docs/thunderboard-sense-2/README.md)

When C4 is done, ping to finalize the Walk plan with your real latency number.
