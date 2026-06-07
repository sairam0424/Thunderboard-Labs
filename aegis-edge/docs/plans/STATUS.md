# Aegis Edge — Live Status

A quick, scannable status of the phased build. Legend:
✅ done · 🟡 in progress / ready for you · ⬜ not started · 🔒 blocked (waiting on a prior step)

## Phase status

| Phase | What | Status |
|-------|------|--------|
| **Scaffold** | Workspace, runbooks, scripts, templates | ✅ done |
| **Software layer** | Option-B C++ firmware, Web Bluetooth dashboard, CI + tests | ✅ done (C++ not compiled here — needs SSv5) |
| **Crawl** | On-device IMU gesture recognizer | 🟢 C0-C4 DONE on hardware (model runs on-device, ~87.5 ms/inf measured); C5 BLE demo remaining |
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

## What is blocked on physical hardware (yours)

- ⬜ Install Edge Impulse CLI + flash firmware (C0)
- ⬜ Physically perform + record gestures (C1)
- ⬜ Click Train in EI Studio (C2)
- ⬜ Deploy + measure real on-device latency (C3-C4)
- ⬜ Point a phone / open the dashboard for the offline BLE demo (C5)
- ⬜ Film the 60-90 s demo video

## Next concrete action

Open [`../../runbooks/C0-setup.md`](../../runbooks/C0-setup.md) and run the C0 steps on
the board. The provisional detailed Walk plan
([`03-walk-detailed.md`](./03-walk-detailed.md)) is written and ready; its latency
targets get finalized once Crawl **C4** measures the real 38.4 MHz number.

_Last updated: 2026-06-06._
