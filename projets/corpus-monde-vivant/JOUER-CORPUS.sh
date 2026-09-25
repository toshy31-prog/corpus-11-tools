#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
executable="${project_dir}/dist/CORPUS-Monde-vivant"
save_file="${project_dir}/saves/monde-principal.save"

if [[ ! -x "${executable}" ]]; then
  "${project_dir}/package.sh"
fi

exec "${executable}" --save "${save_file}"
