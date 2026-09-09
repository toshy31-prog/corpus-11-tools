import test from "node:test";
import assert from "node:assert/strict";
import { assessContentAddressedEvidenceBinding } from "./runtime.mjs";
import { evidenceContents, fullSetup } from "./fixtures.mjs";

test("recomputes and binds every declared evidence content", () => {
  const result = assessContentAddressedEvidenceBinding(fullSetup());
  assert.equal(result.status, "content_addressed_evidence_binding_candidate");
  assert.equal(result.allContentsBound, true);
  assert.equal(result.authenticityEstablished, false);
});

test("detects a post-manifest raw-data modification", () => {
  const setup = fullSetup();
  setup.evidenceArtifactContents["synthetic-held-out-3"].rawData += " tampered";
  const result = assessContentAddressedEvidenceBinding(setup);
  assert.deepEqual(result.failures, ["evidence_content_binding_failed"]);
  assert.ok(result.bindingAudits[2].failures.includes("content_hash_mismatch_rawDataRootHash"));
});

test("does not accept a missing source artifact", () => {
  const contents = evidenceContents();
  delete contents["synthetic-held-out-6"];
  const result = assessContentAddressedEvidenceBinding(fullSetup({ evidenceArtifactContents: contents }));
  assert.deepEqual(result.bindingAudits[5].failures, ["missing_evidence_artifact_content"]);
});
