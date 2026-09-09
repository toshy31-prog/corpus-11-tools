import test from "node:test";
import assert from "node:assert/strict";
import { assessRevocableWitnessAuthorityRegistry } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("admits signatures only through two valid registered authority domains", () => {
  const result = assessRevocableWitnessAuthorityRegistry(fullSetup());
  assert.equal(result.status, "revocable_witness_authority_registry_candidate");
  assert.equal(result.distinctAuthorityDomains, 2);
  assert.equal(result.authorityLegitimacyEstablished, false);
});

test("rejects a key revoked before its attestations", () => {
  const setup = fullSetup();
  setup.witnessAuthorityRegistry[0].revocations.push({ effectiveAt: "2026-01-01T06:00:00.000Z", reason: "synthetic compromise" });
  const result = assessRevocableWitnessAuthorityRegistry(setup);
  assert.deepEqual(result.failures, ["witness_authority_status_failed"]);
  assert.ok(result.authorityAudits[0].failures.includes("key_revoked_at_attestation_time"));
  assert.equal(result.distinctAuthorityDomains, 1);
});

test("rejects retrospective enrollment of a signing key", () => {
  const setup = fullSetup();
  setup.witnessAuthorityRegistry[1].enrolledAt = "2026-01-01T13:00:00.000Z";
  const result = assessRevocableWitnessAuthorityRegistry(setup);
  assert.ok(result.authorityAudits[1].failures.includes("witness_enrolled_after_attestation"));
});
