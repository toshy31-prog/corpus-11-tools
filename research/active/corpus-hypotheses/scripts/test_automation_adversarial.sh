#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEMP_ROOT"' EXIT

pass=0
fail=0

record() {
  local ok="$1"
  local name="$2"
  if [ "$ok" -eq 0 ]; then
    echo "PASS: $name"
    pass=$((pass + 1))
  else
    echo "FAIL: $name"
    fail=$((fail + 1))
  fi
}

make_repo() {
  local name="$1"
  REPO="$TEMP_ROOT/$name"
  REMOTE="$TEMP_ROOT/$name.git"
  mkdir -p "$REPO"
  (cd "$ROOT" && tar -cf - corpus-11-tools research transfers) | (cd "$REPO" && tar -xf -)
  rm -f -- "$REPO/research/active/corpus-hypotheses/state/last_automation_run.txt"
  git -C "$REPO" init -q
  git -C "$REPO" config user.name "Corpus Adversarial Test"
  git -C "$REPO" config user.email "corpus-adversarial@example.invalid"
  git -C "$REPO" checkout -qb main
  git -C "$REPO" add -- corpus-11-tools research transfers
  git -C "$REPO" commit -qm fixture
  git init -q --bare "$REMOTE"
  git -C "$REPO" remote add origin "$REMOTE"
  git -C "$REPO" push -qu origin main
}

make_repo wrong-branch
git -C "$REPO" switch -qc feature
before="$(git -C "$REPO" rev-parse HEAD)"
if (cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "publisher on branch != main => REFUSED"
elif [ "$(git -C "$REPO" rev-parse HEAD)" = "$before" ]; then
  record 0 "publisher on branch != main => REFUSED"
else
  record 1 "publisher on branch != main => REFUSED"
fi
if (cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) \
  >/dev/null 2>&1; then
  record 1 "deterministic preflight on branch != main => REFUSED"
else
  record 0 "deterministic preflight on branch != main => REFUSED"
fi

make_repo missing-origin
git -C "$REPO" remote remove origin
if (cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "origin absent => REFUSED"
else
  record 0 "origin absent => REFUSED"
fi

make_repo missing-origin-main
git -C "$REPO" update-ref -d refs/remotes/origin/main
if (cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "origin/main absent => REFUSED"
else
  record 0 "origin/main absent => REFUSED"
fi

make_repo push-retry
printf '%s\n' '# retry fixture' >> "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
printf '%s\n' '#!/usr/bin/env bash' 'test ! -e "$(dirname "$0")/../reject"' > "$REMOTE/hooks/pre-receive"
chmod +x "$REMOTE/hooks/pre-receive"
touch "$REMOTE/reject"
set +e
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1
first_status=$?
set -e
first_head="$(git -C "$REPO" rev-parse HEAD)"
first_count="$(git -C "$REPO" rev-list --count HEAD)"
marker="$(git -C "$REPO" rev-parse --git-path corpus11-unpublished-main)"
rm -f -- "$REMOTE/reject"
set +e
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1
retry_status=$?
set -e
second_count="$(git -C "$REPO" rev-list --count HEAD)"
remote_head="$(git --git-dir="$REMOTE" rev-parse refs/heads/main)"
if [ "$first_status" -ne 0 ] \
  && [ "$retry_status" -eq 0 ] \
  && [ "$first_head" = "$remote_head" ] \
  && [ "$first_count" = "$second_count" ] \
  && [ ! -e "$marker" ]; then
  record 0 "push failed then next run retries existing commit"
else
  record 1 "push failed then next run retries existing commit"
fi

make_repo staging-failure
printf '%s\n' '# keep worktree' >> "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
printf '%s\n' '#!/usr/bin/env bash' 'exit 1' > "$REPO/.git/hooks/pre-commit"
chmod +x "$REPO/.git/hooks/pre-commit"
set +e
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1
staging_status=$?
set -e
if [ "$staging_status" -ne 0 ] \
  && git -C "$REPO" diff --cached --quiet \
  && ! git -C "$REPO" diff --quiet; then
  record 0 "failure after staging restores empty index and preserves worktree"
else
  record 1 "failure after staging restores empty index and preserves worktree"
fi

make_repo outside-allowlist
printf '%s\n' bad > "$REPO/outside.txt"
if (cd "$REPO" && ./research/active/corpus-hypotheses/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "file outside allowlist => ERROR"
else
  record 0 "file outside allowlist => ERROR"
fi

make_repo timestamp-owned
set +e
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) \
  >"$TEMP_ROOT/preflight.out" 2>&1
preflight_status=$?
set -e
printf '%s\n' fake-agent-timestamp \
  > "$REPO/research/active/corpus-hypotheses/state/last_automation_run.txt"
set +e
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) \
  >"$TEMP_ROOT/postflight.out" 2>&1
postflight_status=$?
set -e
if [ "$preflight_status" -eq 0 ] \
  && [ "$postflight_status" -eq 0 ] \
  && grep -qx 'SEMANTIC_AGENT_REQUIRED' "$TEMP_ROOT/preflight.out" \
  && grep -qx 'NO_CHANGE' "$TEMP_ROOT/postflight.out" \
  && [ ! -e "$REPO/research/active/corpus-hypotheses/state/last_automation_run.txt" ] \
  && [ -z "$(git -C "$REPO" status --porcelain)" ]; then
  record 0 "timestamp modified between preflight/postflight is restored and non-substantive"
else
  record 1 "timestamp modified between preflight/postflight is restored and non-substantive"
fi

cycle_script="$ROOT/research/active/corpus-hypotheses/scripts/run_research_cycle.sh"
if grep -Fq 'codex exec' "$cycle_script"; then
  record 1 "deterministic cycle contains no forbidden agent invocation"
else
  record 0 "deterministic cycle contains no forbidden agent invocation"
fi
paths_missing=0
for required_path in \
  'research/state/current_state.md' \
  'research/hypotheses/' \
  'research/notes/' \
  'research/experiments/' \
  'research/reports/'; do
  if ! grep -Fq "$required_path" "$cycle_script"; then
    paths_missing=1
  fi
done
if [ "$paths_missing" -eq 0 ]; then
  record 0 "preflight exposes required semantic paths"
else
  record 1 "preflight exposes required semantic paths"
fi

make_repo local-no-change
before_head="$(git -C "$REPO" rev-parse HEAD)"
before_branches="$(git -C "$REPO" for-each-ref --format='%(refname)' refs/heads)"
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) \
  >"$TEMP_ROOT/local-no-change-pre.out" 2>&1
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) \
  >"$TEMP_ROOT/local-no-change-post.out" 2>&1
