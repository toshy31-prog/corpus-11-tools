import { createHash, createPrivateKey, sign } from "node:crypto";
import { suspensionPayload } from "./runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, transitionFixture, validAmendment, validEndorsements, validValidation } from "../sequenced-restoration-v6.7-contestable-observer-admission/fixtures.mjs";
export { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, transitionFixture, validAmendment, validEndorsements, validValidation };
const SELECTOR_PRIVATE_KEYS = {
  "selector-x": "MC4CAQAwBQYDK2VwBCIEIKPxIppPUKztVl9sQWede2WLglaeUox7YNEXNjY3LGJQ",
  "selector-y": "MC4CAQAwBQYDK2VwBCIEIPH4S6hqQcpVtPd/2KZRF3eu77v1cxqS7yLaWwvG9geN"
};
export function suspensionFixture(transition, validation, patch = {}) {
  return { schema: "cct-observer-suspension/v1", observerId: "observer-c",
    registryDigest: createHash("sha256").update(JSON.stringify([...transition.newRegistry].sort((a, b) => a.observerId.localeCompare(b.observerId)).map(({ observerId, controller, failureDomain, publicKeyDer }) => ({ observerId, controller, failureDomain, publicKeyDer })))).digest("hex"),
    incidentDigest: "ab".repeat(32), groundsCode: "credible-non-cryptographic-misconduct",
    openedAtTick: validation.generalLogConsistencyProof.integratedAtTick,
    endsAtTick: validation.generalLogConsistencyProof.integratedAtTick + 8,
    appealRoute: "independent-public-appeal", evidenceRoute: "sealed-incident-record", ...patch };
}
export function suspensionEndorsements(suspension, selectors = selectorRegistry()) {
  return selectors.slice(0, 2).map((selector) => { const item = { ...suspension,
    schema: "cct-observer-suspension-endorsement/v1", selectorId: selector.selectorId,
    controller: selector.controller, failureDomain: selector.failureDomain,
    publicKeyDer: selector.publicKeyDer, signature: "" };
    item.signature = sign(null, Buffer.from(suspensionPayload(item)), createPrivateKey({ key: Buffer.from(SELECTOR_PRIVATE_KEYS[selector.selectorId], "base64"), format: "der", type: "pkcs8" })).toString("base64");
    return item; });
}
