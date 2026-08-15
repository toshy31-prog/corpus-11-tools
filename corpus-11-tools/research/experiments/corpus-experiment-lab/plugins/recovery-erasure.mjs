import {
  createExperiment,
  diffuseStep,
  diffuseUntilStable,
  erase,
  injectRandomFault,
  measure,
  readBit,
  writeBit,
} from "../../memory-erasure-lab/simulator.mjs";

const RANGE = (width) => Array.from({ length: width }, (_, index) => index);

function combinations(values, size) {
  const output = [];
  function visit(start, prefix) {
    if (prefix.length === size) {
      output.push(prefix);
      return;
    }
    for (let index = start; index <= values.length - (size - prefix.length); index += 1) {
      visit(index + 1, [...prefix, values[index]]);
    }
  }
  visit(0, []);
  return output;
}

function readSubset(state, positions) {
  return positions.map((position) => state[position]);
}

function resetSubset(state, positions) {
  const output = [...state];
  for (const position of positions) output[position] = 0;
  return output;
}

function equal(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function minimumRecoveryCost(zero, one) {
  for (let cost = 0; cost <= zero.length; cost += 1) {
    if (combinations(RANGE(zero.length), cost).some(
      (positions) => !equal(readSubset(zero, positions), readSubset(one, positions)),
    )) return cost;
  }
  throw new Error("Input families are not distinguishable");
}

export function minimumErasureCost(zero, one) {
  for (let cost = 0; cost <= zero.length; cost += 1) {
    if (combinations(RANGE(zero.length), cost).some(
      (positions) => equal(resetSubset(zero, positions), resetSubset(one, positions)),
    )) return cost;
  }
  throw new Error("Input families cannot be erased");
}

function adjacency(width, edges, removed = []) {
  const removedKeys = new Set(removed.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const graph = Array.from({ length: width }, () => []);
  for (const [a, b] of edges) {
    if (removedKeys.has(`${Math.min(a, b)}-${Math.max(a, b)}`)) continue;
    graph[a].push(b);
    graph[b].push(a);
  }
  return graph.map((neighbors) => neighbors.sort((a, b) => a - b));
}

function rootedMetrics(width, edges, root = 0) {
  const graph = adjacency(width, edges);
  const parent = Array(width).fill(-1);
  const distance = Array(width).fill(-1);
  distance[root] = 0;
  const order = [root];
  for (const vertex of order) {
    for (const neighbor of graph[vertex]) {
      if (distance[neighbor] === -1) {
        parent[neighbor] = vertex;
        distance[neighbor] = distance[vertex] + 1;
        order.push(neighbor);
      }
    }
  }
  const subtree = Array(width).fill(1);
  for (const vertex of [...order.slice(1)].reverse()) subtree[parent[vertex]] += subtree[vertex];
  return {
    degreeProfile: graph.map((items) => items.length).sort((a, b) => b - a),
    rootDegree: graph[root].length,
    eccentricity: Math.max(...distance),
    singleEdgeResidualProfile: subtree.slice(1).sort((a, b) => b - a),
  };
}

function unreachableCount(width, edges, removed, root = 0) {
  const graph = adjacency(width, edges, removed);
  const reached = new Set([root]);
  const queue = [root];
  for (const vertex of queue) {
    for (const neighbor of graph[vertex]) {
      if (!reached.has(neighbor)) {
        reached.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return width - reached.size;
}

function edgeProfiles(width, edges) {
  const rooted = rootedMetrics(width, edges);
  const oneEdge = edges.map((edge) => unreachableCount(width, edges, [edge])).sort((a, b) => b - a);
  const twoEdge = combinations(edges, 2)
    .map((removed) => unreachableCount(width, edges, removed))
    .sort((a, b) => b - a);
  return {
    matched: [rooted.degreeProfile, rooted.rootDegree, rooted.eccentricity, oneEdge],
    twoEdge,
  };
}

function treeFromPrufer(width, sequence) {
  const degree = Array(width).fill(1);
  for (const vertex of sequence) degree[vertex] += 1;
  const edges = [];
  for (const vertex of sequence) {
    const leaf = degree.findIndex((value) => value === 1);
    edges.push([Math.min(leaf, vertex), Math.max(leaf, vertex)]);
    degree[leaf] -= 1;
    degree[vertex] -= 1;
  }
  const last = RANGE(width).filter((index) => degree[index] === 1);
  edges.push([Math.min(...last), Math.max(...last)]);
  return edges.sort(([a1, b1], [a2, b2]) => a1 - a2 || b1 - b2);
}

function sequences(width) {
  const count = width ** (width - 2);
  return {
    count,
    *[Symbol.iterator]() {
      for (let encoded = 0; encoded < count; encoded += 1) {
        let value = encoded;
        const sequence = Array(width - 2).fill(0);
        for (let index = width - 3; index >= 0; index -= 1) {
          sequence[index] = value % width;
          value = Math.floor(value / width);
        }
        yield sequence;
      }
    },
  };
}

function stableKey(value) {
  return JSON.stringify(value);
}

function localizedVsBroadcast({ createEngine }) {
  const cases = [];
  for (let width = 2; width <= 8; width += 1) {
    const localized = createEngine({ topology: "line", size: width, erasure: "direct", seed: 0 });
    localized.operate("write_bit", { bit: 1 });
    const localizedState = localized.observe("terminal_state");
    const broadcast = createEngine({ topology: "line", size: width, erasure: "direct", seed: 0 });
    broadcast.operate("write_bit", { bit: 1 });
    broadcast.operate("diffuse_until_stable");
    const broadcastState = broadcast.observe("terminal_state");
    const zero = Array(width).fill(0);
    cases.push({
      width,
      localized: {
        recoveryCost: minimumRecoveryCost(zero, localizedState),
        erasureCost: minimumErasureCost(zero, localizedState),
      },
      broadcast: {
        recoveryCost: minimumRecoveryCost(zero, broadcastState),
        erasureCost: minimumErasureCost(zero, broadcastState),
      },
    });
  }
  return { cases, allMatched: cases.every((item) =>
    item.localized.recoveryCost === 1 && item.localized.erasureCost === 1
    && item.broadcast.recoveryCost === 1 && item.broadcast.erasureCost === item.width),
  };
}

const SHALLOW = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]];
const DEEP = [[0, 1], [0, 3], [1, 2], [2, 4], [2, 5]];
const TREE_A = [[0, 1], [0, 3], [1, 2], [1, 5], [2, 4]];
const TREE_B = [[0, 1], [0, 3], [1, 2], [2, 4], [2, 5]];

function matchedErasureDepth() {
  const shallow = rootedMetrics(6, SHALLOW);
  const deep = rootedMetrics(6, DEEP);
  return {
    common: { recoveryCost: 1, hamming: 6, edges: 5, work: 5,
      degreeProfile: shallow.degreeProfile, actuatorDegree: shallow.rootDegree },
    shallowDepth: shallow.eccentricity,
    deepDepth: deep.eccentricity,
    allMatched: stableKey(shallow.degreeProfile) === stableKey(deep.degreeProfile)
      && shallow.rootDegree === deep.rootDegree && shallow.eccentricity === 2 && deep.eccentricity === 3,
  };
}

function singleEdgeRobustness() {
  const first = rootedMetrics(6, TREE_A);
  const second = rootedMetrics(6, TREE_B);
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  return {
    common: { recoveryCost: 1, hamming: 6, edges: 5, work: 5,
      degreeProfile: first.degreeProfile, actuatorDegree: first.rootDegree, eccentricity: first.eccentricity },
    treeA: { edges: TREE_A, residualProfile: first.singleEdgeResidualProfile,
      meanNumerator: sum(first.singleEdgeResidualProfile), meanDenominator: 5 },
    treeB: { edges: TREE_B, residualProfile: second.singleEdgeResidualProfile,
      meanNumerator: sum(second.singleEdgeResidualProfile), meanDenominator: 5 },
    allMatched: stableKey(first.degreeProfile) === stableKey(second.degreeProfile)
      && first.rootDegree === second.rootDegree && first.eccentricity === second.eccentricity,
  };
}

function twoEdgeNoRemainder({ input }) {
  const width = input.width ?? 7;
  if (![7, 8].includes(width)) throw new Error("Closed control is defined only for widths 7 and 8");
  const seen = new Map();
  let searched = 0;
  for (const sequence of sequences(width)) {
    searched += 1;
    const edges = treeFromPrufer(width, sequence);
    const profiles = edgeProfiles(width, edges);
    const key = stableKey(profiles.matched);
    const previous = seen.get(key);
    if (previous && stableKey(previous.twoEdge) !== stableKey(profiles.twoEdge)) {
      return { width, searched, total: width ** (width - 2), pairFound: true,
        first: previous, second: { edges, twoEdge: profiles.twoEdge }, matched: profiles.matched };
    }
    if (!previous) seen.set(key, { edges, twoEdge: profiles.twoEdge });
  }
  return { width, searched, total: width ** (width - 2), pairFound: false };
}

export const recoveryErasurePlugin = {
  manifest: {
    id: "recovery-erasure",
    version: "1.0.0",
    title: "Recovery / erasure",
    observer: {
      allowedOperations: ["inspect_any_terminal_subset", "traverse_online_links", "inspect_node"],
      maxSteps: 100,
      successThreshold: 1,
    },
    conventions: {
      historicalRecoveryCost: "Minimum size of any terminal subset distinguishing input 0 from input 1.",
      interactiveReadCost: "Breadth-first inspections from one declared read port; this is a distinct observable.",
      historicalWaveDepth: "Synchronous propagation rounds after actuator root 0 has already been reset.",
      interactiveWaveDepth: "Includes the root reset, so it is historicalWaveDepth + 1 on a connected all-one tree.",
    },
    reversalConditions: [
      "Any historical control fails under its declared observer and matching conditions.",
      "Recovery and erasure costs become equal in every admissible architecture under identical local read/reset controls.",
    ],
  },
  createState: (configuration) => createExperiment(configuration),
  operations: {
    write_bit: ({ state, input }) => writeBit(state, input.bit ?? 1),
    diffuse_step: ({ state }) => diffuseStep(state),
    diffuse_until_stable: ({ state, input }) => diffuseUntilStable(state, input.maxSteps),
    erase: ({ state }) => erase(state),
  },
  perturbations: {
    random_fault: ({ state, input }) => injectRandomFault(state, input.kind),
  },
  observers: {
    network_measure: ({ state }) => measure(state),
    network_read: ({ state }) => readBit(state),
    terminal_state: ({ state }) => state.nodes.map((node) => node.bit),
    terminal_costs: ({ input }) => ({
      recoveryCost: minimumRecoveryCost(input.zero, input.one),
      erasureCost: minimumErasureCost(input.zero, input.one),
    }),
  },
  criteria: {
    counterfactual_exact: ({ state }) => ({ success: measure(state).counterfactualExact }),
    observer_reconstructs: ({ input, observer }) => ({
      success: Number(input.score) >= observer.successThreshold,
      score: Number(input.score),
      threshold: observer.successThreshold,
    }),
  },
  controls: {
    localized_vs_broadcast: localizedVsBroadcast,
    matched_erasure_depth: matchedErasureDepth,
    single_edge_robustness: singleEdgeRobustness,
    two_edge_no_remainder: twoEdgeNoRemainder,
  },
  classifiers: {
    reversal_status: ({ evidence, manifest }) => {
      const failed = evidence.filter((item) => !item.match).map((item) => item.control);
      return failed.length
        ? { status: "reversal_triggered", failedControls: failed, conditions: manifest.reversalConditions }
        : { status: "not_triggered", failedControls: [], conditions: manifest.reversalConditions,
          scope: "Historical controls reproduced; no claim of physical or universal validity." };
    },
  },
};

export default recoveryErasurePlugin;