after_branches="$(git -C "$REPO" for-each-ref --format='%(refname)' refs/heads)"
if grep -qx NO_CHANGE "$TEMP_ROOT/local-no-change-post.out" \
  && [ "$before_head" = "$(git -C "$REPO" rev-parse HEAD)" ] \
  && [ "$before_branches" = "$after_branches" ]; then
  record 0 "NO_CHANGE => no branch and no commit"
else
  record 1 "NO_CHANGE => no branch and no commit"
fi

make_repo local-changes-ready
sources_before="$(git -C "$REPO" ls-tree -r HEAD -- research/active/corpus-hypotheses/sources)"
remote_before="$(git --git-dir="$REMOTE" rev-parse refs/heads/main)"
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '%s\n' '# local commit fixture' >> \
  "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
(cd "$REPO" && CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120000 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) \
  >"$TEMP_ROOT/local-ready.out" 2>&1
local_commit="$(git -C "$REPO" rev-parse refs/heads/autoresearch/20260815-120000)"
if grep -qx CHANGES_READY "$TEMP_ROOT/local-ready.out" \
  && grep -qx NO_PUSH "$TEMP_ROOT/local-ready.out" \
  && [ "$(git -C "$REPO" branch --show-current)" = main ] \
  && [ "$(git -C "$REPO" rev-parse HEAD)" = "$(git -C "$REPO" rev-parse refs/remotes/origin/main)" ] \
  && [ "$(git --git-dir="$REMOTE" rev-parse refs/heads/main)" = "$remote_before" ] \
  && [ -z "$(git -C "$REPO" status --porcelain)" ] \
  && [ "$(git -C "$REPO" ls-tree -r "$local_commit" -- research/active/corpus-hypotheses/sources)" = "$sources_before" ]; then
  record 0 "CHANGES_READY => local commit, NO_PUSH, clean synchronized main, sources intact"
else
  record 1 "CHANGES_READY => local commit, NO_PUSH, clean synchronized main, sources intact"
