import { admissibleRegister, fullSetup as parentSetup } from "../sequenced-restoration-v10.14-prospective-effect-envelope-admission/fixtures.mjs";

export function independentManifest() {
  return admissibleRegister().map((entry, index) => ({
    sourceId: entry.sourceId,
    rawDataRootHash: `sha256:synthetic-data-${index + 1}`,
    samplingFrameHash: `sha256:synthetic-frame-${index + 1}`,
    generatorHash: `sha256:synthetic-generator-${index + 1}`,
    protocolHash: "sha256:cct-sentinel-protocol-v10.15",
    outcomeHash: "sha256:pairwise-hamming-distance-v1",
    artifactHash: `sha256:synthetic-artifact-${index + 1}`,
  }));
}

export function fullSetup(overrides = {}) {
  return {
    ...parentSetup({ effectEnvelopeRegister: admissibleRegister(), requestedBudgetStatus: "evidence_justified_requirement" }),
    evidenceRootManifest: independentManifest(),
    requestedTransportStatus: "design_audit_only",
    ...overrides,
  };
}
