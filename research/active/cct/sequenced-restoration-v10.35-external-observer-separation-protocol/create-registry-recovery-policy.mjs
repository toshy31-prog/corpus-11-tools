import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [policyId, firstId, firstKeyPath, secondId, secondKeyPath, thirdId, thirdKeyPath, firstRatifierId, firstRatifierKeyPath, secondRatifierId, secondRatifierKeyPath, controlRegistryPath, presenceEvidencePath, networkObserverRegistryPath, pathScannerRegistryPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-registry-recovery-policy.mjs POLICY_ID RECOVERY_ID1 PUB1 RECOVERY_ID2 PUB2 RECOVERY_ID3 PUB3 RATIFIER_ID1 PUB1 RATIFIER_ID2 PUB2 CONTROL_REGISTRY PRESENCE_EVIDENCE NETWORK_OBSERVER_REGISTRY PATH_SCANNER_REGISTRY OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const members = [[firstId, firstKeyPath], [secondId, secondKeyPath], [thirdId, thirdKeyPath]].map(([id, path]) => {
  const key = createPublicKey(readFileSync(path));
  return { id, keyDigest: digest(key.export({ type: "spki", format: "der" })), publicKeyPem: key.export({ type: "spki", format: "pem" }).toString() };
});
const ratifiers = [[firstRatifierId, firstRatifierKeyPath], [secondRatifierId, secondRatifierKeyPath]].map(([id, path]) => {
  const key = createPublicKey(readFileSync(path));
  return { id, keyDigest: digest(key.export({ type: "spki", format: "der" })), publicKeyPem: key.export({ type: "spki", format: "pem" }).toString() };
});
const all = [...members, ...ratifiers];
if (new Set(all.map(value => value.id)).size !== 5 || new Set(all.map(value => value.keyDigest)).size !== 5) throw new Error("recovery members and ratifiers must all be distinct");
const controlRegistryText = readFileSync(controlRegistryPath, "utf8");
const controlRegistry = JSON.parse(controlRegistryText);
const controlBody = { schema: controlRegistry.schema, sourceRegistryDigest: controlRegistry.sourceRegistryDigest, sourceRegistry: controlRegistry.sourceRegistry, profiles: controlRegistry.profiles };
const profilesMatch = all.every(member => controlRegistry.profiles?.some(profile => profile.id === member.id && profile.keyDigest === member.keyDigest && profile.role === (members.includes(member) ? "recovery" : "ratifier")));
if (controlRegistry.schema !== "cct-recovery-control-registry/v1" || controlRegistry.stateDigest !== digest(JSON.stringify(controlBody)) || !profilesMatch) throw new Error("control registry does not match policy members");
const presenceText = readFileSync(presenceEvidencePath, "utf8");
const presence = JSON.parse(presenceText);
const challengeText = Buffer.from(presence.challengeTextBase64 ?? "", "base64").toString("utf8");
const challenge = JSON.parse(challengeText);
const sourceRegistryText = `${JSON.stringify(controlRegistry.sourceRegistry)}\n`;
const presenceBody = value => ({ schema: value.schema, sourceId: value.sourceId, challengeDigest: value.challengeDigest, sourceRegistryDigest: value.sourceRegistryDigest, hostComparisonContextDigest: value.hostComparisonContextDigest, hostScopeDigest: value.hostScopeDigest, networkOperatorId: value.networkOperatorId, networkFailureDomain: value.networkFailureDomain, observedAtMs: value.observedAtMs });
const expectedSources = controlRegistry.sourceRegistry.sources.map(value => value.sourceId).sort();
const presenceValid = presence.schema === "cct-control-source-presence-evidence/v1" && presence.sourceRegistryDigest === digest(sourceRegistryText) &&
  challenge.sourceRegistryDigest === presence.sourceRegistryDigest && presence.verifiedAtMs <= challenge.expiresAtMs && Date.now() <= challenge.expiresAtMs &&
  JSON.stringify(presence.attestations.map(value => value.sourceId).sort()) === JSON.stringify(expectedSources) &&
  new Set(presence.attestations.map(value => value.hostScopeDigest)).size === presence.attestations.length &&
  presence.attestations.every(value => {
    const source = controlRegistry.sourceRegistry.sources.find(candidate => candidate.sourceId === value.sourceId);
    return source && value.networkOperatorId === source.networkOperatorId && value.networkFailureDomain === source.networkFailureDomain && value.challengeDigest === digest(challengeText) && value.sourceRegistryDigest === challenge.sourceRegistryDigest &&
      verify(null, Buffer.from(JSON.stringify(presenceBody(value))), createPublicKey(source.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64"));
  });
if (!presenceValid) throw new Error("source presence evidence invalid");
const occupiedControllers = new Set(controlRegistry.profiles.map(value => value.controllerId)), occupiedDomains = new Set(controlRegistry.profiles.map(value => value.failureDomain));
const candidates = controlRegistry.sourceRegistry.sources.filter(value => !occupiedControllers.has(value.controllerId) && !occupiedDomains.has(value.failureDomain));
const firstTimeWitness = candidates[0], secondTimeWitness = candidates.find(value => value.sourceId !== firstTimeWitness?.sourceId && value.controllerId !== firstTimeWitness?.controllerId && value.failureDomain !== firstTimeWitness?.failureDomain && value.networkOperatorId !== firstTimeWitness?.networkOperatorId && value.networkFailureDomain !== firstTimeWitness?.networkFailureDomain);
if (!firstTimeWitness || !secondTimeWitness) throw new Error("two control- and network-separated time witnesses required");
const timeWitnesses = [firstTimeWitness, secondTimeWitness].map(value => ({ id: value.sourceId, keyDigest: value.keyDigest, publicKeyPem: value.publicKeyPem, controllerId: value.controllerId, failureDomain: value.failureDomain, networkOperatorId: value.networkOperatorId, networkFailureDomain: value.networkFailureDomain }));
const networkObserverRegistryText = readFileSync(networkObserverRegistryPath, "utf8");
const networkObserverRegistry = JSON.parse(networkObserverRegistryText);
const observers = networkObserverRegistry.observers ?? [];
const occupiedObserverControllers = new Set([...controlRegistry.profiles.map(value => value.controllerId), ...timeWitnesses.map(value => value.controllerId)]);
const occupiedObserverDomains = new Set([...controlRegistry.profiles.map(value => value.failureDomain), ...timeWitnesses.map(value => value.failureDomain)]);
const observerKeysValid = observers.every(value => {
  try { return value.keyDigest === digest(createPublicKey(value.publicKeyPem).export({ type: "spki", format: "der" })); } catch { return false; }
});
const triggerAuthority = networkObserverRegistry.triggerAuthority;
let triggerAuthorityValid = false;
try { triggerAuthorityValid = triggerAuthority?.keyDigest === digest(createPublicKey(triggerAuthority.publicKeyPem).export({ type: "spki", format: "der" })) && !observers.some(value => value.controllerId === triggerAuthority.controllerId || value.failureDomain === triggerAuthority.failureDomain || value.keyDigest === triggerAuthority.keyDigest) && !occupiedObserverControllers.has(triggerAuthority.controllerId) && !occupiedObserverDomains.has(triggerAuthority.failureDomain); } catch {}
if (networkObserverRegistry.schema !== "cct-network-observer-registry/v1" || observers.length < 2 || new Set(observers.map(value => value.observerId)).size !== observers.length || new Set(observers.map(value => value.controllerId)).size !== observers.length || new Set(observers.map(value => value.failureDomain)).size !== observers.length || new Set(observers.map(value => value.networkOperatorId)).size !== observers.length || new Set(observers.map(value => value.networkFailureDomain)).size !== observers.length || new Set(observers.map(value => value.hostingProviderId)).size !== observers.length || new Set(observers.map(value => value.effectiveOwnerId)).size !== observers.length || observers.some(value => !value.networkOperatorId || !value.networkFailureDomain || !value.hostingProviderId || !value.effectiveOwnerId) || new Set(observers.map(value => value.keyDigest)).size !== observers.length || !observerKeysValid || !triggerAuthorityValid || observers.some(value => occupiedObserverControllers.has(value.controllerId) || occupiedObserverDomains.has(value.failureDomain))) throw new Error("cryptographically valid, control- and infrastructure-separated observers and trigger authority required");
const pathScannerRegistryText = readFileSync(pathScannerRegistryPath, "utf8"), pathScannerRegistry = JSON.parse(pathScannerRegistryText), scanners = pathScannerRegistry.scanners ?? [], observerControllers = new Set(observers.map(value => value.controllerId)), observerDomains = new Set(observers.map(value => value.failureDomain)), observerKeys = new Set(observers.map(value => value.keyDigest));
const observerNetworkOperators = new Set(observers.map(value => value.networkOperatorId)), observerHostingProviders = new Set(observers.map(value => value.hostingProviderId));
const scannersValid = pathScannerRegistry.schema === "cct-path-scanner-registry/v1" && scanners.length === 2 && new Set(scanners.map(value => value.scannerId)).size === 2 && new Set(scanners.map(value => value.controllerId)).size === 2 && new Set(scanners.map(value => value.failureDomain)).size === 2 && new Set(scanners.map(value => value.networkOperatorId)).size === 2 && new Set(scanners.map(value => value.hostingProviderId)).size === 2 && new Set(scanners.map(value => value.effectiveOwnerId)).size === 2 && scanners.every(value => { try { return value.networkOperatorId && value.hostingProviderId && value.effectiveOwnerId && value.keyDigest === digest(createPublicKey(value.publicKeyPem).export({ type: "spki", format: "der" })) && !observerControllers.has(value.controllerId) && !observerDomains.has(value.failureDomain) && !observerKeys.has(value.keyDigest) && !observerNetworkOperators.has(value.networkOperatorId) && !observerHostingProviders.has(value.hostingProviderId) && !observers.some(observer => observer.effectiveOwnerId === value.effectiveOwnerId) && !occupiedObserverControllers.has(value.controllerId) && !occupiedObserverDomains.has(value.failureDomain); } catch { return false; } });
if (!scannersValid) throw new Error("two cryptographically valid path scanners separated from all recovery evidence actors required");
const policy = { schema: "cct-registry-recovery-policy/v1", policyId, threshold: 2, maxActivationDelayMs: 3600000, maxFirstStatusDelayMs: 300000, maxClockSkewMs: 30000, maxLedgerReceiptDelayMs: 30000, maxSharedTransitAsns: 0, minRouteAgreementBps: 5000, minRouteObservationSpanMs: 60000, members, ratifiers, timeWitnesses, networkObserverRegistryDigest: digest(networkObserverRegistryText), networkObserverRegistry, pathScannerRegistryDigest: digest(pathScannerRegistryText), pathScannerRegistry, controlRegistryDigest: digest(controlRegistryText), controlRegistry, sourcePresenceEvidenceDigest: digest(presenceText), sourcePresenceEvidence: presence };
atomicReplaceDurable(outputPath, `${JSON.stringify(policy)}\n`);
