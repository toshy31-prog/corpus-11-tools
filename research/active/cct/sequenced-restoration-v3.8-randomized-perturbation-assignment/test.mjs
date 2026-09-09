import test from "node:test";
import assert from "node:assert/strict";
import {
  assessRandomizedPerturbationAssignment,
  CctRandomizedPerturbationAssignmentRuntime,
  computeAssignmentProtocolDigest,
  validateRandomizedAssignmentSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("precommitted reproducible assignments with complete follow-up can qualify", () => {
  assert.equal(validateRandomizedAssignmentSpec(), true);
  assert.deepEqual(assessRandomizedPerturbationAssignment(axes, audit, completeExercise()), {
    status: "bounded_randomized_perturbation_assignment_candidate",
    failures: []
  });
});

test("selective loss in one arm blocks an otherwise favorable effect", () => {
  const exercise = completeExercise();
  const assignment = exercise.crossSignalPerturbations[0].probes[0].effects[0].assignment;
  assignment.plannedPerArm = 200000;
  assignment.actualBaselineAssigned = 200000;
  assignment.actualPerturbedAssigned = 200000;
  exercise.assignmentProtocolCommitment.digest = computeAssignmentProtocolDigest(exercise);
  const result = assessRandomizedPerturbationAssignment(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "randomized_assignment_or_attrition_invalid");
});

test("a seed reveal that does not match its commitment is refused", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].effects[0].assignment.seedReveal = "substituted-seed";
  assert.equal(assessRandomizedPerturbationAssignment(axes, audit, exercise).failures[0].reason, "randomized_assignment_or_attrition_invalid");
});

test("runtime blocks when perturbation assignment is unestablished", () => {
  const runtime = new CctRandomizedPerturbationAssignmentRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 31 } }, allowedActions: ["bridge"] }), { message: "CCT_PERTURBATION_ASSIGNMENT_UNESTABLISHED" });
});
