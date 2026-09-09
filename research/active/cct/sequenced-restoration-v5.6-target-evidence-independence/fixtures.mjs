import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.5-axis-calibration-transport/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

export function validValidation() {
  const validation = sourceValidation();
  validation.transportAudit.targetContexts.forEach((target, index) => {
    const suffix = index + 1;
    target.provenance = { rawDataRoot: `raw-${suffix}`, samplingFrameRoot: `frame-${suffix}`, generatorRoot: `generator-${suffix}`,
      adjudicationRoot: `adjudication-${suffix}`, failureDomain: `target-domain-${suffix}` };
    target.axisCases.forEach((packet) => packet.cases.forEach((item) => { item.sampleId = `target-${suffix}-${item.sampleId}`; }));
  });
  return validation;
}

export function renamedButDependentTargets() {
  const validation = validValidation();
  const [left, right] = validation.transportAudit.targetContexts;
  right.provenance.rawDataRoot = left.provenance.rawDataRoot;
  right.provenance.generatorRoot = left.provenance.generatorRoot;
  right.axisCases.forEach((packet, packetIndex) => packet.cases.forEach((item, itemIndex) => {
    item.sampleId = left.axisCases[packetIndex].cases[itemIndex].sampleId;
  }));
  return validation;
}
