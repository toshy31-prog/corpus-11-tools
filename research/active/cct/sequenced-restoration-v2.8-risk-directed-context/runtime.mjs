import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import {
  assessBoundedTriples,
  permutations
} from "../sequenced-restoration-v2.6-bounded-triples/runtime.mjs";
import {
  CctDualContextTriplesRuntime,
  requiredDualTripleCovers,
  selectDualContextQualifiedBridge
} from "../sequenced-restoration-v2.7-dual-context-triples/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export const ADAPTIVE_PAIR_BUDGET = 6;

export function validateRiskDirectedContextSpec(candidate = SPEC) {
  return candidate?.schema === "cct-risk-directed-context/v1"
    && candidate?.version === "2.8-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.7-DUAL-CONTEXT-TRIPLES-CANDIDATE-001";
}

function classIndex(name) {
  return REQUIRED_DEPENDENCY_CLASSES.indexOf(name);
}

function canonicalTripleId(classes) {
  return [...classes].sort((left, right) => classIndex(left) - classIndex(right)).join("+");
}

function existingThirdContexts(pair) {
  const contexts = new Set();
  for (const { triples } of requiredDualTripleCovers()) {
    for (const triple of triples) {
      if (pair.every((name) => triple.includes(name))) {
        contexts.add(triple.find((name) => !pair.includes(name)));
      }
    }
  }
  return contexts;
}

export function deriveRiskDirectedSchedule(pairSignals, classRiskScores, pairBudget = ADAPTIVE_PAIR_BUDGET) {
  const pairs = requiredClassPairs();
  const pairRank = new Map(pairs.map((pair, index) => [pair.join("+"), index]));
  const rankedPairs = [...pairSignals].sort((left, right) =>
    left.minimumMargin - right.minimumMargin
      || pairRank.get(left.pair.join("+")) - pairRank.get(right.pair.join("+"))
  ).slice(0, pairBudget);
  const rankedClasses = [...classRiskScores].sort((left, right) =>
    right.riskScore - left.riskScore
      || classIndex(left.dependencyClass) - classIndex(right.dependencyClass)
  );
  const usedTriples = new Set();
  return rankedPairs.map((signal) => {
    const pair = signal.pair;
    const existing = existingThirdContexts(pair);
    const third = rankedClasses.find(({ dependencyClass }) => {
      const tripleId = canonicalTripleId([...pair, dependencyClass]);
      return !pair.includes(dependencyClass) && !existing.has(dependencyClass) && !usedTriples.has(tripleId);
    })?.dependencyClass;
    if (!third) throw new Error(`NO_UNUSED_THIRD_CONTEXT:${pair.join("+")}`);
    usedTriples.add(canonicalTripleId([...pair, third]));
    return { pair, thirdClass: third, classes: [...pair, third] };
  });
}

function canonicalPlanInput(pairSignals, classRiskScores, schedule, pairBudget) {
  const pairRank = new Map(requiredClassPairs().map((pair, index) => [pair.join("+"), index]));
  return {
    schema: "cct-risk-directed-plan/v1",
    pairBudget,
    pairSignals: [...pairSignals].sort((left, right) =>
      pairRank.get(left.pair.join("+")) - pairRank.get(right.pair.join("+"))
    ),
    classRiskScores: [...classRiskScores].sort((left, right) =>
      classIndex(left.dependencyClass) - classIndex(right.dependencyClass)
    ),
    schedule
  };
}

export function computePlanDigest(pairSignals, classRiskScores, schedule, pairBudget = ADAPTIVE_PAIR_BUDGET) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalPlanInput(pairSignals, classRiskScores, schedule, pairBudget)))
    .digest("hex");
}

function validSignals(exercise) {
  const pairIds = requiredClassPairs().map((pair) => pair.join("+"));
  const signals = exercise?.pairSignals;
  const scores = exercise?.classRiskScores;
  if (!Array.isArray(signals) || signals.length !== pairIds.length
    || new Set(signals.map((signal) => signal?.pair?.join("+"))).size !== pairIds.length
    || signals.some((signal) => !pairIds.includes(signal?.pair?.join("+"))
      || typeof signal.minimumMargin !== "number" || !Number.isFinite(signal.minimumMargin)
      || signal.minimumMargin < 0 || typeof signal.sourceRoot !== "string" || !signal.sourceRoot)
    || new Set(signals.map((signal) => signal.sourceRoot)).size < 2) return false;
  if (!Array.isArray(scores) || scores.length !== REQUIRED_DEPENDENCY_CLASSES.length
    || new Set(scores.map((score) => score?.dependencyClass)).size !== REQUIRED_DEPENDENCY_CLASSES.length
    || scores.some((score) => !REQUIRED_DEPENDENCY_CLASSES.includes(score?.dependencyClass)
      || typeof score.riskScore !== "number" || !Number.isFinite(score.riskScore) || score.riskScore < 0
      || typeof score.sourceRoot !== "string" || !score.sourceRoot)
    || new Set(scores.map((score) => score.sourceRoot)).size < 2) return false;
  return true;
}

