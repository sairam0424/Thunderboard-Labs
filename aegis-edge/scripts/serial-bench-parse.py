#!/usr/bin/env python3
"""Parse an Edge Impulse run-impulse log and emit a Markdown benchmark table.

Reads the stdout of ``edge-impulse-run-impulse --continuous`` (from a file
argument or stdin), extracts every timing triple of the form::

    Predictions (DSP: 18 ms., Classification: 1 ms., Anomaly: 0 ms.):

computes count / min / max / mean for DSP, Classification, Anomaly, and the
derived Total (DSP + Classification + Anomaly), and prints a Markdown table
ready to paste into ../benchmark/BENCHMARK.md.

No third-party dependencies (stdlib only).

Usage:
    # from a captured log file
    python3 scripts/serial-bench-parse.py run.log

    # from a live pipe (stop the daemon first - single serial port!)
    edge-impulse-run-impulse --continuous | python3 scripts/serial-bench-parse.py

    # explicit stdin
    python3 scripts/serial-bench-parse.py -

Note:
    The board runs at 38.4 MHz by default (40 MHz max). The measured numbers
    here are the headline benchmark deliverable - the published Edge Impulse
    reference is captured at a higher clock and is NOT comparable 1:1. Record
    the clock alongside the numbers in BENCHMARK.md.
"""

import argparse
import re
import sys

# Matches "DSP: 18 ms" / "Classification: 1 ms." / "Anomaly: 0 ms" with
# optional decimals and flexible spacing/punctuation. Case-insensitive.
_TRIPLE_RE = re.compile(
    r"DSP:\s*([\d.]+)\s*ms\.?"           # DSP milliseconds
    r".*?Classification:\s*([\d.]+)\s*ms\.?"  # Classification milliseconds
    r".*?Anomaly:\s*([\d.]+)\s*ms\.?",   # Anomaly milliseconds
    re.IGNORECASE | re.DOTALL,
)


def parse_triples(text):
    """Return a list of (dsp, classification, anomaly) float triples."""
    triples = []
    for match in _TRIPLE_RE.finditer(text):
        try:
            dsp = float(match.group(1))
            classification = float(match.group(2))
            anomaly = float(match.group(3))
        except (TypeError, ValueError):
            continue
        triples.append((dsp, classification, anomaly))
    return triples


def summarize(values):
    """Return (count, minimum, maximum, mean) for a list of floats."""
    count = len(values)
    if count == 0:
        return (0, 0.0, 0.0, 0.0)
    return (count, min(values), max(values), sum(values) / count)


def render_markdown(triples):
    """Render the count/min/max/mean Markdown table for a list of triples."""
    dsp_vals = [t[0] for t in triples]
    clf_vals = [t[1] for t in triples]
    ano_vals = [t[2] for t in triples]
    tot_vals = [t[0] + t[1] + t[2] for t in triples]

    rows = [
        ("DSP", summarize(dsp_vals)),
        ("Classification", summarize(clf_vals)),
        ("Anomaly", summarize(ano_vals)),
        ("Total", summarize(tot_vals)),
    ]

    lines = []
    lines.append(f"Parsed {len(triples)} inference sample(s).")
    lines.append("")
    lines.append("| Stage          | Count | Min (ms) | Max (ms) | Mean (ms) |")
    lines.append("|----------------|-------|----------|----------|-----------|")
    for label, (count, lo, hi, mean) in rows:
        lines.append(
            f"| {label:<14} | {count:>5} | {lo:>8.2f} | {hi:>8.2f} | {mean:>9.2f} |"
        )

    # Derived inferences/sec from mean total, when available.
    _, _, _, mean_total = summarize(tot_vals)
    if mean_total > 0:
        lines.append("")
        lines.append(
            f"Mean total {mean_total:.2f} ms -> ~{1000.0 / mean_total:.1f} inferences/sec "
            "(continuous-mode wall time may differ; confirm-on-device)."
        )
    return "\n".join(lines)


def read_input(path):
    """Read text from a file path, or from stdin when path is None or '-'."""
    if path is None or path == "-":
        return sys.stdin.read()
    with open(path, "r", encoding="utf-8", errors="replace") as handle:
        return handle.read()


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Parse an edge-impulse-run-impulse --continuous log and print a "
            "Markdown timing table (DSP / Classification / Anomaly / Total)."
        )
    )
    parser.add_argument(
        "logfile",
        nargs="?",
        default=None,
        help="Path to a captured log file. Omit or use '-' to read stdin.",
    )
    args = parser.parse_args(argv)

    text = read_input(args.logfile)
    triples = parse_triples(text)

    if not triples:
        print(
            "No timing triples found. Expected lines like:\n"
            "  Predictions (DSP: 18 ms., Classification: 1 ms., Anomaly: 0 ms.):\n"
            "Check that the log came from 'edge-impulse-run-impulse --continuous'\n"
            "and that the daemon was stopped first (single serial port).",
            file=sys.stderr,
        )
        return 1

    print(render_markdown(triples))
    return 0


if __name__ == "__main__":
    sys.exit(main())
