#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
cargo_bin="${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/cargo/bin/cargo"
rustup_dir="${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/rustup"
cargo_home="${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/cargo"

if [[ ! -x "${cargo_bin}" ]]; then
  echo "Toolchain Rust isolée absente : ${cargo_bin}" >&2
  exit 1
fi

exec env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" run --manifest-path "${project_dir}/Cargo.toml" --release -p corpus-cli -- "$@"
