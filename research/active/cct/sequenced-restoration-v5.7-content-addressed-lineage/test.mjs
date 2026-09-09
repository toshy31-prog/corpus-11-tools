import test from "node:test";
import assert from "node:assert/strict";
import { assessTargetEvidenceIndependence } from "../sequenced-restoration-v5.6-target-evidence-independence/runtime.mjs";
import { assessContentAddressedLineage, CctContentAddressedLineageRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, renamedContentCollision, validAmendment, validValidation } from "./fixtures.mjs";

test("verifies target separation from content and unit fingerprints", () => {
  assert.deepEqual(assessContentAddressedLineage(axes, audit, completeExercise(), validAmendment(), validValidation()), {
    status: "content_addressed_target_lineage_candidate", verifiedTargetCount: 2, collisions: [], failures: []
  });
});

test("distinct root names cannot conceal identical artifacts or units", () => {
  const validation = renamedContentCollision();
  assert.equal(assessTargetEvidenceIndependence(axes, audit, completeExercise(), validAmendment(), validation).status,
    "materially_independent_target_evidence_candidate");
  const result = assessContentAddressedLineage(axes, audit, completeExercise(), validAmendment(), validation);
  assert.equal(result.failures[0], "renamed_lineage_collision_detected");
  assert.ok(result.collisions[0].sharedArtifacts.includes("rawData") && result.collisions[0].sharedUnitCount > 0);
});

test("runtime blocks actions without content-addressed lineage", () => {
  const runtime = new CctContentAddressedLineageRuntime(); runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 17 } }, allowedActions: ["restore"] }), { message: /CCT_CONTENT_ADDRESSED_LINEAGE_UNESTABLISHED/ });
});
