const pairs = (width) => {
  const output = [];
  for (let left = 0; left < width; left += 1) {
    for (let right = left + 1; right < width; right += 1) output.push([left, right]);
  }
  return output;
};

function tournamentRelations(width, mask) {
  return pairs(width).map(([left, right], bit) => (
    mask & (1 << bit)
      ? { from: left, to: right, weight: 1 }
      : { from: right, to: left, weight: 1 }
  ));
}

function relationMatrix(width, relations) {
  const beats = Array.from({ length: width }, () => Array(width).fill(false));
  for (const relation of relations) beats[relation.from][relation.to] = true;
  return beats;
}

function minimumBackwardEdges(width, relations) {
  const beats = relationMatrix(width, relations);
  const limit = 1 << width;
  const costs = Array(limit).fill(width * width);
  const choices = Array(limit).fill(-1);
  costs[0] = 0;
  for (let subset = 1; subset < limit; subset += 1) {
    for (let last = 0; last < width; last += 1) {
      if (!(subset & (1 << last))) continue;
      const previous = subset ^ (1 << last);
      let added = 0;
      for (let earlier = 0; earlier < width; earlier += 1) {
        if ((previous & (1 << earlier)) && beats[last][earlier]) added += 1;
      }
      const candidate = costs[previous] + added;
      if (candidate < costs[subset]) {
        costs[subset] = candidate;
        choices[subset] = last;
      }
    }
  }
  const reversed = [];
  let subset = limit - 1;
  while (subset) {
    const last = choices[subset];
    reversed.push(last);
    subset ^= 1 << last;
  }
  const order = reversed.reverse();
  return {
    minimumViolations: costs.at(-1),
    totalRelations: relations.length,
    fraction: `${costs.at(-1)}/${relations.length}`,
    witnessOrder: order,
  };
}

function localSummary(width, relations) {
  const beats = relationMatrix(width, relations);
  const scoreSequence = beats.map((row) => row.filter(Boolean).length).sort((a, b) => b - a);
  let cyclicTriangles = 0;
  for (let a = 0; a < width; a += 1) {
    for (let b = a + 1; b < width; b += 1) {
      for (let c = b + 1; c < width; c += 1) {
        if ((beats[a][b] && beats[b][c] && beats[c][a])
          || (beats[a][c] && beats[c][b] && beats[b][a])) cyclicTriangles += 1;
      }
    }
  }
  return { scoreSequence, cyclicTriangles };
}

function orderViolations(relations, order) {
  const positions = new Map(order.map((vertex, index) => [vertex, index]));
  if (positions.size !== order.length) throw new Error("Candidate order contains duplicate vertices");
  return relations.filter(({ from, to }) => positions.get(from) >= positions.get(to)).length;
}

function loadTournament(state, mask) {
  const limit = 1 << pairs(state.width).length;
  if (!Number.isInteger(mask) || mask < 0 || mask >= limit) throw new Error(`Mask must be in [0, ${limit})`);
  state.mask = mask;
  state.relations = tournamentRelations(state.width, mask);
  state.candidateOrder = Array.from({ length: state.width }, (_, index) => index);
  return { width: state.width, mask, relationCount: state.relations.length };
}

function exhaustiveMatchedLocalRemainder({ createEngine }) {
  const width = 6;
  const total = 1 << pairs(width).length;
  const seen = new Map();
  const discriminatingKeys = new Set();
  let selected = null;
  for (let mask = 0; mask < total; mask += 1) {
    const relations = tournamentRelations(width, mask);
    const local = localSummary(width, relations);
    const frustration = minimumBackwardEdges(width, relations).minimumViolations;
    const key = JSON.stringify([local.scoreSequence, local.cyclicTriangles]);
    const previous = seen.get(key);
    if (previous && previous.frustration !== frustration) {
      discriminatingKeys.add(key);
      if (!selected) selected = { first: previous, second: { mask, frustration }, local };
    } else {
      seen.set(key, { mask, frustration });
    }
  }
  if (!selected) throw new Error("No locally matched pair with distinct frustration was found");

  const reobserved = [selected.first.mask, selected.second.mask].map((mask) => {
    const engine = createEngine({ width });
    engine.operate("load_tournament", { mask });
    return {
      mask,
      local: engine.observe("local_summary"),
      frustration: engine.observe("minimum_frustration"),
    };
  });
  return {
    width,
    totalTournaments: total,
    matchedKeysWithMultipleFrustrations: discriminatingKeys.size,
    selected: {
      local: selected.local,
      masks: [selected.first.mask, selected.second.mask],
      minimumBackwardEdges: [selected.first.frustration, selected.second.frustration],
      fractions: reobserved.map((item) => item.frustration.fraction),
    },
    reobserved,
  };
}

