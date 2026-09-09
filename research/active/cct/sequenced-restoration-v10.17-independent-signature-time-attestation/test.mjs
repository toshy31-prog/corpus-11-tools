import test from "node:test";
import assert from "node:assert/strict";
import { assessIndependentSignatureTimeAttestation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("verifies signed artifact bindings from two distinct synthetic witnesses", () => {
  const result = assessIndependentSignatureTimeAttestation(fullSetup());
  assert.equal(result.status, "independent_signature_time_attestation_candidate");
  assert.equal(result.distinctWitnesses, 2);
  assert.equal(result.identityEstablished, false);
  assert.equal(result.trustedTimeEstablished, false);
});

test("detects a signature modified after issuance", () => {
  const setup = fullSetup();
  setup.timeAttestations[0].signatureBase64 = setup.timeAttestations[0].signatureBase64.slice(0, -2) + "AA";
  const result = assessIndependentSignatureTimeAttestation(setup);
  assert.deepEqual(result.failures, ["signature_or_time_attestation_failed"]);
  assert.ok(result.attestationAudits[0].failures.includes("invalid_attestation_signature"));
});

test("rejects an attestation issued after the register freeze", () => {
  const setup = fullSetup();
  setup.timeAttestations[3].issuedAt = "2026-01-03T00:00:00.000Z";
  const result = assessIndependentSignatureTimeAttestation(setup);
  assert.ok(result.attestationAudits[3].failures.includes("attestation_not_before_register_freeze"));
});
