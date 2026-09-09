import { createHash } from "node:crypto";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.17-independent-signature-time-attestation/fixtures.mjs";

const fingerprint = (pem) => `sha256:${createHash("sha256").update(pem).digest("hex")}`;

export function authorityRegistry(attestations) {
  const unique = [...new Map(attestations.map((item) => [item.witnessId, item])).values()];
  return unique.map((item, index) => ({
    witnessId: item.witnessId,
    publicKeyFingerprint: fingerprint(item.publicKeyPem),
    authorityDomain: `synthetic-oversight-domain-${index + 1}`,
    enrolledAt: "2025-12-01T00:00:00.000Z",
    validFrom: "2025-12-01T00:00:00.000Z",
    validUntil: "2026-12-01T00:00:00.000Z",
    revocations: [],
  }));
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return {
    ...setup,
    witnessAuthorityRegistry: authorityRegistry(setup.timeAttestations),
    authorityRegistryFrozenAt: "2026-01-01T18:00:00.000Z",
    ...overrides,
  };
}
