# Script tests

Pytest coverage for the host-side helper scripts. Run from the `aegis-edge/`
directory with `python3 -m pytest scripts/tests -v` (or `make test` from the
same directory). The suite needs only `pytest` (`pip install pytest`) plus the
standard library. `test_serial_bench_parse.py` loads
`scripts/serial-bench-parse.py` by absolute file path via `importlib` (the
filename's hyphen blocks a normal `import`) and exercises the `--continuous`
log parser end to end: the happy path (a multi-sample log parses into the
expected DSP / Classification / Anomaly triples with correct count, min, max,
and mean, plus the derived Total column and decimal timings), and the
no-matches path (empty and non-matching input yield an empty result, and
`main()` returns exit code 1 with the "No timing triples found" guidance on
stderr). These tests run in CI under Python 3.12; they do not require the
board, the Edge Impulse CLI, or any network access.
