import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.3-axis-membership-observability/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

function adjudications(axis, value) {
  return [
    { sourceRoot: `${axis}-reference-a`, controller: `${axis}-adjudicator-a`, failureDomain: `${axis}-reference-domain-a`, value, observedAtTick: 5, blindToPredictionsAndOutcomes: true },
    { sourceRoot: `${axis}-reference-b`, controller: `${axis}-adjudicator-b`, failureDomain: `${axis}-reference-domain-b`, value, observedAtTick: 5, blindToPredictionsAndOutcomes: true }
  ];
}

export function validValidation() {
  const validation = sourceValidation();
  validation.axisConstructAudits = axes.map((axis) => ({
    axis,
    construct: `Material exposure represented by the open debt axis ${axis}.`,
    operationalDefinition: `Pre-outcome membership criteria specified independently for ${axis}.`,
    inclusionObservable: `Documented exposure satisfying the positive reference rule for ${axis}.`,
    exclusionObservable: `Documented absence satisfying the negative reference rule for ${axis}.`,
    closestRivalConstruct: `Administrative visibility without material exposure to ${axis}.`,
    discriminatingObservation: `Blind reference adjudication separates material exposure from administrative visibility.`,
    reversalCondition: `Withdraw support if either calibrated sensitivity or specificity falls below the frozen bound.`,
    referenceCases: validation.observations.map((item) => ({ sampleId: item.sampleId, adjudications: adjudications(axis, item.debtAxes.includes(axis)) }))
  }));
  return validation;
}

export function agreeingChannelsWithInvalidProxy() {
  const validation = validValidation();
  const axis = axes[0];
  const candidates = validation.observations.filter((item) => !item.debtAxes.includes(axis)).slice(0, 8);
  candidates.forEach((item) => {
    item.debtAxes.push(axis);
    const record = item.axisMembershipMeasurements.find((entry) => entry.axis === axis);
    record.measurements.forEach((measurement) => { measurement.value = true; });
  });
  return validation;
}
