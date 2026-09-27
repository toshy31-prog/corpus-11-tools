#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
exec "${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/godot/Godot_v4.7.2-stable_linux.x86_64" --path "${project_dir}/game-godot" "$@"
