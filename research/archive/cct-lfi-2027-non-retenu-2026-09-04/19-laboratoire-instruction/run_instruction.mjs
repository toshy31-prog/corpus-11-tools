import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const guarantees = ["A1_dependances", "A2_continuite", "A3_hors_numerique", "A4_exceptions", "A5_charge", "A6_contradiction"];
const required = ["droit", "budget_capacite", "territoire"];

// Profils de pieces, non territoires reels : ils testent le protocole, pas la France.
const profiles = {
  pieces_completes: Object.fromEntries(guarantees.map((id) => [id, { droit: "P", budget_capacite: "P", territoire: "P" }])),
  droit_sans_capacite_locale: Object.fromEntries(guarantees.map((id) => [id, { droit: "P", budget_capacite: "C", territoire: "A" }])),
  capacite_sans_base_juridique: Object.fromEntries(guarantees.map((id) => [id, { droit: "A", budget_capacite: "P", territoire: "P" }])),
  voie_humaine_absente: Object.fromEntries(guarantees.map((id) => [id, { droit: "P", budget_capacite: "P", territoire: id === "A3_hors_numerique" ? "A" : "C" }])),
};

function classify(record) {
  const missing = required.filter((key) => record[key] === "A");
  const conditional = required.filter((key) => record[key] === "C");
  if (missing.length) return { status: "A_RETENIR", missing, conditional };
  if (conditional.length) return { status: "PRET_A_INSTRUIRE_SOUS_CONDITIONS", missing, conditional };
  return { status: "PRET_A_INSTRUIRE", missing, conditional };
}

const results = Object.fromEntries(Object.entries(profiles).map(([profile, records]) => [profile,
  Object.fromEntries(Object.entries(records).map(([id, record]) => [id, { pieces: record, ...classify(record) }]))
]));
const report = {
  title: "Qualification juridique-budget-territoire : moteur interne",
  source: "internal_synthetic",
  boundary: "Les profils representent des pieces disponibles ou absentes ; ils ne decrivent aucun territoire reel et ne sont pas une expertise juridique ou budgetaire.",
  rules: { all_three_present: "PRET_A_INSTRUIRE", any_absent: "A_RETENIR", no_claim: ["legalite", "financement", "faisabilite_nationale"] },
  results,
};
await writeFile(resolve(here, "resultat-interne.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
