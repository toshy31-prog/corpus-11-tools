import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessTargetEvidenceIndependence, CctTargetEvidenceIndependenceRuntime } from "../sequenced-restoration-v5.6-target-evidence-independence/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export function lineageDigest(content) { return createHash("sha256").update(JSON.stringify(content)).digest("hex"); }

export function validateContentAddressedLineageSpec(candidate = SPEC) {
  return candidate?.schema === "cct-content-addressed-lineage/v1" && candidate?.version === "5.7-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.6-TARGET-EVIDENCE-INDEPENDENCE-CANDIDATE-001"
    && candidate?.algorithm === "sha256"
    && JSON.stringify(candidate?.artifactKinds) === JSON.stringify(["rawData", "samplingFrame", "generator", "adjudication", "failureDomain"])
    && candidate?.requireDisjointUnitFingerprints === true;
}

export function assessContentAddressedLineage(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessTargetEvidenceIndependence(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "materially_independent_target_evidence_candidate") return prior;
  const targets = validation.transportAudit.targetContexts;
  if (!validateContentAddressedLineageSpec() || targets.some((target) => {
    const commitments = target?.lineageCommitments;
    const fingerprints = target?.unitFingerprints;
    return !commitments || SPEC.artifactKinds.some((kind) => typeof commitments[kind]?.content !== "string" || !commitments[kind].content
      || commitments[kind]?.algorithm !== SPEC.algorithm || commitments[kind]?.digest !== lineageDigest(commitments[kind].content))
      || !Array.isArray(fingerprints) || fingerprints.length !== target.axisCases[0].cases.length
      || new Set(fingerprints).size !== fingerprints.length || fingerprints.some((value) => typeof value !== "string" || !value);
  })) return { status: "not_established", failures: ["content_addressed_lineage_invalid"] };
  const collisions = [];
  for (let left = 0; left < targets.length; left += 1) for (let right = left + 1; right < targets.length; right += 1) {
    const sharedArtifacts = SPEC.artifactKinds.filter((kind) => targets[left].lineageCommitments[kind].digest === targets[right].lineageCommitments[kind].digest);
    const leftUnits = new Set(targets[left].unitFingerprints);
    const sharedUnits = targets[right].unitFingerprints.filter((fingerprint) => leftUnits.has(fingerprint));
    if (sharedArtifacts.length || sharedUnits.length) collisions.push({ left: left + 1, right: right + 1, sharedArtifacts, sharedUnitCount: sharedUnits.length });
  }
  if (collisions.length) return { status: "not_established", collisions, failures: ["renamed_lineage_collision_detected"] };
  return { status: SPEC.successStatus, verifiedTargetCount: targets.length, collisions: [], failures: [] };
}

export class CctContentAddressedLineageRuntime extends CctTargetEvidenceIndependenceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.contentAddressedLineageExercises?.[action];
      return assessContentAddressedLineage(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise, packet?.amendment, packet?.validation).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_CONTENT_ADDRESSED_LINEAGE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
