import { createPrivateKey, sign } from "node:crypto";
import { advancedCheckpointMemory, audit, axes, completeExercise, initialCheckpointMemory, validAmendment, validValidation } from "../sequenced-restoration-v6.3-checkpoint-rollback-resistance/fixtures.mjs";
import { observerCheckpointPayload } from "./runtime.mjs";

export { advancedCheckpointMemory, audit, axes, completeExercise, initialCheckpointMemory, validAmendment, validValidation };
export const OBSERVER_KEYS = [
  { id: "a", publicKeyDer: "MCowBQYDK2VwAyEAawI7lajYV4PWLAwFZ1ff4JDOJwhBv/MsMJMQ2JohiIg=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEICL0o79uuM2uz0gEeomvp4O5eQ3nZVqyOyrbchD7tHeI" },
  { id: "b", publicKeyDer: "MCowBQYDK2VwAyEA+YBq+POGmw/VTYVwwSEmK8lztG/TibvrlU9Cr5YkbHc=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIJ+RviPR4VBPfkHgVzPeWcWRGTlB3xbMqUJALSC6ZVjc" },
  { id: "c", publicKeyDer: "MCowBQYDK2VwAyEAbiWoujeSBrjdkmOhBFcIShrsO5d7SoMJkWHrxFYMbew=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIITKlzpe4Sa1si7T4MPSisyjpK0vV4zow7CVVGVp8iPj" },
  { id: "d", publicKeyDer: "MCowBQYDK2VwAyEAl4onxedk5rUmQzTOf81ZtTrZecHMAidioAB16Jqbpfk=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIMxRCdiBInTkGFay3d/zVUFBfdpCva1HJWfB7DAX2817" }
];

export function observerStatement(memory, key, patch = {}) {
  const item = { schema: "cct-observer-checkpoint/v1", observerId: `observer-${key.id}`,
    controller: `controller-${key.id}`, failureDomain: `domain-${key.id}`, logId: memory.logId,
    treeSize: memory.treeSize, rootHash: memory.rootHash, observedAtTick: memory.recordedAtTick,
    publicKeyDer: key.publicKeyDer, signature: "", ...patch };
  item.signature = sign(null, Buffer.from(observerCheckpointPayload(item)), createPrivateKey({
    key: Buffer.from(key.privateKeyDer, "base64"), format: "der", type: "pkcs8" })).toString("base64");
  return item;
}

export function agreeingStatements(memory) { return OBSERVER_KEYS.slice(0, 2).map((key) => observerStatement(memory, key)); }
export function commonControllerStatements(memory) {
  return OBSERVER_KEYS.slice(0, 2).map((key) => observerStatement(memory, key, { controller: "shared-controller" }));
}
export function partitionedStatements(memory) {
  return [observerStatement(memory, OBSERVER_KEYS[0]), observerStatement(memory, OBSERVER_KEYS[1], { treeSize: memory.treeSize + 1, rootHash: "ab".repeat(32) })];
}
