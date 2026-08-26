#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findMinimalAtomicityCounterexample, minimumStagedRestorationPlan } from "../structural-solver-v0.1/solver.mjs";

const expectedUrl = new URL("./structural-validation-report.json", import.meta.url);

function action(id, axes) {
  return {
    id, resourceCost: 1, recoveryKind: "restoration", vitalMaintained: true,
    ecologyMaintained: true, harmsAxes: [], protectsAxes: [...axes], restoresAxes: [...axes],
  };
}

function oracleMinimum(debtCount, masks) {
  const full = (1 << debtCount) - 1;
  const distance = Array(1 << debtCount).fill(Infinity);
  distance[0] = 0;
  for (let state = 0; state <= full; state += 1) {
    for (const mask of masks) distance[state | mask] = Math.min(distance[state | mask], distance[state] + 1);
  }
  return distance[full];
}

let catalogsChecked = 0;
let deadlineCasesChecked = 0;
let mismatches = 0;
for (let debtCount = 1; debtCount <= 4; debtCount += 1) {
  const debts = Array.from({ length: debtCount }, (_, index) => `d${index + 1}`);
  const possibleMasks = Array.from({ length: (1 << debtCount) - 1 }, (_, index) => index + 1);
  for (let catalogMask = 1; catalogMask < (1 << possibleMasks.length); catalogMask += 1) {
    const masks = possibleMasks.filter((_, index) => catalogMask & (1 << index));
    const actions = masks.map((mask) => action(`a${mask}`, debts.filter((_, index) => mask & (1 << index))));
    const minimum = oracleMinimum(debtCount, masks);
    catalogsChecked += 1;
    for (let deadline = 1; deadline <= debtCount; deadline += 1) {
      const result = minimumStagedRestorationPlan({ debts, budget: 1, actions, maximumTicks: deadline });
      const expectedFeasible = Number.isFinite(minimum) && minimum <= deadline;
      if (result.feasible !== expectedFeasible || (result.feasible && result.ticks !== minimum)) mismatches += 1;
      deadlineCasesChecked += 1;
    }
  }
}

const witness = findMinimalAtomicityCounterexample();
const report = {
  schema: "cct-sequenced-restoration-structural-validation/v1",
  generatedAt: "2026-08-26",
  candidate: "CCT-EXEC-1.4-CANDIDATE-001",
  finiteScope: { maximumDebtAxes: 4, actionCatalog: "every non-empty family of non-empty debt subsets", deadlines: "1..debt-count" },
  results: {
    catalogsChecked,
    deadlineCasesChecked,
    mismatchesAgainstBitmaskOracle: mismatches,
    minimumAtomicityCounterexampleDebtAxes: witness.debtAxisCount,
  },
  verdict: mismatches === 0 ? "finite_search_consistent" : "finite_search_mismatch",
  strongestConclusion: "Within the complete finite scope up to four debts, the sequenced planner agrees with an independent bitmask shortest-cover oracle for every action catalog and tested deadline.",
  statusBoundary: "Exhaustive only within the declared finite abstraction; no external transport, institutional effect, authorization, deployment, or universal correctness is established.",
};

assert.equal(mismatches, 0);
if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(expectedUrl, "utf8"));
  assert.deepEqual(report, expected);
  process.stdout.write(`${JSON.stringify({ valid: true, catalogsChecked, deadlineCasesChecked, mismatches }, null, 2)}\n`);
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
