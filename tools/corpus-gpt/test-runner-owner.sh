#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; SRC="$ROOT/tools/corpus-gpt/corpus-bb-run"; INST="$ROOT/tools/corpus-gpt/install-corpus-bb-run"; DEP="$HOME/.local/bin/corpus-bb-run"
[ "$(sha256sum "$SRC"|awk '{print $1}')" = "c0cee1b44cf75986748db4d80e9da695ea85b1ed8199709fb8dc1c9c2b494783" ]
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
