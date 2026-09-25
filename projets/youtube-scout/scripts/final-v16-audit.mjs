#!/usr/bin/env node
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const algebra = read("lib/evidence-algebra.mjs");
const multisource = read("lib/multisource-decision.mjs");
const resolution = read("lib/resolution-evidence.mjs");
const live = read("scripts/live-track-resolution-engine.mjs");

const invariants = {
  centralRelationKernel: algebra.includes("export function relationBetweenNames"),
  centralSupportKernel:
    algebra.includes("export function summarizeIdentityObservations") &&
    algebra.includes("export function summarizeIdentityCandidateGroups"),
  centralDecisionKernel:
    algebra.includes("export function decideIdentityFromSupport") &&
    algebra.includes("export function decideRankedResolutionFromEvidence"),
  centralLiveCorroboration:
    algebra.includes("export function enforceKnownIdentityCorroboration"),
  multisourceDelegates: multisource.includes("decideIdentityFromSupport({"),
  resolutionDelegates: resolution.includes("decideRankedResolutionFromEvidence({"),
  liveDelegatesCorroboration: live.includes("enforceKnownIdentityCorroboration({"),
  oldMultisourceDecisionTreeRemoved: !multisource.includes('"multiple_supported_identities"'),
  oldResolutionDecisionTreeRemoved: !resolution.includes("best.score < 0.55"),
  liveLocalCandidateMatcherRemoved: !live.includes("function candidateSupportsArtist("),
  liveLocalVariantAuthorityRemoved: !live.includes("const nonCompetingVariants")
};

console.log("=== V16 FINAL ARCHITECTURE AUDIT ===");
console.log(JSON.stringify(invariants, null, 2));

const failures = Object.entries(invariants)
  .filter(([, value]) => !value)
  .map(([key]) => key);

console.log("");
if (failures.length) {
  console.log("FINAL STATUS: NOT READY");
  console.log("Failed invariants:", failures);
  process.exitCode = 1;
} else {
  console.log("FINAL STATUS: READY");
  console.log("Evidence algebra migration complete.");
  console.log("No graph mutation performed.");
}
