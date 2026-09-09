import assert from "node:assert/strict";
import { assessProspectiveEffectEnvelopeAdmission } from "../runtime.mjs";
import { admissibleRegister, fullSetup } from "../fixtures.mjs";

const register = admissibleRegister();
delete register[5].independenceLineage;
const result = assessProspectiveEffectEnvelopeAdmission(fullSetup({
  effectEnvelopeRegister: register,
  requestedBudgetStatus: "evidence_justified_requirement",
}));
assert.deepEqual(result.failures, ["unsubstantiated_envelope_cannot_set_operational_budget"]);
assert.ok(result.admission[5].failures.includes("missing_independenceLineage"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], missing: result.admission[5].failures[0] }));
