import assert from "node:assert/strict";
import { assessRevocableWitnessAuthorityRegistry } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.witnessAuthorityRegistry[1].validUntil = "2026-01-01T10:00:00.000Z";
const result = assessRevocableWitnessAuthorityRegistry(setup);
assert.deepEqual(result.failures, ["witness_authority_status_failed"]);
assert.ok(result.authorityAudits[1].failures.includes("attestation_outside_key_validity"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], remainingAuthorityDomains: result.distinctAuthorityDomains }));
