#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"
STAMP="$RESEARCH/state/last_automation_run.txt"
PREFLIGHT_STATE="$(git rev-parse --git-path corpus11-research-preflight)"
STAMP_BACKUP="$(git rev-parse --git-path corpus11-research-stamp-before)"
MODE="${1:-preflight}"
POSTFLIGHT_SUCCEEDED=0
POSTFLIGHT_STAMP_STATE=""
POSTFLIGHT_TIMESTAMP_TMP=""

. "$RESEARCH/scripts/git_automation_guard.sh"
cd "$ROOT"

source_digest() {
  find "$RESEARCH/sources" -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
}

validate_all() {
  python3 "$RESEARCH/scripts/validate_research_workspace.py"
  python3 "$ROOT/corpus-11-tools/tools/validate_package.py"
  python3 "$ROOT/corpus-11-tools/tools/check_graph.py"
  git diff --check
}

require_main_synchronized() {
  local head_commit
  local origin_main

  corpus_require_main_publish_context
  git fetch origin main
  corpus_require_main_publish_context
  head_commit="$(git rev-parse HEAD)"
  origin_main="$(git rev-parse refs/remotes/origin/main)"
  if [ "$head_commit" != "$origin_main" ]; then
    echo "ERROR: main must be exactly synchronized with origin/main" >&2
    return 47
  fi
}

save_stamp_state() {
  rm -f -- "$STAMP_BACKUP"
  if [ -e "$STAMP" ]; then
    cp -p -- "$STAMP" "$STAMP_BACKUP"
    printf '%s\n' present
  else
    printf '%s\n' absent
  fi
}

restore_stamp_state() {
  local stamp_state="$1"
  if [ "$stamp_state" = "present" ]; then
    if [ ! -f "$STAMP_BACKUP" ]; then
      echo "ERROR: timestamp backup is missing" >&2
      return 48
    fi
    cp -p -- "$STAMP_BACKUP" "$STAMP"
  elif [ "$stamp_state" = "absent" ]; then
    rm -f -- "$STAMP"
  else
    echo "ERROR: invalid timestamp state in preflight record" >&2
    return 49
  fi
}

run_preflight() {
  local head_commit
  local sources_hash
  local stamp_state

  echo "=== Corpus 11 deterministic preflight ==="
  corpus_require_clean_worktree
  require_main_synchronized
  validate_all

  head_commit="$(git rev-parse HEAD)"
  sources_hash="$(source_digest)"
  stamp_state="$(save_stamp_state)"
  printf '%s\n%s\n%s\n' "$head_commit" "$sources_hash" "$stamp_state" > "$PREFLIGHT_STATE"

  "$RESEARCH/scripts/research_snapshot.sh"

  echo
  echo "SEMANTIC_AGENT_REQUIRED"
  echo "SEMANTIC_WORKSPACE: $RESEARCH"
  echo "READ: research/state/current_state.md"
  echo "READ: research/hypotheses/"
  echo "READ: research/notes/"
  echo "READ: research/experiments/"
  echo "READ: research/reports/"
  echo "POSTFLIGHT: $RESEARCH/scripts/run_research_cycle.sh postflight"
}

run_postflight() {
  local expected_head
  local expected_sources
  local stamp_state
  local current_sources
  local substantive_status

  if [ ! -f "$PREFLIGHT_STATE" ]; then
    echo "ERROR: deterministic preflight record is missing" >&2
    return 50
  fi
  expected_head="$(sed -n '1p' "$PREFLIGHT_STATE")"
  expected_sources="$(sed -n '2p' "$PREFLIGHT_STATE")"
  stamp_state="$(sed -n '3p' "$PREFLIGHT_STATE")"
  POSTFLIGHT_STAMP_STATE="$stamp_state"

  cleanup_postflight() {
    local status=$?
    trap - EXIT
    if [ "$POSTFLIGHT_SUCCEEDED" -ne 1 ]; then
      restore_stamp_state "$POSTFLIGHT_STAMP_STATE" || true
    fi
    [ -z "$POSTFLIGHT_TIMESTAMP_TMP" ] || rm -f -- "$POSTFLIGHT_TIMESTAMP_TMP"
    exit "$status"
  }
  trap cleanup_postflight EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  echo "=== Corpus 11 deterministic postflight ==="
  restore_stamp_state "$stamp_state"
  require_main_synchronized
  if [ "$(git rev-parse HEAD)" != "$expected_head" ]; then
    echo "ERROR: HEAD changed since deterministic preflight" >&2
    return 51
  fi

  current_sources="$(source_digest)"
  if [ "$current_sources" != "$expected_sources" ]; then
    echo "ERROR: research/sources changed since deterministic preflight" >&2
    return 20
  fi

  corpus_validate_pending_paths
  validate_all

  git status --short
  git diff --stat
  substantive_status="$(
    git status --porcelain -- . \
      ":(exclude)corpus-11-tools/research/state/last_automation_run.txt"
  )"
  if [ -z "$substantive_status" ]; then
    echo "NO_CHANGE"
  else
    POSTFLIGHT_TIMESTAMP_TMP="$(mktemp "$RESEARCH/state/.last_automation_run.XXXXXX")"
    date -Is > "$POSTFLIGHT_TIMESTAMP_TMP"
    mv -- "$POSTFLIGHT_TIMESTAMP_TMP" "$STAMP"
    POSTFLIGHT_TIMESTAMP_TMP=""
    echo "CHANGES_READY"
  fi

  rm -f -- "$PREFLIGHT_STATE" "$STAMP_BACKUP"
  POSTFLIGHT_SUCCEEDED=1
  trap - EXIT INT TERM
}

case "$MODE" in
  preflight)
    run_preflight
    ;;
  postflight)
    run_postflight
    ;;
  *)
    echo "Usage: $0 [preflight|postflight]" >&2
    exit 64
    ;;
esac
