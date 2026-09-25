#!/usr/bin/env bash
set -euo pipefail

cd ~/Documents/ChatGPT/Corpus/projets/youtube-scout
BACKUP="/home/olivier/Téléchargements/youtube-scout-sauvegarde-2026-09-13(1).json"

echo "===== 1. CHECK ====="
npm run check

echo
echo "===== 2. TESTS ====="
npm test

echo
echo "===== 3. SHADOW 3881 ====="
node scripts/evidence-algebra-shadow-audit.mjs "$BACKUP"

echo
echo "===== 4. FINAL ARCHITECTURE AUDIT ====="
node scripts/final-v16-audit.mjs

echo
echo "===== 5. GIT DIFF SUMMARY ====="
git diff --stat || true

echo
echo "===== TERMINE ====="
echo "Si npm test est vert, shadow = 3881 / 0 / 0,"
echo "et FINAL STATUS: READY, la migration est TERMINEE."
echo "Aucune mutation du graphe n'a ete effectuee."
