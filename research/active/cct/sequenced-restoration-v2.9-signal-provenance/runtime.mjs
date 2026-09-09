import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import {
  assessRiskDirectedContext,
  CctRiskDirectedContextRuntime,
  selectRiskDirectedQualifiedBridge
} from "../sequenced-restoration-v2.8-risk-directed-context/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const PAIR_SCHEMA = "axis-protection-margin/v1";
const RISK_SCHEMA = "dependency-failure-risk/v1";

export function validateSignalProvenanceSpec(candidate = SPEC) {
  return candidate?.schema === "cct-signal-provenance/v1"
    && candidate?.version === "2.9-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.8-RISK-DIRECTED-CONTEXT-CANDIDATE-001";
}

function evidenceDigest(kind, id, attestations) {
  return createHash("sha256")
    .update(JSON.stringify({ schema: "cct-signal-evidence/v1", kind, id, attestations }))
    .digest("hex");
}

function independentAttestations(attestations) {
  return attestations.length >= 2
    && new Set(attestations.map((item) => item.sourceRoot)).size >= 2
    && new Set(attestations.map((item) => item.controller)).size >= 2
    && new Set(attestations.map((item) => item.failureDomain)).size >= 2;
}

function validCommonAttestation(attestation, schema, commitmentTick, minimumSampleSize) {
  return attestation?.schema === schema
    && typeof attestation.sourceRoot === "string" && attestation.sourceRoot
    && typeof attestation.controller === "string" && attestation.controller
    && typeof attestation.failureDomain === "string" && attestation.failureDomain
    && Number.isInteger(attestation.measuredAtTick) && attestation.measuredAtTick >= 0
    && attestation.measuredAtTick <= commitmentTick
    && typeof attestation.value === "number" && Number.isFinite(attestation.value) && attestation.value >= 0
    && Number.isInteger(attestation.sampleSize) && attestation.sampleSize >= minimumSampleSize
    && attestation.blindChallengePassed === true;
}

export function compileSignalEvidence(signalEvidence, commitmentTick) {
  const failures = [];
  const pairRecords = signalEvidence?.pairMargins;
  const riskRecords = signalEvidence?.classRisks;
  const pairs = requiredClassPairs();
  if (!Array.isArray(pairRecords) || !Array.isArray(riskRecords) || !Number.isInteger(commitmentTick)) {
    return { pairSignals: [], classRiskScores: [], failures: ["invalid_signal_evidence"] };
  }

  const pairSignals = [];
  for (const pair of pairs) {
    const pairId = pair.join("+");
    const record = pairRecords.find((candidate) => candidate?.pair?.join("+") === pairId);
    const attestations = record?.attestations;
    if (!Array.isArray(attestations)
      || !independentAttestations(attestations)
      || attestations.some((item) => !validCommonAttestation(item, PAIR_SCHEMA, commitmentTick, 12))) {
      failures.push({ signalType: "pair_margin", signal: pairId, reason: "independent_attestations_missing" });
      continue;
    }
    pairSignals.push({
      pair,
      minimumMargin: Math.min(...attestations.map((item) => item.value)),
      sourceRoot: evidenceDigest("pair_margin", pairId, attestations)
    });
  }
  if (pairRecords.length !== pairs.length
    || new Set(pairRecords.map((record) => record?.pair?.join("+"))).size !== pairs.length) {
    failures.push({ signalType: "pair_margin", reason: "evidence_set_not_exact" });
  }

  const classRiskScores = [];
  for (const dependencyClass of REQUIRED_DEPENDENCY_CLASSES) {
    const record = riskRecords.find((candidate) => candidate?.dependencyClass === dependencyClass);
    const attestations = record?.attestations;
    if (!Array.isArray(attestations)
      || !independentAttestations(attestations)
      || attestations.some((item) => !validCommonAttestation(item, RISK_SCHEMA, commitmentTick, 30)
        || item.value > 1
        || typeof item.calibrationError !== "number" || !Number.isFinite(item.calibrationError)
        || item.calibrationError < 0 || item.calibrationError > 0.1)) {
      failures.push({ signalType: "class_risk", signal: dependencyClass, reason: "calibrated_attestations_missing" });
      continue;
    }
    classRiskScores.push({
      dependencyClass,
      riskScore: Math.max(...attestations.map((item) => item.value)),
      sourceRoot: evidenceDigest("class_risk", dependencyClass, attestations)
    });
  }
  if (riskRecords.length !== REQUIRED_DEPENDENCY_CLASSES.length
    || new Set(riskRecords.map((record) => record?.dependencyClass)).size !== REQUIRED_DEPENDENCY_CLASSES.length) {
    failures.push({ signalType: "class_risk", reason: "evidence_set_not_exact" });
  }
  return { pairSignals, classRiskScores, failures };
}

export function assessSignalProvenance(openDebtAxes, dependencyAudit, exercise) {
  const commitmentTick = exercise?.planCommitment?.committedAtTick;
  const compiled = compileSignalEvidence(exercise?.signalEvidence, commitmentTick);
  if (compiled.failures.length > 0) {
    return { status: "not_established", failures: compiled.failures };
  }
  if (JSON.stringify(exercise.pairSignals) !== JSON.stringify(compiled.pairSignals)
    || JSON.stringify(exercise.classRiskScores) !== JSON.stringify(compiled.classRiskScores)) {
    return { status: "not_established", failures: ["compiled_signals_not_applied"] };
  }
  const result = assessRiskDirectedContext(openDebtAxes, dependencyAudit, exercise);
  return {
    status: result.failures.length === 0 ? "bounded_provenanced_risk_signals_candidate" : "not_established",
    failures: result.failures
  };
}

export function selectProvenancedSignalQualifiedBridge(
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
  riskDirectedExercises,
  signalProvenanceExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessSignalProvenance(openDebtAxes, dependencyAudits?.[action], signalProvenanceExercises?.[action]).status
      === "bounded_provenanced_risk_signals_candidate"
  );
  return selectRiskDirectedQualifiedBridge(
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
    dualContextExercises,
    riskDirectedExercises
  );
}

export class CctSignalProvenanceRuntime extends CctRiskDirectedContextRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectProvenancedSignalQualifiedBridge(
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
      view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises
    );
    if (!selected) this.terminal("CCT_ADAPTIVE_SIGNAL_PROVENANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
