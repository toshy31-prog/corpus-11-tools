#!/usr/bin/env bash
set -euo pipefail

HERE="$(git rev-parse --show-toplevel)"
RESEARCH="$HERE/research/active/corpus-hypotheses"
cd "$HERE"

echo "=== DATE ==="
date -Iseconds

echo
echo "=== BRANCH ==="
git branch --show-current

echo
echo "=== LAST COMMIT ==="
git log -1 --pretty=format:'%H%n%ad%n%s' --date=iso

echo
echo "=== STATUS ==="
git status --short -- "$RESEARCH"

echo
echo "=== RESEARCH FILES CHANGED IN LAST 24H ==="
find "$RESEARCH" -type f -mmin -1440 -print 2>/dev/null | sort || true

echo
echo "=== RECENT COMMITS TOUCHING RESEARCH ==="
git log \
  --since="24 hours ago" \
  --pretty=format:'%h %ad %s' \
  --date=short \
  -- research/active/corpus-hypotheses
