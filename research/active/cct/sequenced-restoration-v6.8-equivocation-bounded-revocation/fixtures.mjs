import { OBSERVER_KEYS, observerStatement } from "../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/fixtures.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, transitionFixture, validAmendment, validEndorsements, validValidation } from "../sequenced-restoration-v6.7-contestable-observer-admission/fixtures.mjs";
export { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, transitionFixture, validAmendment, validEndorsements, validValidation };
export function equivocationEvidence(memory) {
  const key = OBSERVER_KEYS[2];
  return [observerStatement(memory, key), observerStatement(memory, key, { rootHash: "cd".repeat(32) })];
}
export function mereAbsenceEvidence(memory) { return [observerStatement(memory, OBSERVER_KEYS[2])]; }
export function differentTickEvidence(memory) {
  const key = OBSERVER_KEYS[2];
  return [observerStatement(memory, key), observerStatement(memory, key, { rootHash: "cd".repeat(32), observedAtTick: memory.recordedAtTick + 1 })];
}
