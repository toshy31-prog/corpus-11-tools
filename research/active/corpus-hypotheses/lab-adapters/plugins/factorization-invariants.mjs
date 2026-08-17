const DIMENSION = 3;

function permutations(values) {
  if (values.length === 0) return [[]];
  const output = [];
  for (let index = 0; index < values.length; index += 1) {
    const head = values[index];
    const rest = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const tail of permutations(rest)) output.push([head, ...tail]);
  }
  return output;
}

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

function signedPermutationMatrices() {
  const matrices = [];
  for (const permutation of permutations([0, 1, 2])) {
    for (let signMask = 0; signMask < 8; signMask += 1) {
      const signs = [0, 1, 2].map((column) => (
        signMask & (1 << (2 - column)) ? 1 : -1
      ));
      const matrix = Array.from({ length: DIMENSION }, () => Array(DIMENSION).fill(0));
      for (let column = 0; column < DIMENSION; column += 1) {
        matrix[permutation[column]][column] = signs[column];
      }
      matrices.push(matrix);
    }
  }
  return matrices;
}

const CATALOG = signedPermutationMatrices();

function determinant2(rows, rowA, rowB, colA, colB) {
  return rows[rowA][colA] * rows[rowB][colB] - rows[rowA][colB] * rows[rowB][colA];
}

function determinant3(first, second, third) {
  return first[0] * (second[1] * third[2] - second[2] * third[1])
    - first[1] * (second[0] * third[2] - second[2] * third[0])
    + first[2] * (second[0] * third[1] - second[1] * third[0]);
}

function exactRank(rows) {
  const nonzero = rows.filter((row) => row.some((value) => value !== 0));
  if (nonzero.length === 0) return 0;
  for (const selected of combinations(nonzero, 3)) {
    if (determinant3(...selected) !== 0) return 3;
  }
  for (let rowA = 0; rowA < nonzero.length; rowA += 1) {
    for (let rowB = rowA + 1; rowB < nonzero.length; rowB += 1) {
      for (let colA = 0; colA < DIMENSION; colA += 1) {
        for (let colB = colA + 1; colB < DIMENSION; colB += 1) {
          if (determinant2(nonzero, rowA, rowB, colA, colB) !== 0) return 2;
        }
      }
    }
  }
  return 1;
}

function fixedDimension(matrices) {
  const equations = [];
  for (const matrix of matrices) {
    for (let row = 0; row < DIMENSION; row += 1) {
      equations.push(matrix[row].map((value, column) => value - Number(row === column)));
    }
  }
  return DIMENSION - exactRank(equations);
}

function profile(transports) {
  return {
    marginal: transports.map((matrix) => fixedDimension([matrix])).sort((a, b) => b - a),
    pairwise: combinations(transports, 2).map((pair) => fixedDimension(pair)).sort((a, b) => b - a),
    total: fixedDimension(transports),
  };
}

function multiply(left, right) {
  return left.map((row) => right[0].map((_, column) =>
    row.reduce((sum, value, index) => sum + value * right[index][column], 0)));
}

