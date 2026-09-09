import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyAuthorityAnchorBinding } from "./authority-anchor-binding.mjs";

const args = process.argv.slice(2);
if (args.length !== 19) {
  process.stderr.write("usage: node verify-dual-live-process-attestations.mjs A_ATTESTATION A_OBSERVER_KEY A_CREDENTIAL A_AUTHORITY_KEY A_STATUS A_CHECKPOINT A_RECEIPT A_ANCHOR_STATE A_ANCHOR_KEY B_ATTESTATION B_OBSERVER_KEY B_CREDENTIAL B_AUTHORITY_KEY B_STATUS B_CHECKPOINT B_RECEIPT B_ANCHOR_STATE B_ANCHOR_KEY AS_OF_MS\n");
  process.exit(2);
}
const offsets = [0, 9];
const values = offsets.map(index => JSON.parse(readFileSync(args[index], "utf8")));
const keys = offsets.map(index => createPublicKey(readFileSync(args[index + 1])));
const credentials = offsets.map(index => JSON.parse(readFileSync(args[index + 2], "utf8")));
const authorityKeys = offsets.map(index => createPublicKey(readFileSync(args[index + 3])));
const statuses = offsets.map(index => JSON.parse(readFileSync(args[index + 4], "utf8")));
const anchorBindings = offsets.map(index => verifyAuthorityAnchorBinding(args[index + 4], args[index + 5], args[index + 6], args[index + 7], args[index + 3], args[index + 8]));
const asOfMs = Number(args[18]);
const body = value => ({
  schema: value.schema, observerId: value.observerId, controllerId: value.controllerId,
  failureDomain: value.failureDomain, observerPid: value.observerPid,
  observerStartTicks: value.observerStartTicks, observerBootId: value.observerBootId,
  server: value.server, requester: value.requester, observedAtMs: value.observedAtMs
});
const credentialBody = value => ({
  schema: value.schema, issuerId: value.issuerId, observerId: value.observerId,
  observerKeyDigest: value.observerKeyDigest, controllerId: value.controllerId,
  failureDomain: value.failureDomain, validFromMs: value.validFromMs, validUntilMs: value.validUntilMs
});
const keyDigest = key => `sha256:${createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex")}`;
const documentDigest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const statusBody = value => ({
  schema: value.schema, issuerId: value.issuerId, generation: value.generation,
  generatedAtMs: value.generatedAtMs, validUntilMs: value.validUntilMs,
  revokedCredentialDigests: value.revokedCredentialDigests
});
const targetIdentity = value => JSON.stringify({ server: value.server, requester: value.requester });
const attestationSignatures = values.every((value, index) => verify(null, Buffer.from(JSON.stringify(body(value))), keys[index], Buffer.from(value.signatureBase64, "base64")));
const credentialSignatures = credentials.every((value, index) => verify(null, Buffer.from(JSON.stringify(credentialBody(value))), authorityKeys[index], Buffer.from(value.signatureBase64, "base64")));
const credentialBindings = credentials.every((credential, index) => {
  const value = values[index];
  return credential.schema === "cct-observer-authority-credential/v1" &&
    credential.observerId === value.observerId && credential.observerKeyDigest === keyDigest(keys[index]) &&
    credential.controllerId === value.controllerId && credential.failureDomain === value.failureDomain &&
    value.observedAtMs >= credential.validFromMs && value.observedAtMs <= credential.validUntilMs;
});
const statusSignatures = statuses.every((value, index) => verify(null, Buffer.from(JSON.stringify(statusBody(value))), authorityKeys[index], Buffer.from(value.signatureBase64 ?? "", "base64")));
const credentialStatuses = statuses.every((status, index) =>
  status.schema === "cct-observer-authority-status/v1" && status.issuerId === credentials[index].issuerId &&
  Number.isSafeInteger(status.generation) && status.generation >= 1 &&
  status.generatedAtMs <= asOfMs && asOfMs <= status.validUntilMs &&
  Array.isArray(status.revokedCredentialDigests) && !status.revokedCredentialDigests.includes(documentDigest(credentials[index])));
const checks = {
  schemas: values.every(value => value.schema === "cct-live-process-attestation/v1"),
  attestationSignatures, credentialSignatures, credentialBindings, statusSignatures, credentialStatuses,
  currentStatusAnchors: anchorBindings.every(binding => binding.ok),
  sameLiveTargets: targetIdentity(values[0]) === targetIdentity(values[1]),
  overlappingWindow: Math.abs(values[0].observedAtMs - values[1].observedAtMs) <= 10_000,
  distinctObserverProcesses: values[0].observerPid !== values[1].observerPid || values[0].observerStartTicks !== values[1].observerStartTicks,
  observersExternalToTargets: values.every(value => value.observerPid !== value.server.pid && value.observerPid !== value.requester.pid),
  distinctObserverSigningRoots: keyDigest(keys[0]) !== keyDigest(keys[1]),
  distinctAuthoritySigningRoots: keyDigest(authorityKeys[0]) !== keyDigest(authorityKeys[1]),
  distinctCredentialedControllers: credentials[0].controllerId !== credentials[1].controllerId,
  distinctCredentialedFailureDomains: credentials[0].failureDomain !== credentials[1].failureDomain
};
const artifactPairValid = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ artifactPairValid, independentEvidenceAdmissible: false, checks, anchorBindings, credentialedControlSeparation: credentialSignatures && credentialBindings && checks.distinctCredentialedControllers && checks.distinctCredentialedFailureDomains, authorityRootsExternallyAuthorized: false, evidenceDependence: artifactPairValid ? "partially_dependent" : "independence_not_established", sharedFailureModes: ["same_host", "same_procfs", "same_attestation_code"], organizationalIndependenceEstablished: false, distinctHostsEstablished: false, admissionBlockers: ["authority_roots_not_externally_authorized", "measurement_channels_shared"] })}\n`);
if (!artifactPairValid) process.exitCode = 1;
