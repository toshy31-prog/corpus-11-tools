#!/usr/bin/env bash
# Provision a reproducible, mostly free/open-source Ubuntu workstation for Corpus 11.
# Safe to re-run: package installs and the shell block are idempotent.
set -Eeuo pipefail

workspace_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
shell_rc="${HOME}/.bashrc"
local_bin="${HOME}/.local/bin"

if [[ "${EUID}" -eq 0 ]]; then
  echo "Run this script as your normal user, not as root." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  age bat build-essential ca-certificates curl direnv fd-find flatpak fzf \
  gimp git git-delta gh inkscape jq kitty libreoffice-writer make \
  meld neovim nodejs npm obs-studio ocrmypdf okular pandoc pipx podman \
  podman-compose python3-venv rclone restic ripgrep shellcheck shfmt sqlite3 \
  syncthing tesseract-ocr tesseract-ocr-fra tmux yq zoxide

# Desktop research/code tools. Flatpak keeps their runtime separate from the OS.
if ! flatpak remotes --user --columns=name | grep -qx 'flathub'; then
  flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
fi
flatpak install -y --user flathub \
  com.logseq.Logseq com.vscodium.codium io.dbeaver.DBeaverCommunity org.zotero.Zotero

mkdir -p "${local_bin}"

# Corpus uses only locked Python validation dependencies and Node 18+ built-ins.
make -C "${workspace_dir}" bootstrap

git config --global init.defaultBranch main
git config --global fetch.prune true
git config --global pull.ff only
git config --global core.pager delta
git config --global interactive.diffFilter 'delta --color-only'
git config --global delta.navigate true
git config --global delta.side-by-side false

begin_marker='# >>> corpus-ubuntu-workstation >>>'
end_marker='# <<< corpus-ubuntu-workstation <<<'
tmp_rc="$(mktemp)"
if [[ -f "${shell_rc}" ]]; then
  awk -v start="${begin_marker}" -v end="${end_marker}" '
    $0 == start { skip=1; next }
    $0 == end { skip=0; next }
    !skip { print }
  ' "${shell_rc}" > "${tmp_rc}"
fi
cat >> "${tmp_rc}" <<'EOF'

# >>> corpus-ubuntu-workstation >>>
# Short names for Ubuntu package names; no project state is changed here.
alias fd='fdfind'
alias bat='batcat'
EOF
printf 'alias corpus=%q\n' "cd ${workspace_dir}" >> "${tmp_rc}"
cat >> "${tmp_rc}" <<'EOF'

case ":${PATH}:" in
  *":${HOME}/.local/bin:"*) ;;
  *) export PATH="${HOME}/.local/bin:${PATH}" ;;
esac
command -v direnv >/dev/null 2>&1 && eval "$(direnv hook bash)"
command -v zoxide >/dev/null 2>&1 && eval "$(zoxide init bash)"
[[ -r /usr/share/doc/fzf/examples/key-bindings.bash ]] && source /usr/share/doc/fzf/examples/key-bindings.bash
[[ -r /usr/share/doc/fzf/examples/completion.bash ]] && source /usr/share/doc/fzf/examples/completion.bash
# <<< corpus-ubuntu-workstation <<<
EOF
mv "${tmp_rc}" "${shell_rc}"

echo
echo "Corpus Ubuntu workstation ready. Open a new terminal, then run:"
echo "  corpus && make verify"
echo "  codex plugin marketplace add . && codex plugin add corpus-11-tools@corpus-11-local"
