import { createPrivateKey, sign } from "node:crypto";
import { admissionPayload, registryDigest } from "./runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, transitionFixture, validAmendment, validValidation } from "../sequenced-restoration-v6.6-joint-observer-registry-transition/fixtures.mjs";
export { audit, axes, completeExercise, initialCheckpointMemory, transitionFixture, validAmendment, validValidation };
const SELECTORS = [
  { id: "x", controller: "selector-civic", domain: "civic-domain", publicKeyDer: "MCowBQYDK2VwAyEA8wA4u8yMTnkMRcy5qvt6dRjRUeGAdDqwAoxs5Q2aMKE=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIKPxIppPUKztVl9sQWede2WLglaeUox7YNEXNjY3LGJQ" },
  { id: "y", controller: "selector-judicial", domain: "judicial-domain", publicKeyDer: "MCowBQYDK2VwAyEAwREAjO8lbyEUmw6mkQsIq/R3DJuHxCl+ItHbT/JfIoM=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIPH4S6hqQcpVtPd/2KZRF3eu77v1cxqS7yLaWwvG9geN" },
  { id: "z", controller: "selector-users", domain: "users-domain", publicKeyDer: "MCowBQYDK2VwAyEAYslRahdfIaVllhK+Xa6kbUsS9hzuMWnLGCh1wRzXkGE=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIHqhtqfpXSOqC8t5q7V6fysNmSYd7ITGEhbAl3alSn9M" }
];
export function selectorRegistry() { return SELECTORS.map((s) => ({ selectorId: `selector-${s.id}`, controller: s.controller,
  failureDomain: s.domain, publicKeyDer: s.publicKeyDer })); }
function endorsement(transition, selector, patch = {}) { const item = { schema: "cct-observer-admission-endorsement/v1",
  selectorId: `selector-${selector.id}`, controller: selector.controller, failureDomain: selector.domain,
  registryDigest: registryDigest(transition.newRegistry), approvedAtTick: 10, mandateEndsAtTick: 80,
  appealRoute: "independent-public-appeal", publicKeyDer: selector.publicKeyDer, signature: "", ...patch };
  item.signature = sign(null, Buffer.from(admissionPayload(item)), createPrivateKey({ key: Buffer.from(selector.privateKeyDer, "base64"), format: "der", type: "pkcs8" })).toString("base64"); return item; }
export function validEndorsements(transition) { return SELECTORS.slice(0, 2).map((s) => endorsement(transition, s)); }
export function capturedEndorsements(transition) { return SELECTORS.slice(0, 2).map((s) => endorsement(transition, s, { controller: "controller-c" })); }
export function overlongEndorsements(transition) { return SELECTORS.slice(0, 2).map((s) => endorsement(transition, s, { mandateEndsAtTick: 200 })); }
