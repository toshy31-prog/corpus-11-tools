#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"
STAMP="$RESEARCH/state/last_automation_run.txt"

cd "$ROOT"

echo "=== Corpus 11 automated research cycle ==="

echo "[1] Git sync"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "[2] Preflight"
python3 "$RESEARCH/scripts/validate_research_workspace.py"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"

echo "[3] Protect sources"
SOURCE_BEFORE="$(
  find "$RESEARCH/sources" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sha256sum \
  | awk '{print $1}'
)"

echo "[4] Snapshot"
"$RESEARCH/scripts/research_snapshot.sh"

echo "[5] Semantic research run"
cd "$RESEARCH"

codex exec "
r

Contraintes supplémentaires pour ce run automatique :
- ne touche jamais à sources/ ;
- ne modifie rien si aucun résultat substantiel n'est trouvé ;
- exécute les tests finis déjà spécifiés avant d'étendre les hypothèses ;
- mets à jour seulement les fichiers dont le contenu est réellement devenu obsolète ;
- ne commit pas et ne pousse pas ;
- termine par un résumé très court des changements et de la prochaine action.
"

cd "$ROOT"

echo "[6] Source integrity"
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

echo "[7] Final validation"
python3 "$RESEARCH/scripts/validate_research_workspace.py"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"
git diff --check

date -Is > "$STAMP"

echo "[8] Result"
git status --short
git diff --stat

if [ -z "$(git status --porcelain)" ]; then
  echo "NO_CHANGE"
else
  echo "CHANGES_READY"
fi
