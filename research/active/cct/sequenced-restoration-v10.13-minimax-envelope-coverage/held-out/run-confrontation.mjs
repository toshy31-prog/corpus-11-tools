import assert from "node:assert/strict";
import { assessMinimaxEnvelopeCoverage } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const result = assessMinimaxEnvelopeCoverage(fullSetup({
  availableBitsPerBatch: 88,
  requestedEnvelopeCoverage: "all_precommitted_alternatives",
}));
assert.deepEqual(result.failures, ["insufficient_bits_for_declared_effect_envelope"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], requiredBitsPerBatch: result.requiredBitsPerBatch }));
