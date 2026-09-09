import { createPrivateKey, sign } from "node:crypto";
import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.8-independent-preoutcome-custody/fixtures.mjs";
import { hashLogLeaf, hashLogNode, signedTreeHeadPayload } from "./runtime.mjs";

export { audit, axes, completeExercise, validAmendment };

const PUBLIC_KEY_DER = "MCowBQYDK2VwAyEAoAjOxL52lfz+w7mR14SJO8OGgHiWJsYzoPolgL369Pw=";
const PRIVATE_KEY_DER = "MC4CAQAwBQYDK2VwBCIEIBVHxFb8e3dX71olBM9zHa8hpE4JLCoPSXU71o9Lus74";

function signedReceipt(bundleDigest) {
  const leafHash = hashLogLeaf(bundleDigest);
  const siblingHash = hashLogLeaf("synthetic-independent-entry");
  const receipt = {
    schema: "cct-transparency-log-receipt/v1",
    logId: "synthetic-cct-transparency-log",
    logController: "synthetic-log-controller",
    failureDomain: "synthetic-log-domain",
    bundleDigest,
    leafHash,
    leafIndex: 0,
    treeSize: 2,
    auditPath: [{ position: "right", hash: siblingHash }],
    rootHash: hashLogNode(leafHash, siblingHash),
    integratedAtTick: 7,
    publicKeyDer: PUBLIC_KEY_DER,
    signature: ""
  };
  const privateKey = createPrivateKey({ key: Buffer.from(PRIVATE_KEY_DER, "base64"), format: "der", type: "pkcs8" });
  receipt.signature = sign(null, Buffer.from(signedTreeHeadPayload(receipt)), privateKey).toString("base64");
  return receipt;
}

export function validValidation() {
  const validation = sourceValidation();
  validation.transparencyLogReceipt = signedReceipt(validation.lineageCustody.bundleDigest);
  return validation;
}

export function tamperedInclusionProof() {
  const validation = validValidation();
  validation.transparencyLogReceipt.auditPath[0].hash = hashLogLeaf("tampered-entry");
  return validation;
}