fi
git -C "$REPO" branch -D autoresearch/20260815-120000 >/dev/null

make_repo malicious-post-commit
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '%s\n' '# malicious post-commit fixture' >> \
  "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
printf '%s\n' '#!/usr/bin/env bash' \
  'git push -q origin HEAD:refs/heads/malicious-hook-push' \
  > "$REPO/.git/hooks/post-commit"
chmod +x "$REPO/.git/hooks/post-commit"
mkdir -p "$TEMP_ROOT/empty-hooks-tmp"
(cd "$REPO" && TMPDIR="$TEMP_ROOT/empty-hooks-tmp" \
  CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120004 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) >/dev/null
if git -C "$REPO" show-ref --verify --quiet refs/heads/autoresearch/20260815-120004 \
  && ! git --git-dir="$REMOTE" show-ref --verify --quiet refs/heads/malicious-hook-push \
  && [ -z "$(find "$TEMP_ROOT/empty-hooks-tmp" -mindepth 1 -print -quit)" ]; then
  record 0 "malicious post-commit push hook => not executed; temporary hooks dir removed"
else
  record 1 "malicious post-commit push hook => not executed; temporary hooks dir removed"
fi

make_repo malicious-commit-hooks
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '%s\n' '# malicious hooks fixture' >> \
  "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
hooks_executed=0
for hook in pre-commit prepare-commit-msg commit-msg post-commit post-rewrite; do
  sentinel="$TEMP_ROOT/${hook}.executed"
  if [ "$hook" = pre-commit ]; then
    printf '%s\n' '#!/usr/bin/env bash' "touch '$sentinel'" 'exit 99' \
      > "$REPO/.git/hooks/$hook"
  else
    printf '%s\n' '#!/usr/bin/env bash' "touch '$sentinel'" \
      > "$REPO/.git/hooks/$hook"
  fi
  chmod +x "$REPO/.git/hooks/$hook"
done
mkdir -p "$TEMP_ROOT/failing-hooks-tmp"
set +e
(cd "$REPO" && TMPDIR="$TEMP_ROOT/failing-hooks-tmp" \
  CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120005 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) >/dev/null 2>&1
hooks_status=$?
set -e
for hook in pre-commit prepare-commit-msg commit-msg post-commit post-rewrite; do
  if [ -e "$TEMP_ROOT/${hook}.executed" ]; then
    hooks_executed=1
  fi
done
if [ "$hooks_status" -eq 0 ] \
  && [ "$hooks_executed" -eq 0 ] \
  && git -C "$REPO" show-ref --verify --quiet refs/heads/autoresearch/20260815-120005 \
  && [ "$(git -C "$REPO" branch --show-current)" = main ] \
  && [ "$(git -C "$REPO" rev-parse HEAD)" = "$(git -C "$REPO" rev-parse refs/remotes/origin/main)" ] \
  && [ -z "$(find "$TEMP_ROOT/failing-hooks-tmp" -mindepth 1 -print -quit)" ]; then
  record 0 "all git commit hooks including failing hook => not executed"
else
  record 1 "all git commit hooks including failing hook => not executed"
fi

make_repo local-commit-failure-cleanup
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '%s\n' '# preserve after commit failure' >> \
  "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
failure_hash="$(sha256sum "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md")"
mkdir -p "$TEMP_ROOT/failed-commit-hooks-tmp"
set +e
(cd "$REPO" && TMPDIR="$TEMP_ROOT/failed-commit-hooks-tmp" \
  GIT_AUTHOR_NAME= CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120006 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) >/dev/null 2>&1
commit_failure_status=$?
set -e
if [ "$commit_failure_status" -ne 0 ] \
  && git -C "$REPO" diff --cached --quiet \
  && [ "$(git -C "$REPO" branch --show-current)" = main ] \
  && [ "$failure_hash" = "$(sha256sum "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md")" ] \
  && [ -z "$(find "$TEMP_ROOT/failed-commit-hooks-tmp" -mindepth 1 -print -quit)" ]; then
  record 0 "commit failure => empty hooks dir removed, index reset, worktree preserved"
else
  record 1 "commit failure => empty hooks dir removed, index reset, worktree preserved"
fi

