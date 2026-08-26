import test from "node:test";
import assert from "node:assert/strict";
import {
  decideNeedForAnotherWorld,
  diagnoseAtomicRestoration,
  findMinimalAtomicityCounterexample,
  maximumIndependentConfirmations,
  minimumStagedRestorationPlan,
} from "./solver.mjs";

const safe = (id, restoresAxes) => ({
  id, resourceCost: 1, recoveryKind: "restoration", vitalMaintained: true,
  ecologyMaintained: true, harmsAxes: [], protectsAxes: [...restoresAxes], restoresAxes,
});

test("independent confirmation is a distinct actor/domain matching", () => {
  const result = maximumIndependentConfirmations([
    { id: "r1", verdict: "confirmed", observerActor: "A", observerFailureDomain: "X" },
    { id: "r2", verdict: "confirmed", observerActor: "A", observerFailureDomain: "Y" },
    { id: "r3", verdict: "confirmed", observerActor: "B", observerFailureDomain: "Y" },
  ], { responsibleActor: "owner" });
  assert.equal(result.count, 2);
  assert.deepEqual(result.receiptIds, ["r1", "r3"]);
});

test("self-certification is excluded", () => {
  const result = maximumIndependentConfirmations([
    { id: "self", verdict: "confirmed", observerActor: "owner", observerFailureDomain: "X" },
  ], { responsibleActor: "owner" });
  assert.equal(result.count, 0);
});

test("a rejection preserves contestation", () => {
  const result = maximumIndependentConfirmations([
    { id: "yes", verdict: "confirmed", observerActor: "A", observerFailureDomain: "X" },
    { id: "no", verdict: "rejected", observerActor: "B", observerFailureDomain: "Y" },
  ], { responsibleActor: "owner" });
  assert.equal(result.status, "contested");
});

test("atomic diagnosis identifies the common blocking clauses", () => {
  const result = diagnoseAtomicRestoration({
    debts: ["rights", "power"], activeRisks: ["rights", "power"], budget: 1,
    actions: [safe("rights_only", ["rights"]), safe("power_only", ["power"])],
  });
  assert.equal(result.satisfiable, false);
  assert.deepEqual(result.unavoidableFailureClauses, ["protect_all_active_risks", "restore_all_debts_atomically"]);
});

test("bounded set-cover finds the shortest staged repair", () => {
  const result = minimumStagedRestorationPlan({
    debts: ["rights", "power", "portability"], budget: 1, maximumTicks: 2,
    actions: [safe("a", ["rights", "power"]), safe("b", ["portability"]), safe("c", ["rights"])],
  });
  assert.deepEqual(result, { feasible: true, ticks: 2, plan: ["a", "b"], covered: ["portability", "power", "rights"] });
});

test("deadline makes an otherwise covering plan infeasible", () => {
  const result = minimumStagedRestorationPlan({
    debts: ["rights", "power"], budget: 1, maximumTicks: 1,
    actions: [safe("a", ["rights"]), safe("b", ["power"])],
  });
  assert.equal(result.feasible, false);
  assert.deepEqual(result.missing, []);
});

test("the minimal atomicity counterexample needs exactly two debts", () => {
  const witness = findMinimalAtomicityCounterexample();
  assert.equal(witness.debtAxisCount, 2);
  assert.equal(witness.atomic.satisfiable, false);
  assert.deepEqual(witness.staged.plan, ["restore_1", "restore_2"]);
});

test("world generation is reserved for irreducibly empirical claims", () => {
  const result = decideNeedForAnotherWorld({
    unresolvedClaims: ["atomicity_gap", "external_transport"],
    availableCalculations: ["atomicity_gap"],
  });
  assert.deepEqual(result.calculated, ["atomicity_gap"]);
  assert.deepEqual(result.empirical, ["external_transport"]);
  assert.equal(result.anotherWorldNeeded, true);
});
