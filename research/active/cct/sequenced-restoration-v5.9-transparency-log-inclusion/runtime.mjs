import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessIndependentPreoutcomeCustody, CctIndependentPreoutcomeCustodyRuntime } from "../sequenced-restoration-v5.8-independent-preoutcome-custody/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const HEX_256 = /^[0-9a-f]{64}$/;

export function hashLogLeaf(value) {
  return createHash("sha256").update(`leaf:${value}`).digest("hex");
}

export function hashLogNode(left, right) {
  return createHash("sha256").update(Buffer.concat([
    Buffer.from("node:"), Buffer.from(left, "hex"), Buffer.from(right, "hex")
  ])).digest("hex");
}

export function signedTreeHeadPayload(receipt) {
  return JSON.stringify({
    logId: receipt.logId,
    treeSize: receipt.treeSize,
    rootHash: receipt.rootHash,
    integratedAtTick: receipt.integratedAtTick
  });
}

export function validateTransparencyLogSpec(candidate = SPEC) {
  return candidate?.schema === "cct-transparency-log-inclusion/v1" && candidate?.version === "5.9-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.8-INDEPENDENT-PREOUTCOME-CUSTODY-CANDIDATE-001"
    && candidate?.digestAlgorithm === "sha256" && candidate?.signatureAlgorithm === "ed25519"
    && candidate?.supportedTreeSize === 2 && HEX_256.test(candidate?.pinnedLogPublicKeyDigest ?? "");
}

function receiptStructureIsValid(receipt, validation) {
  const custody = validation.lineageCustody;
  const path = receipt?.auditPath;
  const keyDer = typeof receipt?.publicKeyDer === "string" ? Buffer.from(receipt.publicKeyDer, "base64") : null;
  const keyDigest = keyDer ? createHash("sha256").update(keyDer).digest("hex") : null;
  const custodians = custody.attestations;
  return receipt?.schema === "cct-transparency-log-receipt/v1"
    && receipt.logId === SPEC.pinnedLogId && keyDigest === SPEC.pinnedLogPublicKeyDigest
    && receipt.bundleDigest === custody.bundleDigest && receipt.leafHash === hashLogLeaf(receipt.bundleDigest)
    && receipt.treeSize === SPEC.supportedTreeSize && Number.isInteger(receipt.leafIndex)
    && receipt.leafIndex >= 0 && receipt.leafIndex < receipt.treeSize
    && Array.isArray(path) && path.length === 1 && HEX_256.test(path[0]?.hash ?? "")
    && path[0]?.position === (receipt.leafIndex === 0 ? "right" : "left")
    && HEX_256.test(receipt.rootHash ?? "") && Number.isInteger(receipt.integratedAtTick)
    && receipt.integratedAtTick < validation.outcomesAccessedAtTick
    && typeof receipt.logController === "string" && receipt.logController.length > 0
    && typeof receipt.failureDomain === "string" && receipt.failureDomain.length > 0
    && custodians.every((item) => item.controller !== receipt.logController && item.failureDomain !== receipt.failureDomain)
    && typeof receipt.signature === "string";
}

export function assessTransparencyLogInclusion(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessIndependentPreoutcomeCustody(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "independently_custodied_preoutcome_lineage_candidate") return prior;
  const receipt = validation?.transparencyLogReceipt;
  if (!validateTransparencyLogSpec() || !receiptStructureIsValid(receipt, validation)) {
    return { status: "not_established", failures: ["transparency_log_receipt_invalid"] };
  }
  const computedRoot = receipt.auditPath[0].position === "right"
    ? hashLogNode(receipt.leafHash, receipt.auditPath[0].hash)
    : hashLogNode(receipt.auditPath[0].hash, receipt.leafHash);
  if (computedRoot !== receipt.rootHash) {
    return { status: "not_established", failures: ["transparency_log_receipt_invalid"] };
  }
  try {
    const publicKey = createPublicKey({ key: Buffer.from(receipt.publicKeyDer, "base64"), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(signedTreeHeadPayload(receipt)), publicKey, Buffer.from(receipt.signature, "base64"))) {
      return { status: "not_established", failures: ["transparency_log_signature_invalid"] };
    }
  } catch {
    return { status: "not_established", failures: ["transparency_log_signature_invalid"] };
  }
  return { status: SPEC.successStatus, logId: receipt.logId, treeSize: receipt.treeSize,
    integratedAtTick: receipt.integratedAtTick, bundleDigest: receipt.bundleDigest, failures: [] };
}

export class CctTransparencyLogInclusionRuntime extends CctIndependentPreoutcomeCustodyRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.transparencyLogInclusionExercises?.[action];
      return assessTransparencyLogInclusion(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_TRANSPARENCY_LOG_INCLUSION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
