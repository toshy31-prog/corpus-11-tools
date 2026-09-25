.DEFAULT_GOAL := verify

PYTHON ?= python3
VENV := .venv
VENV_PYTHON := $(VENV)/bin/python
BWRAP ?= bwrap
# Local fixtures only: no Internet, no installation, workspace mounted read-only.
PROJECT_TEST_ISOLATION = $(BWRAP) --unshare-net --die-with-parent --ro-bind / / --dev /dev --proc /proc --tmpfs /tmp --setenv PYTHONDONTWRITEBYTECODE 1
MUBI_OFFLINE_TESTS = $(patsubst projets/mubi-film-scout/%,%,$(wildcard projets/mubi-film-scout/lib/*.test.mjs projets/mubi-film-scout/public/*.test.mjs projets/mubi-film-scout/scripts/*.test.mjs))
YOUTUBE_HTTP_TESTS = tests/google-oauth-http.test.mjs tests/evolution-server.test.mjs tests/ephemeral-server.test.mjs tests/multi-participant-http.test.mjs
YOUTUBE_OFFLINE_TESTS = $(filter-out $(YOUTUBE_HTTP_TESTS),$(patsubst projets/youtube-scout/%,%,$(wildcard projets/youtube-scout/lib/*.test.mjs projets/youtube-scout/public/*.test.mjs projets/youtube-scout/tests/*.test.mjs)))
CORPUS_LOCAL_JS_TESTS = $(wildcard projets/corpus-local-llm-migration/test_*.cjs projets/corpus-local-llm-migration/test_*.mjs)

.PHONY: help bootstrap verify check-structure test-python test-node test-projects test-projects-offline test-corpus-local-python test-corpus-local-node-full test-scouts-offline test-projects-http test-maintenance test-research test-cct clean-venv

## Display validation commands without running checks or installing dependencies.
help:
	@printf '%s\n' \
	  'Corpus — validations locales' \
	  '' \
	  'Sans installation de dépendances :' \
	  '  make test-maintenance  Tests des scripts de maintenance (Python système).' \
	  '  make test-projects     Corpus local + Scouts hors Internet, puis HTTP MUBI isolé.' \
	  '  make test-projects-offline  Tests rapides sans Internet ni serveur applicatif.' \
	  '  make test-corpus-local-python  Tests Python Corpus local sous isolation.' \
	  '  make test-corpus-local-node-full  Suite Node Corpus local complète (diagnostic séparé).' \
	  '  make test-scouts-offline  MUBI et YouTube, sous-ensembles sans serveur.' \
	  '  make test-projects-http  Tests HTTP MUBI dans un réseau isolé.' \
	  '  Ces cibles exigent Bubblewrap, Python et Node.js déjà installés.' \
	  '  make test-node         Tests Node du plugin et des recherches.' \
	  '  make test-research     Contrôles déclarés du portefeuille de recherche.' \
	  '  make test-cct          Tests du moteur CCT.' \
	  '  make check-structure   Contrôles du plugin et du dépôt ; dépendances requises.' \
	  '' \
	  'Avec création de .venv et installation des dépendances verrouillées :' \
	  '  make bootstrap        Préparer uniquement cet environnement.' \
	  '  make test-python      Préparer puis exécuter les tests Python.' \
	  '  make verify           Validation complète ; cible par défaut de make.' \
	  '' \
	  'Recherche ciblée (remplacer ID par un identifiant du portefeuille) :' \
	  '  python3 research/scripts/portfolio_cycle.py --check --project ID' \
	  '  Ajouter --run-safe-checks pour exécuter ses contrôles déclarés.' \
	  '  Répéter --project pour plusieurs laboratoires.' \
	  '' \
	  'Nettoyage : make clean-venv supprime uniquement le dossier .venv.'

## Create the hash-pinned Python validation environment.
bootstrap:
	$(PYTHON) -m venv $(VENV)
	$(VENV_PYTHON) -m pip install --disable-pip-version-check --require-hashes --only-binary=:all: -r corpus-11-tools/tools/requirements-bootstrap.txt
	$(VENV_PYTHON) -m pip install --disable-pip-version-check --require-hashes --only-binary=:all: -r corpus-11-tools/tools/requirements-validation.txt

## Run every local validation that does not require a paid live Codex call.
verify: bootstrap check-structure test-python test-node test-projects test-research test-cct

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

## Preserve MUBI's HTTP coverage and include the audited Corpus/Scout suites.
## No application service or model is launched; HTTP tests use temporary fixtures.
test-projects: test-projects-offline test-projects-http

test-projects-offline: test-corpus-local-python test-scouts-offline

test-corpus-local-node-full:
	$(PROJECT_TEST_ISOLATION) --chdir "$(CURDIR)" node --test $(CORPUS_LOCAL_JS_TESTS)

test-corpus-local-python:
	$(PROJECT_TEST_ISOLATION) --chdir "$(CURDIR)" $(PYTHON) -m unittest discover -s projets/corpus-local-llm-migration -p 'test_*.py'

test-scouts-offline:
	$(PROJECT_TEST_ISOLATION) --chdir "$(CURDIR)/projets/mubi-film-scout" node --test $(MUBI_OFFLINE_TESTS)
	$(PROJECT_TEST_ISOLATION) --chdir "$(CURDIR)/projets/youtube-scout" node --test $(YOUTUBE_OFFLINE_TESTS)

test-projects-http:
	$(PROJECT_TEST_ISOLATION) --chdir "$(CURDIR)/projets/mubi-film-scout" node --test server.test.mjs

test-maintenance:
	$(PYTHON) -W error::ResourceWarning -m unittest discover -s scripts -p 'test_*.py'

test-research:
	$(PYTHON) research/scripts/portfolio_cycle.py --check --run-safe-checks

test-cct:
	PYTHONPATH=corpus-11-tools/labs/python $(PYTHON) research/active/cct/executable/run_all.py

clean-venv:
	rm -rf -- $(VENV)
