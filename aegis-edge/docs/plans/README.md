# Aegis Edge — Plans

Planning documents for the Aegis Edge build. Start with the status board, then the
full plan, then the next-phase detail.

| Doc | What it is |
|-----|-----------|
| [`STATUS.md`](./STATUS.md) | Live, scannable status of every phase + Crawl milestone |
| [`01-implementation-plan.md`](./01-implementation-plan.md) | The approved implementation plan: Crawl in full (C0-C5), verified build parameters, risk register, portfolio deliverables |
| [`02-next-phases.md`](./02-next-phases.md) | Detailed Walk (W0-W4) + Run (R0-R4) milestone breakdowns — the phases after Crawl |

## How these relate to the rest of the repo

- **Conceptual "what + why":** [`../../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md`](../../../docs/thunderboard-sense-2/aegis-edge/aegis-edge-guide.md)
  (the evidence-based ML project guide in the reference doc set).
- **Executable "how":** the [`../../runbooks/`](../../runbooks/) (C0-C5 + FLASHING) — the
  turn-key on-hardware instructions.
- **These plans:** the milestone structure, acceptance criteria, risks, and phase
  sequencing that the runbooks execute against.

## Sequencing note

The plan is deliberately **Crawl-in-full, Walk/Run-outlined**. Walk gets finalized into
a `03-walk-detailed.md` only after Crawl milestone **C4** measures the real on-device
38.4 MHz latency — the empirical anchor that makes honest audio-model sizing possible.
