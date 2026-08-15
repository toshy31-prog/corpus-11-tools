#!/usr/bin/env bash

# Shared Git safety checks for the Corpus 11 research automation envelope.
# This file is sourced by the publisher and by its isolated integration tests.

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

corpus_is_allowed_path() {
  case "$1" in
    corpus-11-tools/research/state/* | \
    corpus-11-tools/research/hypotheses/* | \
    corpus-11-tools/research/notes/* | \
    corpus-11-tools/research/experiments/* | \
    corpus-11-tools/research/reports/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

corpus_is_protected_source_path() {
  case "$1" in
    corpus-11-tools/research/sources | corpus-11-tools/research/sources/*)
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
}

corpus_stage_allowlist() {
  local path
  local -a paths=()

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    corpus_is_allowed_path "$path" || continue
    paths+=("$path")
  done < <(corpus_status_paths)

  if [ "${#paths[@]}" -eq 0 ]; then
    return 0
  fi
  git add -- "${paths[@]}"
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
