import assert from "node:assert/strict";
import { assessAttestedPortfolioLineage, computeLineageAttestationProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const cluster = exercise.transportEvidence.pairMargins[0].trials[0].clusters[0];
cluster.lineageAttestations[1].evidenceRoot = cluster.lineageAttestations[0].evidenceRoot;
exercise.lineageAttestationCommitment.digest = computeLineageAttestationProtocolDigest(exercise);

const result = assessAttestedPortfolioLineage(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "lineage_attestation_dependent");
console.log("held-out confrontation: one lineage artifact copied twice cannot establish independent attestation");
