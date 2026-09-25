#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
cargo_bin="${workspace_dir}/.toolchains/cargo/bin/cargo"
rustup_dir="${workspace_dir}/.toolchains/rustup"
cargo_home="${workspace_dir}/.toolchains/cargo"

env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" build --manifest-path "${project_dir}/Cargo.toml" --release -p corpus-cli

mkdir -p "${project_dir}/dist" "${project_dir}/saves"
install -m 755 "${project_dir}/target/release/corpus-cli" \
  "${project_dir}/dist/CORPUS-Monde-vivant"

echo "Exécutable prêt : ${project_dir}/dist/CORPUS-Monde-vivant"
