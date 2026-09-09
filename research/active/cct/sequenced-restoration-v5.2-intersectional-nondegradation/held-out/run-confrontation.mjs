import assert from "node:assert/strict";
import { assessDebtAxisNondegradation } from "../../sequenced-restoration-v5.1-debt-axis-nondegradation/runtime.mjs";
import { assessIntersectionalNondegradation } from "../runtime.mjs";
import { audit, axes, completeExercise, marginalPassIntersectionFailure, validAmendment } from "../fixtures.mjs";

const validation = marginalPassIntersectionFailure();
assert.equal(assessDebtAxisNondegradation(axes, audit, completeExercise(), validAmendment(), validation).status,
  "debt_axis_nondegradation_admission_candidate");
assert.equal(assessIntersectionalNondegradation(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: passing debt-axis marginals cannot conceal loss at their intersection");
