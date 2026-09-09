import assert from "node:assert/strict";
import { assessContentAddressedEvidenceBinding } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
const a = setup.evidenceArtifactContents["synthetic-held-out-1"].rawData;
setup.evidenceArtifactContents["synthetic-held-out-1"].rawData = setup.evidenceArtifactContents["synthetic-held-out-2"].rawData;
setup.evidenceArtifactContents["synthetic-held-out-2"].rawData = a;
const result = assessContentAddressedEvidenceBinding(setup);
assert.deepEqual(result.failures, ["evidence_content_binding_failed"]);
assert.ok(result.bindingAudits[0].failures.includes("content_hash_mismatch_rawDataRootHash"));
assert.ok(result.bindingAudits[1].failures.includes("content_hash_mismatch_rawDataRootHash"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], swappedSourcesDetected: 2 }));
