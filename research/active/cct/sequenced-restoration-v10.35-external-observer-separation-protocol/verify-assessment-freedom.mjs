import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [partyRegistryPath, advocateRegistryPath, assessmentsPath, safeguardsPath] = process.argv.slice(2);
if (!safeguardsPath) { process.stderr.write("usage: node verify-assessment-freedom.mjs PARTY_REGISTRY ADVOCATE_REGISTRY ASSESSMENTS SAFEGUARDS\n"); process.exit(2); }
const parties = new Map(JSON.parse(readFileSync(partyRegistryPath, "utf8")).parties.map(item => [item.partyId, item]));
const advocates = new Map(JSON.parse(readFileSync(advocateRegistryPath, "utf8")).advocates.map(item => [item.advocateId, item]));
const assessments = JSON.parse(readFileSync(assessmentsPath, "utf8"));
const safeguards = JSON.parse(readFileSync(safeguardsPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const assessmentRows = assessments.map(assessment => {
  const party = parties.get(assessment.partyId);
  const { signatureBase64, ...body } = assessment;
  return { assessment, party, assessmentDigest: digest(assessment), valid: Boolean(party) && assessment.schema === "cct-affected-party-repair-assessment/v1" && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(party.publicKeyPem), Buffer.from(signatureBase64, "base64")) };
});
const safeguardsValid = safeguards.map(item => {
  const advocate = advocates.get(item.advocateId);
  const body = { schema: item.schema, safeguardId: item.safeguardId, advocateId: item.advocateId, assessmentDigest: item.assessmentDigest, privateChannel: item.privateChannel, decisionMakerAbsent: item.decisionMakerAbsent, withdrawalAvailable: item.withdrawalAvailable, benefitNotConditioned: item.benefitNotConditioned, retaliationChannelAvailable: item.retaliationChannelAvailable, observedAtTick: item.observedAtTick };
  const conditions = [item.privateChannel, item.decisionMakerAbsent, item.withdrawalAvailable, item.benefitNotConditioned, item.retaliationChannelAvailable].every(value => value === true);
  return { ...item, advocate, valid: Boolean(advocate) && item.schema === "cct-assessment-freedom-safeguard/v1" && conditions && Number.isSafeInteger(item.observedAtTick) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(advocate.publicKeyPem), Buffer.from(item.signatureBase64, "base64")) };
});
const audits = assessmentRows.map(row => {
  const receipts = safeguardsValid.filter(item => item.valid && item.assessmentDigest === row.assessmentDigest);
  const advocateQuorum = receipts.length >= 2 && new Set(receipts.map(item => item.advocateId)).size >= 2 && new Set(receipts.map(item => item.advocate.controller)).size >= 2 && new Set(receipts.map(item => item.advocate.failureDomain)).size >= 2 && receipts.every(item => item.advocate.controller !== row.party?.controller);
  return { assessmentId: row.assessment.assessmentId, assessmentSignature: row.valid, advocateQuorum, safeguardIds: receipts.map(item => item.safeguardId), freedomCorroborated: row.valid && advocateQuorum };
});
const complete = assessments.length > 0 && audits.every(audit => audit.freedomCorroborated) && safeguardsValid.every(item => item.valid);
process.stdout.write(`${JSON.stringify({ ok: complete, assessmentsPresent: assessments.length > 0, audits, silenceInterpretedAsSufficiency: false, coercionAbsenceEstablished: false })}\n`);
if (!complete) process.exitCode = 1;
