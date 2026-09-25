from pathlib import Path
from datetime import datetime

ALG = Path("lib/evidence-algebra.mjs")
LIVE = Path("scripts/live-track-resolution-engine.mjs")

for p in (ALG, LIVE):
    if not p.exists():
        raise SystemExit(f"{p} introuvable — aucun changement.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
for p in (ALG, LIVE):
    Path(f"/tmp/{p.name}.before-v8_1-{stamp}.mjs").write_text(p.read_text())

# 1. Live engine : preferred peut être un Set.
s = LIVE.read_text()

needle = 'preferred.some(\n          (preferredArtist) =>'
replacement = 'Array.from(preferred || []).some(\n          (preferredArtist) =>'

count = s.count(needle)

if count == 0:
    raise SystemExit("Aucune occurrence de preferred.some attendue — aucun patch live appliqué.")

s = s.replace(needle, replacement)
LIVE.write_text(s)

# 2. Algèbre : deux qualifiants parenthétiques différents
#    représentent une vraie divergence, pas une variante de crédit.
s = ALG.read_text()

marker = '''export function relationBetweenNames(a, b) {
  const A = clean(a);
  const B = clean(b);

  if (!A || !B) return null;
'''

insert = '''export function relationBetweenNames(a, b) {
  const A = clean(a);
  const B = clean(b);

  if (!A || !B) return null;

  const terminalQualifier = (value) => {
    const match = value.match(/\\(([^()]{1,80})\\)\\s*$/u);
    return match ? looseKey(match[1]) : "";
  };

  const qualifierA = terminalQualifier(A);
  const qualifierB = terminalQualifier(B);

  if (
    qualifierA &&
    qualifierB &&
    qualifierA !== qualifierB
  ) {
    return RELATIONS.COMPETING_IDENTITY;
  }
'''

if marker not in s:
    raise SystemExit("relationBetweenNames attendue introuvable — aucun patch algèbre appliqué.")

s = s.replace(marker, insert, 1)
ALG.write_text(s)

print("===== V8.1 CORRECTIF RELATION KERNEL =====")
print("Live preferred.some corrigés :", count)
print("Protection qualifiants parenthétiques : OK")
print("Backups /tmp suffixe :", stamp)
print("Aucune mutation du graphe.")