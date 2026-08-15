#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RESEARCH="$ROOT/corpus-11-tools/research"
. "$RESEARCH/scripts/git_automation_guard.sh"

cd "$ROOT"

STAGING_STARTED=0
cleanup_failed_staging() {
  local status=$?
  trap - EXIT
  if [ "$status" -ne 0 ] && [ "$STAGING_STARTED" -eq 1 ]; then
    git reset -q
  fi
  exit "$status"
}
trap cleanup_failed_staging EXIT

echo "=== CORPUS 11 PUBLISH ==="

corpus_require_clean_index
corpus_require_main_publish_context

# Refresh the remote-tracking ref before deciding whether this is a new
# publication or the retry of one already committed locally.
git fetch origin main
corpus_require_main_publish_context

MARKER="$(corpus_unpublished_marker)"
HEAD_COMMIT="$(git rev-parse HEAD)"
ORIGIN_MAIN="$(git rev-parse refs/remotes/origin/main)"

if [ -f "$MARKER" ]; then
  MARKED_COMMIT="$(sed -n '1p' "$MARKER")"
  if [ "$HEAD_COMMIT" = "$ORIGIN_MAIN" ] && [ "$MARKED_COMMIT" = "$HEAD_COMMIT" ]; then
    rm -f -- "$MARKER"
    echo "PUBLISHED: origin/main already contains the marked commit"
    exit 0
  fi
  if [ "$MARKED_COMMIT" != "$HEAD_COMMIT" ]; then
    echo "ERROR: unpublished marker does not match HEAD" >&2
    exit 41
  fi
  if ! git merge-base --is-ancestor refs/remotes/origin/main HEAD; then
    echo "ERROR: marked unpublished commit diverges from origin/main" >&2
    exit 42
  fi
  corpus_require_clean_worktree
  echo "RETRY_UNPUBLISHED: $HEAD_COMMIT"
  if git push origin HEAD:main; then
    rm -f -- "$MARKER"
    echo "PUBLISHED: $HEAD_COMMIT"
    exit 0
  fi
  echo "ERROR: retry push failed; unpublished marker retained at $MARKER" >&2
  exit 43
fi

if [ "$HEAD_COMMIT" != "$ORIGIN_MAIN" ]; then
  echo "ERROR: local main must equal origin/main before creating an automated commit" >&2
  exit 44
fi

corpus_validate_pending_paths

python3 corpus-11-tools/research/scripts/validate_research_workspace.py
python3 corpus-11-tools/tools/validate_package.py
python3 corpus-11-tools/tools/check_graph.py
git diff --check

if [ -z "$(git status --porcelain)" ]; then
  echo "Rien à publier."
  exit 0
fi

echo "Diff à publier :"
git status --short
git diff --stat

DATE="$(date +%F)"

STAGING_STARTED=1
corpus_stage_allowlist
corpus_verify_staged_diff

# Re-read every Git state after staging and before committing.
if [ -n "$(git diff --name-only)" ] || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "ERROR: unstaged or untracked entries remain after allowlisted staging" >&2
  git status --short >&2
  exit 34
fi
corpus_validate_pending_paths
corpus_verify_staged_diff

if [ "${CORPUS_AUTOMATION_NO_COMMIT:-0}" = "1" ]; then
  git reset -q
  STAGING_STARTED=0
  echo "VALIDATED_NO_COMMIT"
  exit 0
fi

git commit -m "Research cycle ${DATE}"
HEAD_COMMIT="$(git rev-parse HEAD)"

if [ "${CORPUS_AUTOMATION_NO_PUSH:-0}" = "1" ]; then
  printf '%s\n' "$HEAD_COMMIT" > "$MARKER"
  echo "UNPUBLISHED: $HEAD_COMMIT (push disabled; marker: $MARKER)"
  exit 45
fi

if git push origin HEAD:main; then
  rm -f -- "$MARKER"
  echo "PUBLISHED: $HEAD_COMMIT"
  exit 0
fi

printf '%s\n' "$HEAD_COMMIT" > "$MARKER"
echo "ERROR: push failed; local commit marked unpublished at $MARKER" >&2
exit 46
