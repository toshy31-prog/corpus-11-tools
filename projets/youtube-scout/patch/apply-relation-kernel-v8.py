from pathlib import Path
from datetime import datetime

ALG = Path("lib/evidence-algebra.mjs")
LIVE = Path("scripts/live-track-resolution-engine.mjs")

for p in (ALG, LIVE):
    if not p.exists():
        raise SystemExit(f"{p} introuvable — aucun changement.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
for p in (ALG, LIVE):
    Path(f"/tmp/{p.name}.before-relation-kernel-v8-{stamp}").write_text(p.read_text())

s = ALG.read_text()
marker = "export function collapseDuplicateFacts(facts = []) {"
if marker not in s:
    raise SystemExit("Point d'insertion algèbre introuvable.")

helpers = '''
export function isNonCompetingRelation(relation = "") {
  return [
    RELATIONS.SAME_IDENTITY,
    RELATIONS.ORTHOGRAPHIC_VARIANT,
    RELATIONS.CREDIT_VARIANT,
    RELATIONS.DOCUMENTED_ALIAS
  ].includes(relation);
}

export function namesAreNonCompeting(a, b) {
  return isNonCompetingRelation(
    relationBetweenNames(a, b)
  );
}

'''

if "export function namesAreNonCompeting" not in s:
    s = s.replace(marker, helpers + marker)
ALG.write_text(s)

s = LIVE.read_text()
import_block = '''import {
  namesAreNonCompeting
} from "../lib/evidence-algebra.mjs";
'''

if 'from "../lib/evidence-algebra.mjs"' not in s:
    idx = s.find("const ROOT")
    if idx == -1:
        raise SystemExit("const ROOT introuvable dans live engine.")
    s = s[:idx].rstrip() + "\n\n" + import_block + "\n" + s[idx:]

needle = "!nonCompetingVariants.has(k)"
replacement = '''!nonCompetingVariants.has(k) &&
        !preferred.some(
          (preferredArtist) =>
            namesAreNonCompeting(
              preferredArtist.name || preferredArtist,
              name
            )
        )'''

count = s.count(needle)
if count == 0:
    raise SystemExit("Filtre nonCompetingVariants introuvable — aucun patch live.")

s = s.replace(needle, replacement)
LIVE.write_text(s)

print("===== EVIDENCE ALGEBRA V8 — RELATION KERNEL =====")
print("Algèbre :", ALG)
print("Live    :", LIVE)
print("Filtres renforcés :", count)
print("Backups /tmp suffixe :", stamp)
print("Aucune mutation du graphe.")
