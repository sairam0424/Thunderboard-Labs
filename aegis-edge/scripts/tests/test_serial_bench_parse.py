"""Pytest suite for scripts/serial-bench-parse.py.

The script under test has a hyphen in its filename, so it cannot be imported
with a normal ``import`` statement. We load it by file path via importlib and
exercise its public functions:

    parse_triples(text)   -> list[(dsp, classification, anomaly)]
    summarize(values)     -> (count, min, max, mean)
    render_markdown(triples) -> str
    main(argv)            -> int  (0 ok, 1 when no triples matched)

Coverage:
    - Happy path: a representative --continuous log -> correct counts + means.
    - No-matches path: empty / non-matching input -> graceful empty result and
      a non-zero exit from main().
    - Decimal timings and the derived Total column.

Run from the aegis-edge/ directory:
    python -m pytest scripts/tests -v
"""

import importlib.util
import os

import pytest

# ---------------------------------------------------------------------------
# Load the hyphenated script as a module by absolute file path. This is robust
# to the test being invoked from any working directory (we anchor off this
# test file's own location, not the CWD).
# ---------------------------------------------------------------------------
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_SCRIPT_PATH = os.path.normpath(
    os.path.join(_THIS_DIR, "..", "serial-bench-parse.py")
)


def _load_module():
    spec = importlib.util.spec_from_file_location("serial_bench_parse", _SCRIPT_PATH)
    assert spec is not None and spec.loader is not None, (
        f"could not build import spec for {_SCRIPT_PATH}"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def sbp():
    """The serial-bench-parse module under test."""
    assert os.path.exists(_SCRIPT_PATH), f"script not found at {_SCRIPT_PATH}"
    return _load_module()


# ---------------------------------------------------------------------------
# Sample log fixtures.
# ---------------------------------------------------------------------------

# A realistic snippet of `edge-impulse-run-impulse --continuous` stdout.
# Three inference samples with known timings:
#   DSP:            18, 20, 16  -> count 3, min 16, max 20, mean 18.0
#   Classification:  1,  2,  3  -> count 3, min  1, max  3, mean  2.0
#   Anomaly:         0,  1,  2  -> count 3, min  0, max  2, mean  1.0
#   Total (sum):    19, 23, 21  -> count 3, min 19, max 23, mean 21.0
SAMPLE_LOG = """\
Inferencing settings:
  Interval: 16.00 ms.
Starting inferencing in 2 seconds...
Predictions (DSP: 18 ms., Classification: 1 ms., Anomaly: 0 ms.):
    circle: 0.953125
    none: 0.046875
Predictions (DSP: 20 ms., Classification: 2 ms., Anomaly: 1 ms.):
    zigzag: 0.882812
    none: 0.117188
Predictions (DSP: 16 ms., Classification: 3 ms., Anomaly: 2 ms.):
    none: 0.703125
"""

# A log with no timing triples at all (e.g. only banner / error text).
EMPTY_LOG = """\
Edge Impulse impulse runner
Daemon already running on this serial port.
No predictions emitted.
"""

# Decimal timings, single sample, to exercise float parsing + Total.
DECIMAL_LOG = (
    "Predictions (DSP: 18.5 ms., Classification: 1.25 ms., Anomaly: 0.0 ms.):\n"
)


# ---------------------------------------------------------------------------
# parse_triples / summarize - happy path.
# ---------------------------------------------------------------------------

def test_parse_triples_extracts_all_samples(sbp):
    triples = sbp.parse_triples(SAMPLE_LOG)
    assert triples == [
        (18.0, 1.0, 0.0),
        (20.0, 2.0, 1.0),
        (16.0, 3.0, 2.0),
    ]


def test_summarize_dsp_counts_and_mean(sbp):
    triples = sbp.parse_triples(SAMPLE_LOG)
    dsp = [t[0] for t in triples]
    count, lo, hi, mean = sbp.summarize(dsp)
    assert count == 3
    assert lo == 16.0
    assert hi == 20.0
    assert mean == pytest.approx(18.0)


def test_summarize_classification_and_anomaly(sbp):
    triples = sbp.parse_triples(SAMPLE_LOG)
    clf = sbp.summarize([t[1] for t in triples])
    ano = sbp.summarize([t[2] for t in triples])
    # Classification: 1, 2, 3
    assert clf == (3, 1.0, 3.0, pytest.approx(2.0))
    # Anomaly: 0, 1, 2
    assert ano == (3, 0.0, 2.0, pytest.approx(1.0))


def test_summarize_total_is_sum_of_stages(sbp):
    triples = sbp.parse_triples(SAMPLE_LOG)
    totals = [t[0] + t[1] + t[2] for t in triples]
    count, lo, hi, mean = sbp.summarize(totals)
    # Per-row totals: 18+1+0=19, 20+2+1=23, 16+3+2=21
    assert count == 3
    assert lo == 19.0
    assert hi == 23.0
    assert mean == pytest.approx(21.0)  # (19 + 23 + 21) / 3


def test_render_markdown_reports_sample_count_and_rows(sbp):
    triples = sbp.parse_triples(SAMPLE_LOG)
    md = sbp.render_markdown(triples)
    assert "Parsed 3 inference sample(s)." in md
    # Every stage row label should be present in the table.
    for label in ("DSP", "Classification", "Anomaly", "Total"):
        assert label in md
    # Derived inferences/sec line shows up when mean total > 0.
    assert "inferences/sec" in md


# ---------------------------------------------------------------------------
# Decimal parsing.
# ---------------------------------------------------------------------------

def test_parse_triples_handles_decimals(sbp):
    triples = sbp.parse_triples(DECIMAL_LOG)
    assert triples == [(18.5, 1.25, 0.0)]
    # Total mean for the single sample = 18.5 + 1.25 + 0.0 = 19.75
    total = sbp.summarize([t[0] + t[1] + t[2] for t in triples])
    assert total[0] == 1
    assert total[3] == pytest.approx(19.75)


# ---------------------------------------------------------------------------
# No-matches path.
# ---------------------------------------------------------------------------

def test_parse_triples_empty_string(sbp):
    assert sbp.parse_triples("") == []


def test_parse_triples_no_matching_lines(sbp):
    assert sbp.parse_triples(EMPTY_LOG) == []


def test_summarize_empty_is_all_zero(sbp):
    assert sbp.summarize([]) == (0, 0.0, 0.0, 0.0)


# ---------------------------------------------------------------------------
# main() exit codes (stdin path).
# ---------------------------------------------------------------------------

def test_main_returns_zero_on_happy_path(sbp, monkeypatch, capsys):
    import io

    monkeypatch.setattr("sys.stdin", io.StringIO(SAMPLE_LOG))
    # argv [] -> logfile defaults to None -> reads stdin.
    rc = sbp.main([])
    out = capsys.readouterr().out
    assert rc == 0
    assert "Parsed 3 inference sample(s)." in out


def test_main_returns_one_on_no_matches(sbp, monkeypatch, capsys):
    import io

    monkeypatch.setattr("sys.stdin", io.StringIO(EMPTY_LOG))
    rc = sbp.main([])
    captured = capsys.readouterr()
    assert rc == 1
    # The "no triples" guidance is written to stderr, not stdout.
    assert "No timing triples found" in captured.err


def test_main_reads_from_file_argument(sbp, tmp_path, capsys):
    log_file = tmp_path / "run.log"
    log_file.write_text(SAMPLE_LOG, encoding="utf-8")
    rc = sbp.main([str(log_file)])
    out = capsys.readouterr().out
    assert rc == 0
    assert "Parsed 3 inference sample(s)." in out
