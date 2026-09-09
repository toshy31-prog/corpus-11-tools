import assert from "node:assert/strict";
import { audit, axes, completeExercise } from "../fixtures.mjs";
import { assessSignalProvenance } from "../runtime.mjs";

const exercise = completeExercise();
const target = exercise.signalEvidence.pairMargins.find((item) => item.pair.join("+") === "network+power");
target.attestations[1].controller = target.attestations[0].controller;
target.attestations[1].failureDomain = target.attestations[0].failureDomain;

const result = assessSignalProvenance(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{
  signalType: "pair_margin",
  signal: "network+power",
  reason: "independent_attestations_missing"
}]);
console.log("held-out confrontation: duplicated governance behind distinct files cannot steer adaptive testing");
