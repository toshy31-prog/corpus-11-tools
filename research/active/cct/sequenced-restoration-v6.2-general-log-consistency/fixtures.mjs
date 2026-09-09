import { createPrivateKey, sign } from "node:crypto";
import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v6.1-bounded-log-consistency/fixtures.mjs";
import { signedTreeHeadPayload } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";
import { rfc9162LeafHash, rfc9162NodeHash } from "./runtime.mjs";

export { audit, axes, completeExercise, validAmendment };
const LOG_PRIVATE_KEY_DER = "MC4CAQAwBQYDK2VwBCIEIBVHxFb8e3dX71olBM9zHa8hpE4JLCoPSXU71o9Lus74";

export function treeHash(leaves) {
  if (leaves.length === 1) return rfc9162LeafHash(leaves[0]);
  let k = 1; while ((k << 1) < leaves.length) k <<= 1;
  return rfc9162NodeHash(treeHash(leaves.slice(0, k)), treeHash(leaves.slice(k)));
}

export function consistencyPath(first, leaves, complete = true) {
  if (first === leaves.length) return complete ? [] : [treeHash(leaves)];
  let k = 1; while ((k << 1) < leaves.length) k <<= 1;
  if (first <= k) return [...consistencyPath(first, leaves.slice(0, k), complete), treeHash(leaves.slice(k))];
  return [...consistencyPath(first - k, leaves.slice(k), false), treeHash(leaves.slice(0, k))];
}

export function inclusionPath(index, leaves) {
  if (leaves.length === 1) return [];
  let k = 1; while ((k << 1) < leaves.length) k <<= 1;
  return index < k
    ? [...inclusionPath(index, leaves.slice(0, k)), treeHash(leaves.slice(k))]
    : [...inclusionPath(index - k, leaves.slice(k)), treeHash(leaves.slice(0, k))];
}

function generalProof(bounded, mutate = false) {
  const leaves = [`cct-6.1-root:${bounded.rootHash}`, "entry-a", "entry-b", "entry-c", "entry-d", "entry-e", "entry-f"];
  const previousTreeSize = 3;
  const previous = leaves.slice(0, previousTreeSize);
  const proof = { schema: "cct-general-log-consistency-proof/v1", logId: bounded.logId,
    previousTreeSize, previousRootHash: treeHash(previous), treeSize: leaves.length, rootHash: treeHash(leaves),
    anchorLeafHash: rfc9162LeafHash(leaves[0]), anchorAuditPath: inclusionPath(0, previous),
    consistencyPath: consistencyPath(previousTreeSize, leaves), integratedAtTick: 11,
    publicKeyDer: bounded.publicKeyDer, signature: "" };
  if (mutate) proof.consistencyPath[0] = rfc9162LeafHash("plausible-but-wrong-proof-node");
  const key = createPrivateKey({ key: Buffer.from(LOG_PRIVATE_KEY_DER, "base64"), format: "der", type: "pkcs8" });
  proof.signature = sign(null, Buffer.from(signedTreeHeadPayload(proof)), key).toString("base64");
  return proof;
}

export function validValidation() {
  const validation = sourceValidation();
  validation.outcomesAccessedAtTick = 12;
  validation.generalLogConsistencyProof = generalProof(validation.logConsistencyProof);
  return validation;
}

export function inconsistentPrefixValidation() {
  const validation = validValidation();
  validation.generalLogConsistencyProof = generalProof(validation.logConsistencyProof, true);
  return validation;
}
