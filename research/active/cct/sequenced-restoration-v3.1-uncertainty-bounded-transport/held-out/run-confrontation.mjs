import assert from "node:assert/strict";
import { computeTransportProtocolDigest } from "../../sequenced-restoration-v3.0-held-out-signal-transport/runtime.mjs";
import { assessUncertaintyBoundedTransport, computeUncertaintyProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const trial = exercise.transportEvidence.pairMargins.find((record) => record.pair.join("+") === "network+power").trials[0];
trial.sampleSize = 1_000;
trial.rivalAllAxesProtectedCount = 500;
trial.candidateAllAxesProtectedCount = 505;
exercise.transportProtocolCommitment.digest = computeTransportProtocolDigest(exercise.transportEvidence);
exercise.uncertaintyProtocolCommitment.digest = computeUncertaintyProtocolDigest(exercise);

const result = assessUncertaintyBoundedTransport(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "uncertainty_interval_crosses_transfer_limit");
console.log("held-out confrontation: an imprecise point estimate inside the transfer tolerance cannot steer adaptive testing");
