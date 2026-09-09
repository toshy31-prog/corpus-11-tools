import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.20-contestable-control-corroboration/fixtures.mjs";

const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const judges = ["synthetic-adjudicator-a", "synthetic-adjudicator-b"].map((adjudicatorId, index) => ({ adjudicatorId, centerId: `synthetic-adjudication-center-${index + 1}`, ...generateKeyPairSync("ed25519") }));
const challengePayload = (item) => JSON.stringify({ challengeId: item.challengeId, authorityDomain: item.authorityDomain, dimension: item.dimension, contraryValue: item.contraryValue });
const payload = (item) => JSON.stringify({ challengeId: item.challengeId, challengeHash: item.challengeHash, verdict: item.verdict, reasonArtifactHash: item.reasonArtifactHash, issuedAt: item.issuedAt, adjudicatorId: item.adjudicatorId });

export function adjudicatorRegistry() {
  return judges.map((judge) => ({ adjudicatorId: judge.adjudicatorId, centerId: judge.centerId, publicKeyPem: judge.publicKey.export({ type: "spki", format: "pem" }), controlRootIds: [`root-${judge.centerId}`] }));
}

export function signedDecisions(challenge, verdict = "challenge_rejected") {
  return judges.map((judge) => {
    const reason = `synthetic reason for ${challenge.challengeId} by ${judge.adjudicatorId}`;
    const item = { challengeId: challenge.challengeId, challengeHash: hash(challengePayload(challenge)), verdict, reasonArtifactHash: hash(reason), issuedAt: "2026-01-01T20:00:00.000Z", adjudicatorId: judge.adjudicatorId };
    return { ...item, reason, signatureBase64: sign(null, Buffer.from(payload(item)), judge.privateKey).toString("base64") };
  });
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  const challenge = { challengeId: "challenge-1", authorityDomain: setup.authorityControlProfiles[0].authorityDomain, dimension: "effectiveOwnerId", status: "open", contraryValue: setup.authorityControlProfiles[1].effectiveOwnerId };
  return { ...setup, controlChallenges: [challenge], adjudicatorRegistry: adjudicatorRegistry(), adjudicationDecisions: signedDecisions(challenge), ...overrides };
}
