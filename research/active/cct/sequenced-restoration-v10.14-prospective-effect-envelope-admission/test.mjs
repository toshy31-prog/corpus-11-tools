import test from "node:test";
import assert from "node:assert/strict";
import { assessProspectiveEffectEnvelopeAdmission } from "./runtime.mjs";
import { admissibleRegister, fullSetup } from "./fixtures.mjs";

test("downgrades an unsupported 574-bit requirement to a scenario ceiling", () => {
  const result = assessProspectiveEffectEnvelopeAdmission(fullSetup());
  assert.equal(result.status, "prospective_effect_envelope_admission_candidate");
  assert.equal(result.allEffectsAdmitted, false);
  assert.equal(result.budgetStatus, "scenario_ceiling_only");
});

test("rejects an operational budget claim based on hypothesis-only effects", () => {
  const result = assessProspectiveEffectEnvelopeAdmission(fullSetup({ requestedBudgetStatus: "evidence_justified_requirement" }));
  assert.deepEqual(result.failures, ["unsubstantiated_envelope_cannot_set_operational_budget"]);
});

test("requires evidence frozen before the envelope register", () => {
  const register = admissibleRegister();
  register[5].frozenAt = "2026-01-03T00:00:00.000Z";
  const result = assessProspectiveEffectEnvelopeAdmission(fullSetup({ effectEnvelopeRegister: register }));
  assert.equal(result.admission[5].admitted, false);
  assert.ok(result.admission[5].failures.includes("effect_evidence_not_prospectively_frozen"));
});

test("complete fixture evidence makes the design admissible, never operationally established", () => {
  const result = assessProspectiveEffectEnvelopeAdmission(fullSetup({ effectEnvelopeRegister: admissibleRegister(), requestedBudgetStatus: "evidence_justified_requirement" }));
  assert.equal(result.allEffectsAdmitted, true);
  assert.equal(result.budgetStatus, "evidence_justified_requirement");
  assert.equal(result.operationalRequirementEstablished, false);
});
