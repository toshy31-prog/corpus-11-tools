import assert from "node:assert/strict";
import { assessIndependentSignatureTimeAttestation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.timeAttestations[2].artifactHash = setup.timeAttestations[1].artifactHash;
const result = assessIndependentSignatureTimeAttestation(setup);
assert.deepEqual(result.failures, ["signature_or_time_attestation_failed"]);
assert.ok(result.attestationAudits[2].failures.includes("attested_artifact_hash_mismatch"));
assert.ok(result.attestationAudits[2].failures.includes("invalid_attestation_signature"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], substitutedArtifactDetected: true }));
