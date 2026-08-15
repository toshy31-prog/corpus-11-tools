#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"
STAMP="$RESEARCH/state/last_automation_run.txt"

cd "$ROOT"

echo "=== Corpus 11 automated research cycle ==="

echo "[1] Clean Git preflight"
. "$RESEARCH/scripts/git_automation_guard.sh"
corpus_require_clean_worktree

echo "[2] Git sync"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "[3] Preflight"
python3 "$RESEARCH/scripts/validate_research_workspace.py"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"

echo "[4] Protect sources"
SOURCE_BEFORE="$(
  find "$RESEARCH/sources" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sha256sum \
  | awk '{print $1}'
)"

echo "[5] Snapshot"
"$RESEARCH/scripts/research_snapshot.sh"

echo "[6] Semantic research run"
cd "$RESEARCH"

codex exec "
Exécute explicitement le cycle de recherche courant décrit dans AGENTS.md, étapes 1 à 14.
Ne traite pas cette instruction comme le shorthand r et ne relance aucun script de cycle.

Contraintes supplémentaires pour ce run automatique :
- ne touche jamais à sources/ ;
- ne modifie rien si aucun résultat substantiel n'est trouvé ;
- exécute les tests finis déjà spécifiés avant d'étendre les hypothèses ;
- mets à jour seulement les fichiers dont le contenu est réellement devenu obsolète ;
- ne commit pas et ne pousse pas ;
- termine par un résumé très court des changements et de la prochaine action.
"

cd "$ROOT"

echo "[7] Source integrity"
SOURCE_AFTER="$(
  find "$RESEARCH/sources" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sha256sum \
  | awk '{print $1}'
)"

if [ "$SOURCE_BEFORE" != "$SOURCE_AFTER" ]; then
  echo "ERROR: research/sources changed"
  exit 20
fi

echo "[8] Final validation"
python3 "$RESEARCH/scripts/validate_research_workspace.py"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"
git diff --check

echo "[9] Result"
git status --short
git diff --stat

SUBSTANTIVE_STATUS="$(git status --porcelain -- . ":(exclude)corpus-11-tools/research/state/last_automation_run.txt")"
if [ -z "$SUBSTANTIVE_STATUS" ]; then
  echo "NO_CHANGE"
else
  date -Is > "$STAMP"
  echo "CHANGES_READY"
fi
