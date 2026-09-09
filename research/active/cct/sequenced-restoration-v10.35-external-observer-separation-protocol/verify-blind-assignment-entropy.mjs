import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [custodianRegistryPath, commitmentsPath, revealsPath, campaignPath] = process.argv.slice(2);
if (!campaignPath) { process.stderr.write("usage: node verify-blind-assignment-entropy.mjs CUSTODIAN_REGISTRY COMMITMENTS REVEALS CAMPAIGN\n"); process.exit(2); }
const custodians = new Map(JSON.parse(readFileSync(custodianRegistryPath, "utf8")).custodians.map(item => [item.custodianId, item]));
const commitments = JSON.parse(readFileSync(commitmentsPath, "utf8"));
const reveals = JSON.parse(readFileSync(revealsPath, "utf8"));
const campaign = JSON.parse(readFileSync(campaignPath, "utf8"));
const hash = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const commitMap = new Map(commitments.map(item => [item.custodianId, item]));
const rows = reveals.map(reveal => {
  const custodian = custodians.get(reveal.custodianId), commitment = commitMap.get(reveal.custodianId);
  const commitBody = commitment && { schema: commitment.schema, custodianId: commitment.custodianId, campaignId: commitment.campaignId, secretCommitmentDigest: commitment.secretCommitmentDigest, committedAtTick: commitment.committedAtTick };
  const revealBody = { schema: reveal.schema, custodianId: reveal.custodianId, campaignId: reveal.campaignId, secretBase64: reveal.secretBase64, revealedAtTick: reveal.revealedAtTick };
  const valid = Boolean(custodian && commitment) && commitment.schema === "cct-assignment-entropy-commitment/v1" && reveal.schema === "cct-assignment-entropy-reveal/v1" && commitment.campaignId === campaign.campaignId && reveal.campaignId === campaign.campaignId && commitment.committedAtTick < campaign.beganAtTick && reveal.revealedAtTick > campaign.endedAtTick && commitment.secretCommitmentDigest === hash(Buffer.from(reveal.secretBase64, "base64")) && verify(null, Buffer.from(JSON.stringify(commitBody)), createPublicKey(custodian.publicKeyPem), Buffer.from(commitment.signatureBase64, "base64")) && verify(null, Buffer.from(JSON.stringify(revealBody)), createPublicKey(custodian.publicKeyPem), Buffer.from(reveal.signatureBase64, "base64"));
  return { reveal, custodian, valid };
});
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.reveal.custodianId)).size >= 2 && new Set(rows.map(row => row.custodian?.controller)).size >= 2 && new Set(rows.map(row => row.custodian?.failureDomain)).size >= 2;
const combinedSeed = hash(rows.sort((a, b) => a.reveal.custodianId.localeCompare(b.reveal.custodianId)).map(row => row.reveal.secretBase64).join("\n"));
const expectedSchedule = Array.from({ length: campaign.slots }, (_, index) => createHash("sha256").update(`${combinedSeed}:${index}`).digest()[0] % 2 === 0 ? "blind" : "announced");
const scheduleMatches = JSON.stringify(expectedSchedule) === JSON.stringify(campaign.assignmentSchedule);
const bothArmsPresent = new Set(expectedSchedule).size === 2;
const ok = quorum && Number.isSafeInteger(campaign.slots) && campaign.slots >= 4 && scheduleMatches && bothArmsPresent;
process.stdout.write(`${JSON.stringify({ ok, quorum, scheduleMatches, bothArmsPresent, combinedSeed, expectedSchedule })}\n`);
if (!ok) process.exitCode = 1;