function representationAndMethodAudit({ createEngine }) {
  const engine = createEngine({ width: 6 });
  engine.operate("load_tournament", { mask: 8 });
  const original = {
    local: engine.observe("local_summary"),
    frustration: engine.observe("minimum_frustration"),
  };
  engine.operate("set_candidate_order", { order: [0, 1, 2, 3, 4, 5] });
  const candidate = engine.observe("candidate_order_score");
  const afterCandidate = engine.observe("minimum_frustration");
  engine.perturb("relabel_vertices", { permutation: [2, 4, 1, 5, 0, 3] });
  const relabelled = {
    local: engine.observe("local_summary"),
    frustration: engine.observe("minimum_frustration"),
  };
  engine.perturb("reverse_relations");
  const reversed = engine.observe("minimum_frustration");
  return {
    original,
    candidateOrderScore: candidate,
    minimumAfterCandidateOrder: afterCandidate,
    relabelled,
    reversed,
    checks: {
      candidateDoesNotDefineMinimum: afterCandidate.minimumViolations === original.frustration.minimumViolations,
      relabellingPreservesLocalSummary: JSON.stringify(relabelled.local) === JSON.stringify(original.local),
      relabellingPreservesMinimum: relabelled.frustration.minimumViolations === original.frustration.minimumViolations,
      reversalPreservesMinimum: reversed.minimumViolations === original.frustration.minimumViolations,
    },
  };
}

export const temporalFrustrationPlugin = {
  manifest: {
    id: "temporal-frustration",
    version: "1.0.0",
    title: "Temporal frustration",
    observer: {
      allowedOperations: ["inspect_local_relation", "propose_scalar_order", "optimize_over_scalar_orders"],
      maxSteps: 720,
      successThreshold: 0,
    },
    conventions: {
      localInput: "A directed relation is supplied without a preferred scalar order.",
      scalarOrder: "A candidate is a permutation of vertices; a relation is violated when it points backward.",
      frustration: "F_T is the exact minimum violated weight divided by total relation weight.",
      commandOrder: "Engine journal order is execution provenance and is not an input to F_T.",
    },
    reversalConditions: [
      "The matched tournament pair no longer differs in exact minimum feedback arcs.",
      "F_T changes under a bijective relabelling of vertices.",
      "The optimizer reads engine command order or a user-supplied candidate order as the target order.",
    ],
  },
  createState: (configuration) => ({
    width: configuration.width ?? 6,
    mask: null,
    relations: [],
    candidateOrder: [],
  }),
  operations: {
    load_tournament: ({ state, input }) => loadTournament(state, input.mask),
    set_candidate_order: ({ state, input }) => {
      if (!Array.isArray(input.order) || input.order.length !== state.width
        || [...input.order].sort((a, b) => a - b).some((value, index) => value !== index)) {
        throw new Error("Candidate order must be a permutation of every vertex");
      }
      state.candidateOrder = [...input.order];
      return { order: [...state.candidateOrder] };
    },
  },
  perturbations: {
    relabel_vertices: ({ state, input }) => {
      const permutation = input.permutation;
      if (!Array.isArray(permutation) || permutation.length !== state.width
        || [...permutation].sort((a, b) => a - b).some((value, index) => value !== index)) {
        throw new Error("Relabelling must be a permutation of every vertex");
      }
      state.relations = state.relations.map(({ from, to, weight }) => ({
        from: permutation[from], to: permutation[to], weight,
      })).sort((left, right) => left.from - right.from || left.to - right.to);
      state.candidateOrder = state.candidateOrder.map((vertex) => permutation[vertex]);
      state.mask = null;
      return { permutation: [...permutation] };
    },
    reverse_relations: ({ state }) => {
      state.relations = state.relations.map(({ from, to, weight }) => ({ from: to, to: from, weight }));
      state.mask = null;
      return { relationCount: state.relations.length };
    },
  },
  observers: {
    local_summary: ({ state }) => localSummary(state.width, state.relations),
    minimum_frustration: ({ state }) => minimumBackwardEdges(state.width, state.relations),
    candidate_order_score: ({ state }) => ({
      order: [...state.candidateOrder],
      violations: orderViolations(state.relations, state.candidateOrder),
      totalRelations: state.relations.length,
    }),
  },
  criteria: {
    exact_scalar_embedding: ({ state }) => {
      const result = minimumBackwardEdges(state.width, state.relations);
      return { success: result.minimumViolations === 0, ...result };
    },
  },
  controls: {
    exhaustive_matched_local_remainder: exhaustiveMatchedLocalRemainder,
    representation_and_method_audit: representationAndMethodAudit,
  },
  classifiers: {
    reversal_status: ({ evidence, manifest }) => {
      const failed = evidence.filter((item) => !item.match).map((item) => item.metric);
      return failed.length
        ? { status: "reversal_triggered", failedMetrics: failed, conditions: manifest.reversalConditions }
        : { status: "not_triggered", failedMetrics: [], conditions: manifest.reversalConditions,
          scope: "Finite tournament result reproduced; temporal or physical interpretation remains unestablished." };
    },
  },
};

export default temporalFrustrationPlugin;
