#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"

cd "$ROOT"

python3 "$RESEARCH/scripts/validate_research_workspace.py"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"
git diff --check

if ! git diff --quiet -- "$RESEARCH/sources"; then
  echo "ERROR: protected sources changed"
  exit 20
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "NO_CHANGE"
  exit 0
fi

git add \
  corpus-11-tools/research/state \
  corpus-11-tools/research/hypotheses \
  corpus-11-tools/research/notes \
  corpus-11-tools/research/experiments \
  corpus-11-tools/research/reports

if git diff --cached --quiet; then
  echo "NO_ADMISSIBLE_CHANGE"
  exit 0
fi

git commit -m "Automated research cycle $(date +%F)"
git push origin main

echo "PUBLISHED"
