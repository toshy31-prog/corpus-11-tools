#!/usr/bin/env bash
# Apply the safe, reproducible user-level configuration for a Corpus workstation.
# Account credentials, device pairing, and backup targets deliberately stay manual.
set -Eeuo pipefail

workspace_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
local_bin="${HOME}/.local/bin"
notes_dir="${HOME}/Documents/Corpus-Notes"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing command: $1. Run scripts/setup-corpus-ubuntu.sh first." >&2
    exit 1
  }
}

need git
need flatpak
need systemctl

mkdir -p "${local_bin}" "${notes_dir}"

if [[ ! -e "${notes_dir}/README.md" ]]; then
  cat > "${notes_dir}/README.md" <<'EOF'
# Notes Corpus

Notes personnelles de recherche. Ce dossier est séparé du dépôt Corpus pour ne
pas confondre les notes de travail, le produit, les expériences et les archives.
EOF
fi

make_wrapper() {
  local command_name="$1"
  local app_id="$2"
  cat > "${local_bin}/${command_name}" <<EOF
#!/bin/sh
exec flatpak run ${app_id} "\$@"
EOF
  chmod 0755 "${local_bin}/${command_name}"
}

make_wrapper codium com.vscodium.codium
make_wrapper zotero org.zotero.Zotero
make_wrapper dbeaver io.dbeaver.DBeaverCommunity
make_wrapper logseq com.logseq.Logseq

# Git: safe defaults for a single-user research workstation. No identity or
# credential helper is configured here because those are personal choices.
git config --global diff.tool meld
git config --global merge.tool meld
git config --global difftool.prompt false
git config --global mergetool.prompt false
git config --global merge.conflictStyle zdiff3
git config --global rerere.enabled true

# Use the VSCodium Flatpak CLI to install only open-source workflow extensions.
extensions=(
  yzhang.markdown-all-in-one
  EditorConfig.EditorConfig
  redhat.vscode-yaml
  ms-python.python
  timonwong.shellcheck
  mkhl.shfmt
  mhutchie.git-graph
)

if flatpak info --user com.vscodium.codium >/dev/null 2>&1; then
  for extension in "${extensions[@]}"; do
    flatpak run com.vscodium.codium --install-extension "${extension}" --force || \
      echo "WARNING: VSCodium extension not installed: ${extension}" >&2
  done
fi

# Syncthing starts locally only; pairing a second device remains an explicit step.
systemctl --user enable --now syncthing.service

echo
echo "Automated configuration complete. Open a new terminal, then use:"
echo "  codium ${workspace_dir}"
echo "  logseq ${notes_dir}"
echo "  zotero"
echo "  dbeaver"
echo "  syncthing (then open http://127.0.0.1:8384)"
