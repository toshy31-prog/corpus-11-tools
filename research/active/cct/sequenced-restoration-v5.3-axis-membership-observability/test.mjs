import test from "node:test";
import assert from "node:assert/strict";
import { assessIntersectionalNondegradation } from "../sequenced-restoration-v5.2-intersectional-nondegradation/runtime.mjs";
import { assessAxisMembershipObservability, CctAxisMembershipObservabilityRuntime } from "./runtime.mjs";
import { audit, axes, concealedIntersectionMembership, completeExercise, validAmendment, validValidation } from "./fixtures.mjs";

test("requires two complete independent pre-outcome membership channels per axis", () => {
  const result = assessAxisMembershipObservability(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.deepEqual(result, { status: "observable_axis_membership_admission_candidate", admittedVariable: "housing_insecurity",
    auditedObservations: 40, failures: [] });
});

test("rejects an intersection made artificially safe by membership labels", () => {
  const validation = concealedIntersectionMembership();
  assert.equal(assessIntersectionalNondegradation(axes, audit, completeExercise(), validAmendment(), validation).status,
    "intersectional_nondegradation_admission_candidate");
  assert.equal(assessAxisMembershipObservability(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "axis_membership_observability_unestablished");
});

test("missing or dependent membership evidence blocks admission", () => {
  const validation = validValidation();
  validation.observations[0].axisMembershipMeasurements[0].measurements[1].controller =
    validation.observations[0].axisMembershipMeasurements[0].measurements[0].controller;
  assert.equal(assessAxisMembershipObservability(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
});

test("runtime blocks actions without observable membership evidence", () => {
  const runtime = new CctAxisMembershipObservabilityRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 13 } }, allowedActions: ["restore"] }), {
    message: /CCT_AXIS_MEMBERSHIP_OBSERVABILITY_UNESTABLISHED/
  });
});
