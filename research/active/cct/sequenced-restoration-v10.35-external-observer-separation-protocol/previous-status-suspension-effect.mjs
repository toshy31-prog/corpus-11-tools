import { createHash, createPublicKey, verify } from "node:crypto";
import { assessBlindedPathSentinelDetectability } from "../sequenced-restoration-v10.26-blinded-path-sentinel-detectability/runtime.mjs";
import { verifyScannerInfrastructureCorroboration } from "./scanner-infrastructure-corroboration.mjs";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const postFreezeReportBody = value => ({ schema: value.schema, channel: value.channel, scannerRootId: value.scannerRootId, previousStatusDigest: value.previousStatusDigest, inventoryHash: value.inventoryHash, discoveredPaths: value.discoveredPaths, observedAt: value.observedAt });
export const verifyPreviousStatusSuspensionEffect = (bundle, previousStatus, policy) => {
  let result; try { result = assessBlindedPathSentinelDetectability(bundle?.effectArguments ?? {}); } catch { result = { status: "not_established" }; }
  const args = bundle?.effectArguments ?? {}, postReports = args.postFreezeExecutionPathDiscoveryReports ?? [], expectedChannels = (args.executionPathDiscoveryReports ?? []).map(value => value.channel), inventory = args.executionPathInventory?.paths ?? [], lastProbeAt = (args.executionPathProbes ?? []).map(value => value.attemptedAt).sort().at(-1), preRoots = new Set((args.executionPathDiscoveryReports ?? []).map(value => value.scannerRootId));
  const postFreezeReobservation = postReports.length === expectedChannels.length && JSON.stringify(postReports.map(value => value.channel)) === JSON.stringify(expectedChannels) && new Set(postReports.map(value => value.scannerRootId)).size === postReports.length && postReports.every(value => { const scanner = policy?.pathScannerRegistry?.scanners?.find(candidate => candidate.scannerId === value.scannerRootId); try { return scanner && !preRoots.has(value.scannerRootId) && value.schema === "cct-post-freeze-path-discovery-report/v1" && value.previousStatusDigest === bundle.previousStatusDigest && value.inventoryHash === args.executionPathInventory.inventoryHash && value.observedAt > lastProbeAt && JSON.stringify(value.discoveredPaths) === JSON.stringify(inventory) && verify(null, Buffer.from(JSON.stringify(postFreezeReportBody(value))), createPublicKey(scanner.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64")); } catch { return false; } });
  const checks = {
    statusBinding: bundle?.schema === "cct-previous-status-suspension-effect/v1" && bundle.previousStatusDigest === digest(`${JSON.stringify(previousStatus)}\n`),
    orderedCommandEffect: result.suspensionEffectEstablished === true,
    frozenPathCoverage: result.allInventoriedPathsBlocked === true,
    dualChannelInventoryReconciliation: result.inventoryReconciledAcrossDeclaredChannels === true,
    blindedSentinelDetectability: result.declaredChannelSentinelDetectabilityEstablished === true,
    postFreezeInventoryReobserved: postFreezeReobservation,
    scannerRegistryPolicyBound: policy?.pathScannerRegistryDigest === digest(`${JSON.stringify(policy?.pathScannerRegistry)}\n`),
    scannerInfrastructureCorroborated: verifyScannerInfrastructureCorroboration(policy?.pathScannerRegistry, bundle?.previousStatusDigest, previousStatus?.issuedAtMs ?? 0, previousStatus?.scannerOwnershipRevocationHistoryDigest),
    boundedConclusion: result.allPossiblePathsBlocked === false && result.inventoryExhaustivenessEstablished === false
  };
  return { ok: Object.values(checks).every(Boolean), checks, effectAssessment: result };
};
