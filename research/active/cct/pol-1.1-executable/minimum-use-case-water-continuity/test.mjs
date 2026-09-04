import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateMinimumUseCase } from "./contract.mjs";

const root = new URL(".", import.meta.url);
const intervention = JSON.parse(readFileSync(new URL("./intervention.json", root)));

test("the minimal water instrument is complete but not authorized", () => {
  assert.deepEqual(validateMinimumUseCase(intervention), []);
  assert.equal(intervention.status, "candidate_design_not_authorized");
});

test("a claimed water-continuity pilot fails if it uses deprivation or hides its stop and repair duties", () => {
  const mutated = structuredClone(intervention);
  mutated.non_negotiable.no_vital_service_withdrawal_for_comparison = false;
  mutated.comparison.no_deprivation_design = false;
  mutated.non_negotiable.independent_stop_authority_required = false;
  mutated.non_negotiable.repair_and_contingency_fund_required = false;
  assert.deepEqual(validateMinimumUseCase(mutated).sort(), [
    "missing:comparison.no_deprivation_design",
    "missing:non_negotiable.independent_stop_authority_required",
    "missing:non_negotiable.no_vital_service_withdrawal_for_comparison",
    "missing:non_negotiable.repair_and_contingency_fund_required"
  ]);
});
