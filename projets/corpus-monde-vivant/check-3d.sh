#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
godot_bin="${workspace_dir}/.toolchains/godot/Godot_v4.7.2-stable_linux.x86_64"
scratch_dir=$(mktemp -d /tmp/corpus-3d-check-XXXXXX)
"${project_dir}/package.sh"
for scenario in smoke scenario; do
  env XDG_DATA_HOME="${scratch_dir}/data" XDG_CONFIG_HOME="${scratch_dir}/config" XDG_CACHE_HOME="${scratch_dir}/cache" \
    timeout 45 "${godot_bin}" --headless --path "${project_dir}/game-3d" \
    --script "res://${scenario}.gd" -- --autoplay --saves "${scratch_dir}/${scenario}"
done
echo "Traces de test conservées dans ${scratch_dir}"
