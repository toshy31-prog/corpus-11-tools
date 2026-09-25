#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
cargo_bin="${workspace_dir}/.toolchains/cargo/bin/cargo"
rustup_dir="${workspace_dir}/.toolchains/rustup"
cargo_home="${workspace_dir}/.toolchains/cargo"

if [[ ! -x "${cargo_bin}" ]]; then
  echo "Toolchain Rust isolée absente : ${cargo_bin}" >&2
  exit 1
fi

exec env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" run --manifest-path "${project_dir}/Cargo.toml" --release -p corpus-cli -- "$@"
