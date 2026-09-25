#!/usr/bin/env bash
set -euo pipefail
cd ~/Documents/ChatGPT/Corpus/projets/youtube-scout

echo "===== 1. PATCH V2 EXACT ====="
python3 patch/apply-explorer-neutral-v2.py

echo
echo "===== 2. SYNTAXE ====="
node --check public/app.js

echo
echo "===== 3. TEST CIBLE ====="
node --test tests/explorer-neutral-v2.test.mjs

echo
echo "===== 4. SUITE COMPLETE ====="
npm test

echo
echo "===== 5. CONTROLE ====="
grep -nE \
  'resumableDig|restoreExplorationSession|restoredDig|Explorer est prêt pour un nouveau départ|explorationSession = null' \
  public/app.js | sed -n '1,220p'

echo
echo "===== TERMINE ====="
echo "Si tout est vert, recharge le site puis ouvre Explorer."
