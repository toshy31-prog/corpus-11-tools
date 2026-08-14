#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

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
git status --short

echo
echo "=== FILES CHANGED IN LAST 24H ==="
find research -type f -mmin -1440 -print 2>/dev/null | sort || true

echo
echo "=== RECENT COMMITS ==="
git log --since="24 hours ago" --pretty=format:'%h %ad %s' --date=short
