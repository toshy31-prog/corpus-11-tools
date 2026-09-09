import assert from "node:assert/strict";
import { assessExposureRegistryPairScan } from "../../sequenced-restoration-v4.8-exposure-registry-pair-scan/runtime.mjs";
import { assessRegistryAmendment, computeRegistryAmendmentDigest } from "../runtime.mjs";
import { audit, axes, completeExercise, validAmendment } from "../fixtures.mjs";

const exercise = completeExercise();
assert.equal(assessExposureRegistryPairScan(axes, audit, exercise).status, "bounded_exposure_registry_pair_scan_candidate");

const amendment = validAmendment();
amendment.proposedAtTick = 7;
amendment.commitment.committedAtTick = 7;
amendment.commitment.digest = computeRegistryAmendmentDigest(amendment);

assert.deepEqual(assessRegistryAmendment(axes, audit, exercise, amendment), {
  status: "not_established",
  failures: ["registry_amendment_protocol_invalid"]
});

console.log("held-out confrontation: a post-outcome exposure proposal cannot alter the current registry or campaign");
