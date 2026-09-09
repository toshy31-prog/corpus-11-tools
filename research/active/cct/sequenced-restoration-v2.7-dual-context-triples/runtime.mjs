import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import {
  assessBoundedTriples,
  CctBoundedTriplesRuntime,
  requiredTripleCover,
  selectTripleQualifiedBridge,
  tripleCoverProperties
} from "../sequenced-restoration-v2.6-bounded-triples/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const SECOND_COVER_PERMUTATION = Object.freeze([
  "control", "identity", "network", "data", "power",
  "supplier", "personnel", "geography", "finance"
]);

export function validateDualContextTriplesSpec(candidate = SPEC) {
  return candidate?.schema === "cct-dual-context-triples/v1"
    && candidate?.version === "2.7-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.6-BOUNDED-TRIPLES-CANDIDATE-001";
}

export function requiredDualTripleCovers() {
  const primary = requiredTripleCover();
  const mapping = new Map(REQUIRED_DEPENDENCY_CLASSES.map((name, index) => [name, SECOND_COVER_PERMUTATION[index]]));
  const secondary = primary.map((triple) => triple.map((name) => mapping.get(name)));
  return [
    { coverId: "affine-a", triples: primary },
    { coverId: "affine-b", triples: secondary }
  ];
}

function pairContexts(covers) {
  const contexts = new Map();
  for (const cover of covers) {
    for (const triple of cover.triples) {
      for (let left = 0; left < triple.length; left += 1) {
        for (let right = left + 1; right < triple.length; right += 1) {
          const pair = [triple[left], triple[right]].sort();
          const third = triple.find((name) => !pair.includes(name));
          const pairId = pair.join("+");
          if (!contexts.has(pairId)) contexts.set(pairId, new Set());
          contexts.get(pairId).add(third);
        }
      }
    }
  }
  return contexts;
}

export function dualCoverProperties(covers = requiredDualTripleCovers()) {
  const tripleIds = covers.flatMap((cover) => cover.triples.map((triple) => [...triple].sort().join("+")));
  const contexts = pairContexts(covers);
  return {
    coverCount: covers.length,
    tripleCount: tripleIds.length,
    uniqueTripleCount: new Set(tripleIds).size,
    everyCoverBalanced: covers.every((cover) => {
      const properties = tripleCoverProperties(cover.triples);
      return properties.tripleCount === 12
        && properties.uniquePairCount === 36
        && properties.everyPairExactlyOnce
        && Object.values(properties.classCounts).every((count) => count === 4);
    }),
    pairCount: contexts.size,
    everyPairHasTwoContexts: [...contexts.values()].every((thirds) => thirds.size === 2)
  };
}

export function assessDualContextTriples(openDebtAxes, dependencyAudit, exercise) {
  const coverExercises = exercise?.covers;
  const windowTicks = exercise?.windowTicks;
  const requiredCovers = requiredDualTripleCovers();
  const failures = [];
  const properties = dualCoverProperties(requiredCovers);
  if (!Array.isArray(coverExercises) || !Number.isInteger(windowTicks) || windowTicks < 2
    || coverExercises.length !== requiredCovers.length
    || !properties.everyCoverBalanced || !properties.everyPairHasTwoContexts
    || properties.uniqueTripleCount !== properties.tripleCount) {
    return { status: "not_established", failures: ["invalid_dual_cover_exercise"] };
  }

  for (const requiredCover of requiredCovers) {
    const submitted = coverExercises.find((candidate) => candidate?.coverId === requiredCover.coverId);
    if (!submitted) {
      failures.push({ coverId: requiredCover.coverId, reason: "missing_cover" });
      continue;
    }
    const result = assessBoundedTriples(
      openDebtAxes,
      dependencyAudit,
      { windowTicks, tripleTrials: submitted.tripleTrials },
      requiredCover.triples
    );
    for (const failure of result.failures) {
      failures.push(typeof failure === "string"
        ? { coverId: requiredCover.coverId, reason: failure }
        : { coverId: requiredCover.coverId, ...failure });
    }
  }
  return {
    status: failures.length === 0 ? "bounded_dual_context_three_way_candidate" : "not_established",
    failures
  };
}

export function selectDualContextQualifiedBridge(
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
  dualContextExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessDualContextTriples(openDebtAxes, dependencyAudits?.[action], dualContextExercises?.[action]).status
      === "bounded_dual_context_three_way_candidate"
  );
  return selectTripleQualifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises,
    commonCauseExercises,
    dependencyAudits,
    subthresholdExercises,
    crossClassExercises,
    tripleExercises
  );
}

export class CctDualContextTriplesRuntime extends CctBoundedTriplesRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectDualContextQualifiedBridge(
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
      view?.cct?.dualContextExercises
    );
    if (!selected) this.terminal("CCT_DUAL_CONTEXT_TRIPLE_TOLERANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
