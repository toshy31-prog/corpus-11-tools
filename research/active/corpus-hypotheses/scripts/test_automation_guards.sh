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
  research/active/corpus-hypotheses/sources \
  research/active/corpus-hypotheses/state \
  research/active/corpus-hypotheses/hypotheses \
  research/active/corpus-hypotheses/notes \
  research/active/corpus-hypotheses/experiments \
  research/active/corpus-hypotheses/reports
printf 'protected\n' > research/active/corpus-hypotheses/sources/source.txt
printf 'state\n' > research/active/corpus-hypotheses/state/current_state.md
printf 'outside\n' > outside.txt
git add -- \
  research/active/corpus-hypotheses/sources/source.txt \
  research/active/corpus-hypotheses/state/current_state.md \
  outside.txt
git commit -qm fixture

pass=0
fail=0

reset_fixture() {
  git reset --hard -q HEAD
  git clean -fdq
  mkdir -p \
    research/active/corpus-hypotheses/hypotheses \
    research/active/corpus-hypotheses/notes \
    research/active/corpus-hypotheses/experiments \
    research/active/corpus-hypotheses/reports
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

expect_staged() {
  local name="$1"
  local expected_status="$2"
  local expected_path="$3"
  if corpus_validate_pending_paths >/dev/null 2>&1 \
    && corpus_stage_allowlist >/dev/null 2>&1 \
    && git diff --cached --name-status | grep -Eq "^${expected_status}[[:space:]].*${expected_path}$"; then
    echo "PASS: $name"
    pass=$((pass + 1))
  else
    echo "FAIL: $name"
    fail=$((fail + 1))
  fi
  reset_fixture
}

printf 'changed\n' > research/active/corpus-hypotheses/state/current_state.md
git add -- research/active/corpus-hypotheses/state/current_state.md
expect_rejected "index nonempty" corpus_require_clean_index

printf 'changed\n' > research/active/corpus-hypotheses/sources/source.txt
expect_rejected "source modified" corpus_validate_pending_paths

printf 'changed\n' > research/active/corpus-hypotheses/sources/source.txt
git add -- research/active/corpus-hypotheses/sources/source.txt
expect_rejected "source staged" corpus_validate_pending_paths

printf 'new\n' > research/active/corpus-hypotheses/sources/untracked.txt
expect_rejected "source untracked" corpus_validate_pending_paths

mkdir -p research/active/corpus-hypotheses/notes/nested
cp research/active/corpus-hypotheses/sources/source.txt \
  research/active/corpus-hypotheses/notes/nested/renamed-copy.txt
expect_rejected "source_copied_to_allowed" corpus_validate_pending_paths

printf 'changed\n' > outside.txt
expect_rejected "file outside allowlist" corpus_validate_pending_paths

printf 'changed\n' > research/active/corpus-hypotheses/state/current_state.md
expect_rejected "dirty worktree" corpus_require_clean_worktree

git rm -q research/active/corpus-hypotheses/sources/source.txt
expect_rejected "source deleted" corpus_validate_pending_paths

git mv research/active/corpus-hypotheses/sources/source.txt research/active/corpus-hypotheses/state/source.txt
expect_rejected "source renamed" corpus_validate_pending_paths

rm research/active/corpus-hypotheses/sources/source.txt
mkdir research/active/corpus-hypotheses/sources/source.txt
printf 'replacement\n' > research/active/corpus-hypotheses/sources/source.txt/content
expect_rejected "source replaced" corpus_validate_pending_paths

git rm -q research/active/corpus-hypotheses/state/current_state.md
expect_staged "allowed deletion staged" "D" "research/active/corpus-hypotheses/state/current_state.md"

git mv research/active/corpus-hypotheses/state/current_state.md \
  research/active/corpus-hypotheses/state/renamed_state.md
expect_staged "allowed rename staged" "R[0-9]+" "research/active/corpus-hypotheses/state/renamed_state.md"

echo "RESULT: $pass PASS, $fail FAIL"
[ "$fail" -eq 0 ]
