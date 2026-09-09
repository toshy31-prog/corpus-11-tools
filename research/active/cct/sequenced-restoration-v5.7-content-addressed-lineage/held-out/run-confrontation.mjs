import assert from "node:assert/strict";
import { assessTargetEvidenceIndependence } from "../../sequenced-restoration-v5.6-target-evidence-independence/runtime.mjs";
import { assessContentAddressedLineage } from "../runtime.mjs";
import { audit, axes, completeExercise, renamedContentCollision, validAmendment } from "../fixtures.mjs";

const validation = renamedContentCollision();
assert.equal(assessTargetEvidenceIndependence(axes, audit, completeExercise(), validAmendment(), validation).status, "materially_independent_target_evidence_candidate");
assert.equal(assessContentAddressedLineage(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: distinct lineage names cannot conceal byte-identical artifacts and units");
