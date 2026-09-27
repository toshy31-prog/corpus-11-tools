#!/usr/bin/env bash
set -euo pipefail

BROWSER_PY="$HOME/.local/share/corpus/runtime/corpus-local/browser-env/bin/python"
JOBDIR="$HOME/.local/share/corpus-bb-runner/jobs"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$HOME/Images/Corpus-BugBounty/bb07-$STAMP"

mkdir -p "$OUT"

export BB07_OUT="$OUT"

echo "============================================================"
echo " BB-07 — FICHIER PRECEDENT"
echo "============================================================"

echo
echo "=== PREFLIGHT ==="

curl -fsS --max-time 2 \
  http://127.0.0.1:18743/corpus/index.html \
  >/dev/null

curl -fsS --max-time 2 \
  http://127.0.0.1:9223/json/version \
  >/dev/null

echo "BACKEND=PASS"
echo "CDP=PASS"

echo
echo "=== TEST ==="

"$BROWSER_PY" "$JOBDIR/bb07.py"

echo
echo "=== PREUVES ==="

FILES=(
  "$OUT/00-ephemeral.png"
  "$OUT/01-catalogue-graph.png"
  "$OUT/02-readme.png"
)

for f in "${FILES[@]}"; do
    [ -s "$f" ] || {
        echo "REFUS: preuve absente: $f"
        exit 30
    }

    sha256sum "$f"
done

UNIQUE="$(
  sha256sum "${FILES[@]}" |
  awk '{print $1}' |
  sort -u |
  wc -l
)"

echo "UNIQUE_SCREENSHOTS=$UNIQUE"

[ "$UNIQUE" -eq 3 ] || {
    echo "REFUS: preuves visuelles non distinctes."
    exit 31
}

echo
echo "=== TRANSPORT GPT ==="

corpus-bb-send-shot "${FILES[@]}"

echo
echo "=== BILAN ==="
echo "BB07=PASS"
echo "CORPUS_SOURCE_MODIFIED=NO"
echo "TAB_CLOSED=NO"
echo "BROWSER_CLOSED=NO"
echo "EVIDENCE_DIR=$OUT"
