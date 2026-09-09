import { audit, axes, completeExercise, validAmendment, validValidation } from "../sequenced-restoration-v6.2-general-log-consistency/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment, validValidation };

export function initialCheckpointMemory(validation) {
  const proof = validation.generalLogConsistencyProof;
  return { schema: "cct-pinned-checkpoint/v1", logId: proof.logId, treeSize: proof.previousTreeSize,
    rootHash: proof.previousRootHash, recordedAtTick: proof.integratedAtTick - 1 };
}

export function advancedCheckpointMemory(validation) {
  const proof = validation.generalLogConsistencyProof;
  return { schema: "cct-pinned-checkpoint/v1", logId: proof.logId, treeSize: proof.treeSize,
    rootHash: proof.rootHash, recordedAtTick: proof.integratedAtTick };
}
