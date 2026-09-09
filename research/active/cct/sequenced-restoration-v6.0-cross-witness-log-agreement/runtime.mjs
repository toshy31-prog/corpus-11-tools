import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessTransparencyLogInclusion, CctTransparencyLogInclusionRuntime } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function witnessPayload(statement) {
  return JSON.stringify({ logId: statement.logId, treeSize: statement.treeSize,
    rootHash: statement.rootHash, observedAtTick: statement.observedAtTick });
}

export function validateCrossWitnessSpec(candidate = SPEC) {
  return candidate?.schema === "cct-cross-witness-log-agreement/v1" && candidate?.version === "6.0-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.9-TRANSPARENCY-LOG-INCLUSION-CANDIDATE-001"
    && candidate?.signatureAlgorithm === "ed25519" && candidate?.minimumIndependentWitnesses === 2
    && new Set(candidate?.pinnedWitnessKeyDigests).size === 2;
}

export function assessCrossWitnessLogAgreement(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessTransparencyLogInclusion(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "verified_preoutcome_log_inclusion_candidate") return prior;
  const receipt = validation.transparencyLogReceipt;
  const statements = validation?.logWitnessStatements;
  const custodians = validation.lineageCustody.attestations;
  if (!validateCrossWitnessSpec() || !Array.isArray(statements) || statements.length < SPEC.minimumIndependentWitnesses
    || new Set(statements.map((item) => item?.witnessId)).size !== statements.length
    || new Set(statements.map((item) => item?.controller)).size !== statements.length
    || new Set(statements.map((item) => item?.failureDomain)).size !== statements.length
    || statements.some((item) => item?.schema !== "cct-log-witness-statement/v1"
      || typeof item?.witnessId !== "string" || !item.witnessId || typeof item?.controller !== "string" || !item.controller
      || typeof item?.failureDomain !== "string" || !item.failureDomain || item.controller === receipt.logController
      || item.failureDomain === receipt.failureDomain || custodians.some((c) => c.controller === item.controller || c.failureDomain === item.failureDomain)
      || item.logId !== receipt.logId || item.treeSize !== receipt.treeSize || item.rootHash !== receipt.rootHash
      || !Number.isInteger(item.observedAtTick) || item.observedAtTick < receipt.integratedAtTick
      || item.observedAtTick >= validation.outcomesAccessedAtTick || typeof item?.publicKeyDer !== "string"
      || typeof item?.signature !== "string")) {
    return { status: "not_established", failures: ["cross_witness_log_disagreement"] };
  }
  try {
    const keyDigests = statements.map((item) => createHash("sha256").update(Buffer.from(item.publicKeyDer, "base64")).digest("hex"));
    if (new Set(keyDigests).size !== statements.length || keyDigests.some((digest) => !SPEC.pinnedWitnessKeyDigests.includes(digest))
      || statements.some((item) => !verify(null, Buffer.from(witnessPayload(item)),
        createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" }),
        Buffer.from(item.signature, "base64")))) {
      return { status: "not_established", failures: ["cross_witness_signature_invalid"] };
    }
  } catch {
    return { status: "not_established", failures: ["cross_witness_signature_invalid"] };
  }
  return { status: SPEC.successStatus, witnessCount: statements.length, logId: receipt.logId,
    treeSize: receipt.treeSize, rootHash: receipt.rootHash, failures: [] };
}

export class CctCrossWitnessLogAgreementRuntime extends CctTransparencyLogInclusionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.crossWitnessLogExercises?.[action];
      return assessCrossWitnessLogAgreement(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_CROSS_WITNESS_LOG_AGREEMENT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