function transpose(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function loadTransports(state, indices) {
  if (!Array.isArray(indices) || indices.length === 0
    || indices.some((index) => !Number.isInteger(index) || index < 0 || index >= CATALOG.length)) {
    throw new Error(`Transport indices must select entries in [0, ${CATALOG.length})`);
  }
  state.transportIndices = [...indices];
  state.transports = indices.map((index) => structuredClone(CATALOG[index]));
  return { indices: [...indices], count: indices.length };
}

function exhaustiveHigherOrderRemainder({ createEngine }) {
  const seen = new Map();
  const discriminatingKeys = new Set();
  let selected = null;
  const indexTriplets = combinations(Array.from({ length: CATALOG.length }, (_, index) => index), 3);
  for (const indices of indexTriplets) {
    const transports = indices.map((index) => CATALOG[index]);
    const dimensions = profile(transports);
    const key = JSON.stringify([dimensions.marginal, dimensions.pairwise]);
    const previous = seen.get(key);
    if (previous && previous.total !== dimensions.total) {
      discriminatingKeys.add(key);
      if (!selected) selected = {
        first: previous,
        second: { indices, total: dimensions.total },
        lowerOrder: { marginal: dimensions.marginal, pairwise: dimensions.pairwise },
      };
    } else {
      seen.set(key, { indices, total: dimensions.total });
    }
  }
  if (!selected) throw new Error("No matched lower-order pair with a triple remainder was found");
  const reobserved = [selected.first.indices, selected.second.indices].map((indices) => {
    const engine = createEngine({ dimension: DIMENSION });
    engine.operate("load_transports", { indices });
    return { indices, profile: engine.observe("fixed_dimension_profile") };
  });
  return {
    dimension: DIMENSION,
    catalogSize: CATALOG.length,
    tripletsSearched: indexTriplets.length,
    matchedKeysWithMultipleTripleDimensions: discriminatingKeys.size,
    selected: {
      lowerOrder: selected.lowerOrder,
      indices: [selected.first.indices, selected.second.indices],
      tripleDimensions: [selected.first.total, selected.second.total],
    },
    reobserved,
  };
}

function representationAudit({ createEngine }) {
  const engine = createEngine({ dimension: DIMENSION });
  engine.operate("load_transports", { indices: [3, 5, 17] });
  const original = engine.observe("fixed_dimension_profile");
  engine.perturb("reorder_factorizations", { order: [2, 0, 1] });
  const reordered = engine.observe("fixed_dimension_profile");
  engine.perturb("change_basis", { basisIndex: 22 });
  const changedBasis = engine.observe("fixed_dimension_profile");
  return {
    original,
    reordered,
    changedBasis,
    checks: {
      reorderingPreservesProfile: JSON.stringify(reordered) === JSON.stringify(original),
      basisChangePreservesProfile: JSON.stringify(changedBasis) === JSON.stringify(original),
      observationsDoNotMutateState: engine.snapshot().journal
        .filter((entry) => entry.kind === "observers").every((entry) => !entry.mutated),
    },
  };
}

export const factorizationInvariantsPlugin = {
  manifest: {
    id: "factorization-invariants",
    version: "1.0.0",
    title: "Factorization invariants",
    observer: {
      allowedOperations: ["inspect_transport", "compute_fixed_space", "intersect_fixed_spaces"],
      maxSteps: 48,
      successThreshold: 1,
    },
    system: "A finite three-dimensional vector space with declared transport matrices attached to admissible factorization labels.",
    states: "An ordered presentation of transport matrices; order is representational and not part of the invariant.",
    operationsDescription: ["load a preregistered transport family"],
    perturbationsDescription: ["reorder factorization labels", "apply an exact invertible basis change"],
    observablesDescription: ["marginal fixed dimensions", "pairwise intersection dimensions", "total intersection dimension"],
    controlsDescription: ["matched lower-order exhaustive search", "factorization reordering", "exact change of basis"],
    conventions: {
      factorizationLabel: "The finite test represents each factorization only by its declared transport matrix.",
      invariant: "The observable is the exact dimension of the common fixed subspace.",
      arithmetic: "Ranks are determined by nonzero integer minors; no floating tolerance is used.",
      order: "Transport list order and engine journal order are provenance, not scientific inputs.",
    },
    reversalConditions: [
      "The two preregistered triplets no longer share all marginal and pairwise fixed dimensions.",
      "Their total fixed dimensions cease to differ between zero and one.",
      "The fixed-dimension profile changes under reordering or invertible basis change.",
    ],
  },
  createState: (configuration) => {
    if ((configuration.dimension ?? DIMENSION) !== DIMENSION) throw new Error("Closed module currently supports exact dimension 3");
    return { dimension: DIMENSION, transportIndices: [], transports: [] };
  },
  operations: {
    load_transports: ({ state, input }) => loadTransports(state, input.indices),
  },
  perturbations: {
    reorder_factorizations: ({ state, input }) => {
      const order = input.order;
      if (!Array.isArray(order) || order.length !== state.transports.length
        || [...order].sort((a, b) => a - b).some((value, index) => value !== index)) {
        throw new Error("Order must be a permutation of loaded factorization positions");
      }
      state.transports = order.map((position) => state.transports[position]);
      state.transportIndices = order.map((position) => state.transportIndices[position]);
      return { order: [...order] };
    },
    change_basis: ({ state, input }) => {
      const basis = CATALOG[input.basisIndex];
      if (!basis) throw new Error("basisIndex must select an invertible signed permutation matrix");
      const inverse = transpose(basis);
      state.transports = state.transports.map((matrix) => multiply(multiply(basis, matrix), inverse));
      state.transportIndices = [];
      return { basisIndex: input.basisIndex };
    },
  },
  observers: {
    fixed_dimension_profile: ({ state }) => profile(state.transports),
    common_fixed_dimension: ({ state }) => ({ dimension: fixedDimension(state.transports) }),
    transport_family: ({ state }) => ({ dimension: state.dimension, transports: structuredClone(state.transports) }),
  },
  criteria: {
    nonzero_common_invariant: ({ state }) => {
      const dimension = fixedDimension(state.transports);
      return { success: dimension > 0, dimension };
    },
  },
  controls: {
    exhaustive_higher_order_remainder: exhaustiveHigherOrderRemainder,
    representation_audit: representationAudit,
  },
  classifiers: {
    reversal_status: ({ evidence, manifest }) => {
      const failed = evidence.filter((item) => !item.match).map((item) => item.metric);
      return failed.length
        ? { status: "reversal_triggered", failedMetrics: failed, conditions: manifest.reversalConditions }
        : { status: "not_triggered", failedMetrics: [], conditions: manifest.reversalConditions,
          scope: "Finite linear-algebra result reproduced; objecthood and physical relevance remain unestablished." };
    },
  },
};

export default factorizationInvariantsPlugin;
