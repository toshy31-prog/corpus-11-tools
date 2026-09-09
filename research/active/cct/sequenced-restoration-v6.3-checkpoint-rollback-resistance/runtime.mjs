import { readFileSync } from "node:fs";
import { assessGeneralLogConsistency, CctGeneralLogConsistencyRuntime } from "../sequenced-restoration-v6.2-general-log-consistency/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const HEX_256 = /^[0-9a-f]{64}$/;

export function validateRollbackResistanceSpec(candidate = SPEC) {
  return candidate?.schema === "cct-checkpoint-rollback-resistance/v1"
    && candidate?.version === "6.3-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-6.2-GENERAL-LOG-CONSISTENCY-CANDIDATE-001"
    && candidate?.stateConstruction === "locally-pinned-monotonic-checkpoint";
}

export function assessCheckpointRollbackResistance(openDebtAxes, dependencyAudit, currentExercise, amendment, validation, checkpointMemory) {
  const prior = assessGeneralLogConsistency(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "general_append_only_log_consistency_candidate") return prior;
  const proof = validation.generalLogConsistencyProof;
  if (!validateRollbackResistanceSpec()
    || checkpointMemory?.schema !== "cct-pinned-checkpoint/v1"
    || checkpointMemory.logId !== proof.logId
    || !Number.isInteger(checkpointMemory.treeSize) || checkpointMemory.treeSize < 1
    || !HEX_256.test(checkpointMemory.rootHash)
    || !Number.isInteger(checkpointMemory.recordedAtTick)
    || checkpointMemory.treeSize !== proof.previousTreeSize
    || checkpointMemory.rootHash !== proof.previousRootHash
    || proof.treeSize <= checkpointMemory.treeSize
    || proof.integratedAtTick <= checkpointMemory.recordedAtTick) {
    return { status: "not_established", failures: ["checkpoint_rollback_or_memory_gap"] };
  }
  return { status: SPEC.successStatus, previousTreeSize: proof.previousTreeSize, treeSize: proof.treeSize,
    nextCheckpointMemory: { schema: "cct-pinned-checkpoint/v1", logId: proof.logId, treeSize: proof.treeSize,
      rootHash: proof.rootHash, recordedAtTick: proof.integratedAtTick }, failures: [] };
}

export class CctCheckpointRollbackResistanceRuntime extends CctGeneralLogConsistencyRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessCheckpointRollbackResistance(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action]).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_CHECKPOINT_ROLLBACK_RESISTANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
