import test from "node:test";
import assert from "node:assert/strict";
import { assessMinimaxEnvelopeCoverage } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("derives the minimax requirement from the full declared envelope", () => {
  const result = assessMinimaxEnvelopeCoverage(fullSetup());
  assert.equal(result.status, "minimax_envelope_coverage_candidate");
  assert.equal(result.requiredBitsPerBatch, 574);
  assert.equal(result.coverageEligible, false);
});

test("rejects 88 bits when coverage of every precommitted alternative is claimed", () => {
  const result = assessMinimaxEnvelopeCoverage(fullSetup({
    availableBitsPerBatch: 88,
    requestedEnvelopeCoverage: "all_precommitted_alternatives",
  }));
  assert.deepEqual(result.failures, ["insufficient_bits_for_declared_effect_envelope"]);
});

test("forbids selecting the cheaper 0.25 alternative after seeing the envelope", () => {
  const result = assessMinimaxEnvelopeCoverage(fullSetup({ selectedAlternativeDistanceProbability: 0.25 }));
  assert.deepEqual(result.failures, ["post_hoc_effect_scope_selection_forbidden"]);
});

test("574 bits creates design eligibility but not evidence of independence", () => {
  const result = assessMinimaxEnvelopeCoverage(fullSetup({
    availableBitsPerBatch: 574,
    requestedEnvelopeCoverage: "all_precommitted_alternatives",
  }));
  assert.equal(result.coverageEligible, true);
  assert.equal(result.strongerConclusionReopened, false);
});
