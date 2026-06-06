#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# check-tooling.sh - Aegis Edge (CRAWL) host toolchain sanity check
# ----------------------------------------------------------------------------
# Read-only, idempotent. Verifies the host has the tools needed to capture
# data, build, flash, and benchmark the Thunderboard Sense 2 (BRD4166A,
# EFR32MG12) Edge Impulse gesture recognizer.
#
# Checks:
#   - node    : present, major >= 22 (Node 22 LTS is the verified target).
#               WARN if 16-21, FAIL if < 16.
#   - npm     : present.
#   - edge-impulse-daemon : on PATH, prints --version.
#   - python3 : present (needed by serial-bench-parse.py).
#
# Exit code: 0 if no FAILs (WARNs allowed), 1 if any FAIL.
#
# Usage:
#   ./scripts/check-tooling.sh
#
# Notes (verified context):
#   - macOS additionally needs Xcode Command Line Tools (node-gyp builds the
#     serial native module); missing CLT -> gyp errors during `npm install -g
#     edge-impulse-cli`. This script flags it as INFO on Darwin.
#   - Linux additionally needs `screen` (sudo apt install screen) for some
#     serial workflows; flagged as INFO on Linux.
# ============================================================================

# --- output helpers ---------------------------------------------------------
fail_count=0
warn_count=0

pass() { printf '  [PASS] %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1"; warn_count=$((warn_count + 1)); }
fail() { printf '  [FAIL] %s\n' "$1"; fail_count=$((fail_count + 1)); }
info() { printf '  [INFO] %s\n' "$1"; }

# Extract the leading integer of a version string (e.g. "v22.3.0" -> 22).
major_of() {
  # strip leading non-digits, then take chars up to the first dot
  local v="$1"
  v="${v#v}"
  v="${v%%.*}"
  printf '%s' "$v"
}

printf '== Aegis Edge tooling check ==\n\n'

# --- node --------------------------------------------------------------------
printf 'node:\n'
if command -v node >/dev/null 2>&1; then
  node_raw="$(node --version 2>/dev/null || echo 'unknown')"
  node_major="$(major_of "$node_raw")"
  if [[ "$node_major" =~ ^[0-9]+$ ]]; then
    if [[ "$node_major" -ge 22 ]]; then
      pass "node ${node_raw} (>= 22 LTS, target)"
    elif [[ "$node_major" -ge 16 ]]; then
      warn "node ${node_raw} detected; Aegis Edge targets Node 22 LTS. Upgrade recommended (edge-impulse-cli is validated on 22)."
    else
      fail "node ${node_raw} is too old (< 16). Install Node 22 LTS."
    fi
  else
    warn "node present but version unparseable ('${node_raw}'). Verify it is 22 LTS."
  fi
else
  fail "node not found on PATH. Install Node 22 LTS (https://nodejs.org)."
fi

# --- npm ---------------------------------------------------------------------
printf 'npm:\n'
if command -v npm >/dev/null 2>&1; then
  npm_raw="$(npm --version 2>/dev/null || echo 'unknown')"
  pass "npm ${npm_raw}"
else
  fail "npm not found on PATH (normally ships with Node)."
fi

# --- edge-impulse-daemon -----------------------------------------------------
printf 'edge-impulse-cli (daemon):\n'
if command -v edge-impulse-daemon >/dev/null 2>&1; then
  ei_raw="$(edge-impulse-daemon --version 2>/dev/null || echo 'unknown')"
  pass "edge-impulse-daemon ${ei_raw}"
  info "Sibling tools expected: edge-impulse-data-forwarder, edge-impulse-run-impulse, edge-impulse-uploader."
else
  fail "edge-impulse-daemon not found. Install: npm install -g edge-impulse-cli"
fi

# --- python3 -----------------------------------------------------------------
printf 'python3:\n'
if command -v python3 >/dev/null 2>&1; then
  py_raw="$(python3 --version 2>&1 || echo 'unknown')"
  pass "${py_raw} (used by scripts/serial-bench-parse.py)"
else
  fail "python3 not found. Required to run the benchmark log parser."
fi

# --- platform-specific INFO --------------------------------------------------
printf 'platform:\n'
uname_s="$(uname -s 2>/dev/null || echo unknown)"
case "$uname_s" in
  Darwin)
    if xcode-select -p >/dev/null 2>&1; then
      pass "Xcode Command Line Tools present (node-gyp can build native serial module)."
    else
      warn "Xcode Command Line Tools NOT detected. 'npm install -g edge-impulse-cli' may hit gyp errors. Install: xcode-select --install"
    fi
    info "Serial baud for the board is 115200. Drive enumerates as TB004 over USB MSD."
    ;;
  Linux)
    if command -v screen >/dev/null 2>&1; then
      pass "screen present (serial terminal fallback available)."
    else
      info "screen not found. Some serial workflows want it: sudo apt install screen"
    fi
    info "Serial baud for the board is 115200. Drive enumerates as TB004 over USB MSD."
    ;;
  *)
    info "Platform '${uname_s}': no platform-specific checks. Serial baud 115200; drive enumerates as TB004."
    ;;
esac

# --- summary -----------------------------------------------------------------
printf '\n== Summary ==\n'
printf '  WARN: %d   FAIL: %d\n' "$warn_count" "$fail_count"
if [[ "$fail_count" -gt 0 ]]; then
  printf '  RESULT: FAIL - resolve the [FAIL] items above before proceeding.\n'
  exit 1
elif [[ "$warn_count" -gt 0 ]]; then
  printf '  RESULT: PASS (with warnings) - review [WARN] items.\n'
  exit 0
else
  printf '  RESULT: PASS - host toolchain ready.\n'
  exit 0
fi
