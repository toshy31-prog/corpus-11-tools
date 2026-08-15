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
  (cd "$ROOT" && tar -cf - corpus-11-tools) | (cd "$REPO" && tar -xf -)
  git -C "$REPO" init -q
  git -C "$REPO" config user.name "Corpus Adversarial Test"
  git -C "$REPO" config user.email "corpus-adversarial@example.invalid"
  git -C "$REPO" checkout -qb main
  git -C "$REPO" add -- corpus-11-tools
  git -C "$REPO" commit -qm fixture
  git init -q --bare "$REMOTE"
  git -C "$REPO" remote add origin "$REMOTE"
  git -C "$REPO" push -qu origin main
}

make_repo wrong-branch
git -C "$REPO" switch -qc feature
before="$(git -C "$REPO" rev-parse HEAD)"
if (cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "publisher on branch != main => REFUSED"
elif [ "$(git -C "$REPO" rev-parse HEAD)" = "$before" ]; then
  record 0 "publisher on branch != main => REFUSED"
else
  record 1 "publisher on branch != main => REFUSED"
fi
if (cd "$REPO" && ./corpus-11-tools/research/scripts/run_research_cycle.sh preflight) \
  >/dev/null 2>&1; then
  record 1 "deterministic preflight on branch != main => REFUSED"
else
  record 0 "deterministic preflight on branch != main => REFUSED"
fi

make_repo missing-origin
git -C "$REPO" remote remove origin
if (cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "origin absent => REFUSED"
else
  record 0 "origin absent => REFUSED"
fi

make_repo missing-origin-main
git -C "$REPO" update-ref -d refs/remotes/origin/main
if (cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "origin/main absent => REFUSED"
else
  record 0 "origin/main absent => REFUSED"
fi

make_repo push-retry
printf '%s\n' '# retry fixture' >> "$REPO/corpus-11-tools/research/notes/2026-08-15-source-reconstruction.md"
printf '%s\n' '#!/usr/bin/env bash' 'test ! -e "$(dirname "$0")/../reject"' > "$REMOTE/hooks/pre-receive"
chmod +x "$REMOTE/hooks/pre-receive"
touch "$REMOTE/reject"
set +e
(cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1
first_status=$?
set -e
first_head="$(git -C "$REPO" rev-parse HEAD)"
first_count="$(git -C "$REPO" rev-list --count HEAD)"
marker="$(git -C "$REPO" rev-parse --git-path corpus11-unpublished-main)"
rm -f -- "$REMOTE/reject"
set +e
(cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1
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
printf '%s\n' '# keep worktree' >> "$REPO/corpus-11-tools/research/notes/2026-08-15-source-reconstruction.md"
printf '%s\n' '#!/usr/bin/env bash' 'exit 1' > "$REPO/.git/hooks/pre-commit"
chmod +x "$REPO/.git/hooks/pre-commit"
set +e
(cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1
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
if (cd "$REPO" && ./corpus-11-tools/research/scripts/publish_research_cycle.sh) >/dev/null 2>&1; then
  record 1 "file outside allowlist => ERROR"
else
  record 0 "file outside allowlist => ERROR"
fi

make_repo timestamp-owned
set +e
(cd "$REPO" && ./corpus-11-tools/research/scripts/run_research_cycle.sh preflight) \
  >"$TEMP_ROOT/preflight.out" 2>&1
preflight_status=$?
set -e
printf '%s\n' fake-agent-timestamp \
  > "$REPO/corpus-11-tools/research/state/last_automation_run.txt"
set +e
(cd "$REPO" && ./corpus-11-tools/research/scripts/run_research_cycle.sh postflight) \
  >"$TEMP_ROOT/postflight.out" 2>&1
postflight_status=$?
set -e
if [ "$preflight_status" -eq 0 ] \
  && [ "$postflight_status" -eq 0 ] \
  && grep -qx 'SEMANTIC_AGENT_REQUIRED' "$TEMP_ROOT/preflight.out" \
  && grep -qx 'NO_CHANGE' "$TEMP_ROOT/postflight.out" \
  && [ ! -e "$REPO/corpus-11-tools/research/state/last_automation_run.txt" ] \
  && [ -z "$(git -C "$REPO" status --porcelain)" ]; then
  record 0 "timestamp modified between preflight/postflight is restored and non-substantive"
else
  record 1 "timestamp modified between preflight/postflight is restored and non-substantive"
fi

cycle_script="$ROOT/corpus-11-tools/research/scripts/run_research_cycle.sh"
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
p = Path("'"$REPO"'/corpus-11-tools/research/hypotheses/temporal-frustration.md")
s = p.read_text(encoding="utf-8")
start = s.index("## Condition de renversement")
end = s.index("## Méthodes nécessaires", start)
p.write_text(s[:start] + "## Condition de renversement\n\n" + s[end:], encoding="utf-8")
'
if python3 "$REPO/corpus-11-tools/research/scripts/validate_research_workspace.py" >/dev/null 2>&1; then
  record 1 "empty reversal condition => REFUSED"
else
  record 0 "empty reversal condition => REFUSED"
fi

echo "RESULT: $pass PASS, $fail FAIL"
[ "$fail" -eq 0 ]
