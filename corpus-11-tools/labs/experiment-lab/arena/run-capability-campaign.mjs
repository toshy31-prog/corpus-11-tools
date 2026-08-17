import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDominated } from "./campaign/pareto.mjs";
import { compiledFieldCapacityIlyana } from "./compiler/field-capacity-ilyana-binding.mjs";
import { compiledHiddenCostIlyana } from "./compiler/hidden-cost-ilyana-binding.mjs";
import { createDeclarativeScenario } from "./declarative/adapter.mjs";
import { ilyanaBellContenders } from "./fixtures/ilyana-bell-contenders.mjs";
import { applyLifecycleRegistry } from "./lifecycle/select.mjs";
import { runBlindArena } from "./runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const document = JSON.parse(await readFile(resolve(here, "fixtures/ilyana-bell.json"), "utf8"));
const registry = JSON.parse(await readFile(resolve(here, "lifecycle/registry.json"), "utf8"));
const candidates = [...ilyanaBellContenders, compiledHiddenCostIlyana, compiledFieldCapacityIlyana];
const selection = applyLifecycleRegistry(candidates, registry, { scope: document.manifest.id });
const result = runBlindArena({
  arenaId: "corpus-capability-campaign-ilyana-001",
  scenario: createDeclarativeScenario(document),
  contenders: selection.active,
  seed: 1,
  blindKey: "capability-campaign-secret",
});
const outcomesById = Object.fromEntries(result.report.runs.map((run) => [
  result.sealedIdentityMap[run.label], run.outcomes,
]));
const orientations = { pitch_error: "min", craze: "min", clay_removed: "min", sleep: "max" };
const campaign = {
  report: result.report,
  evaluationRule: {
    type: "pareto-only",
    orientations,
    source: "declared workshop interpretation; not supplied by the capability",
  },
  outcomesById,
  dominatedBy: findDominated(outcomesById, orientations),
  lifecycle: {
    excludedBeforeRun: selection.excluded,
    validationBoundary: "local patch; not deployed or independently re-observed",
  },
};
process.stdout.write(`${JSON.stringify(campaign, null, 2)}\n`);