export function assessRiskDirectedContext(openDebtAxes, dependencyAudit, exercise) {
  if (!validSignals(exercise) || exercise?.pairBudget !== ADAPTIVE_PAIR_BUDGET
    || !Number.isInteger(exercise?.firstExerciseTick)
    || !Number.isInteger(exercise?.planCommitment?.committedAtTick)
    || exercise.planCommitment.committedAtTick >= exercise.firstExerciseTick
    || exercise.planCommitment.algorithm !== "sha256"
    || typeof exercise.planCommitment.sourceRoot !== "string" || !exercise.planCommitment.sourceRoot
    || !Array.isArray(exercise?.adaptiveTrials)) {
    return { status: "not_established", failures: ["invalid_adaptive_exercise"] };
  }

  let schedule;
  try {
    schedule = deriveRiskDirectedSchedule(exercise.pairSignals, exercise.classRiskScores, exercise.pairBudget);
  } catch {
    return { status: "not_established", failures: ["adaptive_schedule_unavailable"] };
  }
  const digest = computePlanDigest(exercise.pairSignals, exercise.classRiskScores, schedule, exercise.pairBudget);
  if (exercise.planCommitment.digest !== digest) {
    return { status: "not_established", failures: ["plan_commitment_mismatch"] };
  }
  const submittedSchedule = exercise.adaptiveTrials.map((trial) => ({
    pair: trial?.pair,
    thirdClass: trial?.thirdClass,
    classes: trial?.classes
  }));
  if (JSON.stringify(submittedSchedule) !== JSON.stringify(schedule)) {
    return { status: "not_established", failures: ["derived_schedule_not_applied"] };
  }
  const result = assessBoundedTriples(
    openDebtAxes,
    dependencyAudit,
    { windowTicks: exercise.windowTicks, tripleTrials: exercise.adaptiveTrials },
    schedule.map((item) => item.classes)
  );
  return {
    status: result.failures.length === 0 ? "bounded_risk_directed_context_candidate" : "not_established",
    failures: result.failures
  };
}

export function selectRiskDirectedQualifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises,
  commonCauseExercises,
  dependencyAudits,
  subthresholdExercises,
  crossClassExercises,
  tripleExercises,
  dualContextExercises,
  riskDirectedExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessRiskDirectedContext(openDebtAxes, dependencyAudits?.[action], riskDirectedExercises?.[action]).status
      === "bounded_risk_directed_context_candidate"
  );
  return selectDualContextQualifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises,
    commonCauseExercises,
    dependencyAudits,
    subthresholdExercises,
    crossClassExercises,
    tripleExercises,
    dualContextExercises
  );
}

export class CctRiskDirectedContextRuntime extends CctDualContextTriplesRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectRiskDirectedQualifiedBridge(
      view?.cct?.actionOntology,
      allowedActions,
      openDebtAxes,
      view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises,
      view?.cct?.commonCauseExercises,
      view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises,
      view?.cct?.crossClassExercises,
      view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises,
      view?.cct?.riskDirectedExercises
    );
    if (!selected) this.terminal("CCT_RISK_DIRECTED_CONTEXT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

export function buildAdaptiveTrials(schedule, axes, windowTicks = 2) {
  return schedule.map(({ pair, thirdClass, classes }) => ({
    pair,
    thirdClass,
    classes,
    components: classes.map((dependencyClass) => ({ dependencyClass, root: `${dependencyClass}-adaptive-root`, impact: 5 })),
    sequences: permutations(classes).map((order) => ({
      order,
      observations: Array.from({ length: windowTicks + 1 }, (_, tick) => ({
        tick,
        appliedClasses: order.slice(0, Math.min(tick + 1, 3)),
        protectedAxes: axes
      }))
    }))
  }));
}
