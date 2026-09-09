import { createPrivateKey, sign } from "node:crypto";
import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.9-transparency-log-inclusion/fixtures.mjs";
import { hashLogLeaf } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";
import { witnessPayload } from "./runtime.mjs";

export { audit, axes, completeExercise, validAmendment };

const WITNESS_KEYS = [
  { id: "a", publicKeyDer: "MCowBQYDK2VwAyEAawI7lajYV4PWLAwFZ1ff4JDOJwhBv/MsMJMQ2JohiIg=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEICL0o79uuM2uz0gEeomvp4O5eQ3nZVqyOyrbchD7tHeI" },
  { id: "b", publicKeyDer: "MCowBQYDK2VwAyEA+YBq+POGmw/VTYVwwSEmK8lztG/TibvrlU9Cr5YkbHc=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIJ+RviPR4VBPfkHgVzPeWcWRGTlB3xbMqUJALSC6ZVjc" }
];

function statement(receipt, key, rootHash = receipt.rootHash) {
  const item = { schema: "cct-log-witness-statement/v1", witnessId: `synthetic-witness-${key.id}`,
    controller: `synthetic-witness-controller-${key.id}`, failureDomain: `synthetic-witness-domain-${key.id}`,
    logId: receipt.logId, treeSize: receipt.treeSize, rootHash, observedAtTick: 7,
    publicKeyDer: key.publicKeyDer, signature: "" };
  const privateKey = createPrivateKey({ key: Buffer.from(key.privateKeyDer, "base64"), format: "der", type: "pkcs8" });
  item.signature = sign(null, Buffer.from(witnessPayload(item)), privateKey).toString("base64");
  return item;
}

export function validValidation() {
  const validation = sourceValidation();
  validation.logWitnessStatements = WITNESS_KEYS.map((key) => statement(validation.transparencyLogReceipt, key));
  return validation;
}

export function splitViewValidation() {
  const validation = validValidation();
  validation.logWitnessStatements[1] = statement(validation.transparencyLogReceipt, WITNESS_KEYS[1], hashLogLeaf("alternate-signed-view"));
  return validation;
}
