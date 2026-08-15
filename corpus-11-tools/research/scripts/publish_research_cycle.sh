#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo
echo "=== CORPUS 11 PUBLISH ==="
echo

if ! git diff --quiet -- corpus-11-tools/research/sources/; then
  echo "ERREUR: modification détectée dans research/sources/"
  exit 1
fi

python3 corpus-11-tools/research/scripts/validate_research_workspace.py
python3 corpus-11-tools/tools/validate_package.py
python3 corpus-11-tools/tools/check_graph.py
git diff --check

if [ -z "$(git status --porcelain)" ]; then
  echo "Rien à publier."
  exit 0
fi

echo
echo "Diff à publier :"
git status --short
git diff --stat

DATE="$(date +%F)"

git add \
  corpus-11-tools/research/state \
  corpus-11-tools/research/hypotheses \
  corpus-11-tools/research/notes \
  corpus-11-tools/research/experiments \
  corpus-11-tools/research/reports \
  corpus-11-tools/research/scripts \
  corpus-11-tools/research/AGENTS.md

if git diff --cached --quiet; then
  echo "Aucun changement admissible à commiter."
  exit 0
fi

git commit -m "Research cycle ${DATE}"

git push origin main

echo
echo "Publication terminée."
git status
