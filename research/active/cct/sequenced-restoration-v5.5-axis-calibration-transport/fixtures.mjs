import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.4-axis-construct-calibration/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

function targetContext(validation, suffix) {
  return {
    population: `target population ${suffix}`, protocol: `independent protocol ${suffix}`, environment: `field environment ${suffix}`,
    differences: ["population", "protocol", "environment"],
    bridgeEvidence: `Blind target re-observation under changed population, protocol, and environment ${suffix}.`,
    reversalCondition: `Withdraw transport for target ${suffix} if either calibrated class falls below threshold.`,
    axisCases: axes.map((axis) => ({ axis, cases: validation.observations.map((item) => {
      const value = item.debtAxes.includes(axis);
      return { sampleId: item.sampleId, transportedValue: value, referenceAdjudications: [
        { controller: `${axis}-${suffix}-ref-a`, failureDomain: `${axis}-${suffix}-domain-a`, value, blindToTransportedValue: true },
        { controller: `${axis}-${suffix}-ref-b`, failureDomain: `${axis}-${suffix}-domain-b`, value, blindToTransportedValue: true }
      ] };
    }) }))
  };
}

export function validValidation() {
  const validation = sourceValidation();
  validation.sourceContext = { population: "source population", protocol: "source protocol", environment: "source environment" };
  validation.transportAudit = { targetContexts: [targetContext(validation, "north"), targetContext(validation, "south")] };
  return validation;
}

export function localSuccessTargetFailure() {
  const validation = validValidation();
  const packet = validation.transportAudit.targetContexts[1].axisCases.find((item) => item.axis === axes[0]);
  packet.cases.filter((item) => item.referenceAdjudications[0].value === false).slice(0, 8)
    .forEach((item) => { item.transportedValue = true; });
  return validation;
}
