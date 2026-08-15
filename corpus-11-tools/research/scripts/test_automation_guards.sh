#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/git_automation_guard.sh"

TEMP_REPO="$(mktemp -d)"
trap 'rm -rf -- "$TEMP_REPO"' EXIT

cd "$TEMP_REPO"
git init -q
git config user.name "Corpus Automation Test"
git config user.email "corpus-automation-test@example.invalid"
mkdir -p \
  corpus-11-tools/research/sources \
  corpus-11-tools/research/state
printf 'protected\n' > corpus-11-tools/research/sources/source.txt
printf 'state\n' > corpus-11-tools/research/state/current_state.md
printf 'outside\n' > outside.txt
git add -- \
  corpus-11-tools/research/sources/source.txt \
  corpus-11-tools/research/state/current_state.md \
  outside.txt
git commit -qm fixture

pass=0
fail=0

reset_fixture() {
  git reset --hard -q HEAD
  git clean -fdq
}

expect_rejected() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "FAIL: $name"
    fail=$((fail + 1))
  else
    echo "PASS: $name"
    pass=$((pass + 1))
  fi
  reset_fixture
}

printf 'changed\n' > corpus-11-tools/research/state/current_state.md
git add -- corpus-11-tools/research/state/current_state.md
expect_rejected "index nonempty" corpus_require_clean_index

printf 'changed\n' > corpus-11-tools/research/sources/source.txt
expect_rejected "source modified" corpus_validate_pending_paths

printf 'changed\n' > corpus-11-tools/research/sources/source.txt
git add -- corpus-11-tools/research/sources/source.txt
expect_rejected "source staged" corpus_validate_pending_paths

printf 'new\n' > corpus-11-tools/research/sources/untracked.txt
expect_rejected "source untracked" corpus_validate_pending_paths

printf 'changed\n' > outside.txt
expect_rejected "file outside allowlist" corpus_validate_pending_paths

printf 'changed\n' > corpus-11-tools/research/state/current_state.md
expect_rejected "dirty worktree" corpus_require_clean_worktree

git rm -q corpus-11-tools/research/sources/source.txt
expect_rejected "source deleted" corpus_validate_pending_paths

git mv corpus-11-tools/research/sources/source.txt corpus-11-tools/research/state/source.txt
expect_rejected "source renamed" corpus_validate_pending_paths

rm corpus-11-tools/research/sources/source.txt
mkdir corpus-11-tools/research/sources/source.txt
printf 'replacement\n' > corpus-11-tools/research/sources/source.txt/content
expect_rejected "source replaced" corpus_validate_pending_paths

echo "RESULT: $pass PASS, $fail FAIL"
[ "$fail" -eq 0 ]
