import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessCrossWitnessLogAgreement, CctCrossWitnessLogAgreementRuntime } from "../sequenced-restoration-v6.0-cross-witness-log-agreement/runtime.mjs";
import { hashLogNode, signedTreeHeadPayload } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const HEX_256 = /^[0-9a-f]{64}$/;

export function validateBoundedConsistencySpec(candidate = SPEC) {
  return candidate?.schema === "cct-bounded-log-consistency/v1" && candidate?.version === "6.1-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-6.0-CROSS-WITNESS-LOG-AGREEMENT-CANDIDATE-001"
    && candidate?.fromTreeSize === 2 && candidate?.toTreeSize === 3;
}

export function assessBoundedLogConsistency(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessCrossWitnessLogAgreement(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "cross_witness_log_agreement_candidate") return prior;
  const receipt = validation.transparencyLogReceipt;
  const proof = validation?.logConsistencyProof;
  if (!validateBoundedConsistencySpec() || proof?.schema !== "cct-bounded-log-consistency-proof/v1"
    || proof.logId !== receipt.logId || proof.previousTreeSize !== receipt.treeSize
    || proof.previousTreeSize !== SPEC.fromTreeSize || proof.treeSize !== SPEC.toTreeSize
    || proof.previousRootHash !== receipt.rootHash || !HEX_256.test(proof.appendedLeafHash ?? "")
    || proof.rootHash !== hashLogNode(proof.previousRootHash, proof.appendedLeafHash)
    || !Number.isInteger(proof.integratedAtTick) || proof.integratedAtTick < receipt.integratedAtTick
    || proof.integratedAtTick >= validation.outcomesAccessedAtTick || proof.publicKeyDer !== receipt.publicKeyDer
    || typeof proof.signature !== "string") {
    return { status: "not_established", failures: ["append_only_log_extension_invalid"] };
  }
  try {
    const key = createPublicKey({ key: Buffer.from(proof.publicKeyDer, "base64"), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(signedTreeHeadPayload(proof)), key, Buffer.from(proof.signature, "base64"))) {
      return { status: "not_established", failures: ["extended_log_signature_invalid"] };
    }
  } catch {
    return { status: "not_established", failures: ["extended_log_signature_invalid"] };
  }
  return { status: SPEC.successStatus, previousTreeSize: proof.previousTreeSize, treeSize: proof.treeSize,
    previousRootHash: proof.previousRootHash, rootHash: proof.rootHash, failures: [] };
}

export class CctBoundedLogConsistencyRuntime extends CctCrossWitnessLogAgreementRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.boundedLogConsistencyExercises?.[action];
      return assessBoundedLogConsistency(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_BOUNDED_LOG_CONSISTENCY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
