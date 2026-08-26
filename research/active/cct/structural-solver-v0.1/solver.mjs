const unique = (values) => [...new Set(values)].sort();

function combinations(values, size, start = 0, prefix = [], output = []) {
  if (prefix.length === size) {
    output.push(prefix);
    return output;
  }
  for (let index = start; index <= values.length - (size - prefix.length); index += 1) {
    combinations(values, size, index + 1, [...prefix, values[index]], output);
  }
  return output;
}

export function maximumIndependentConfirmations(receipts, { responsibleActor, rejectedVerdict = "rejected" } = {}) {
  const contested = receipts.some((receipt) => receipt.verdict === rejectedVerdict);
  const eligible = receipts
    .filter((receipt) => receipt.verdict === "confirmed" && receipt.observerActor !== responsibleActor)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (let size = eligible.length; size >= 0; size -= 1) {
    for (const candidate of combinations(eligible, size)) {
      if (new Set(candidate.map((item) => item.observerActor)).size !== size) continue;
      if (new Set(candidate.map((item) => item.observerFailureDomain)).size !== size) continue;
      return {
        status: contested ? "contested" : "computed",
        count: size,
        receiptIds: candidate.map((item) => item.id),
      };
    }
  }
  return { status: contested ? "contested" : "computed", count: 0, receiptIds: [] };
}

function restorationFailures(action, { debts, activeRisks, budget }) {
  const failures = [];
  if (action.resourceCost > budget) failures.push("budget");
  if (action.recoveryKind !== "restoration") failures.push("restoration_kind");
  if (!action.vitalMaintained) failures.push("vital_floor");
  if (!action.ecologyMaintained) failures.push("ecological_floor");
  if ((action.harmsAxes ?? []).length) failures.push("zero_harm");
  if (!activeRisks.every((axis) => (action.protectsAxes ?? []).includes(axis))) failures.push("protect_all_active_risks");
  if (!debts.every((axis) => (action.restoresAxes ?? []).includes(axis) && (action.protectsAxes ?? []).includes(axis))) {
    failures.push("restore_all_debts_atomically");
  }
  return failures;
}

export function diagnoseAtomicRestoration({ debts, activeRisks, budget, actions }) {
  const normalizedDebts = unique(debts);
  const normalizedRisks = unique(activeRisks);
  const evaluated = actions.map((action) => ({
    action: action.id,
    failures: restorationFailures(action, { debts: normalizedDebts, activeRisks: normalizedRisks, budget }),
  }));
  const admissible = evaluated.filter((item) => item.failures.length === 0).map((item) => item.action);
  const minimumFailureCount = evaluated.length ? Math.min(...evaluated.map((item) => item.failures.length)) : null;
  const closest = evaluated.filter((item) => item.failures.length === minimumFailureCount);
  const unavoidable = evaluated.length
    ? unique(evaluated[0].failures.filter((failure) => evaluated.every((item) => item.failures.includes(failure))))
    : ["no_action"];
  return {
    satisfiable: admissible.length > 0,
    admissible,
    closest,
    unavoidableFailureClauses: unavoidable,
    evaluated,
  };
}

function stagedSafe(action, budget) {
  return action.resourceCost <= budget && action.recoveryKind === "restoration"
    && action.vitalMaintained && action.ecologyMaintained && !(action.harmsAxes ?? []).length
    && (action.restoresAxes ?? []).every((axis) => (action.protectsAxes ?? []).includes(axis));
}

export function minimumStagedRestorationPlan({ debts, budget, actions, maximumTicks }) {
  const targets = unique(debts);
  const candidates = actions.filter((action) => stagedSafe(action, budget)
    && (action.restoresAxes ?? []).some((axis) => targets.includes(axis)))
    .sort((a, b) => a.id.localeCompare(b.id));
  const queue = [{ covered: [], plan: [] }];
  const seen = new Map([["", 0]]);
  while (queue.length) {
    const current = queue.shift();
    if (targets.every((axis) => current.covered.includes(axis))) {
      return { feasible: true, ticks: current.plan.length, plan: current.plan, covered: current.covered };
    }
    if (current.plan.length >= maximumTicks) continue;
    for (const action of candidates) {
      const covered = unique([...current.covered, ...action.restoresAxes.filter((axis) => targets.includes(axis))]);
      if (covered.length === current.covered.length) continue;
      const key = covered.join("|");
      const steps = current.plan.length + 1;
      if (seen.has(key) && seen.get(key) <= steps) continue;
      seen.set(key, steps);
      queue.push({ covered, plan: [...current.plan, action.id] });
    }
  }
  return {
    feasible: false,
    ticks: null,
    plan: [],
    covered: unique(candidates.flatMap((action) => action.restoresAxes).filter((axis) => targets.includes(axis))),
    missing: targets.filter((axis) => !candidates.some((action) => action.restoresAxes.includes(axis))),
  };
}

export function findMinimalAtomicityCounterexample({ maximumDebtAxes = 6 } = {}) {
  for (let count = 1; count <= maximumDebtAxes; count += 1) {
    const debts = Array.from({ length: count }, (_, index) => `debt_${index + 1}`);
    const actions = debts.map((axis, index) => ({
      id: `restore_${index + 1}`,
      resourceCost: 1,
      recoveryKind: "restoration",
      vitalMaintained: true,
      ecologyMaintained: true,
      harmsAxes: [],
      protectsAxes: [axis],
      restoresAxes: [axis],
    }));
    const atomic = diagnoseAtomicRestoration({ debts, activeRisks: debts, budget: 1, actions });
    const staged = minimumStagedRestorationPlan({ debts, budget: 1, actions, maximumTicks: count });
    if (!atomic.satisfiable && staged.feasible) {
      return { debtAxisCount: count, debts, actions, atomic, staged };
    }
  }
  return null;
}

export function decideNeedForAnotherWorld({ unresolvedClaims, availableCalculations }) {
  const calculated = unresolvedClaims.filter((claim) => availableCalculations.includes(claim));
  const empirical = unresolvedClaims.filter((claim) => !availableCalculations.includes(claim));
  return {
    calculated,
    empirical,
    anotherWorldNeeded: empirical.length > 0,
    stopWorldGenerationWhen: "Every remaining claim is decided by invariant checking, finite search, or an existing trace.",
  };
}
