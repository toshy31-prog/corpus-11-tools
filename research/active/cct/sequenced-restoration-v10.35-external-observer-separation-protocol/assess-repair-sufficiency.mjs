import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [decisionId, partyRegistryPath, assessmentsPath] = process.argv.slice(2);
if (!assessmentsPath) { process.stderr.write("usage: node assess-repair-sufficiency.mjs DECISION_ID PARTY_REGISTRY ASSESSMENTS\n"); process.exit(2); }
const registry = JSON.parse(readFileSync(partyRegistryPath, "utf8"));
const assessments = JSON.parse(readFileSync(assessmentsPath, "utf8"));
const parties = new Map(registry.parties?.map(party => [party.partyId, party]) ?? []);
const required = ["accessRestored", "burdenCompensated", "recourseUsable", "nonRepetitionSafeguardObserved", "autonomyRestored"];
const rows = assessments.map(assessment => {
  const party = parties.get(assessment.partyId);
  const body = { schema: assessment.schema, assessmentId: assessment.assessmentId, partyId: assessment.partyId, decisionId: assessment.decisionId, repairDigest: assessment.repairDigest, dimensions: assessment.dimensions, residualLosses: assessment.residualLosses, reportedSufficient: assessment.reportedSufficient, assessedAtTick: assessment.assessedAtTick, waiverGranted: assessment.waiverGranted };
  const dimensionsComplete = assessment.dimensions && required.every(name => typeof assessment.dimensions[name] === "boolean") && Object.keys(assessment.dimensions).sort().join() === [...required].sort().join();
  const valid = Boolean(party) && assessment.schema === "cct-affected-party-repair-assessment/v1" && assessment.decisionId === decisionId && dimensionsComplete && Array.isArray(assessment.residualLosses) && Number.isSafeInteger(assessment.assessedAtTick) && typeof assessment.reportedSufficient === "boolean" && typeof assessment.waiverGranted === "boolean" && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(party.publicKeyPem), Buffer.from(assessment.signatureBase64, "base64"));
  return { assessment, valid };
});
const expectedPartyIds = registry.parties?.filter(party => party.affectedDecisionIds?.includes(decisionId)).map(party => party.partyId) ?? [];
const coveredPartyIds = new Set(rows.filter(row => row.valid).map(row => row.assessment.partyId));
const completeCoverage = expectedPartyIds.length > 0 && expectedPartyIds.every(id => coveredPartyIds.has(id));
const validAssessments = rows.filter(row => row.valid).map(row => row.assessment);
const residualLosses = [...new Set(validAssessments.flatMap(item => item.residualLosses))].sort();
const failedDimensions = [...new Set(validAssessments.flatMap(item => required.filter(name => item.dimensions[name] === false)))].sort();
const partiesReportSufficient = completeCoverage && validAssessments.every(item => item.reportedSufficient) && residualLosses.length === 0 && failedDimensions.length === 0;
const result = { ok: rows.every(row => row.valid) && completeCoverage, completeCoverage, partiesReportSufficient, failedDimensions, residualLosses, waiverUsedAsEvidence: false, objectiveSufficiencyEstablished: false };
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) process.exitCode = 2;
else if (!partiesReportSufficient) process.exitCode = 1;
