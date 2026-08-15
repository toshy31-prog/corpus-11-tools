#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"

cd "$ROOT"

echo
echo "=== CORPUS 11 RESEARCH CYCLE ==="
echo

echo "[1/8] Vérification Git"
git status --short

if ! git diff --quiet -- corpus-11-tools/research/sources/; then
  echo
  echo "ERREUR: research/sources contient déjà des modifications."
  echo "Cycle arrêté pour protéger les sources."
  exit 1
fi

echo
echo "[2/8] Snapshot"
"$RESEARCH/scripts/research_snapshot.sh"

echo
echo "[3/8] Validation workspace"
python3 "$RESEARCH/scripts/validate_research_workspace.py"

echo
echo "[4/8] Validation package"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"

echo
echo "[5/8] Validation graphe"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"

BEFORE_SOURCE_HASH="$(
  find "$RESEARCH/sources" -type f -print0 2>/dev/null \
  | sort -z \
  | xargs -0 sha256sum 2>/dev/null \
  | sha256sum \
  | awk '{print $1}'
)"

echo
echo "[6/8] Lancement Codex"

cd "$RESEARCH"

codex exec "
run

Travaille selon les AGENTS.md applicables.
Utilise state/current_state.md comme état persistant.
Exécute le cycle de recherche courant.

Priorités :
- ne travailler que sur ce qui peut changer une conclusion, attribution, confiance, test, priorité ou condition de renversement ;
- exécuter d'abord les tests finis déjà spécifiés lorsqu'ils sont exécutables ;
- ne pas modifier sources/ ;
- ne pas créer de théorie à partir de Corpus 11 Tools ;
- ne pas faire de commit ;
- terminer par les fichiers modifiés et la prochaine action.
"

cd "$ROOT"

echo
echo "[7/8] Contrôles après Codex"

AFTER_SOURCE_HASH="$(
  find "$RESEARCH/sources" -type f -print0 2>/dev/null \
  | sort -z \
  | xargs -0 sha256sum 2>/dev/null \
  | sha256sum \
  | awk '{print $1}'
)"

if [ "$BEFORE_SOURCE_HASH" != "$AFTER_SOURCE_HASH" ]; then
  echo
  echo "ERREUR: research/sources a été modifié."
  echo "Les changements restent visibles mais ne doivent pas être commités."
  exit 2
fi

python3 "$RESEARCH/scripts/validate_research_workspace.py"
python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
python3 "$ROOT/corpus-11-tools/tools/check_graph.py"
git diff --check

echo
echo "[8/8] Résultat"

if git diff --quiet && [ -z "$(git status --porcelain)" ]; then
  echo
  echo "Aucun changement substantiel."
  exit 0
fi

echo
echo "Fichiers modifiés :"
git status --short

echo
echo "Résumé :"
git diff --stat

echo
echo "Cycle terminé."
echo "Pour valider et publier : rp"
