#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"
. "$RESEARCH/scripts/git_automation_guard.sh"

cd "$ROOT"

echo "=== CORPUS 11 PUBLISH ==="

corpus_require_clean_index
corpus_validate_pending_paths

python3 corpus-11-tools/research/scripts/validate_research_workspace.py
python3 corpus-11-tools/tools/validate_package.py
python3 corpus-11-tools/tools/check_graph.py
git diff --check

if [ -z "$(git status --porcelain)" ]; then
  echo "Rien à publier."
  exit 0
fi

echo "Diff à publier :"
git status --short
git diff --stat

DATE="$(date +%F)"

corpus_stage_allowlist

set +e
corpus_verify_staged_diff
status=$?
set -e
if [ "$status" -ne 0 ]; then
  if [ "$status" -eq 10 ]; then
    echo "Aucun changement admissible à commiter."
    exit 0
  fi
  exit "$status"
fi

# Re-read every Git state after staging and before committing.
if [ -n "$(git diff --name-only)" ] || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "ERROR: unstaged or untracked entries remain after allowlisted staging" >&2
  git status --short >&2
  exit 34
fi
corpus_validate_pending_paths
corpus_verify_staged_diff

if [ "${CORPUS_AUTOMATION_NO_COMMIT:-0}" = "1" ]; then
  echo "VALIDATED_NO_COMMIT"
  exit 0
fi

git commit -m "Research cycle ${DATE}"

if [ "${CORPUS_AUTOMATION_NO_PUSH:-0}" != "1" ]; then
  git push origin main
fi

echo "Publication terminée."
git status
