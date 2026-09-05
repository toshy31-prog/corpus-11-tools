import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBlindArena } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const events = [
  { continuity: -8, access: -2, reversibility: 0, burden: 3, label: "transfert d'operateur" },
  { continuity: -14, access: -4, reversibility: 0, burden: 6, label: "canicule et pic de demande" },
  { continuity: -4, access: -18, reversibility: 0, burden: 9, label: "panne numerique" },
  { continuity: -3, access: -3, reversibility: -14, burden: 4, label: "mesure d'urgence prolongee" },
];
const clamp = (value) => Math.max(0, Math.min(100, value));

const scenario = {
  manifest: {
    id: "lfi-six-guarantees-stress-test",
    version: "1.0.0",
    title: "Stress test synthetique des garanties de continuite et de recours",
    rounds: 4,
    dimensions: ["service_continuity", "rights_access", "decision_reversibility", "resident_burden", "delivery_progress"],
    reversalConditions: [
      "Une garantie reduit la continuite ou l'acces dans tous les scenarii synthetiques testes.",
      "Un gain de continuite n'apparait qu'en supprimant le recours ou la voie humaine.",
      "Un result at favorable est presente comme une preuve de terrain ou de transportabilite."
    ],
    source: { regime: "internal_synthetic", authorId: "cct-france", authorRelationToCorpus: "maintainer", frozenBeforeContenders: true, authorshipTrace: "cct-lfi-synthetic-stress-test-2026-09-01" },
  },
  createTrial() { return { world: { continuity: 75, access: 75, reversibility: 65, burden: 25, delivery: 0, prepared: false }, exogenous: events }; },
  project({ world, round }) { return { round, continuity: world.continuity, access: world.access, reversibility: world.reversibility, burden: world.burden, prepared: world.prepared }; },
  admissibleActions() { return ["accelerate", "prepare", "guarantee"]; },
  act({ world, action, round, exogenous }) {
    const e = exogenous[round];
    world.continuity = clamp(world.continuity + e.continuity);
    world.access = clamp(world.access + e.access);
    world.reversibility = clamp(world.reversibility + e.reversibility);
    world.burden = clamp(world.burden + e.burden);
    if (action === "accelerate") { world.delivery = clamp(world.delivery + 22); world.continuity = clamp(world.continuity - 5); world.access = clamp(world.access - 4); world.burden = clamp(world.burden + 4); }
    if (action === "prepare") { world.delivery = clamp(world.delivery + 7); world.prepared = true; world.continuity = clamp(world.continuity + 10); world.access = clamp(world.access + 3); world.burden = clamp(world.burden - 4); }
    if (action === "guarantee") { world.delivery = clamp(world.delivery + 12); world.continuity = clamp(world.continuity + (world.prepared ? 8 : 3)); world.access = clamp(world.access + 13); world.reversibility = clamp(world.reversibility + 15); world.burden = clamp(world.burden - 8); }
  },
  observe({ world, round }) { return { round, ...world }; },
  scorePredictions({ predictions, observation }) { return { stated: predictions, access_error: Math.abs(predictions.access - observation.access), continuity_error: Math.abs(predictions.continuity - observation.continuity) }; },
  close({ world }) { return { service_continuity: world.continuity, rights_access: world.access, decision_reversibility: world.reversibility, resident_burden: world.burden, delivery_progress: world.delivery }; },
};

function predict(view, action, round) {
  const e = events[round];
  const gains = action === "accelerate" ? { continuity: -5, access: -4 } : action === "prepare" ? { continuity: 10, access: 3 } : { continuity: view.prepared ? 8 : 3, access: 13 };
  return { continuity: clamp(view.continuity + e.continuity + gains.continuity), access: clamp(view.access + e.access + gains.access) };
}
const contenders = [
  { manifest: { id: "rapid-delivery", version: "1.0.0", title: "Acceleration immediate", family: "delivery-first" }, decide({ view, round }) { const action = "accelerate"; return { action, predictions: predict(view, action, round) }; } },
  { manifest: { id: "prepare-then-guarantee", version: "1.0.0", title: "Preparation puis garanties", family: "continuity-rights" }, decide({ view, round }) { const action = round === 0 ? "prepare" : "guarantee"; return { action, predictions: predict(view, action, round) }; } },
  { manifest: { id: "conditional-guarantee", version: "1.0.0", title: "Garantie conditionnelle", family: "threshold" }, decide({ view, round }) { const action = (view.access < 65 || view.continuity < 65) ? "guarantee" : "accelerate"; return { action, predictions: predict(view, action, round) }; } },
];

const { report, sealedIdentityMap } = runBlindArena({ arenaId: "cct-lfi-six-001", scenario, contenders, seed: 20260901, blindKey: "cct-lfi-blind-key-2026" });
await writeFile(resolve(here, "resultat-interne.json"), `${JSON.stringify({ report, sealedIdentityMap }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
