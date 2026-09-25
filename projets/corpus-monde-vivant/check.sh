#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_dir="$(cd -- "${project_dir}/../.." && pwd)"
cargo_bin="${workspace_dir}/.toolchains/cargo/bin/cargo"
rustup_dir="${workspace_dir}/.toolchains/rustup"
cargo_home="${workspace_dir}/.toolchains/cargo"

env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" fmt --manifest-path "${project_dir}/Cargo.toml" --all --check
env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" clippy --manifest-path "${project_dir}/Cargo.toml" --all-targets -- -D warnings
env CARGO_HOME="${cargo_home}" RUSTUP_HOME="${rustup_dir}" \
  "${cargo_bin}" test --manifest-path "${project_dir}/Cargo.toml" --all-targets
