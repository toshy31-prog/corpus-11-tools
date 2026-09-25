#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
godot_bin="${workspace_dir}/.toolchains/godot/Godot_v4.7.2-stable_linux.x86_64"

if [[ ! -x "${project_dir}/dist/CORPUS-Monde-vivant" ]]; then
  "${project_dir}/package.sh"
fi

if [[ ! -x "${godot_bin}" ]]; then
  echo "Godot local absent : ${godot_bin}" >&2
  exit 1
fi

exec "${project_dir}/JOUER-3D.sh" "$@"
