#!/usr/bin/env bash
set -euo pipefail

launcher_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
game_file="${launcher_dir}/dist/CORPUS-Jeu.html"

if [[ ! -f "${game_file}" ]]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "Le paquet CORPUS est absent et Node.js n'est pas disponible pour le reconstruire." >&2
    exit 1
  fi
  node "${launcher_dir}/build-browser.mjs"
  node "${launcher_dir}/package-standalone.mjs"
fi

if command -v xdg-open >/dev/null 2>&1; then
  exec xdg-open "${game_file}"
elif command -v gio >/dev/null 2>&1; then
  exec gio open "${game_file}"
elif command -v firefox >/dev/null 2>&1; then
  exec firefox "${game_file}"
else
  echo "Aucun navigateur graphique compatible n'a été trouvé." >&2
  exit 1
fi
