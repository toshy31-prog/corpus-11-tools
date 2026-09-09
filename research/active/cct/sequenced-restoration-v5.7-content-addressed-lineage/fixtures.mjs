import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.6-target-evidence-independence/fixtures.mjs";
import { lineageDigest } from "./runtime.mjs";

export { audit, axes, completeExercise, validAmendment };

function commitment(content) { return { algorithm: "sha256", content, digest: lineageDigest(content) }; }

export function validValidation() {
  const validation = sourceValidation();
  validation.transportAudit.targetContexts.forEach((target, index) => {
    const suffix = index + 1;
    target.lineageCommitments = Object.fromEntries(["rawData", "samplingFrame", "generator", "adjudication", "failureDomain"]
      .map((kind) => [kind, commitment(`${kind}-artifact-content-${suffix}`)]));
    target.unitFingerprints = target.axisCases[0].cases.map((item, itemIndex) => lineageDigest(`${suffix}|${itemIndex}|${item.sampleId}`));
  });
  return validation;
}

export function renamedContentCollision() {
  const validation = validValidation();
  const [left, right] = validation.transportAudit.targetContexts;
  right.lineageCommitments.rawData = structuredClone(left.lineageCommitments.rawData);
  right.lineageCommitments.generator = structuredClone(left.lineageCommitments.generator);
  right.unitFingerprints = [...left.unitFingerprints];
  return validation;
}
