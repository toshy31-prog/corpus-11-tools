from __future__ import annotations

from collections import Counter, defaultdict
import csv
from pathlib import Path

from limit_tests_50 import CASES, INVARIANTS


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "results-limit-50"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    counts = Counter(case.verdict for case in CASES)
    by_family = defaultdict(Counter)
    for case in CASES:
        by_family[case.family][case.verdict] += 1

    with (OUT / "summary.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["id", "family", "verdict", "invariants", "scene", "observable", "failure", "finding", "patch"])
        for case in CASES:
            writer.writerow([case.id, case.family, case.verdict, " ".join(case.invariants), case.scene,
                             case.observable, case.failure, case.finding, case.patch])

    lines = [
        "# CCT-L50-001 — cinquante tests-limites de la CCT v0.10",
        "",
        "## Statut de l'épreuve",
        "",
        "Cette épreuve est un audit conceptuel reproductible : elle vérifie si la version écrite contient une réponse, un observable et une voie de récupération. Elle ne simule ni comportements collectifs ni effets causaux. « Robuste sur le papier » signifie seulement qu'un mécanisme explicite couvre déjà le cas.",
        "",
        "## Résultat brut",
        "",
        f"- {counts['robuste_sur_le_papier']} cas robustes sur le papier ;",
        f"- {counts['partiel']} réponses partielles ;",
        f"- {counts['rupture']} ruptures de spécification.",
        "",
        "La conclusion forte est que la v0.10 couvre assez bien les attaques isolées contre les droits ou les organes formels, mais reste fragile devant les dépendances techniques cachées, les chocs composés et la saturation simultanée de ses contre-pouvoirs.",
        "",
        "## Matrice par famille",
        "",
        "| Famille | Robuste | Partiel | Rupture |",
        "|---|---:|---:|---:|",
    ]
    for family in sorted(by_family):
        n = by_family[family]
        lines.append(f"| {family} | {n['robuste_sur_le_papier']} | {n['partiel']} | {n['rupture']} |")

    lines += ["", "## Les cinquante scènes", ""]
    for family in sorted({case.family for case in CASES}):
        lines += [f"### {family}", ""]
        for case in [c for c in CASES if c.family == family]:
            label = {"robuste_sur_le_papier": "ROBUSTE/PAPIER", "partiel": "PARTIEL", "rupture": "RUPTURE"}[case.verdict]
            lines += [
                f"#### {case.id} — {label}", "",
                f"**Scène.** {case.scene}", "",
                f"**Centre probable.** {case.center}.", "",
                f"**Observable.** {case.observable}.", "",
                f"**Échec si.** {case.failure}.", "",
                f"**Résultat.** {case.finding}", "",
                f"**Correction.** {case.patch}", "",
                f"**Invariants concernés.** {', '.join(case.invariants)}.", "",
            ]

    lines += ["## Invariants candidats v0.11", ""]
    for key, value in INVARIANTS.items():
        lines.append(f"- **{key}** — {value}")

    lines += [
        "", "## Dix ruptures nettes", "",
        "1. absence de constitution hors ligne pour les droits vitaux ;",
        "2. absence de règle de pénurie quand plancher et plafond sont physiquement incompatibles ;",
        "3. absence de droit de sortie territoriale avec dette et continuité bornées ;",
        "4. archives ouvertes mais non récupérables si une clé technique unique disparaît ;",
        "5. anticoncentration contournable par fragmentation coordonnée ;",
        "6. transitions testées séparément mais pas en contention sur les mêmes ressources ;",
        "7. retour au civil sans leviers matériels suffisants contre une force désobéissante ;",
        "8. réparation de dernier ressort non garantie en cas d'insolvabilité ;",
        "9. redondances sectorielles partageant potentiellement une même cause de panne ;",
        "10. absence de budget global lorsque tous les contrôles renforcés s'activent ensemble.",
        "", "## Paquet de reconstruction v0.11", "",
        "La prochaine version doit ajouter six mécanismes : mode constitutionnel dégradé hors ligne ; protocole de pénurie impossible ; registre des clés et dépendances effectives ; budget de charge constitutionnelle avec ordre de délestage ; extinction atomique des pouvoirs temporaires ; laboratoire adverse externe avec seuils gelés.",
        "", "## Condition de renversement", "",
        "Ce diagnostic serait affaibli si une lecture indépendante montrait que ces dix mécanismes sont déjà exécutables, attribués et testables dans la v0.10, ou si des scénarios externes à information comparable ne reproduisaient pas la fragilité aux chocs composés. Il serait renforcé par un échec de P-005, notamment si les protections se neutralisent mutuellement sous charge.",
    ]
    (OUT / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {len(CASES)} cases to {OUT}")


if __name__ == "__main__":
    main()
