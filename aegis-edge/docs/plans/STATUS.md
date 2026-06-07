# Aegis Edge — Live Status

A quick, scannable status of the phased build. Legend:
✅ done · 🟡 in progress / ready for you · ⬜ not started · 🔒 blocked (waiting on a prior step)

## Phase status

| Phase | What | Status |
|-------|------|--------|
| **Scaffold** | Workspace, runbooks, scripts, templates | ✅ done |
| **Software layer** | Option-B C++ firmware, Web Bluetooth dashboard, CI + tests | ✅ done (C++ not compiled here — needs SSv5) |
| **Crawl** | On-device IMU gesture recognizer | ✅ C0-C4 DONE on hardware (model runs on-device, ~87.5 ms/inf measured); only C5 BLE demo remaining (optional) |
| **Walk** | On-device keyword spotting (mic) | 🟡 detailed plan written; **now has the real C4 latency anchor (~86 ms DSP @38.4 MHz)** to finalize against |
| **Run** | Multi-sensor fusion "Smart Guardian" | 🟡 detailed plan written (PROVISIONAL); needs Option-B build + C4/W4 |

## Crawl milestones (the active phase)

| # | Milestone | Owner | Status |
|---|-----------|-------|--------|
| C0 | Tooling + EI firmware flashed | [HUMAN] | ✅ done (board green/online) |
| C1 | Labeled gesture dataset collected | [HUMAN] | ✅ done (36 samples, 5 classes, 75/25) |
| C2 | Impulse designed + trained | [HUMAN] | ✅ done (85% test acc + anomaly) |
| C3 | Deploy back to board (Option A) | [HUMAN] | ✅ done (live predictions verified on-device) |
| C4 | On-device verification + **latency capture** | [HUMAN] | ✅ done — **~87.5 ms total / ~86 ms DSP @38.4 MHz measured** |
| C5 | BLE result streaming, offline demo | [HUMAN] | 🟡 next (model is on the board; just connect a phone) |

## What is done (AI-scaffolded, verified)

- ✅ Full `aegis-edge/` workspace + git monorepo (Git Flow, kept feature branches)
- ✅ Runbooks C0-C5 + FLASHING (turn-key, verified params + BLE UUIDs)
- ✅ `scripts/check-tooling.sh` + `serial-bench-parse.py` (12 pytest tests pass)
- ✅ `firmware-option-b/src/` C++ integration (Run-phase foundation; NOT compiled here)
- ✅ `dashboard/` Web Bluetooth UI (runnable in Chrome; untested vs live board)
- ✅ CI (`.github/workflows/ci.yml`), `Makefile`, benchmark + demo templates
- ✅ This plan, captured at `aegis-edge/docs/plans/`
- ✅ Crawl proven on the metal: 85% model streaming live predictions on-device,
  ~87.5 ms/inf measured (~86 ms DSP), FFT-16 software-fallback finding documented
- ✅ Demo assets captured under `aegis-edge/demo/` — 5 EI Studio screenshots
  (`screenshots/`, headline `ei-03-classifier-85pct-confusion-matrix`) + 3 video
  stills (`frames/`); recorded videos exist locally (gitignored)

## Done on physical hardware (yours) — Crawl

- ✅ Installed Edge Impulse CLI + flashed firmware (C0 — board green/online)
- ✅ Physically performed + recorded gestures (C1 — 36 samples, 5 classes, 75/25)
- ✅ Trained in EI Studio (C2 — 85% test acc, ROC 0.98, + K-means anomaly)
- ✅ Deployed + measured real on-device latency (C3-C4 — live predictions verified;
  ~87.5 ms total / ~86 ms DSP @38.4 MHz). EON Tuner run too (best candidate 22% << 85%,
  so kept the hand-tuned 85% model).

## Still remaining (optional polish)

- 🟡 Point a phone / open the dashboard for the offline BLE demo (C5)
- 🟡 Film the demo video (recorded; assets in `aegis-edge/demo/` — screenshots/ + frames/)

## Next concrete action

Crawl C0-C4 are DONE and verified on-device — the model streams live predictions and
latency is measured. The only Crawl item left is **C5**, the offline BLE phone demo
([`../../runbooks/C5-ble-demo.md`](../../runbooks/C5-ble-demo.md)), and it is optional
polish (the model is already on the board; just connect a phone). Beyond that, the
detailed Walk plan ([`03-walk-detailed.md`](./03-walk-detailed.md)) is written and now
has its real latency anchor — Crawl **C4** measured ~86 ms DSP @38.4 MHz — to finalize
its targets against.

_Last updated: 2026-06-08._
