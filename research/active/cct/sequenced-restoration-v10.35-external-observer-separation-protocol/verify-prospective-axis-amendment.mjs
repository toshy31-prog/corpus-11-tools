import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [oldAxesPath, newAxesPath, newClassesPath, adjudicatorRegistryPath, attestationsPath] = process.argv.slice(2);
if (!attestationsPath) { process.stderr.write("usage: node verify-prospective-axis-amendment.mjs OLD_AXES NEW_AXES NEW_CLASSES ADJUDICATOR_REGISTRY ATTESTATIONS\n"); process.exit(2); }
const oldAxes = JSON.parse(readFileSync(oldAxesPath, "utf8")), newAxes = JSON.parse(readFileSync(newAxesPath, "utf8")), classes = JSON.parse(readFileSync(newClassesPath, "utf8"));
const adjudicators = new Map(JSON.parse(readFileSync(adjudicatorRegistryPath, "utf8")).adjudicators.map(item => [item.adjudicatorId, item]));
const attestations = JSON.parse(readFileSync(attestationsPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const rows = attestations.map(item => {
  const adjudicator = adjudicators.get(item.adjudicatorId);
  const body = { schema: item.schema, adjudicatorId: item.adjudicatorId, oldAxesDigest: item.oldAxesDigest, newAxesDigest: item.newAxesDigest, proposal: item.proposal, challengeIds: item.challengeIds, currentCampaign: item.currentCampaign, effectiveFromCampaign: item.effectiveFromCampaign, regeneratedClassRegistryDigest: item.regeneratedClassRegistryDigest, evidenceArtifactDigest: item.evidenceArtifactDigest };
  const valid = Boolean(adjudicator) && item.schema === "cct-prospective-leakage-axis-amendment/v1" && item.oldAxesDigest === digest(oldAxes) && item.newAxesDigest === digest(newAxes) && item.regeneratedClassRegistryDigest === digest(classes) && Number.isSafeInteger(item.currentCampaign) && item.effectiveFromCampaign > item.currentCampaign && Array.isArray(item.challengeIds) && item.challengeIds.length >= 2 && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(adjudicator.publicKeyPem), Buffer.from(item.signatureBase64, "base64"));
  return { item, adjudicator, valid };
});
const sample = rows[0]?.item, proposal = sample?.proposal;
const expectedAxes = JSON.parse(JSON.stringify(oldAxes));
if (proposal?.kind === "omitted_value" && Array.isArray(expectedAxes.axes?.[proposal.axisName])) expectedAxes.axes[proposal.axisName] = [...new Set([...expectedAxes.axes[proposal.axisName], proposal.proposedValue])].sort();
else if (proposal?.kind === "omitted_axis" && !Object.hasOwn(expectedAxes.axes ?? {}, proposal.proposedAxisName)) expectedAxes.axes[proposal.proposedAxisName] = [...new Set(proposal.seedValues)].sort();
const amendmentExact = JSON.stringify(newAxes) === JSON.stringify(expectedAxes);
const axisNames = Object.keys(newAxes.axes ?? {}), combinations = axisNames.reduce((rows, axis) => rows.flatMap(row => newAxes.axes[axis].map(value => ({ ...row, [axis]: value }))), [{}]);
const expectedClasses = combinations.map(combination => ({ classId: `lc-${createHash("sha256").update(JSON.stringify(combination)).digest("hex").slice(0, 16)}`, ...combination }));
const classRegistryRegenerated = classes.schema === "cct-leakage-probe-class-registry/v2" && JSON.stringify(classes.classes) === JSON.stringify(expectedClasses);
const sameAmendment = new Set(rows.map(row => JSON.stringify({ ...row.item, adjudicatorId: null, signatureBase64: null, evidenceArtifactDigest: null }))).size === 1;
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.item.adjudicatorId)).size >= 2 && new Set(rows.map(row => row.adjudicator?.controller)).size >= 2 && new Set(rows.map(row => row.adjudicator?.failureDomain)).size >= 2 && new Set(rows.map(row => row.item.evidenceArtifactDigest)).size >= 2;
const ok = amendmentExact && classRegistryRegenerated && sameAmendment && quorum;
process.stdout.write(`${JSON.stringify({ ok, amendmentExact, classRegistryRegenerated, sameAmendment, quorum, effectiveFromCampaign: sample?.effectiveFromCampaign, retroactive: sample ? sample.effectiveFromCampaign <= sample.currentCampaign : null })}\n`);
if (!ok) process.exitCode = 1;
