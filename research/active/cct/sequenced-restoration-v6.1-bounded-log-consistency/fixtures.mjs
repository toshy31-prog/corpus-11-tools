import { createPrivateKey, sign } from "node:crypto";
import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v6.0-cross-witness-log-agreement/fixtures.mjs";
import { hashLogLeaf, hashLogNode, signedTreeHeadPayload } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";

export { audit, axes, completeExercise, validAmendment };

const LOG_PRIVATE_KEY_DER = "MC4CAQAwBQYDK2VwBCIEIBVHxFb8e3dX71olBM9zHa8hpE4JLCoPSXU71o9Lus74";

function consistencyProof(receipt, previousRootHash = receipt.rootHash) {
  const appendedLeafHash = hashLogLeaf("synthetic-third-entry");
  const proof = { schema: "cct-bounded-log-consistency-proof/v1", logId: receipt.logId,
    previousTreeSize: 2, previousRootHash, treeSize: 3, appendedLeafHash,
    rootHash: hashLogNode(previousRootHash, appendedLeafHash), integratedAtTick: 9,
    publicKeyDer: receipt.publicKeyDer, signature: "" };
  const key = createPrivateKey({ key: Buffer.from(LOG_PRIVATE_KEY_DER, "base64"), format: "der", type: "pkcs8" });
  proof.signature = sign(null, Buffer.from(signedTreeHeadPayload(proof)), key).toString("base64");
  return proof;
}

export function validValidation() {
  const validation = sourceValidation();
  validation.outcomesAccessedAtTick = 10;
  validation.logConsistencyProof = consistencyProof(validation.transparencyLogReceipt);
  return validation;
}

export function rewrittenHistoryValidation() {
  const validation = validValidation();
  validation.logConsistencyProof = consistencyProof(validation.transparencyLogReceipt, hashLogLeaf("rewritten-old-history"));
  return validation;
}
