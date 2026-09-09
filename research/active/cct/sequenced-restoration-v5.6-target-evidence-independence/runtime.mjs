import { readFileSync } from "node:fs";
import { assessAxisCalibrationTransport, CctAxisCalibrationTransportRuntime } from "../sequenced-restoration-v5.5-axis-calibration-transport/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateTargetEvidenceIndependenceSpec(candidate = SPEC) {
  return candidate?.schema === "cct-target-evidence-independence/v1" && candidate?.version === "5.6-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.5-AXIS-CALIBRATION-TRANSPORT-CANDIDATE-001"
    && JSON.stringify(candidate?.requiredDistinctRoots) === JSON.stringify(["rawDataRoot", "samplingFrameRoot", "generatorRoot", "adjudicationRoot", "failureDomain"])
    && candidate?.requireDisjointSampleIds === true;
}

export function assessTargetEvidenceIndependence(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessAxisCalibrationTransport(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "axis_calibration_transported_for_scope_candidate") return prior;
  const targets = validation.transportAudit.targetContexts;
  if (!validateTargetEvidenceIndependenceSpec() || targets.some((target) => SPEC.requiredDistinctRoots.some((field) =>
    typeof target?.provenance?.[field] !== "string" || !target.provenance[field]))) {
    return { status: "not_established", failures: ["target_evidence_lineage_unknown"] };
  }
  const dependenceEdges = [];
  for (let left = 0; left < targets.length; left += 1) for (let right = left + 1; right < targets.length; right += 1) {
    const sharedRoots = SPEC.requiredDistinctRoots.filter((field) => targets[left].provenance[field] === targets[right].provenance[field]);
    const leftSamples = new Set(targets[left].axisCases.flatMap((packet) => packet.cases.map((item) => item.sampleId)));
    const sharedSamples = [...new Set(targets[right].axisCases.flatMap((packet) => packet.cases.map((item) => item.sampleId)))].filter((id) => leftSamples.has(id));
    if (sharedRoots.length || sharedSamples.length) dependenceEdges.push({ left: left + 1, right: right + 1, sharedRoots, sharedSampleCount: sharedSamples.length });
  }
  if (dependenceEdges.length) return { status: "not_established", dependenceEdges, failures: ["target_evidence_substantially_dependent"] };
  return { status: SPEC.successStatus, independentTargetCount: targets.length, dependenceEdges: [], failures: [] };
}

export class CctTargetEvidenceIndependenceRuntime extends CctAxisCalibrationTransportRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.targetEvidenceIndependenceExercises?.[action];
      return assessTargetEvidenceIndependence(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise, packet?.amendment, packet?.validation).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_TARGET_EVIDENCE_INDEPENDENCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
