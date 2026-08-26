#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findMinimalAtomicityCounterexample, decideNeedForAnotherWorld } from "./solver.mjs";

const expectedUrl = new URL("./report.json", import.meta.url);

const witness = findMinimalAtomicityCounterexample();
const testPolicy = decideNeedForAnotherWorld({
  unresolvedClaims: [
    "verification_quorum_consistency",
    "restoration_atomicity_gap",
    "deadline_feasibility",
    "external_transport",
    "institutional_effect",
  ],
  availableCalculations: [
    "verification_quorum_consistency",
    "restoration_atomicity_gap",
    "deadline_feasibility",
  ],
});

const report = {
  schema: "cct-structural-solver-report/v1",
  generatedAt: "2026-08-26",
  target: "CCT-EXEC 1.3 candidate",
  result: {
    structuralCounterexampleFound: witness !== null,
    minimumDebtAxes: witness?.debtAxisCount ?? null,
    currentAtomicRuleSatisfiable: witness?.atomic.satisfiable ?? null,
    stagedPlanFeasible: witness?.staged.feasible ?? null,
    stagedPlan: witness?.staged.plan ?? [],
  },
  witness,
  testPolicy,
  strongestConclusion: "No additional fictional world is needed to establish the restoration atomicity defect: two independently repairable debts already form a finite counterexample. Worlds remain relevant only for external transport and institutional effect.",
  statusBoundary: "Bounded structural result for the encoded transition predicates; not a proof about every implementation, institution, or real environment.",
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(expectedUrl, "utf8"));
  assert.deepEqual(report, expected);
  process.stdout.write(`${JSON.stringify({ valid: true, minimumDebtAxes: witness.debtAxisCount, stagedTicks: witness.staged.ticks }, null, 2)}\n`);
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
