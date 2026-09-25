#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$HOME/Documents/ChatGPT/Corpus/projets/youtube-scout}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

echo "Installation des nouveaux fichiers seulement."
echo "Aucun fichier existant n'est écrasé silencieusement."

copy_new () {
  local src="$1"
  local dst="$2"

  if [ -e "$dst" ]; then
    echo "SKIP existe déjà: $dst"
    return
  fi

  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "ADD  $dst"
}

copy_new "$HERE/lib/multisource-source-registry.mjs" "lib/multisource-source-registry.mjs"
copy_new "$HERE/lib/youtube-resolution-evidence.mjs" "lib/youtube-resolution-evidence.mjs"
copy_new "$HERE/lib/multisource-decision.mjs" "lib/multisource-decision.mjs"
copy_new "$HERE/lib/multisource-resolution-orchestrator.mjs" "lib/multisource-resolution-orchestrator.mjs"
copy_new "$HERE/scripts/inspect-integration-points.mjs" "scripts/inspect-integration-points.mjs"
copy_new "$HERE/scripts/multisource-priority-audit.mjs" "scripts/multisource-priority-audit.mjs"
copy_new "$HERE/tests/multisource-decision.test.mjs" "tests/multisource-decision.test.mjs"
copy_new "$HERE/tests/multisource-orchestrator.test.mjs" "tests/multisource-orchestrator.test.mjs"

echo
echo "Terminé."
echo "Aucune modification des modules existants."
