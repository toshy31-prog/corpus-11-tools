#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
"${project_dir}/package.sh"
bundle_dir="${project_dir}/dist/CORPUS-3D-linux"
mkdir -p "${bundle_dir}/game" "${bundle_dir}/third-party" "${bundle_dir}/runtime"
install -m 755 "${workspace_dir}/.toolchains/godot/Godot_v4.7.2-stable_linux.x86_64" "${bundle_dir}/runtime/Godot"
env CARGO_HOME="${workspace_dir}/.toolchains/cargo" RUSTUP_HOME="${workspace_dir}/.toolchains/rustup" \
  "${workspace_dir}/.toolchains/cargo/bin/rustc" --edition 2024 -O \
  "${project_dir}/packaging/launcher.rs" -o "${bundle_dir}/CORPUS"
install -m 755 "${project_dir}/dist/CORPUS-Monde-vivant" "${bundle_dir}/CORPUS-Core"
install -m 755 "${project_dir}/packaging/JOUER.sh" "${bundle_dir}/JOUER.sh"
for name in project.godot main.tscn main.gd backend.gd models.gd landscape.gd water.gdshader; do
  install -m 644 "${project_dir}/game-3d/${name}" "${bundle_dir}/game/${name}"
done
for name in GODOT-LICENSE.txt GODOT-COPYRIGHT.txt GODOT-AUTHORS.md; do
  install -m 644 "${project_dir}/third-party/${name}" "${bundle_dir}/third-party/${name}"
done
install -m 644 "${project_dir}/README_RUN.md" "${bundle_dir}/LIRE-MOI.md"
install -m 644 "${project_dir}/OPEN_SOURCE.md" "${bundle_dir}/OPEN_SOURCE.md"
tar -czf "${project_dir}/dist/CORPUS-3D-linux.tar.gz" -C "${project_dir}/dist" CORPUS-3D-linux
echo "Jeu autonome : ${bundle_dir}/JOUER.sh"
