import assert from "node:assert/strict";
import { assessAxisMembershipObservability } from "../../sequenced-restoration-v5.3-axis-membership-observability/runtime.mjs";
import { assessAxisConstructCalibration } from "../runtime.mjs";
import { agreeingChannelsWithInvalidProxy, audit, axes, completeExercise, validAmendment } from "../fixtures.mjs";

const validation = agreeingChannelsWithInvalidProxy();
assert.equal(assessAxisMembershipObservability(axes, audit, completeExercise(), validAmendment(), validation).status,
  "observable_axis_membership_admission_candidate");
assert.equal(assessAxisConstructCalibration(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: two agreeing measurement channels cannot validate a proxy contradicted by blind reference cases");
