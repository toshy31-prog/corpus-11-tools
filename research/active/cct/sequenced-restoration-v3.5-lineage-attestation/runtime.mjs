import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessPortfolioLineageTransport,
  CctPortfolioLineageRuntime,
  selectPortfolioLineageQualifiedBridge
} from "../sequenced-restoration-v3.4-portfolio-lineage/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const ROOT_FIELDS = ["samplingUnitRoot", "eventRoot", "generatorRoot"];

export function validateLineageAttestationSpec(candidate = SPEC) {
  return candidate?.schema === "cct-lineage-attestation/v1"
    && candidate?.version === "3.5-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.4-PORTFOLIO-LINEAGE-CANDIDATE-001"
    && candidate?.attestationsPerCluster === 2
    && candidate?.maximumAttestorShare === 0.5
    && candidate?.maximumAttestationFailureDomainShare === 0.5;
}

function allClusters(exercise) {
  const pairClusters = exercise?.transportEvidence?.pairMargins?.flatMap((record) =>
    record?.trials?.flatMap((trial) => trial?.clusters ?? []) ?? []
  ) ?? [];
  const riskClusters = exercise?.transportEvidence?.classRisks?.flatMap((record) =>
    record?.trials?.flatMap((trial) => trial?.clusters ?? []) ?? []
  ) ?? [];
  return [...pairClusters, ...riskClusters];
}

function attestationProtocolInput(exercise) {
  return {
    schema: "cct-lineage-attestation-protocol/v1",
    attestationsPerCluster: SPEC.attestationsPerCluster,
    maximumAttestorShare: SPEC.maximumAttestorShare,
    maximumAttestationFailureDomainShare: SPEC.maximumAttestationFailureDomainShare,
    clusters: allClusters(exercise).map((cluster) => ({
      clusterId: cluster?.clusterId,
      roots: Object.fromEntries(ROOT_FIELDS.map((field) => [field, cluster?.[field]])),
      attestations: cluster?.lineageAttestations
    }))
  };
}

export function computeLineageAttestationProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(attestationProtocolInput(exercise))).digest("hex");
}

function maximumShare(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

function validClusterAttestations(cluster, commitmentTick) {
  const attestations = cluster?.lineageAttestations;
  if (!Array.isArray(attestations) || attestations.length !== SPEC.attestationsPerCluster) return false;
  const expectedRoots = Object.fromEntries(ROOT_FIELDS.map((field) => [field, cluster[field]]));
  return new Set(attestations.map((item) => item?.evidenceRoot)).size === SPEC.attestationsPerCluster
    && new Set(attestations.map((item) => item?.controller)).size === SPEC.attestationsPerCluster
    && new Set(attestations.map((item) => item?.failureDomain)).size === SPEC.attestationsPerCluster
    && attestations.every((item) => item?.schema === "cluster-lineage-attestation/v1"
      && typeof item.evidenceRoot === "string" && item.evidenceRoot
      && typeof item.controller === "string" && item.controller && item.controller !== cluster.controller
      && typeof item.failureDomain === "string" && item.failureDomain && item.failureDomain !== cluster.failureDomain
      && Number.isInteger(item.attestedAtTick) && item.attestedAtTick < commitmentTick
      && item.blindChallengePassed === true
      && JSON.stringify(item.boundRoots) === JSON.stringify(expectedRoots));
}

export function assessAttestedPortfolioLineage(openDebtAxes, dependencyAudit, exercise) {
  const portfolio = assessPortfolioLineageTransport(openDebtAxes, dependencyAudit, exercise);
  if (portfolio.status !== "bounded_portfolio_lineage_transport_candidate") return portfolio;

  const commitment = exercise?.lineageAttestationCommitment;
  if (!validateLineageAttestationSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.portfolioLineageProtocolCommitment?.committedAtTick
    || commitment.digest !== computeLineageAttestationProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_lineage_attestation_protocol"] };
  }

  const clusters = allClusters(exercise);
  const invalid = clusters.filter((cluster) => !validClusterAttestations(cluster, commitment.committedAtTick));
  if (invalid.length > 0) {
    return { status: "not_established", failures: [{ reason: "lineage_attestation_dependent", clusterIds: invalid.map((cluster) => cluster?.clusterId) }] };
  }

  const attestations = clusters.flatMap((cluster) => cluster.lineageAttestations);
  const evidenceRoots = attestations.map((item) => item.evidenceRoot);
  const controllers = attestations.map((item) => item.controller);
  const failureDomains = attestations.map((item) => item.failureDomain);
  if (new Set(evidenceRoots).size !== evidenceRoots.length
    || maximumShare(controllers) > SPEC.maximumAttestorShare
    || maximumShare(failureDomains) > SPEC.maximumAttestationFailureDomainShare) {
    return { status: "not_established", failures: [{ reason: "attestation_portfolio_dependence" }] };
  }

  return { status: "bounded_attested_portfolio_lineage_candidate", failures: [] };
}

export function selectAttestedLineageQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessAttestedPortfolioLineage(openDebtAxes, dependencyAudits?.[action], lineageAttestationExercises?.[action]).status
      === "bounded_attested_portfolio_lineage_candidate"
  );
  return selectPortfolioLineageQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises
  );
}

export class CctLineageAttestationRuntime extends CctPortfolioLineageRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectAttestedLineageQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises
    );
    if (!selected) this.terminal("CCT_SIGNAL_LINEAGE_ATTESTATION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
