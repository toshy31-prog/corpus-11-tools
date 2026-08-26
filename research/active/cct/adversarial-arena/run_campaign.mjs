#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBlindArena } from "../../../../corpus-11-tools/labs/experiment-lab/arena/runner.mjs";
import { attackNames, cctStressContenders, cctStressScenario } from "./scenario.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(ROOT, "reports");
const THRESHOLDS = {
  vital_unmet: 55,
  ecological_breach: 55,
  rights_burden: 55,
  unaccountable_power: 55,
  exit_obstruction: 55,
  recovery_lag: 55,
};

function failures(outcomes) {
  return Object.entries(THRESHOLDS).filter(([key, limit]) => outcomes[key] > limit).map(([key]) => key);
}

export function execute() {
  const reports = [];
  let identityMap = null;
  for (const [seed, attack] of attackNames.entries()) {
    const result = runBlindArena({
      arenaId: "cct-adversarial-stress-v1",
      scenario: cctStressScenario,
      contenders: cctStressContenders,
      seed,
      blindKey: "cct-review-key-v1-not-public",
    });
    identityMap ??= result.sealedIdentityMap;
    reports.push({ attack, seed, report: result.report });
  }
  const cctLabel = Object.entries(identityMap).find(([, id]) => id === "cct-v012-constitutional")?.[0];
  const cctRuns = reports.map(({ attack, report }) => {
    const run = report.runs.find((item) => item.label === cctLabel);
    return { attack, label: cctLabel, outcomes: run.outcomes, failed_dimensions: failures(run.outcomes) };
  });
  const rivalNoninferiority = reports.map(({ attack, report }) => {
    const candidate = report.runs.find((item) => item.label === cctLabel);
    const rivals = report.runs
      .filter((item) => item.label !== cctLabel)
      .filter((item) => Object.keys(candidate.outcomes).every((key) => item.outcomes[key] <= candidate.outcomes[key]))
      .map((item) => item.label);
    return { attack, rival_labels: rivals };
  });
  const failureWorlds = cctRuns.filter((item) => item.failed_dimensions.length > 0).map((item) => item.attack);
  const noninferiorityWorlds = rivalNoninferiority.filter((item) => item.rival_labels.length > 0).map((item) => item.attack);
  const publicReport = {
    campaign: "CCT adversarial constitutional stress v1",
    status: "internal_synthetic",
    scope: "Executable interpretation of a narrow constitutional decision kernel; not a territorial simulation or external evidence.",
    thresholds: THRESHOLDS,
    reversal_rule: "Revise the candidate if it crosses a non-compensable threshold in four of six worlds, or a matched rival is no worse on every vector dimension in a world.",
    worlds: reports.map(({ attack, seed, report }) => ({ attack, seed, report })),
    candidate_review: cctRuns,
    candidate_failure_worlds: failureWorlds,
    post_blind_rival_noninferiority: rivalNoninferiority,
    rival_noninferiority_worlds: noninferiorityWorlds,
    conclusion: failureWorlds.length >= 4 || noninferiorityWorlds.length > 0
      ? "revision_required_for_the_executable_interpretation"
      : "compatible_survivors",
  };
  return { publicReport, identityMap };
}

export async function main() {
  const { publicReport, identityMap } = execute();
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(resolve(OUTPUT, "public-report.json"), `${JSON.stringify(publicReport, null, 2)}\n`);
  // Stored separately so a reviewer can inspect the blind report before decoding labels.
  await writeFile(resolve(OUTPUT, "sealed-identity-map.json"), `${JSON.stringify(identityMap, null, 2)}\n`);
  console.log(JSON.stringify({ candidate_failure_worlds: publicReport.candidate_failure_worlds }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
