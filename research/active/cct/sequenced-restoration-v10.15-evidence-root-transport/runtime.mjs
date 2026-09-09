import { readFileSync } from "node:fs";
import { assessProspectiveEffectEnvelopeAdmission } from "../sequenced-restoration-v10.14-prospective-effect-envelope-admission/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessEvidenceRootTransport(args) {
  const prior = assessProspectiveEffectEnvelopeAdmission(args);
  if (prior.status !== "prospective_effect_envelope_admission_candidate") return prior;
  const manifest = args.evidenceRootManifest ?? [];
  const expectedSources = args.effectEnvelopeRegister.map((entry) => entry.sourceId);
  if (JSON.stringify(manifest.map((entry) => entry.sourceId)) !== JSON.stringify(expectedSources)) return { status: "not_established", failures: ["evidence_manifest_source_mismatch"] };
  const entryAudits = manifest.map((entry) => {
    const failures = SPEC.requiredManifestFields.filter((field) => entry[field] === undefined).map((field) => `missing_${field}`);
    if (entry.protocolHash !== undefined && entry.protocolHash !== SPEC.targetProtocolHash) failures.push("protocol_transport_mismatch");
    if (entry.outcomeHash !== undefined && entry.outcomeHash !== SPEC.targetOutcomeHash) failures.push("outcome_transport_mismatch");
    const clusterKey = [entry.rawDataRootHash, entry.samplingFrameHash, entry.generatorHash].join("|");
    return { sourceId: entry.sourceId, clusterKey, failures };
  });
  const uniqueClusters = new Set(entryAudits.filter((entry) => entry.failures.length === 0).map((entry) => entry.clusterKey)).size;
  const manifestComplete = entryAudits.every((entry) => entry.failures.length === 0);
  const independenceEligible = manifestComplete && uniqueClusters >= SPEC.minimumIndependentClusters;
  if (args.requestedTransportStatus === "evidence_justified_transport" && !independenceEligible) return { status: "not_established", failures: ["dependent_or_untransportable_effect_evidence"], uniqueClusters, entryAudits };
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "evidence_root_and_target_hash_audit",
    uniqueClusters,
    entryAudits,
    independenceEligible,
    transportStatus: independenceEligible ? "manifest_eligible_for_external_verification" : "transport_not_established",
    materialIndependenceEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
