#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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
git status --short -- .

echo
echo "=== RESEARCH FILES CHANGED IN LAST 24H ==="
find research -type f -mmin -1440 -print 2>/dev/null | sort || true

echo
echo "=== RECENT COMMITS TOUCHING RESEARCH ==="
git log \
  --since="24 hours ago" \
  --pretty=format:'%h %ad %s' \
  --date=short \
  -- research
