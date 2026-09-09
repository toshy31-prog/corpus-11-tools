import { fullSetup as parentSetup } from "../sequenced-restoration-v10.13-minimax-envelope-coverage/fixtures.mjs";

const probabilities = [0.1, 0.2, 0.25, 0.3, 0.35, 0.4];

export function hypothesisRegister() {
  return probabilities.map((alternativeDistanceProbability) => ({
    alternativeDistanceProbability,
    status: "hypothesis_only",
  }));
}

export function admissibleRegister() {
  return probabilities.map((alternativeDistanceProbability, index) => ({
    alternativeDistanceProbability,
    sourceId: `synthetic-held-out-${index + 1}`,
    estimateType: "held_out_observation",
    targetMatch: "same_population_protocol_and_outcome",
    uncertaintyBounds: [Math.max(0, alternativeDistanceProbability - 0.02), alternativeDistanceProbability + 0.02],
    independenceLineage: `synthetic-lineage-${index + 1}`,
    frozenAt: "2026-01-01T00:00:00.000Z",
    status: "evidence_fixture_only",
  }));
}

export function fullSetup(overrides = {}) {
  return {
    ...parentSetup(),
    effectEnvelopeRegister: hypothesisRegister(),
    registerFrozenAt: "2026-01-02T00:00:00.000Z",
    requestedBudgetStatus: "scenario_ceiling",
    ...overrides,
  };
}
