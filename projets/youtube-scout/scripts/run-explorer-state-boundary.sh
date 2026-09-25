#!/usr/bin/env bash
set -euo pipefail

cd ~/Documents/ChatGPT/Corpus/projets/youtube-scout

echo "===== 0. INSPECTION READ ONLY ====="
scripts/inspect-explorer-state.sh

echo
echo "===== 1. PATCH ====="
python3 patch/apply-explorer-state-boundary.py

echo
echo "===== 2. SYNTAXE ====="
node --check public/app.js
node --check patch/explorer-state-policy.mjs

echo
echo "===== 3. TESTS CIBLES ====="
node --test \
  tests/explorer-state-policy.test.mjs \
  tests/explorer-state-boundary-static.test.mjs

echo
echo "===== 4. SUITE COMPLETE ====="
npm test

echo
echo "===== 5. AUDIT ====="
node scripts/audit-explorer-state-boundary.mjs

echo
echo "===== 6. GIT DIFF CIBLE ====="
git diff -- public/app.js || true

echo
echo "===== TERMINE ====="
echo "Si tout est vert : redémarre/recharge le site et ouvre Explorer."
echo "Attendu : aucun seed actif sans action explicite."
