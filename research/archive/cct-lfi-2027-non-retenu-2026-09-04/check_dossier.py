from pathlib import Path

ROOT = Path(__file__).resolve().parent

REQUIRED = [
    "README.md", "00-mandat.md", "01-gouvernance.md", "02-alignment-lfi.md", "02b-matrice-amendements.md",
    "03-mesures/catalogue.md", "04-droit-et-competences.md", "05-budget-et-capacites.md",
    "06-preuves/registre-sources.md", "06-preuves/liens-sources.md", "07-deploiement.md",
    "08-contradiction.md", "09-transmission.md", "10-auto-contradiction.md", "memo-transmission.md",
    "11-fiches-instruction.md", "12-matrice-budget-capacites.md",
    "13-envoi-groupe-thematique.md", "14-objections-politiques.md",
]

errors = []
for relative in REQUIRED:
    if not (ROOT / relative).is_file():
        errors.append(f"missing: {relative}")

catalogue = (ROOT / "03-mesures/catalogue.md").read_text(encoding="utf-8")
instruction = (ROOT / "11-fiches-instruction.md").read_text(encoding="utf-8")
budget = (ROOT / "12-matrice-budget-capacites.md").read_text(encoding="utf-8")
sources = (ROOT / "06-preuves/registre-sources.md").read_text(encoding="utf-8")
for number in range(1, 16):
    token = f"## M{number:02d}"
    if token not in catalogue:
        errors.append(f"missing measure: {token}")
    else:
        section = catalogue.split(token, 1)[1].split("\n## ", 1)[0]
        for field in ("Effet.", "Voie.", "Risque.", "Garde-fou.", "Indicateurs."):
            if field not in section:
                errors.append(f"M{number:02d} missing field: {field}")
    if f"## M{number:02d}" not in instruction:
        errors.append(f"instruction missing measure: M{number:02d}")

for source_id in range(9, 20):
    if f"S{source_id:02d}" not in sources:
        errors.append(f"missing legal source: S{source_id:02d}")

for heading in ("Fiches de coût", "Ordre de financement", "Essais budgétaires interdits"):
    if heading not in budget:
        errors.append(f"budget matrix missing: {heading}")

if errors:
    raise SystemExit("\n".join(errors))
print("PASS: dossier structure complete; transmission remains an external act and is not simulated")
