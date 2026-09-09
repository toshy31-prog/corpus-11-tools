import assert from "node:assert/strict";
import { audit, axes, completeExercise } from "../fixtures.mjs";
import { assessHeldOutSignalTransport } from "../runtime.mjs";

const exercise = completeExercise();
const target = exercise.transportEvidence.classRisks.find((item) => item.dependencyClass === "identity");
for (const trial of target.trials) trial.failureCount = 20;

const result = assessHeldOutSignalTransport(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{ signalType: "class_risk", signal: "identity", reason: "transfer_error_exceeded" }]);
console.log("held-out confrontation: a source-valid but nontransportable risk score cannot steer adaptive testing");
