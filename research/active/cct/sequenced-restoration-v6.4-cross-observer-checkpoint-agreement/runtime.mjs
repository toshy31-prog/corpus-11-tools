import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessCheckpointRollbackResistance, CctCheckpointRollbackResistanceRuntime } from "../sequenced-restoration-v6.3-checkpoint-rollback-resistance/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const HEX_256 = /^[0-9a-f]{64}$/;

export function observerCheckpointPayload(item) {
  return [item.schema, item.observerId, item.controller, item.failureDomain, item.logId,
    item.treeSize, item.rootHash, item.observedAtTick].join("\n");
}

function validStatement(item, memory) {
  if (item?.schema !== "cct-observer-checkpoint/v1" || typeof item.observerId !== "string"
    || typeof item.controller !== "string" || typeof item.failureDomain !== "string"
    || item.logId !== memory.logId || !Number.isInteger(item.treeSize) || !HEX_256.test(item.rootHash)
    || !Number.isInteger(item.observedAtTick) || typeof item.publicKeyDer !== "string" || typeof item.signature !== "string") return false;
  try {
    const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(observerCheckpointPayload(item)), key, Buffer.from(item.signature, "base64"));
  } catch { return false; }
}

export function assessCrossObserverCheckpointAgreement(openDebtAxes, dependencyAudit, currentExercise, amendment, validation, memory, statements) {
  const prior = assessCheckpointRollbackResistance(openDebtAxes, dependencyAudit, currentExercise, amendment, validation, memory);
  if (prior.status !== "checkpoint_rollback_resistance_candidate") return prior;
  if (!Array.isArray(statements) || statements.length < SPEC.minimumIndependentObservers
    || !statements.every((item) => validStatement(item, memory)))
    return { status: "not_established", failures: ["cross_observer_checkpoint_agreement_invalid"] };
  const ids = new Set(statements.map((item) => item.observerId));
  const controllers = new Set(statements.map((item) => item.controller));
  const domains = new Set(statements.map((item) => item.failureDomain));
  const divergent = statements.some((item) => item.treeSize !== memory.treeSize || item.rootHash !== memory.rootHash);
  if (ids.size < 2 || controllers.size < 2 || domains.size < 2 || divergent)
    return { status: "not_established", failures: ["cross_observer_checkpoint_divergence"] };
  return { status: SPEC.successStatus, observerCount: statements.length, failures: [] };
}

export class CctCrossObserverCheckpointAgreementRuntime extends CctCheckpointRollbackResistanceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessCrossObserverCheckpointAgreement(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action],
        view?.cct?.observerCheckpointStatements?.[action]).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_CROSS_OBSERVER_CHECKPOINT_AGREEMENT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
