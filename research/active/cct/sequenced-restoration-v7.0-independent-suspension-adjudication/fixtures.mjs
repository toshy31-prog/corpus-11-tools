import { createPrivateKey, sign } from "node:crypto";
import { adjudicationPayload } from "./runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, suspensionEndorsements, suspensionFixture, transitionFixture, validAmendment, validEndorsements, validValidation } from "../sequenced-restoration-v6.9-expiring-contestable-suspension/fixtures.mjs";
export { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, suspensionEndorsements, suspensionFixture, transitionFixture, validAmendment, validEndorsements, validValidation };
const KEYS = [
  { id: "a", controller: "adjudication-civic", domain: "adjudication-domain-a", pub: "MCowBQYDK2VwAyEA93Ba4CTDzJ789LnHeemKMZaB6pneHftJOeArdCXNjAQ=", priv: "MC4CAQAwBQYDK2VwBCIEICgLPIrfp/fMSQ4h3QRPvdVaO5ngvCIPu62dbozuW0gL" },
  { id: "b", controller: "adjudication-judicial", domain: "adjudication-domain-b", pub: "MCowBQYDK2VwAyEAN+/u8sXp2/a14gu4aNGr066o/uD94jQ/O76x2Zq5bL0=", priv: "MC4CAQAwBQYDK2VwBCIEIEu+teQnGIjxjHEJOHbUb1Uxc3uzBHXuBIcs+Ez1fXhy" },
  { id: "c", controller: "adjudication-users", domain: "adjudication-domain-c", pub: "MCowBQYDK2VwAyEAO5gttxFD+jbZy5Bv5NRP8W7WLPcjSZXPZ55Z/2sTil8=", priv: "MC4CAQAwBQYDK2VwBCIEINreNLY9/tWeXCZUZ/RmkT+0U1TllFEEpz630C/i1WCx" }
];
export function adjudicatorRegistry() { return KEYS.map((k) => ({ adjudicatorId: `adjudicator-${k.id}`, controller: k.controller, failureDomain: k.domain, publicKeyDer: k.pub })); }
export function adjudicationFixture(suspension, finding = "allegation-not-established", patch = {}) {
  const restores = finding !== "safeguard-substantiated"; const abusive = finding === "suspension-abusive";
  return { schema: "cct-suspension-adjudication/v1", observerId: suspension.observerId,
    incidentDigest: suspension.incidentDigest, recordDigest: "cd".repeat(32), finding,
    decidedAtTick: suspension.openedAtTick + 3, restoreAtTick: restores ? suspension.openedAtTick + 3 : suspension.endsAtTick,
    correctionRecord: restores ? "public-correction-record" : "", repairReceipt: restores ? "repair-receipt" : "",
    accountabilityReferral: abusive ? "selector-accountability-referral" : "", appealRoute: "separate-adjudication-appeal", ...patch };
}
export function adjudicationVotes(decision) { return KEYS.slice(0, 2).map((k) => { const item = { ...decision,
  schema: "cct-suspension-adjudication-vote/v1", adjudicatorId: `adjudicator-${k.id}`, controller: k.controller,
  failureDomain: k.domain, publicKeyDer: k.pub, signature: "" };
  item.signature = sign(null, Buffer.from(adjudicationPayload(item)), createPrivateKey({ key: Buffer.from(k.priv, "base64"), format: "der", type: "pkcs8" })).toString("base64"); return item; }); }
