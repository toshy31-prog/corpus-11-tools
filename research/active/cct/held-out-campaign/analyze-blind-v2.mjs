#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const input = JSON.parse(await readFile(join(here, "runs", "public", "blind-summary.json"), "utf8"));
const labels = [...new Set(input.worlds.flatMap((world) => world.runs.map((run) => run.label)))].sort();
const axes = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];
const strata = {
  all_worlds: input.worlds,
  without_declared_mechanism_variants: input.worlds.filter((world) => !/^(partially|substantially)_dependent/.test(world.dependenceStatus)),
};

function summarize(worlds) {
  const byLabel = Object.fromEntries(labels.map((label) => [label, {
    worldsWithAnyThresholdBreach: 0,
    thresholdBreachesByAxis: Object.fromEntries(axes.map((axis) => [axis, 0])),
    predictionAbsoluteErrorByWorld: {},
  }]));
  for (const world of worlds) for (const run of world.runs) {
    const target = byLabel[run.label];
    if (run.thresholdBreaches.length) target.worldsWithAnyThresholdBreach += 1;
    for (const axis of run.thresholdBreaches) target.thresholdBreachesByAxis[axis] += 1;
    target.predictionAbsoluteErrorByWorld[world.scenarioId] = run.meanPredictionAbsoluteError;
  }
  return byLabel;
}

const exactVectorEquivalences = [];
const vectorDominances = [];
for (const world of input.worlds) for (const pair of world.pairwiseVectorRelations) {
  const values = Object.values(pair.axes);
  if (values.every((value) => value === "equal")) exactVectorEquivalences.push({ scenarioId: world.scenarioId, left: pair.left, right: pair.right });
  if (!values.includes("right_better") && values.includes("left_better")) vectorDominances.push({ scenarioId: world.scenarioId, dominant: pair.left, dominated: pair.right, axes: pair.axes });
  if (!values.includes("left_better") && values.includes("right_better")) vectorDominances.push({ scenarioId: world.scenarioId, dominant: pair.right, dominated: pair.left, axes: pair.axes });
}

const verdict = {
  campaignId: input.campaignId,
  correctionOf: "blind-verdict.json",
  correctionReason: "cross-world prediction-error means used incompatible scenario scales and are removed",
  identityStatusAtOriginalVerdict: "sealed",
  statusBoundary: input.status,
  conclusion: "no_blind_method_avoids_non_compensable_breaches_across_all_worlds",
  noScalarWinner: true,
  strata: Object.fromEntries(Object.entries(strata).map(([name, worlds]) => [name, { worldCount: worlds.length, byLabel: summarize(worlds) }])),
  exactVectorEquivalences,
  vectorDominances,
  reversalCondition: "recompute if a frozen scenario, contender freeze, threshold, identity map, or dependence classification changes",
};
await writeFile(join(here, "runs", "public", "blind-verdict-corrected-v2.json"), `${JSON.stringify(verdict, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ corrected: true, worlds: input.worlds.length }, null, 2));
