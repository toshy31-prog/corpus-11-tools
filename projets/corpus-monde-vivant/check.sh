#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
cargo_bin="${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/cargo/bin/cargo"
rustup_dir="${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/rustup"
cargo_home="${CORPUS_TOOLCHAINS_ROOT:-${HOME}/.local/share/corpus/toolchains}/corpus-3d/cargo"

env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" fmt --manifest-path "${project_dir}/Cargo.toml" --all --check
env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" clippy --manifest-path "${project_dir}/Cargo.toml" --all-targets -- -D warnings
env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" test --manifest-path "${project_dir}/Cargo.toml" --all-targets
