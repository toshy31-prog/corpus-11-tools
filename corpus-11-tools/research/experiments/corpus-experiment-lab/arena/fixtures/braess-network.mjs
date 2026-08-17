const DEMAND = 4000;
const QUANTUM = 100;

function routeCosts(flows, connectorPenalty) {
  const { upper, lower, connector } = flows;
  const startUpper = upper + connector;
  const lowerEnd = lower + connector;
  return {
    upper: startUpper / 100 + 45,
    lower: 45 + lowerEnd / 100,
    connector: startUpper / 100 + connectorPenalty + lowerEnd / 100,
  };
}

function potential(flows, connectorPenalty) {
  const { upper, lower, connector } = flows;
  const startUpper = upper + connector;
  const lowerEnd = lower + connector;
  return (startUpper ** 2 + lowerEnd ** 2) / 200
    + 45 * (upper + lower)
    + connectorPenalty * connector;
}

export function solveBraessEquilibrium({ connectorOpen, connectorPenalty = 0 }) {
  let best = null;
  for (let upper = 0; upper <= DEMAND; upper += QUANTUM) {
    for (let lower = 0; lower <= DEMAND - upper; lower += QUANTUM) {
      const connector = connectorOpen ? DEMAND - upper - lower : 0;
      if (!connectorOpen && upper + lower !== DEMAND) continue;
      const flows = { upper, lower, connector };
      const candidate = { flows, potential: potential(flows, connectorPenalty) };
      if (!best || candidate.potential < best.potential
          || (candidate.potential === best.potential
            && JSON.stringify(flows) < JSON.stringify(best.flows))) best = candidate;
    }
  }
  const costs = routeCosts(best.flows, connectorPenalty);
  const usedCosts = Object.entries(best.flows)
    .filter(([, flow]) => flow > 0)
    .map(([route]) => costs[route]);
  const weighted = Object.entries(best.flows)
    .reduce((sum, [route, flow]) => sum + costs[route] * flow, 0);
  return {
    flows: best.flows,
    routeCosts: costs,
    meanTravelMinutes: weighted / DEMAND,
    maximumUsedTravelMinutes: Math.max(...usedCosts),
  };
}

const POLICIES = {
  keep_closed: { connectorOpen: false, connectorPenalty: 0, infrastructureChange: 0 },
  open_free: { connectorOpen: true, connectorPenalty: 0, infrastructureChange: 1 },
  open_penalized: { connectorOpen: true, connectorPenalty: 26, infrastructureChange: 1 },
};

export const braessNetworkScenario = {
  manifest: {
    id: "braess-network-mixed-adaptation",
    version: "1.0.0",
    title: "Braess four-node congestion network",
    rounds: 1,
    dimensions: [
      "mean_travel_minutes",
      "maximum_used_travel_minutes",
      "connector_flow",
      "infrastructure_change",
    ],
    reversalConditions: [
      "The encoded equilibrium does not reproduce 65 minutes without the connector and 80 with the free connector.",
      "A contender receives different demand or cost functions.",
      "The adaptation is presented as an independently authored Corpus scenario.",
    ],
    source: {
      regime: "mixed",
      authorId: "dietrich-braess-and-corpus-adapter",
      authorRelationToCorpus: "independent-source-internal-adaptation",
      frozenBeforeContenders: true,
      authorshipTrace: "Braess 1968 DOI:10.1007/BF01918335; English DOI:10.1287/trsc.1050.0127",
      adaptationTrace: "Canonical four-node 4000-driver example encoded by Corpus maintainers on 2026-08-17.",
    },
  },

  createTrial() {
    return {
      world: { decision: null, equilibrium: null },
      exogenous: { demand: DEMAND, quantum: QUANTUM },
    };
  },

  project() {
    return {
      demand: DEMAND,
      network: {
        upperRoute: ["flow/100", "45"],
        lowerRoute: ["45", "flow/100"],
        proposedConnector: "0 generalized minutes when free",
      },
      question: "Choose whether and how to add the connector before equilibrium is realized.",
    };
  },

  admissibleActions() {
    return Object.keys(POLICIES);
  },

  act({ world, action }) {
    const policy = POLICIES[action];
    world.decision = action;
    world.equilibrium = solveBraessEquilibrium(policy);
    world.infrastructureChange = policy.infrastructureChange;
  },

  observe({ world }) {
    return {
      decision: world.decision,
      flows: { ...world.equilibrium.flows },
      routeCosts: { ...world.equilibrium.routeCosts },
      meanTravelMinutes: world.equilibrium.meanTravelMinutes,
      maximumUsedTravelMinutes: world.equilibrium.maximumUsedTravelMinutes,
    };
  },

  scorePredictions({ predictions, observation }) {
    const mean = Number(predictions.meanTravelMinutes);
    const connector = Number(predictions.connectorFlow);
    return {
      meanAbsoluteError: Number.isFinite(mean)
        ? Math.abs(mean - observation.meanTravelMinutes) : null,
      connectorFlowAbsoluteError: Number.isFinite(connector)
        ? Math.abs(connector - observation.flows.connector) : null,
    };
  },

  close({ world }) {
    return {
      mean_travel_minutes: world.equilibrium.meanTravelMinutes,
      maximum_used_travel_minutes: world.equilibrium.maximumUsedTravelMinutes,
      connector_flow: world.equilibrium.flows.connector,
      infrastructure_change: world.infrastructureChange,
    };
  },
};

export const braessNetworkContenders = [
  {
    manifest: {
      id: "capacity-expansion-heuristic",
      version: "1.0.0",
      title: "Capacity expansion heuristic",
      family: "local-capacity",
    },
    decide() {
      return {
        action: "open_free",
        predictions: { meanTravelMinutes: 55, connectorFlow: 2000 },
      };
    },
  },
  {
    manifest: {
      id: "equilibrium-aware-closure",
      version: "1.0.0",
      title: "Equilibrium-aware closure",
      family: "network-equilibrium",
    },
    decide() {
      return {
        action: "keep_closed",
        predictions: { meanTravelMinutes: 65, connectorFlow: 0 },
      };
    },
  },
  {
    manifest: {
      id: "priced-connector-policy",
      version: "1.0.0",
      title: "Priced connector policy",
      family: "incentive-design",
    },
    decide() {
      return {
        action: "open_penalized",
        predictions: { meanTravelMinutes: 65, connectorFlow: 0 },
      };
    },
  },
];
