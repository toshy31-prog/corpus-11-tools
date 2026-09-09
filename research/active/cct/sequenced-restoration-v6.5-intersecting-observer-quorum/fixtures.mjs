import { OBSERVER_KEYS, audit, axes, completeExercise, initialCheckpointMemory, observerStatement, validAmendment, validValidation } from "../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/fixtures.mjs";
export { audit, axes, completeExercise, initialCheckpointMemory, validAmendment, validValidation };

export function observerRegistry() {
  return OBSERVER_KEYS.map((key) => ({ observerId: `observer-${key.id}`, controller: `controller-${key.id}`,
    failureDomain: `domain-${key.id}`, publicKeyDer: key.publicKeyDer }));
}
export function quorum(memory, indexes) { return indexes.map((index) => observerStatement(memory, OBSERVER_KEYS[index])); }
