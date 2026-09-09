import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessBoundedLogConsistency, CctBoundedLogConsistencyRuntime } from "../sequenced-restoration-v6.1-bounded-log-consistency/runtime.mjs";
import { signedTreeHeadPayload } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const HEX_256 = /^[0-9a-f]{64}$/;

export function rfc9162LeafHash(value) {
  return createHash("sha256").update(Buffer.concat([Buffer.from([0]), Buffer.from(value)])).digest("hex");
}

export function rfc9162NodeHash(left, right) {
  return createHash("sha256").update(Buffer.concat([Buffer.from([1]), Buffer.from(left, "hex"), Buffer.from(right, "hex")])).digest("hex");
}

export function verifyInclusion(leafHash, leafIndex, treeSize, path, expectedRoot) {
  if (!HEX_256.test(leafHash) || !Number.isInteger(leafIndex) || !Number.isInteger(treeSize)
    || leafIndex < 0 || leafIndex >= treeSize || !Array.isArray(path) || !path.every((x) => HEX_256.test(x))) return false;
  let fn = leafIndex;
  let sn = treeSize - 1;
  let root = leafHash;
  for (const node of path) {
    if (sn === 0) return false;
    if ((fn & 1) === 1 || fn === sn) {
      root = rfc9162NodeHash(node, root);
      while ((fn & 1) === 0 && fn !== 0) { fn >>= 1; sn >>= 1; }
    } else root = rfc9162NodeHash(root, node);
    fn >>= 1;
    sn >>= 1;
  }
  return sn === 0 && root === expectedRoot;
}

export function verifyConsistency(first, second, firstHash, secondHash, suppliedPath) {
  if (!Number.isInteger(first) || !Number.isInteger(second) || first < 1 || first >= second
    || !HEX_256.test(firstHash) || !HEX_256.test(secondHash) || !Array.isArray(suppliedPath)
    || suppliedPath.length === 0 || !suppliedPath.every((x) => HEX_256.test(x))) return false;
  const path = [...suppliedPath];
  if ((first & (first - 1)) === 0) path.unshift(firstHash);
  let fn = first - 1;
  let sn = second - 1;
  while ((fn & 1) === 1) { fn >>= 1; sn >>= 1; }
  let fr = path[0];
  let sr = path[0];
  for (const node of path.slice(1)) {
    if (sn === 0) return false;
    if ((fn & 1) === 1 || fn === sn) {
      fr = rfc9162NodeHash(node, fr);
      sr = rfc9162NodeHash(node, sr);
      while ((fn & 1) === 0 && fn !== 0) { fn >>= 1; sn >>= 1; }
    } else sr = rfc9162NodeHash(sr, node);
    fn >>= 1;
    sn >>= 1;
  }
  return sn === 0 && fr === firstHash && sr === secondHash;
}

export function validateGeneralConsistencySpec(candidate = SPEC) {
  return candidate?.schema === "cct-general-log-consistency/v1" && candidate?.version === "6.2-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-6.1-BOUNDED-LOG-CONSISTENCY-CANDIDATE-001"
    && candidate?.treeConstruction === "rfc9162" && candidate?.minimumPreviousTreeSize === 1;
}

export function assessGeneralLogConsistency(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessBoundedLogConsistency(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "bounded_append_only_log_extension_candidate") return prior;
  const bounded = validation.logConsistencyProof;
  const proof = validation.generalLogConsistencyProof;
  if (!validateGeneralConsistencySpec() || proof?.schema !== "cct-general-log-consistency-proof/v1"
    || proof.logId !== bounded.logId || proof.publicKeyDer !== bounded.publicKeyDer
    || proof.previousTreeSize < SPEC.minimumPreviousTreeSize || proof.previousTreeSize >= proof.treeSize
    || proof.anchorLeafHash !== rfc9162LeafHash(`cct-6.1-root:${bounded.rootHash}`)
    || !verifyInclusion(proof.anchorLeafHash, 0, proof.previousTreeSize, proof.anchorAuditPath, proof.previousRootHash)
    || !verifyConsistency(proof.previousTreeSize, proof.treeSize, proof.previousRootHash, proof.rootHash, proof.consistencyPath)
    || !Number.isInteger(proof.integratedAtTick) || proof.integratedAtTick < bounded.integratedAtTick
    || proof.integratedAtTick >= validation.outcomesAccessedAtTick || typeof proof.signature !== "string") {
    return { status: "not_established", failures: ["general_log_consistency_invalid"] };
  }
  try {
    const key = createPublicKey({ key: Buffer.from(proof.publicKeyDer, "base64"), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(signedTreeHeadPayload(proof)), key, Buffer.from(proof.signature, "base64")))
      return { status: "not_established", failures: ["general_log_checkpoint_signature_invalid"] };
  } catch { return { status: "not_established", failures: ["general_log_checkpoint_signature_invalid"] }; }
  return { status: SPEC.successStatus, previousTreeSize: proof.previousTreeSize, treeSize: proof.treeSize, failures: [] };
}

export class CctGeneralLogConsistencyRuntime extends CctBoundedLogConsistencyRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessGeneralLogConsistency(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_GENERAL_LOG_CONSISTENCY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
