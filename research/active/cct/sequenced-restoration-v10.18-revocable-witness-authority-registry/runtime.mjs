import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessIndependentSignatureTimeAttestation } from "../sequenced-restoration-v10.17-independent-signature-time-attestation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const fingerprint = (pem) => `sha256:${createHash("sha256").update(pem).digest("hex")}`;

export function assessRevocableWitnessAuthorityRegistry(args) {
  const prior = assessIndependentSignatureTimeAttestation(args);
  if (prior.status !== "independent_signature_time_attestation_candidate") return prior;
  if (!(args.authorityRegistryFrozenAt < args.registerFrozenAt)) return { status: "not_established", failures: ["authority_registry_not_frozen_before_effect_register"] };
  const registry = new Map((args.witnessAuthorityRegistry ?? []).map((entry) => [entry.witnessId, entry]));
  const authorityAudits = args.timeAttestations.map((attestation) => {
    const entry = registry.get(attestation.witnessId);
    const failures = [];
    if (!entry) return { sourceId: attestation.sourceId, witnessId: attestation.witnessId, failures: ["witness_not_registered"] };
    if (entry.publicKeyFingerprint !== fingerprint(attestation.publicKeyPem)) failures.push("registered_key_fingerprint_mismatch");
    if (!(entry.enrolledAt <= attestation.issuedAt)) failures.push("witness_enrolled_after_attestation");
    if (!(entry.validFrom <= attestation.issuedAt && attestation.issuedAt < entry.validUntil)) failures.push("attestation_outside_key_validity");
    if ((entry.revocations ?? []).some((item) => item.effectiveAt <= attestation.issuedAt)) failures.push("key_revoked_at_attestation_time");
    return { sourceId: attestation.sourceId, witnessId: attestation.witnessId, authorityDomain: entry.authorityDomain, failures };
  });
  const validAudits = authorityAudits.filter((item) => item.failures.length === 0);
  const distinctAuthorityDomains = new Set(validAudits.map((item) => item.authorityDomain)).size;
  const authorityEligible = validAudits.length === authorityAudits.length && distinctAuthorityDomains >= SPEC.minimumAuthorityDomains;
  if (!authorityEligible) return { status: "not_established", failures: ["witness_authority_status_failed"], distinctAuthorityDomains, authorityAudits };
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "pre_frozen_revocable_key_status_registry",
    distinctAuthorityDomains,
    authorityEligible,
    authorityLegitimacyEstablished: false,
    registryOperatorIndependenceEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
