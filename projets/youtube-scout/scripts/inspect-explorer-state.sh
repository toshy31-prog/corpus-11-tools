#!/usr/bin/env bash
set -euo pipefail

cd ~/Documents/ChatGPT/Corpus/projets/youtube-scout

echo "===== KOSH HORS TESTS ====="
grep -RniE 'Kosh|Black Noise|MTRON009' \
  public lib server.mjs scripts \
  --exclude='*.test.mjs' \
  --exclude='*.json' || true

echo
echo "===== ACTIVE / RECOVERY / RESTORE ====="
grep -RniE \
  'activeDig|resumableDig|restoreExplorationSession|youtube-active-dig|EXPLORATION_KEY|navigationStack|updatedAt' \
  public lib \
  --include='*.mjs' \
  --include='*.js' \
  | head -n 500

echo
echo "===== BACKUP RESTORE ====="
grep -nE \
  'payload\.local\.activeDig|restoredDig|restore.*backup|activeDig =' \
  public/app.js \
  | head -n 200

echo
echo "READ ONLY."
