import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [statePath, firstPath, firstKeyPath, secondPath, secondKeyPath] = process.argv.slice(2);
if (!secondKeyPath) {
  process.stderr.write("usage: node verify-anchor-mirror-receipts.mjs STATE FIRST_RECEIPT FIRST_PUBLIC_KEY SECOND_RECEIPT SECOND_PUBLIC_KEY\n");
  process.exit(2);
}
const stateText = readFileSync(statePath, "utf8");
const state = JSON.parse(stateText);
const values = [JSON.parse(readFileSync(firstPath, "utf8")), JSON.parse(readFileSync(secondPath, "utf8"))];
const keys = [createPublicKey(readFileSync(firstKeyPath)), createPublicKey(readFileSync(secondKeyPath))];
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const keyDigest = key => digest(key.export({ type: "spki", format: "der" }));
const body = value => ({ schema: value.schema, mirrorId: value.mirrorId, controllerId: value.controllerId, failureDomain: value.failureDomain, sourceHolderId: value.sourceHolderId, anchorStateDigest: value.anchorStateDigest, sourceResponseDigest: value.sourceResponseDigest, transportDigest: value.transportDigest, networkAttestationDigest: value.networkAttestationDigest, networkObserverId: value.networkObserverId, hostComparisonContextDigest: value.hostComparisonContextDigest, hostComparisonFreezeDigest: value.hostComparisonFreezeDigest, networkHostScopeDigest: value.networkHostScopeDigest, localAddress: value.localAddress, localPort: value.localPort, remoteAddress: value.remoteAddress, remotePort: value.remotePort, generation: value.generation, receivedAtMs: value.receivedAtMs });
const checks = {
  schemas: values.every(value => value.schema === "cct-anchor-mirror-receipt/v1"),
  signatures: values.every((value, index) => verify(null, Buffer.from(JSON.stringify(body(value))), keys[index], Buffer.from(value.signatureBase64 ?? "", "base64"))),
  stateBinding: values.every(value => value.anchorStateDigest === digest(stateText) && value.generation === state.generation),
  sameSourceHolder: values[0].sourceHolderId === values[1].sourceHolderId,
  distinctSourceResponses: values[0].sourceResponseDigest !== values[1].sourceResponseDigest,
  distinctTransportTraces: values[0].transportDigest !== values[1].transportDigest,
  distinctNetworkAttestations: values[0].networkAttestationDigest !== values[1].networkAttestationDigest,
  distinctNetworkObserverIds: values[0].networkObserverId !== values[1].networkObserverId,
  sameHostComparisonContext: values[0].hostComparisonContextDigest === values[1].hostComparisonContextDigest,
  sameHostComparisonFreeze: values[0].hostComparisonFreezeDigest === values[1].hostComparisonFreezeDigest,
  transportEndpointsPresent: values.every(value => typeof value.localAddress === "string" && Number.isSafeInteger(value.localPort) && typeof value.remoteAddress === "string" && Number.isSafeInteger(value.remotePort)),
  distinctMirrorKeys: keyDigest(keys[0]) !== keyDigest(keys[1]),
  distinctMirrorIds: values[0].mirrorId !== values[1].mirrorId
};
const mirrorReceiptSetValid = Object.values(checks).every(Boolean);
const distinctWitnessHostScopes = checks.sameHostComparisonContext && values[0].networkHostScopeDigest !== values[1].networkHostScopeDigest;
process.stdout.write(`${JSON.stringify({ mirrorReceiptSetValid, checks, distinctTransportResponsesEstablished: checks.distinctSourceResponses && checks.distinctTransportTraces && checks.distinctNetworkAttestations && checks.signatures, distinctWitnessHostScopes, rawMachineIdsDisclosed: false, networkOriginsEstablished: false, remoteHostingEstablished: false, failureDomainSeparationEstablished: false, evidenceDependence: mirrorReceiptSetValid && distinctWitnessHostScopes ? "partially_dependent" : mirrorReceiptSetValid ? "substantially_dependent" : "invalid", sharedEvidence: ["same_source_holder", "same_state", ...(distinctWitnessHostScopes ? [] : ["same_host_scope"])] })}\n`);
if (!mirrorReceiptSetValid) process.exitCode = 1;