make_repo local-validation-failure
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '%s\n' '# invalid outside allowlist' > "$REPO/outside.txt"
set +e
(cd "$REPO" && CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120001 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) >/dev/null 2>&1
failure_status=$?
set -e
if [ "$failure_status" -ne 0 ] \
  && ! git -C "$REPO" show-ref --verify --quiet refs/heads/autoresearch/20260815-120001 \
  && git -C "$REPO" diff --cached --quiet \
  && [ -f "$REPO/outside.txt" ]; then
  record 0 "outside allowlist => refused with no commit and user change preserved"
else
  record 1 "outside allowlist => refused with no commit and user change preserved"
fi

make_repo validator-failure-no-commit
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '\n## Condition de renversement\n\n' >> \
  "$REPO/research/active/corpus-hypotheses/hypotheses/temporal-frustration.md"
set +e
(cd "$REPO" && CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120002 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) >/dev/null 2>&1
failure_status=$?
set -e
if [ "$failure_status" -ne 0 ] \
  && ! git -C "$REPO" show-ref --verify --quiet refs/heads/autoresearch/20260815-120002 \
  && git -C "$REPO" diff --cached --quiet; then
  record 0 "validation failure => no commit"
else
  record 1 "validation failure => no commit"
fi

make_repo branch-collision
git -C "$REPO" branch autoresearch/20260815-120003
collision_head="$(git -C "$REPO" rev-parse refs/heads/autoresearch/20260815-120003)"
(cd "$REPO" && ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh preflight) >/dev/null
printf '%s\n' '# collision fixture' >> \
  "$REPO/research/active/corpus-hypotheses/notes/2026-08-15-source-reconstruction.md"
(cd "$REPO" && CORPUS_AUTORESEARCH_TIMESTAMP=20260815-120003 \
  ./research/active/corpus-hypotheses/scripts/run_research_cycle.sh postflight) >/dev/null
if [ "$(git -C "$REPO" rev-parse refs/heads/autoresearch/20260815-120003)" = "$collision_head" ] \
  && git -C "$REPO" show-ref --verify --quiet refs/heads/autoresearch/20260815-120003-1; then
  record 0 "branch collision => existing branch preserved and unique branch created"
else
  record 1 "branch collision => existing branch preserved and unique branch created"
fi
git -C "$REPO" branch -D autoresearch/20260815-120003 \
  autoresearch/20260815-120003-1 >/dev/null

make_repo validators
mv "$REPO/corpus-11-tools/skills/change-validation/references/capability.md" \
  "$REPO/corpus-11-tools/skills/corpus-11-routing/references/capability.md"
if python3 "$REPO/corpus-11-tools/tools/validate_package.py" >/dev/null 2>&1; then
  record 1 "capability.md moved to non-capability skill => REFUSED"
else
  record 0 "capability.md moved to non-capability skill => REFUSED"
fi
git -C "$REPO" reset --hard -q HEAD

temporary="$TEMP_ROOT/capability.swap"
mv "$REPO/corpus-11-tools/skills/change-validation/references/capability.md" "$temporary"
mv "$REPO/corpus-11-tools/skills/chain-tracing/references/capability.md" \
  "$REPO/corpus-11-tools/skills/change-validation/references/capability.md"
mv "$temporary" "$REPO/corpus-11-tools/skills/chain-tracing/references/capability.md"
if python3 "$REPO/corpus-11-tools/tools/validate_package.py" >/dev/null 2>&1; then
  record 1 "capability.md associated with wrong skill => REFUSED"
else
  record 0 "capability.md associated with wrong skill => REFUSED"
fi
git -C "$REPO" reset --hard -q HEAD

python3 -c '
from pathlib import Path
p = Path("'"$REPO"'/research/active/corpus-hypotheses/hypotheses/temporal-frustration.md")
s = p.read_text(encoding="utf-8")
start = s.index("## Condition de renversement")
end = s.index("## Méthodes nécessaires", start)
p.write_text(s[:start] + "## Condition de renversement\n\n" + s[end:], encoding="utf-8")
'
if python3 "$REPO/research/active/corpus-hypotheses/scripts/validate_research_workspace.py" >/dev/null 2>&1; then
  record 1 "empty reversal condition => REFUSED"
else
  record 0 "empty reversal condition => REFUSED"
fi

echo "RESULT: $pass PASS, $fail FAIL"
[ "$fail" -eq 0 ]
