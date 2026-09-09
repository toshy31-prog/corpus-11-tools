import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyMirrorAuthorityCorroboration } from "./mirror-authority-corroboration.mjs";
import { assessMirrorIssuerControl } from "./mirror-issuer-control.mjs";

const [historyPath, checkpointPath, checkpointPublicKeyPath, anchorStatePath, anchorPublicKeyPath, firstMirrorReceiptPath, firstMirrorKeyPath, secondMirrorReceiptPath, secondMirrorKeyPath, firstCorroborationPath, secondCorroborationPath, issuerProfilesPath, issuerClaimsPath, issuerChallengesPath, issuerSourceRegistryPath, issuerSourceStatusHistoryPath, issuerSourceAuthorityPublicKeyPath, issuerSourceAuthorityTransitionPath, nextIssuerSourceAuthorityPublicKeyPath, issuerEquivocationBundlesPath, issuerRecoveryBundlesPath] = process.argv.slice(2);
if (!issuerRecoveryBundlesPath) {
  process.stderr.write("usage: node admit-control-source-presence-history.mjs ... ISSUER_EQUIVOCATION_BUNDLES_JSON ISSUER_RECOVERY_BUNDLES_JSON\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const history = JSON.parse(readFileSync(historyPath, "utf8"));
const checkpointText = readFileSync(checkpointPath, "utf8");
const checkpoint = JSON.parse(checkpointText);
const state = JSON.parse(readFileSync(anchorStatePath, "utf8"));
const stateText = readFileSync(anchorStatePath, "utf8");
const receipt = state.receipt;
const historyBody = { schema: history.schema, sourceRegistryDigest: history.sourceRegistryDigest, generation: history.generation, records: history.records };
const checkpointBody = { schema: checkpoint.schema, registryStateDigest: checkpoint.registryStateDigest, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords, previousCheckpointDigest: checkpoint.previousCheckpointDigest };
const receiptBody = receipt && { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
const receiptText = receipt && `${JSON.stringify(receipt)}\n`;
const mirrors = [JSON.parse(readFileSync(firstMirrorReceiptPath, "utf8")), JSON.parse(readFileSync(secondMirrorReceiptPath, "utf8"))];
const mirrorKeys = [createPublicKey(readFileSync(firstMirrorKeyPath)), createPublicKey(readFileSync(secondMirrorKeyPath))];
const corroborations = [JSON.parse(readFileSync(firstCorroborationPath, "utf8")), JSON.parse(readFileSync(secondCorroborationPath, "utf8"))];
const nextAuthorityText = nextIssuerSourceAuthorityPublicKeyPath === "-" ? null : readFileSync(nextIssuerSourceAuthorityPublicKeyPath, "utf8");
const nextAuthorityKeys = nextAuthorityText && (() => { try { const value = JSON.parse(nextAuthorityText); return Array.isArray(value) ? value : nextAuthorityText; } catch { return nextAuthorityText; } })();
const issuerControl = assessMirrorIssuerControl(corroborations, JSON.parse(readFileSync(issuerProfilesPath, "utf8")), JSON.parse(readFileSync(issuerClaimsPath, "utf8")), JSON.parse(readFileSync(issuerChallengesPath, "utf8")), JSON.parse(readFileSync(issuerSourceRegistryPath, "utf8")), JSON.parse(readFileSync(issuerSourceStatusHistoryPath, "utf8")), readFileSync(issuerSourceAuthorityPublicKeyPath, "utf8"), issuerSourceAuthorityTransitionPath === "-" ? null : JSON.parse(readFileSync(issuerSourceAuthorityTransitionPath, "utf8")), nextAuthorityKeys, JSON.parse(readFileSync(issuerEquivocationBundlesPath, "utf8")), JSON.parse(readFileSync(issuerRecoveryBundlesPath, "utf8")));
const mirrorBody = value => ({ schema: value.schema, mirrorId: value.mirrorId, controllerId: value.controllerId, failureDomain: value.failureDomain, sourceHolderId: value.sourceHolderId, anchorStateDigest: value.anchorStateDigest, sourceResponseDigest: value.sourceResponseDigest, transportDigest: value.transportDigest, networkAttestationDigest: value.networkAttestationDigest, networkObserverId: value.networkObserverId, hostComparisonContextDigest: value.hostComparisonContextDigest, hostComparisonFreezeDigest: value.hostComparisonFreezeDigest, networkHostScopeDigest: value.networkHostScopeDigest, localAddress: value.localAddress, localPort: value.localPort, remoteAddress: value.remoteAddress, remotePort: value.remotePort, generation: value.generation, receivedAtMs: value.receivedAtMs });
const evaluatedAtMs = Date.now();
const checks = {
  historyIntegrity: history.schema === "cct-control-source-presence-history/v1" && history.stateDigest === digest(JSON.stringify(historyBody)),
  checkpointSignature: checkpoint.schema === "cct-control-source-presence-history-checkpoint/v1" && verify(null, Buffer.from(JSON.stringify(checkpointBody)), createPublicKey(readFileSync(checkpointPublicKeyPath)), Buffer.from(checkpoint.signatureBase64 ?? "", "base64")),
  checkpointBindsHistory: checkpoint.registryStateDigest === history.stateDigest && checkpoint.generation === history.generation && checkpoint.totalRecords === history.records.length,
  anchorReceiptSignature: receipt?.schema === "cct-monotonic-anchor-receipt/v2" && verify(null, Buffer.from(JSON.stringify(receiptBody)), createPublicKey(readFileSync(anchorPublicKeyPath)), Buffer.from(receipt.signatureBase64 ?? "", "base64")),
  anchorStateIntegrity: state.schema === "cct-monotonic-anchor-state/v2" && state.receiptDigest === digest(receiptText) && state.generation === receipt?.generation && state.checkpointDigest === receipt?.checkpointDigest,
  anchorBindsCheckpoint: receipt?.checkpointSchema === checkpoint.schema && receipt?.checkpointDigest === digest(checkpointText) && receipt?.registryStateDigest === checkpoint.registryStateDigest && receipt?.generation === checkpoint.generation && receipt?.totalRecords === checkpoint.totalRecords,
  mirrorSignatures: mirrors.every((value, index) => value.schema === "cct-anchor-mirror-receipt/v1" && verify(null, Buffer.from(JSON.stringify(mirrorBody(value))), mirrorKeys[index], Buffer.from(value.signatureBase64 ?? "", "base64"))),
  mirrorsBindCurrentAnchor: mirrors.every(value => value.anchorStateDigest === digest(stateText) && value.generation === state.generation),
  mirrorTransportsDistinct: mirrors[0].sourceResponseDigest !== mirrors[1].sourceResponseDigest && mirrors[0].transportDigest !== mirrors[1].transportDigest && mirrors[0].networkAttestationDigest !== mirrors[1].networkAttestationDigest,
  mirrorControlClaimsDistinct: mirrors[0].mirrorId !== mirrors[1].mirrorId && mirrors[0].controllerId !== mirrors[1].controllerId && mirrors[0].failureDomain !== mirrors[1].failureDomain,
  mirrorHostScopesDistinct: mirrors[0].hostComparisonContextDigest === mirrors[1].hostComparisonContextDigest && mirrors[0].hostComparisonFreezeDigest === mirrors[1].hostComparisonFreezeDigest && mirrors[0].networkHostScopeDigest !== mirrors[1].networkHostScopeDigest,
  mirrorAuthorityCorroboration: corroborations.every((value, index) => verifyMirrorAuthorityCorroboration(value, mirrors[index], mirrorKeys[index], evaluatedAtMs)),
  issuerSetsDisjoint: new Set(corroborations.flatMap(value => value.authorities.map(authority => authority.credential.issuerId))).size === 4 &&
    new Set(corroborations.flatMap(value => value.authorities.map(authority => digest(createPublicKey(authority.issuerPublicKeyPem).export({ type: "spki", format: "der" }))))).size === 4,
  issuerControlSeparation: issuerControl.ok
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, generation: history.generation, rollbackResistanceLocal: ok, distinctMirrorHostScopesObserved: checks.mirrorHostScopesDistinct, offHostRetentionEstablished: false, organizationalIndependenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
