from pathlib import Path
from datetime import datetime

p = Path("lib/track-resolution.mjs")
if not p.exists():
    raise SystemExit("lib/track-resolution.mjs introuvable — aucun changement.")

s = p.read_text()

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/track-resolution.before-evidence-algebra-v7-{stamp}.mjs")
backup.write_text(s)

import_block = '''import {
  relationBetweenNames,
  RELATIONS
} from "./evidence-algebra.mjs";
'''

if 'from "./evidence-algebra.mjs"' not in s:
    first_function = s.find("function ")
    if first_function == -1:
        raise SystemExit(
            "Aucune fonction trouvée dans track-resolution.mjs — aucun changement."
        )

    prefix = s[:first_function]
    suffix = s[first_function:]

    if prefix and not prefix.endswith("\n\n"):
        prefix = prefix.rstrip() + "\n\n"

    s = prefix + import_block + "\n" + suffix

needle = "function probableCreditVariant(a, b)"
start = s.find(needle)

if start == -1:
    raise SystemExit(
        "probableCreditVariant(a, b) introuvable — aucun changement appliqué."
    )

brace = s.find("{", start)
if brace == -1:
    raise SystemExit("Accolade d'ouverture introuvable — aucun changement.")

depth = 0
end = None

for i in range(brace, len(s)):
    ch = s[i]
    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

if end is None:
    raise SystemExit("Fin de probableCreditVariant introuvable — aucun changement.")

replacement = '''function probableCreditVariant(a, b) {
  return (
    relationBetweenNames(a, b) ===
    RELATIONS.CREDIT_VARIANT
  );
}'''

before = s[start:end]
s = s[:start] + replacement + s[end:]

p.write_text(s)

print("===== EVIDENCE ALGEBRA V7 — PATCH =====")
print("Fichier :", p)
print("Backup  :", backup)
print()
print("Ancienne fonction remplacée :")
print(before)
print()
print("Nouvelle fonction :")
print(replacement)
print()
print("Aucune autre règle de résolution n'a été migrée.")
