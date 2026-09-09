import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessClusterLineageTransport,
  CctClusterLineageRuntime,
  selectClusterLineageQualifiedBridge
} from "../sequenced-restoration-v3.3-cluster-lineage/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validatePortfolioLineageSpec(candidate = SPEC) {
  return candidate?.schema === "cct-portfolio-lineage/v1"
    && candidate?.version === "3.4-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.3-CLUSTER-LINEAGE-CANDIDATE-001"
    && candidate?.portfolioSignalCount === 45
    && JSON.stringify(candidate?.globallyUniqueRoots) === JSON.stringify(["samplingUnitRoot", "eventRoot", "generatorRoot"]);
}

function portfolioRecords(exercise) {
  const pairs = exercise?.transportEvidence?.pairMargins?.map((record) => ({
    signalType: "pair_margin",
    signal: record?.pair?.join("+"),
    trials: record?.trials
  })) ?? [];
  const risks = exercise?.transportEvidence?.classRisks?.map((record) => ({
    signalType: "class_risk",
    signal: record?.dependencyClass,
    trials: record?.trials
  })) ?? [];
  return [...pairs, ...risks];
}

function portfolioProtocolInput(exercise) {
  return {
    schema: "cct-portfolio-lineage-protocol/v1",
    portfolioSignalCount: SPEC.portfolioSignalCount,
    globallyUniqueRoots: SPEC.globallyUniqueRoots,
    signals: portfolioRecords(exercise).map((record) => ({
      signalType: record.signalType,
      signal: record.signal,
      contexts: record.trials?.map((trial) => ({
        contextId: trial?.contextId,
        clusters: trial?.clusters?.map((cluster) => Object.fromEntries(
          SPEC.globallyUniqueRoots.map((field) => [field, cluster?.[field]])
        ))
      }))
    }))
  };
}

export function computePortfolioLineageProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(portfolioProtocolInput(exercise))).digest("hex");
}

function lineageCollisions(records) {
  const collisions = [];
  for (const field of SPEC.globallyUniqueRoots) {
    const owners = new Map();
    for (const record of records) {
      for (const trial of record.trials ?? []) {
        for (const cluster of trial.clusters ?? []) {
          const root = cluster?.[field];
          const prior = owners.get(root);
          if (prior && (prior.signalType !== record.signalType || prior.signal !== record.signal)) {
            collisions.push({
              rootType: field,
              root,
              firstSignal: `${prior.signalType}:${prior.signal}`,
              secondSignal: `${record.signalType}:${record.signal}`
            });
          } else if (!prior) {
            owners.set(root, { signalType: record.signalType, signal: record.signal });
          }
        }
      }
    }
  }
  return collisions;
}

export function assessPortfolioLineageTransport(openDebtAxes, dependencyAudit, exercise) {
  const lineage = assessClusterLineageTransport(openDebtAxes, dependencyAudit, exercise);
  if (lineage.status !== "bounded_cluster_lineage_transport_candidate") return lineage;

  const commitment = exercise?.portfolioLineageProtocolCommitment;
  if (!validatePortfolioLineageSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.clusterLineageProtocolCommitment?.committedAtTick
    || commitment.digest !== computePortfolioLineageProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_portfolio_lineage_protocol"] };
  }

  const records = portfolioRecords(exercise);
  if (records.length !== SPEC.portfolioSignalCount) {
    return { status: "not_established", failures: ["portfolio_signal_set_not_exact"] };
  }
  const collisions = lineageCollisions(records);
  return {
    status: collisions.length === 0 ? "bounded_portfolio_lineage_transport_candidate" : "not_established",
    failures: collisions.length === 0 ? [] : [{ reason: "cross_signal_lineage_collision", collisions }]
  };
}

export function selectPortfolioLineageQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessPortfolioLineageTransport(openDebtAxes, dependencyAudits?.[action], portfolioLineageExercises?.[action]).status
      === "bounded_portfolio_lineage_transport_candidate"
  );
  return selectClusterLineageQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises
  );
}

export class CctPortfolioLineageRuntime extends CctClusterLineageRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectPortfolioLineageQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises
    );
    if (!selected) this.terminal("CCT_SIGNAL_PORTFOLIO_LINEAGE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
