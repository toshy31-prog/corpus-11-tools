import { clone, stableHash } from "../core/reproducibility.mjs";
import { OPEN_ARENA_CONTRACT_VERSION, validateContender, validateScenario } from "./contracts.mjs";

function blindLabel(blindKey, contenderId) {
  return `method-${stableHash({ blindKey, contenderId }).split(":")[1].slice(0, 8)}`;
}

function assertOutcomeVector(outcomes, dimensions) {
  if (!outcomes || typeof outcomes !== "object" || Array.isArray(outcomes)) {
    throw new Error("scenario.close must return an outcome object");
  }
  const missing = dimensions.filter((dimension) => !(dimension in outcomes));
  if (missing.length) throw new Error(`scenario.close omitted dimensions: ${missing.join(", ")}`);
  if ("winner" in outcomes || "aggregateScore" in outcomes) {
    throw new Error("open arena forbids a hidden aggregate winner");
  }
}

export function runBlindArena({
  arenaId,
  scenario,
  contenders,
  seed = 0,
  blindKey,
  claimExternal = false,
}) {
  if (!arenaId) throw new Error("arenaId is required");
  if (typeof blindKey !== "string" || blindKey.length < 8) {
    throw new Error("blindKey must be a non-public string of at least eight characters");
  }
  validateScenario(scenario, { claimExternal });
  if (!Array.isArray(contenders) || contenders.length < 2) {
    throw new Error("at least two contenders are required");
  }
  contenders.forEach(validateContender);
  const contenderIds = contenders.map((item) => item.manifest.id);
  if (new Set(contenderIds).size !== contenderIds.length) {
    throw new Error("contender IDs must be unique");
  }

  const source = clone(scenario.manifest.source);
  const labels = new Map(contenders.map((contender) => [
    contender.manifest.id,
    blindLabel(blindKey, contender.manifest.id),
  ]));
  if (new Set(labels.values()).size !== labels.size) throw new Error("blind label collision");

  const baselines = [];
  const runs = contenders.map((contender) => {
    const trial = clone(scenario.createTrial({ seed }));
    if (!trial || typeof trial !== "object" || !("world" in trial) || !("exogenous" in trial)) {
      throw new Error("scenario.createTrial must return world and exogenous");
    }
    const baseline = {
      worldHash: stableHash(trial.world),
      exogenousHash: stableHash(trial.exogenous),
    };
    baselines.push(baseline);
    const history = [];

    for (let round = 0; round < scenario.manifest.rounds; round += 1) {
      const view = clone(scenario.project({ world: clone(trial.world), round, history: clone(history) }));
      const allowedActions = clone(scenario.admissibleActions({ view: clone(view), round }));
      if (!Array.isArray(allowedActions) || allowedActions.length === 0) {
        throw new Error(`scenario returned no actions at round ${round}`);
      }
      const decision = clone(contender.decide({
        view: clone(view),
        allowedActions: clone(allowedActions),
        history: clone(history),
        round,
      }));
      if (!decision || !allowedActions.includes(decision.action)) {
        throw new Error(`${contender.manifest.id} selected an inadmissible action at round ${round}`);
      }
      if (!decision.predictions || typeof decision.predictions !== "object") {
        throw new Error(`${contender.manifest.id} omitted predictions at round ${round}`);
      }

      const beforeHash = stableHash(trial.world);
      scenario.act({
        world: trial.world,
        action: decision.action,
        round,
        exogenous: clone(trial.exogenous),
      });
      const observation = clone(scenario.observe({ world: clone(trial.world), round }));
      const predictionAssessment = clone(scenario.scorePredictions({
        predictions: clone(decision.predictions),
        view: clone(view),
        observation: clone(observation),
        round,
      }));
      history.push({
        round,
        view,
        admissibleActions: allowedActions,
        action: decision.action,
        predictions: decision.predictions,
        observation,
        predictionAssessment,
        beforeHash,
        afterHash: stableHash(trial.world),
      });
    }

    const outcomes = clone(scenario.close({ world: clone(trial.world), history: clone(history) }));
    assertOutcomeVector(outcomes, scenario.manifest.dimensions);
    return {
      label: labels.get(contender.manifest.id),
      baseline,
      outcomes,
      history,
      finalWorldHash: stableHash(trial.world),
    };
  }).sort((left, right) => left.label.localeCompare(right.label));

  if (baselines.some((item) => item.worldHash !== baselines[0].worldHash
      || item.exogenousHash !== baselines[0].exogenousHash)) {
    throw new Error("contenders did not receive matched initial worlds and exogenous sequences");
  }

  const deterministic = {
    contract: OPEN_ARENA_CONTRACT_VERSION,
    arenaId,
    seed,
    scenario: {
      id: scenario.manifest.id,
      version: scenario.manifest.version,
      title: scenario.manifest.title,
      dimensions: clone(scenario.manifest.dimensions),
      reversalConditions: clone(scenario.manifest.reversalConditions),
      source,
    },
    claimExternal,
    externalityStatus: source.regime === "external_supplied"
      ? "declared_external_with_verified_freeze_authorship_not_independently_verified"
      : `${source.regime}_not_external_evidence`,
    matchedBaseline: baselines[0],
    runs,
    conclusionBoundary: "vector_outcomes_only_no_unique_winner",
  };
  return {
    report: { ...deterministic, reportHash: stableHash(deterministic) },
    sealedIdentityMap: Object.fromEntries(
      contenders.map((contender) => [labels.get(contender.manifest.id), contender.manifest.id]).sort(),
    ),
  };
}
