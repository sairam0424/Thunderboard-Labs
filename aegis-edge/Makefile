# Aegis Edge - dev tasks
# ---------------------------------------------------------------------------
# Convenience wrappers for the host-side workflows that DO run in this repo
# (the C++ firmware is built in Simplicity Studio 5, not here; the Web
# Bluetooth dashboard is served for manual testing in Chrome/Edge).
#
# Run `make` or `make help` for the target list. Recipes are tab-indented.
# ---------------------------------------------------------------------------

# Resolve this Makefile's own directory so targets work regardless of CWD.
ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: help check test lint serve-dashboard

# Default target: list what is available.
help:
	@echo "Aegis Edge - make targets:"
	@echo "  make check           Run host toolchain sanity check (scripts/check-tooling.sh)"
	@echo "  make test            Run the Python test suite (pytest)"
	@echo "  make lint            Lint shell scripts (shellcheck) + Python (ruff/flake8) if present"
	@echo "  make serve-dashboard Serve the Web Bluetooth dashboard at http://localhost:8000"
	@echo "  make help            Show this help (default)"

# Host toolchain sanity check (node / npm / edge-impulse-cli / python3).
check:
	@bash "$(ROOT)scripts/check-tooling.sh"

# Run the parser tests. Invoked from the repo dir so the tests' importlib path
# (scripts/serial-bench-parse.py) resolves; the tests also anchor off their own
# location, so this is belt-and-suspenders.
test:
	@cd "$(ROOT)" && python3 -m pytest scripts/tests -v

# Lint: shellcheck the scripts, then ruff (preferred) or flake8 if installed.
# Each tool is skipped with a notice if not on PATH, so `make lint` never fails
# just because an optional linter is absent.
lint:
	@if command -v shellcheck >/dev/null 2>&1; then \
		echo "== shellcheck =="; \
		shellcheck --shell=bash "$(ROOT)"scripts/*.sh; \
	else \
		echo "shellcheck not installed - skipping (brew install shellcheck)"; \
	fi
	@if command -v ruff >/dev/null 2>&1; then \
		echo "== ruff =="; \
		ruff check "$(ROOT)scripts"; \
	elif command -v flake8 >/dev/null 2>&1; then \
		echo "== flake8 =="; \
		flake8 "$(ROOT)scripts"; \
	else \
		echo "no Python linter (ruff/flake8) installed - skipping"; \
	fi

# Serve the dashboard for manual testing. Web Bluetooth requires https OR
# localhost + a Chromium browser (Chrome/Edge), so a localhost static server
# is sufficient. Open http://localhost:8000 in Chrome/Edge.
serve-dashboard:
	@cd "$(ROOT)dashboard" && python3 -m http.server 8000
