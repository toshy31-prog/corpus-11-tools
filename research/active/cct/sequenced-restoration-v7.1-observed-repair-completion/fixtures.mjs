import { createPrivateKey, sign } from "node:crypto";
import { repairObservationPayload } from "./runtime.mjs";
import { adjudicationFixture, adjudicationVotes, adjudicatorRegistry, audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, suspensionEndorsements, suspensionFixture, transitionFixture, validAmendment, validEndorsements, validValidation } from "../sequenced-restoration-v7.0-independent-suspension-adjudication/fixtures.mjs";
export { adjudicationVotes, adjudicatorRegistry, audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, suspensionEndorsements, suspensionFixture, transitionFixture, validAmendment, validEndorsements, validValidation };
const KEYS = [
  { id: "a", controller: "repair-civic", domain: "repair-domain-a", channel: "registry-query", pub: "MCowBQYDK2VwAyEAL3dzZCRd0bipGm7B4MMTaJ4RqA/dPM8ZgGxqXcTC9PI=", priv: "MC4CAQAwBQYDK2VwBCIEIN3cB7Y3GzJFxYckg1zDNFIC3eazHSHm34FSiw3/NElf" },
  { id: "b", controller: "repair-recipient", domain: "repair-domain-b", channel: "recipient-confirmation", pub: "MCowBQYDK2VwAyEAYZNuIw/oA20tZn34OnsC3CPXlywRsJoO5ICfKi2S0DM=", priv: "MC4CAQAwBQYDK2VwBCIEIIBRcCTZirCRqbNw+dvcDR51wIhqO/uhZbIh3oB6K+Ys" },
  { id: "c", controller: "repair-audit", domain: "repair-domain-c", channel: "public-ledger", pub: "MCowBQYDK2VwAyEADAmRCIOMlZ2AJ/XwTQDFp/QB4uBjn7j3JlaPZIbvAuk=", priv: "MC4CAQAwBQYDK2VwBCIEIEHufYID4ZOe+tOqi3lX/g/q/7OxqkBJctO2IeFU9I17" }
];
export function repairDecision(suspension, finding = "allegation-not-established", patch = {}) { return adjudicationFixture(suspension, finding, { repairReceipt: "ef".repeat(32), ...patch }); }
export function repairAttestorRegistry() { return KEYS.map((k) => ({ attestorId: `repair-${k.id}`, controller: k.controller, failureDomain: k.domain, channel: k.channel, publicKeyDer: k.pub })); }
export function repairObservations(decision, patch = {}) { return KEYS.slice(0, 2).map((k) => { const item = { schema: "cct-repair-observation/v1", attestorId: `repair-${k.id}`, controller: k.controller,
  failureDomain: k.domain, channel: k.channel, publicKeyDer: k.pub, observerId: decision.observerId,
  incidentDigest: decision.incidentDigest, repairCommitmentDigest: decision.repairReceipt,
  repairExecutionDigest: "12".repeat(32), observedAtTick: decision.restoreAtTick + 1,
  eligibilityRestored: true, correctionPublished: true, compensationTransferred: true, signature: "", ...patch };
  item.signature = sign(null, Buffer.from(repairObservationPayload(item)), createPrivateKey({ key: Buffer.from(k.priv, "base64"), format: "der", type: "pkcs8" })).toString("base64"); return item; }); }
