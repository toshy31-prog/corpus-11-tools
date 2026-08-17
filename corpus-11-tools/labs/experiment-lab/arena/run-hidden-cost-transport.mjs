import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findOutcomeEquivalents } from "./campaign/pareto.mjs";
import { compiledHiddenCostThermal, thermalHoldControl } from "./compiler/hidden-cost-thermal-binding.mjs";
import { thermalMosaicContenders, thermalMosaicScenario } from "./fixtures/thermal-mosaic.mjs";
import { runBlindArena } from "./runner.mjs";
import { proposeLifecycleDecision } from "./lifecycle/decide.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const policy = JSON.parse(await readFile(resolve(here, "lifecycle/policy.json"), "utf8"));

const contenders = [...thermalMosaicContenders, thermalHoldControl, compiledHiddenCostThermal];
const result = runBlindArena({
  arenaId: "hidden-cost-transport-thermal-001",
  scenario: thermalMosaicScenario,
  contenders,
  seed: 17,
  blindKey: "hidden-cost-transport-secret",
});
const outcomesById = Object.fromEntries(result.report.runs.map((run) => [
  result.sealedIdentityMap[run.label], run.outcomes,
]));
const output = {
  source: "ilyana-sorel-wet-bell",
  target: "thermal-mosaic-internal-fixture",
  report: result.report,
  outcomesById,
  exactOutcomeEquivalenceGroups: findOutcomeEquivalents(outcomesById),
  lifecycleProposal: proposeLifecycleDecision({
    candidateId: compiledHiddenCostThermal.manifest.id,
    report: result.report,
    sealedIdentityMap: result.sealedIdentityMap,
    policy,
    negativeControlIds: [thermalHoldControl.manifest.id],
  }),
  transportBoundary: "target execution tests a new binding, not transport of source validity",
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
