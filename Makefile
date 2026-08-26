.DEFAULT_GOAL := verify

PYTHON ?= python3
VENV := .venv
VENV_PYTHON := $(VENV)/bin/python

.PHONY: bootstrap verify check-structure test-python test-node test-research test-cct clean-venv

## Create the hash-pinned Python validation environment.
bootstrap:
	$(PYTHON) -m venv $(VENV)
	$(VENV_PYTHON) -m pip install --disable-pip-version-check --require-hashes --only-binary=:all: -r corpus-11-tools/tools/requirements-bootstrap.txt
	$(VENV_PYTHON) -m pip install --disable-pip-version-check --require-hashes --only-binary=:all: -r corpus-11-tools/tools/requirements-validation.txt

## Run every local validation that does not require a paid live Codex call.
verify: bootstrap check-structure test-python test-node test-research test-cct

check-structure:
	cd corpus-11-tools && \
		$(PYTHON) tools/check_ci_pinning.py && \
		$(PYTHON) tools/validate_package.py && \
		$(PYTHON) tools/check_graph.py && \
		$(PYTHON) tools/check_docs.py && \
		$(PYTHON) tools/check_boundaries.py && \
		$(PYTHON) tools/check_organism.py --self-test && \
		$(PYTHON) tools/check_release_content.py && \
		$(PYTHON) tools/check_conversational_surface.py && \
		$(PYTHON) tools/check_integrity.py && \
		$(PYTHON) tools/check_release_identity.py && \
		$(PYTHON) tools/check_evals.py && \
		$(PYTHON) tools/check_principle_registry.py && \
		$(PYTHON) tools/check_behavioral_surfaces.py && \
		$(PYTHON) tools/check_test_inventory.py --self-test && \
		$(PYTHON) tools/test_validation_guards.py
	$(PYTHON) corpus-11-tools/tools/check_tracked_json.py
	git diff --check origin/main...HEAD

test-python: bootstrap
	PYTHONPATH=corpus-11-tools/labs/python $(VENV_PYTHON) -m pytest -q --ignore-glob='research/active/*/tests/test_initial_protocol.py'

test-node:
	@tests="$$(find corpus-11-tools research -path '*/node_modules' -prune -o -type f \( -name '*.test.mjs' -o -name '*.test.js' -o -name 'test-*.mjs' -o -name 'test-*.js' \) -print)"; \
	[ -n "$$tests" ] || { echo 'FAIL: no Node test modules found' >&2; exit 1; }; \
	node --test $$tests

test-research:
	$(PYTHON) research/scripts/portfolio_cycle.py --check --run-safe-checks

test-cct:
	PYTHONPATH=corpus-11-tools/labs/python $(PYTHON) research/active/cct/executable/run_all.py

clean-venv:
	rm -rf -- $(VENV)
