import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.2-intersectional-nondegradation/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

function measurements(axis, value) {
  return [
    { channel: `${axis}-register-a`, controller: `${axis}-controller-a`, failureDomain: `${axis}-domain-a`, value, observedAtTick: 3 },
    { channel: `${axis}-register-b`, controller: `${axis}-controller-b`, failureDomain: `${axis}-domain-b`, value, observedAtTick: 3 }
  ];
}

export function validValidation() {
  const validation = sourceValidation();
  validation.observations.forEach((item) => {
    item.axisMembershipMeasurements = axes.map((axis) => ({ axis, measurements: measurements(axis, item.debtAxes.includes(axis)) }));
  });
  return validation;
}

export function concealedIntersectionMembership() {
  const validation = validValidation();
  validation.observations.slice(10, 15).forEach((item) => {
    item.augmentedPrediction = item.outcome ? 0.4940357853 : 0.5059642147;
    item.axisMembershipMeasurements.forEach((record) => record.measurements.forEach((measurement) => { measurement.value = true; }));
  });
  validation.observations.slice(15).forEach((item) => {
    item.augmentedPrediction = item.outcome ? 0.5472307431 : 0.4527692569;
  });
  validation.observations.slice(0, 10).forEach((item) => {
    item.augmentedPrediction = item.outcome ? 0.5472307431 : 0.4527692569;
  });
  return validation;
}
