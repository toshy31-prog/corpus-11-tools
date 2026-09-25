#!/usr/bin/env bash
set -euo pipefail
cd ~/Documents/ChatGPT/Corpus/projets/youtube-scout

echo "===== 1. PATCH ====="
python3 patch/apply-neutral-seed-catalog.py

echo
echo "===== 2. SYNTAXE ====="
node --check lib/exploration.mjs
node --check public/app.js

echo
echo "===== 3. TEST CIBLE ====="
node --test tests/neutral-seed-catalog.test.mjs

echo
echo "===== 4. SUITE COMPLETE ====="
npm test

echo
echo "===== 5. AUDIT STATIQUE ====="
grep -nE 'seedIdentityClusters|neutralSeedOrder|rankSeedChoices|identityClusterId|seenClusters'   lib/exploration.mjs public/app.js | sed -n '1,260p'

echo
echo "===== 6. ANCIENS BIAIS ====="
if grep -nF 'values.sort((a, b) => b.relationCount - a.relationCount' lib/exploration.mjs; then
  echo "ERREUR: ancien tri relationCount encore présent."
  exit 1
else
  echo "OK: ancien tri relationCount supprimé."
fi

if grep -nF 'const key = `${seed.type}:${normalized(seed.label)}`' lib/exploration.mjs; then
  echo "ERREUR: ancienne déduplication par libellé encore présente."
  exit 1
else
  echo "OK: ancienne déduplication par libellé supprimée."
fi

echo
echo "===== TERMINE ====="
echo "Si tout est vert : recharge le site, ouvre Explorer, puis le picker."
