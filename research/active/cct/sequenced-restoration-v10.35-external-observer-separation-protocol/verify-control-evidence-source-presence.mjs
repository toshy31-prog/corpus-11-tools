import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [challengePath, sourceRegistryPath, hostComparisonSalt, manifestPath, evidencePath] = process.argv.slice(2);
if (!manifestPath) {
  process.stderr.write("usage: node verify-control-evidence-source-presence.mjs CHALLENGE SOURCE_REGISTRY HOST_COMPARISON_SALT ATTESTATION_PATHS_JSON\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const challengeText = readFileSync(challengePath, "utf8");
const challenge = JSON.parse(challengeText);
const registryText = readFileSync(sourceRegistryPath, "utf8");
const registry = JSON.parse(registryText);
const paths = JSON.parse(readFileSync(manifestPath, "utf8"));
const values = paths.map(path => JSON.parse(readFileSync(path, "utf8")));
const body = value => ({ schema: value.schema, sourceId: value.sourceId, challengeDigest: value.challengeDigest, sourceRegistryDigest: value.sourceRegistryDigest, hostComparisonContextDigest: value.hostComparisonContextDigest, hostScopeDigest: value.hostScopeDigest, networkOperatorId: value.networkOperatorId, networkFailureDomain: value.networkFailureDomain, observedAtMs: value.observedAtMs });
const expectedIds = registry.sources.map(value => value.sourceId).sort();
const checks = {
  challengeFresh: challenge.schema === "cct-control-source-presence-challenge/v1" && Date.now() >= challenge.issuedAtMs && Date.now() <= challenge.expiresAtMs,
  registryBinding: challenge.sourceRegistryDigest === digest(registryText) && challenge.hostComparisonContextDigest === digest(hostComparisonSalt),
  exactSourceSet: JSON.stringify(values.map(value => value.sourceId).sort()) === JSON.stringify(expectedIds),
  signatures: values.every(value => {
    const source = registry.sources.find(candidate => candidate.sourceId === value.sourceId);
    return source && value.schema === "cct-control-source-presence-attestation/v1" && value.networkOperatorId === source.networkOperatorId && value.networkFailureDomain === source.networkFailureDomain && value.challengeDigest === digest(challengeText) &&
      value.sourceRegistryDigest === challenge.sourceRegistryDigest && value.hostComparisonContextDigest === challenge.hostComparisonContextDigest &&
      value.observedAtMs >= challenge.issuedAtMs && value.observedAtMs <= challenge.expiresAtMs &&
      verify(null, Buffer.from(JSON.stringify(body(value))), createPublicKey(source.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64"));
  }),
  distinctObservedHostScopes: new Set(values.map(value => value.hostScopeDigest)).size === values.length
};
const sourcePresenceSetAdmissible = Object.values(checks).every(Boolean);
if (sourcePresenceSetAdmissible && evidencePath) {
  const evidence = {
    schema: "cct-control-source-presence-evidence/v1", sourceRegistryDigest: digest(registryText),
    challengeTextBase64: Buffer.from(challengeText).toString("base64"), attestations: values,
    verifiedAtMs: Date.now(), hostScopeCount: new Set(values.map(value => value.hostScopeDigest)).size
  };
  atomicReplaceDurable(evidencePath, `${JSON.stringify(evidence)}\n`);
}
process.stdout.write(`${JSON.stringify({ sourcePresenceSetAdmissible, checks, rawMachineIdsDisclosed: false, organizationalIndependenceEstablished: false, remoteHostingEstablished: false })}\n`);
if (!sourcePresenceSetAdmissible) process.exitCode = 1;
