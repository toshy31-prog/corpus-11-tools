#!/usr/bin/env bash
set -euo pipefail

PY="$HOME/.local/share/corpus/runtime/corpus-local/browser-env/bin/python"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$HOME/Images/Corpus-BugBounty/bb08-$STAMP"

mkdir -p "$OUT"
export BB08_OUT="$OUT"

echo "============================================================"
echo " BB-08 — REFRESH + CONSERVATION SELECTION"
echo "============================================================"

curl -fsS --max-time 2 \
  http://127.0.0.1:18743/corpus/index.html \
  >/dev/null

curl -fsS --max-time 2 \
  http://127.0.0.1:9223/json/version \
  >/dev/null

echo "BACKEND=PASS"
echo "CDP=PASS"

"$PY" \
 "$HOME/.local/share/corpus-bb-runner/jobs/bb08.py"

echo
echo "=== PREUVES ==="

if [ -f "$OUT/00-before-refresh.png" ]; then
    sha256sum "$OUT/00-before-refresh.png"
fi

if [ -f "$OUT/01-after-refresh.png" ]; then
    sha256sum "$OUT/01-after-refresh.png"
fi

if [ -f "$OUT/00-before-refresh.png" ] &&
   [ -f "$OUT/01-after-refresh.png" ]
then
    echo
    echo "=== TRANSPORT SCREENSHOTS ==="

    corpus-bb-send-shot \
      "$OUT/00-before-refresh.png" \
      "$OUT/01-after-refresh.png"
fi

echo
echo "EVIDENCE_DIR=$OUT"
echo "BB08_JOB_COMPLETE=YES"
