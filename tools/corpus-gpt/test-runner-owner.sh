#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; SRC="$ROOT/tools/corpus-gpt/corpus-bb-run"; INST="$ROOT/tools/corpus-gpt/install-corpus-bb-run"; DEP="$HOME/.local/bin/corpus-bb-run"
[ -x "$SRC" ]; bash -n "$SRC"; bash -n "$INST"
set +e; "$INST" /tmp/evil >/dev/null 2>&1; rc=$?; set -e; [ "$rc" -ne 0 ]
td="$(mktemp -d)"; trap 'rm -rf "$td"' EXIT; mkdir -p "$td/repo/tools/corpus-gpt" "$td/home/.local/bin"
cp "$SRC" "$td/repo/tools/corpus-gpt/corpus-bb-run"; cp "$INST" "$td/repo/tools/corpus-gpt/install-corpus-bb-run"; chmod 775 "$td/repo/tools/corpus-gpt/"*
printf '#!/usr/bin/env bash\necho old\n' > "$td/home/.local/bin/corpus-bb-run"; chmod 775 "$td/home/.local/bin/corpus-bb-run"
old="$(sha256sum "$td/home/.local/bin/corpus-bb-run"|awk '{print $1}')"
HOME="$td/home" "$td/repo/tools/corpus-gpt/install-corpus-bb-run" > "$td/install.out"
src="$(sha256sum "$td/repo/tools/corpus-gpt/corpus-bb-run"|awk '{print $1}')"; dep="$(sha256sum "$td/home/.local/bin/corpus-bb-run"|awk '{print $1}')"; [ "$src" = "$dep" ]; [ "$(stat -c '%a' "$td/home/.local/bin/corpus-bb-run")" = 775 ]
backup="$(sed -n 's/^RUNNER_BACKUP=//p' "$td/install.out")"; [ -f "$backup" ]; [ "$(sha256sum "$backup"|awk '{print $1}')" = "$old" ]
HOME="$td/home" "$td/repo/tools/corpus-gpt/install-corpus-bb-run" --rollback "$backup" >/dev/null
[ "$(sha256sum "$td/home/.local/bin/corpus-bb-run"|awk '{print $1}')" = "$old" ]
echo RUNNER_OWNER_TEST=PASS

# Inherited-lock security: exact path is insufficient unless that FD can own the flock.
rtd="$(mktemp -d)"; trap 'rm -rf "$td" "$rtd"' EXIT
rh="$rtd/home"; mkdir -p "$rh/.local/share/corpus-bb-runner/jobs" "$rh/.local/share/corpus-bb-runner/state"
rjob="$rh/.local/share/corpus-bb-runner/jobs/x.sh"
printf '#!/usr/bin/env bash\necho EXECUTED >> "$HOME/count"\n' > "$rjob"; chmod +x "$rjob"
rlock="$rh/.local/share/corpus-bb-runner/state/runner-v2.lock"
exec 8>"$rlock"; flock -n 8
# Legacy path remains fail-fast.
set +e
HOME="$rh" "$SRC" "$rjob" >/dev/null 2>&1; rc=$?
set -e
[ "$rc" -eq 4 ]; [ ! -e "$rh/count" ]
# Forged inherited FD points to the exact file but does not own it.
exec 7>"$rlock"
set +e
HOME="$rh" CORPUS_BB_LOCK_HELD_FD=7 "$SRC" "$rjob" >/dev/null 2>&1; rc=$?
set -e
[ "$rc" -eq 4 ]; [ ! -e "$rh/count" ]
# The actual owning FD is accepted and remains the exclusion owner for the run.
HOME="$rh" CORPUS_BB_LOCK_HELD_FD=8 "$SRC" "$rjob" >/dev/null
[ "$(wc -l < "$rh/count")" -eq 1 ]
echo INHERITED_LOCK_SECURITY_TEST=PASS
