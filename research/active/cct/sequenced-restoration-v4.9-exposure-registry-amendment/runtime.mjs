import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessExposureRegistryPairScan, CctExposureRegistryPairScanRuntime } from "../sequenced-restoration-v4.8-exposure-registry-pair-scan/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateRegistryAmendmentSpec(candidate = SPEC) {
  return candidate?.schema === "cct-exposure-registry-amendment/v1" && candidate?.version === "4.9-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.8-EXPOSURE-REGISTRY-PAIR-SCAN-CANDIDATE-001"
    && candidate?.minimumIndependentAttestations === 2 && candidate?.commitmentAlgorithm === "sha256";
}

function commitmentInput(amendment) {
  return {
    schema: amendment?.schema,
    variable: amendment?.variable,
    operationalDefinition: amendment?.operationalDefinition,
    admissibilityPrediction: amendment?.admissibilityPrediction,
    currentCampaignId: amendment?.currentCampaignId,
    effectiveCampaignId: amendment?.effectiveCampaignId,
    proposedAtTick: amendment?.proposedAtTick,
    outcomeAccessTick: amendment?.outcomeAccessTick,
    attestations: amendment?.attestations
  };
}

export function computeRegistryAmendmentDigest(amendment) {
  return createHash("sha256").update(JSON.stringify(commitmentInput(amendment))).digest("hex");
}

export function assessRegistryAmendment(openDebtAxes, dependencyAudit, currentExercise, amendment) {
  const current = assessExposureRegistryPairScan(openDebtAxes, dependencyAudit, currentExercise);
  if (current.status !== "bounded_exposure_registry_pair_scan_candidate") return current;
  if (!validateRegistryAmendmentSpec() || amendment?.schema !== "cct-exposure-registry-amendment-record/v1"
    || typeof amendment?.variable !== "string" || !amendment.variable
    || currentExercise.exposureRegistry.includes(amendment.variable)
    || typeof amendment?.operationalDefinition !== "string" || amendment.operationalDefinition.length < 20
    || typeof amendment?.admissibilityPrediction !== "string" || amendment.admissibilityPrediction.length < 20
    || !Number.isInteger(amendment?.proposedAtTick) || !Number.isInteger(amendment?.outcomeAccessTick)
    || amendment.proposedAtTick >= amendment.outcomeAccessTick
    || amendment.currentCampaignId === amendment.effectiveCampaignId
    || amendment?.commitment?.algorithm !== SPEC.commitmentAlgorithm
    || amendment.commitment.committedAtTick !== amendment.proposedAtTick
    || amendment.commitment.digest !== computeRegistryAmendmentDigest(amendment)) {
    return { status: "not_established", failures: ["registry_amendment_protocol_invalid"] };
  }
  const attestations = amendment.attestations;
  if (!Array.isArray(attestations) || attestations.length < SPEC.minimumIndependentAttestations
    || attestations.some((item) => typeof item?.sourceRoot !== "string" || !item.sourceRoot
      || typeof item?.controller !== "string" || !item.controller
      || typeof item?.failureDomain !== "string" || !item.failureDomain
      || !Number.isInteger(item?.observedAtTick)
      || item.blindToCurrentOutcomes !== true || item.observedAtTick >= amendment.proposedAtTick)
    || new Set(attestations.map((item) => item?.sourceRoot)).size !== attestations.length
    || new Set(attestations.map((item) => item?.controller)).size !== attestations.length
    || new Set(attestations.map((item) => item?.failureDomain)).size !== attestations.length) {
    return { status: "not_established", failures: ["registry_amendment_independence_unestablished"] };
  }
  return { status: SPEC.successStatus, effectiveCampaignId: amendment.effectiveCampaignId, currentCampaignUnchanged: true, failures: [] };
}

export class CctRegistryAmendmentRuntime extends CctExposureRegistryPairScanRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.registryAmendmentExercises?.[action];
      return assessRegistryAmendment(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise, packet?.amendment).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_REGISTRY_AMENDMENT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
