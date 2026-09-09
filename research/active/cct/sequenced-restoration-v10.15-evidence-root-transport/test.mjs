import test from "node:test";
import assert from "node:assert/strict";
import { assessEvidenceRootTransport } from "./runtime.mjs";
import { fullSetup, independentManifest } from "./fixtures.mjs";

test("makes evidence roots and target hashes externally auditable", () => {
  const result = assessEvidenceRootTransport(fullSetup());
  assert.equal(result.status, "evidence_root_transport_candidate");
  assert.equal(result.uniqueClusters, 6);
  assert.equal(result.independenceEligible, true);
  assert.equal(result.materialIndependenceEstablished, false);
});

test("rejects six labels backed by one shared data, frame, and generator root", () => {
  const manifest = independentManifest().map((entry) => ({ ...entry, rawDataRootHash: "sha256:shared-data", samplingFrameHash: "sha256:shared-frame", generatorHash: "sha256:shared-generator" }));
  const result = assessEvidenceRootTransport(fullSetup({ evidenceRootManifest: manifest, requestedTransportStatus: "evidence_justified_transport" }));
  assert.deepEqual(result.failures, ["dependent_or_untransportable_effect_evidence"]);
  assert.equal(result.uniqueClusters, 1);
});

test("rejects a source measured under another protocol", () => {
  const manifest = independentManifest();
  manifest[2].protocolHash = "sha256:other-protocol";
  const result = assessEvidenceRootTransport(fullSetup({ evidenceRootManifest: manifest, requestedTransportStatus: "evidence_justified_transport" }));
  assert.deepEqual(result.failures, ["dependent_or_untransportable_effect_evidence"]);
  assert.ok(result.entryAudits[2].failures.includes("protocol_transport_mismatch"));
});
