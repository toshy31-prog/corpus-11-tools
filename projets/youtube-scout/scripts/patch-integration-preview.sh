#!/usr/bin/env bash
set -euo pipefail

cd "${1:-$HOME/Documents/ChatGPT/Corpus/projets/youtube-scout}"

echo "===== PREVIEW — POINTS D'INTEGRATION ====="

for f in \
  scripts/live-track-resolution-engine.mjs \
  lib/resolution-evidence.mjs \
  lib/track-resolution.mjs \
  lib/scout.mjs \
  server.mjs
do
  [ -f "$f" ] || continue

  echo
  echo "---- $f ----"

  grep -nE \
    'auditCase|buildTrackSearchProjection|decideTrackCandidate|buildResolutionEvidence|resolveTrack|musicbrainz|discogs|youtube' \
    "$f" \
    | head -120 || true
done

echo
echo "===== RECOMMANDATION DE BRANCHEMENT ====="
cat <<'TXT'
1. Ne pas remplacer buildTrackSearchProjection.
2. Conserver MusicBrainz/Discogs comme fournisseurs spécialisés.
3. Ajouter l'orchestrateur AU-DESSUS du moteur de décision actuel.
4. Ajouter YouTube/local comme premier fournisseur de preuves.
5. Un rejet MB/Discogs devient un motif d'escalade, pas une conclusion globale.
6. N'autoriser une mutation du graphe qu'après décision finale multi-source.
TXT

echo
echo "READ ONLY — aucun fichier modifié."
