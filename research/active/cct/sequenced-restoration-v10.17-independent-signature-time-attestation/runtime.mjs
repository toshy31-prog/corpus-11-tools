import { readFileSync } from "node:fs";
import { verify } from "node:crypto";
import { assessContentAddressedEvidenceBinding } from "../sequenced-restoration-v10.16-content-addressed-evidence-binding/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const payload = (item) => JSON.stringify({ sourceId: item.sourceId, artifactHash: item.artifactHash, issuedAt: item.issuedAt, witnessId: item.witnessId });

export function assessIndependentSignatureTimeAttestation(args) {
  const prior = assessContentAddressedEvidenceBinding(args);
  if (prior.status !== "content_addressed_evidence_binding_candidate") return prior;
  const attestations = args.timeAttestations ?? [];
  const bySource = new Map(attestations.map((item) => [item.sourceId, item]));
  const attestationAudits = args.evidenceRootManifest.map((entry) => {
    const item = bySource.get(entry.sourceId);
    const failures = [];
    if (!item) return { sourceId: entry.sourceId, failures: ["missing_time_attestation"] };
    if (item.artifactHash !== entry.artifactHash) failures.push("attested_artifact_hash_mismatch");
    if (!(item.issuedAt < args.registerFrozenAt)) failures.push("attestation_not_before_register_freeze");
    try {
      if (!verify(null, Buffer.from(payload(item)), item.publicKeyPem, Buffer.from(item.signatureBase64, "base64"))) failures.push("invalid_attestation_signature");
    } catch {
      failures.push("invalid_attestation_signature");
    }
    return { sourceId: entry.sourceId, witnessId: item.witnessId, failures };
  });
  const distinctWitnesses = new Set(attestationAudits.filter((item) => item.failures.length === 0).map((item) => item.witnessId)).size;
  const allAttestationsValid = attestationAudits.every((item) => item.failures.length === 0) && distinctWitnesses >= SPEC.minimumDistinctWitnesses;
  if (!allAttestationsValid) return { status: "not_established", failures: ["signature_or_time_attestation_failed"], distinctWitnesses, attestationAudits };
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "verified_ed25519_multilateral_pre_freeze_attestation",
    distinctWitnesses,
    allAttestationsValid,
    identityEstablished: false,
    trustedTimeEstablished: false,
    observationTruthEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
