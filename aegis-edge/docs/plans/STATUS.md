# Aegis Edge — Live Status

A quick, scannable status of the phased build. Legend:
✅ done · 🟡 in progress / ready for you · ⬜ not started · 🔒 blocked (waiting on a prior step)

## Phase status

| Phase | What | Status |
|-------|------|--------|
| **Scaffold** | Workspace, runbooks, scripts, templates | ✅ done |
| **Software layer** | Option-B C++ firmware, Web Bluetooth dashboard, CI + tests | ✅ done (C++ not compiled here — needs SSv5) |
| **Crawl** | On-device IMU gesture recognizer | 🟡 ready for you (C0-C5 on hardware) |
| **Walk** | On-device keyword spotting (mic) | 🟡 detailed plan written (PROVISIONAL); finalized after Crawl C4 |
| **Run** | Multi-sensor fusion "Smart Guardian" | ⬜ outlined; needs Option-B build |

## Crawl milestones (the active phase)

| # | Milestone | Owner | Status |
|---|-----------|-------|--------|
| C0 | Tooling + EI firmware flashed | [HUMAN] | 🟡 ready (runbook done) |
| C1 | Labeled gesture dataset collected | [HUMAN] | 🔒 after C0 |
| C2 | Impulse designed + trained | [HUMAN] | 🔒 after C1 |
| C3 | Deploy back to board (Option A) | [HUMAN] | 🔒 after C2 |
| C4 | On-device verification + **latency capture** | [HUMAN] | 🔒 after C3 — **unlocks Walk planning** |
| C5 | BLE result streaming, offline demo | [HUMAN] | 🔒 after C3 |

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
