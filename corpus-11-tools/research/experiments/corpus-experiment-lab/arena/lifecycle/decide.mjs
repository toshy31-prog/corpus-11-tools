import { findDominated } from "../campaign/pareto.mjs";

function runsByIdentity(report, sealedIdentityMap) {
  return Object.fromEntries(report.runs.map((run) => [sealedIdentityMap[run.label], run]));
}

function sameActions(left, right) {
  return JSON.stringify(left.history.map((step) => step.action))
    === JSON.stringify(right.history.map((step) => step.action));
}

export function proposeLifecycleDecision({
  candidateId,
  report,
  sealedIdentityMap,
  policy,
  orientations = null,
  negativeControlIds = [],
}) {
  if (policy?.schema !== "corpus-binding-lifecycle-policy/v1") throw new Error("invalid lifecycle policy");
  const runs = runsByIdentity(report, sealedIdentityMap);
  const candidate = runs[candidateId];
  if (!candidate) throw new Error("candidate is absent from arena report");
  const triggers = [];

  if (orientations) {
    const outcomes = Object.fromEntries(Object.entries(runs).map(([id, run]) => [id, run.outcomes]));
    const dominators = findDominated(outcomes, orientations)[candidateId] ?? [];
    if (dominators.length) triggers.push({ rule: "strictParetoDominance", comparators: dominators });
  }

  const equivalentControls = negativeControlIds.filter((id) => {
    const control = runs[id];
    return control && JSON.stringify(control.outcomes) === JSON.stringify(candidate.outcomes)
      && sameActions(candidate, control);
  });
  if (equivalentControls.length) {
    triggers.push({ rule: "exactNegativeControlEquivalence", comparators: equivalentControls });
  }

  return {
    candidateId,
    scenarioId: report.scenario.id,
    proposal: triggers.length ? "propose_quarantine_local" : "retain_for_more_evidence",
    triggers,
    authorityRequired: "user_or_designated_maintainer",
    evaluatorAuthority: "proposal_only",
    sourceCapabilityEffect: "none",
  };
}
