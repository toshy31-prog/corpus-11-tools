#!/usr/bin/env bash

# Shared Git safety checks for the Corpus 11 research automation envelope.
# This file is sourced by the publisher and by its isolated integration tests.

CORPUS_ALLOWLIST_ROOTS=(
  research/active/corpus-hypotheses/state
  research/active/corpus-hypotheses/hypotheses
  research/active/corpus-hypotheses/notes
  research/active/corpus-hypotheses/experiments
  research/active/corpus-hypotheses/reports
)

corpus_git_root() {
  git rev-parse --show-toplevel
}

corpus_require_clean_index() {
  if ! git diff --cached --quiet; then
    echo "ERROR: Git index must be empty before automated publication" >&2
    return 30
  fi
}

corpus_require_clean_worktree() {
  if [ -n "$(git status --porcelain=v1 --untracked-files=all)" ]; then
    echo "ERROR: worktree must be clean before checkout or pull" >&2
    git status --short >&2
    return 31
  fi
}

corpus_require_main_publish_context() {
  local current_branch
  local symbolic_head

  current_branch="$(git branch --show-current)"
  symbolic_head="$(git symbolic-ref -q HEAD || true)"
  if [ "$current_branch" != "main" ] || [ "$symbolic_head" != "refs/heads/main" ]; then
    echo "ERROR: automated publication requires refs/heads/main" >&2
    return 35
  fi
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "ERROR: required Git remote 'origin' is missing" >&2
    return 36
  fi
  if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    echo "ERROR: required ref refs/remotes/origin/main is missing" >&2
    return 37
  fi
}

corpus_unpublished_marker() {
  git rev-parse --git-path corpus11-unpublished-main
}

corpus_is_allowed_path() {
  case "$1" in
    research/active/corpus-hypotheses/state/* | \
    research/active/corpus-hypotheses/hypotheses/* | \
    research/active/corpus-hypotheses/notes/* | \
    research/active/corpus-hypotheses/experiments/* | \
    research/active/corpus-hypotheses/reports/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

corpus_is_protected_source_path() {
  case "$1" in
    research/active/corpus-hypotheses/sources | research/active/corpus-hypotheses/sources/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

corpus_status_paths() {
  git status --porcelain=v1 -z --untracked-files=all \
    | python3 -c '
import sys

records = sys.stdin.buffer.read().split(b"\0")
i = 0
while i < len(records):
    record = records[i]
    i += 1
    if not record:
        continue
    status = record[:2].decode("ascii", "replace")
    path = record[3:].decode("utf-8", "surrogateescape")
    print(path)
    if "R" in status or "C" in status:
        if i < len(records) and records[i]:
            print(records[i].decode("utf-8", "surrogateescape"))
            i += 1
'
}

corpus_validate_pending_paths() {
  local path
  local failed=0

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    if corpus_is_protected_source_path "$path"; then
      echo "ERROR: protected research/sources entry detected: $path" >&2
      failed=1
    elif ! corpus_is_allowed_path "$path"; then
      echo "ERROR: path outside automation allowlist: $path" >&2
      failed=1
    fi
  done < <(corpus_status_paths)

  [ "$failed" -eq 0 ] || return 32
  corpus_reject_source_copies
}

corpus_reject_source_copies() {
  local root
  local path
  local digest
  local -A source_hashes=()

  root="$(corpus_git_root)"
  while IFS= read -r -d '' path; do
    digest="$(sha256sum -- "$path" | awk '{print $1}')"
    source_hashes["$digest"]=1
  done < <(find "$root/research/active/corpus-hypotheses/sources" -type f -print0)

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    corpus_is_allowed_path "$path" || continue
    [ -f "$root/$path" ] || continue
    digest="$(sha256sum -- "$root/$path" | awk '{print $1}')"
    if [ "${source_hashes[$digest]+present}" = "present" ]; then
      echo "ERROR: allowlisted file is a byte-identical copy of a canonical source: $path" >&2
      return 38
    fi
  done < <(corpus_status_paths)
}

corpus_stage_allowlist() {
  local path
  local -a untracked=()

  # Explicit directory pathspecs stage modifications, additions, deletions and
  # both sides of renames without broadening scope beyond the allowlist.
  git add -u -- "${CORPUS_ALLOWLIST_ROOTS[@]}"
  while IFS= read -r -d '' path; do
    untracked+=("$path")
  done < <(git ls-files --others --exclude-standard -z -- "${CORPUS_ALLOWLIST_ROOTS[@]}")
  if [ "${#untracked[@]}" -gt 0 ]; then
    git add -- "${untracked[@]}"
  fi
}

corpus_verify_staged_diff() {
  local path
  local failed=0

  if git diff --cached --quiet; then
    echo "NO_ADMISSIBLE_CHANGE"
    return 10
  fi

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    if corpus_is_protected_source_path "$path"; then
      echo "ERROR: protected source staged: $path" >&2
      failed=1
    elif ! corpus_is_allowed_path "$path"; then
      echo "ERROR: staged path outside automation allowlist: $path" >&2
      failed=1
    fi
  done < <(git diff --cached --name-only --diff-filter=ACDMRTUXB)

  [ "$failed" -eq 0 ] || return 33
  git diff --cached --check
  git diff --cached --stat
}
