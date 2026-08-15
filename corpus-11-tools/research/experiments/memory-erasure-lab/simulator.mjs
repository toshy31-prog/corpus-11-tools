const EDGE_KEY = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

export function createTopology(type = "tree", size = 8) {
  if (!Number.isInteger(size) || size < 2 || size > 20) {
    throw new Error("La taille doit être un entier entre 2 et 20.");
  }

  const pairs = new Map();
  const add = (a, b) => {
    if (a !== b) pairs.set(EDGE_KEY(a, b), [Math.min(a, b), Math.max(a, b)]);
  };

  if (type === "line" || type === "ring" || type === "mesh") {
    for (let index = 0; index < size - 1; index += 1) add(index, index + 1);
  }
  if (type === "ring" || type === "mesh") add(0, size - 1);
  if (type === "star") {
    for (let index = 1; index < size; index += 1) add(0, index);
  }
  if (type === "tree") {
    for (let index = 1; index < size; index += 1) add(Math.floor((index - 1) / 2), index);
  }
  if (type === "mesh") {
    for (let index = 0; index < size; index += 1) add(index, (index + 2) % size);
  }
  if (!['line', 'ring', 'star', 'tree', 'mesh'].includes(type)) {
    throw new Error(`Architecture inconnue : ${type}`);
  }

  return {
    type,
    size,
    nodes: Array.from({ length: size }, (_, id) => ({ id, bit: 0, online: true })),
    edges: [...pairs.entries()].map(([id, [a, b]]) => ({ id, a, b, online: true })),
  };
}

export function createExperiment(options = {}) {
  const topology = createTopology(options.topology ?? "tree", options.size ?? 8);
  const last = topology.size - 1;
  return {
    ...topology,
    writePort: boundedPort(options.writePort ?? 0, topology.size),
    readPort: boundedPort(options.readPort ?? last, topology.size),
    erasePort: boundedPort(options.erasePort ?? 0, topology.size),
    propagation: options.propagation ?? "synchronous",
    erasure: options.erasure ?? "wave",
    fault: options.fault ?? "edge",
    seed: Number(options.seed ?? 42) >>> 0,
    clock: 0,
    operationCount: 0,
    lastRead: null,
    lastErase: null,
    writeHistory: [],
    events: [],
  };
}

function boundedPort(value, size) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 0 && port < size ? port : 0;
}

function nextRandom(experiment) {
  experiment.seed = (1664525 * experiment.seed + 1013904223) >>> 0;
  return experiment.seed / 4294967296;
}

function log(experiment, type, detail) {
  experiment.clock += 1;
  experiment.events.unshift({ step: experiment.clock, type, detail });
  experiment.events = experiment.events.slice(0, 80);
}

export function activeNeighbors(experiment, nodeId) {
  if (!experiment.nodes[nodeId]?.online) return [];
  const result = [];
  for (const edge of experiment.edges) {
    if (!edge.online) continue;
    if (edge.a === nodeId && experiment.nodes[edge.b].online) result.push(edge.b);
    if (edge.b === nodeId && experiment.nodes[edge.a].online) result.push(edge.a);
  }
  return result.sort((a, b) => a - b);
}

export function writeBit(experiment, bit = 1) {
  const node = experiment.nodes[experiment.writePort];
  if (!node.online) return { changed: false, reason: "port-hors-ligne" };
  const changed = node.bit !== bit;
  node.bit = bit;
  if (changed) experiment.writeHistory.push(node.id);
  experiment.operationCount += 1;
  log(experiment, "écriture", `bit ${bit} écrit sur M${node.id}`);
  return { changed, node: node.id };
}

export function diffuseStep(experiment) {
  const boundary = [];
  for (const source of experiment.nodes) {
    if (!source.online || source.bit !== 1) continue;
    for (const target of activeNeighbors(experiment, source.id)) {
      if (experiment.nodes[target].bit === 0) boundary.push([source.id, target]);
    }
  }
  const unique = [...new Map(boundary.map((pair) => [pair.join("-"), pair])).values()];
  if (unique.length === 0) {
    log(experiment, "diffusion", "aucune nouvelle copie possible");
    return { copies: 0, transfers: [] };
  }

  let transfers;
  if (experiment.propagation === "asynchronous") {
    transfers = [unique[Math.floor(nextRandom(experiment) * unique.length)]];
  } else {
    const byTarget = new Map();
    for (const pair of unique) if (!byTarget.has(pair[1])) byTarget.set(pair[1], pair);
    transfers = [...byTarget.values()];
  }

  for (const [, target] of transfers) {
    experiment.nodes[target].bit = 1;
    experiment.writeHistory.push(target);
  }
  experiment.operationCount += transfers.length;
  log(
    experiment,
    "diffusion",
    transfers.map(([source, target]) => `M${source}→M${target}`).join(", "),
  );
  return { copies: transfers.length, transfers };
}

export function diffuseUntilStable(experiment, maxSteps = experiment.size * experiment.size) {
  let steps = 0;
  let copies = 0;
  while (steps < maxSteps) {
    const result = diffuseStep(experiment);
    if (result.copies === 0) break;
    copies += result.copies;
    steps += 1;
  }
  return { steps, copies, stable: steps < maxSteps };
}

export function readBit(experiment) {
  const start = experiment.readPort;
  if (!experiment.nodes[start]?.online) {
    experiment.lastRead = { found: false, cost: 0, distance: null, reason: "port-hors-ligne" };
    log(experiment, "lecture", `M${start} est hors ligne`);
    return experiment.lastRead;
  }

  const distance = Array(experiment.size).fill(-1);
  distance[start] = 0;
  const queue = [start];
  let inspected = 0;
  for (const nodeId of queue) {
    inspected += 1;
    if (experiment.nodes[nodeId].bit === 1) {
      experiment.operationCount += inspected;
      experiment.lastRead = { found: true, node: nodeId, distance: distance[nodeId], cost: inspected };
      log(experiment, "lecture", `bit retrouvé sur M${nodeId} après ${inspected} inspection(s)`);
      return experiment.lastRead;
    }
    for (const neighbor of activeNeighbors(experiment, nodeId)) {
      if (distance[neighbor] === -1) {
        distance[neighbor] = distance[nodeId] + 1;
        queue.push(neighbor);
      }
    }
  }
  experiment.operationCount += inspected;
  experiment.lastRead = { found: false, cost: inspected, distance: null };
  log(experiment, "lecture", `bit introuvable après ${inspected} inspection(s)`);
  return experiment.lastRead;
}

function reachableWithDistances(experiment, start) {
  if (!experiment.nodes[start]?.online) return new Map();
  const distances = new Map([[start, 0]]);
  const queue = [start];
  for (const nodeId of queue) {
    for (const neighbor of activeNeighbors(experiment, nodeId)) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distances.get(nodeId) + 1);
        queue.push(neighbor);
      }
    }
  }
  return distances;
}

export function erase(experiment) {
  let targets = [];
  let depth = 0;

  if (experiment.erasure === "direct") {
    targets = experiment.nodes.filter((node) => node.online && node.bit === 1).map((node) => node.id);
    depth = targets.length ? 1 : 0;
  } else if (experiment.erasure === "reverse") {
    const ordered = [];
    for (const nodeId of [...experiment.writeHistory].reverse()) {
      if (!ordered.includes(nodeId)) ordered.push(nodeId);
    }
    targets = ordered.filter((nodeId) => experiment.nodes[nodeId]?.online && experiment.nodes[nodeId].bit === 1);
    depth = targets.length;
  } else {
    const distances = reachableWithDistances(experiment, experiment.erasePort);
    targets = [...distances.keys()].filter((nodeId) => experiment.nodes[nodeId].bit === 1);
    depth = targets.length ? Math.max(...targets.map((nodeId) => distances.get(nodeId))) + 1 : 0;
  }

  for (const nodeId of targets) experiment.nodes[nodeId].bit = 0;
  experiment.operationCount += targets.length;
  const residual = measure(experiment);
  experiment.lastErase = {
    strategy: experiment.erasure,
    work: targets.length,
    depth,
    residual: residual.totalTraces,
    exact: residual.counterfactualExact,
  };
  log(
    experiment,
    "effacement",
    `${targets.length} remise(s) à zéro, profondeur ${depth}, ${residual.totalTraces} trace(s) restante(s)`,
  );
  return experiment.lastErase;
}

export function toggleNode(experiment, nodeId) {
  const node = experiment.nodes[nodeId];
  if (!node) return false;
  node.online = !node.online;
  log(experiment, "panne", `M${nodeId} ${node.online ? "réactivé" : "mis hors ligne"}`);
  return node.online;
}

export function toggleEdge(experiment, edgeId) {
  const edge = experiment.edges.find((item) => item.id === edgeId);
  if (!edge) return false;
  edge.online = !edge.online;
  log(experiment, "panne", `liaison ${edge.id} ${edge.online ? "rétablie" : "coupée"}`);
  return edge.online;
}

export function injectRandomFault(experiment, kind = experiment.fault) {
  if (kind === "none") {
    log(experiment, "panne", "aucune panne injectée");
    return null;
  }
  if (kind === "node") {
    const candidates = experiment.nodes.filter((node) => node.online && node.id !== experiment.erasePort);
    if (!candidates.length) return null;
    const selected = candidates[Math.floor(nextRandom(experiment) * candidates.length)];
    toggleNode(experiment, selected.id);
    return { kind, id: selected.id };
  }
  const candidates = experiment.edges.filter((edge) => edge.online);
  if (!candidates.length) return null;
  const selected = candidates[Math.floor(nextRandom(experiment) * candidates.length)];
  toggleEdge(experiment, selected.id);
  return { kind: "edge", id: selected.id };
}

export function measure(experiment) {
  const total = experiment.nodes.filter((node) => node.bit === 1).map((node) => node.id);
  const reachable = reachableWithDistances(experiment, experiment.readPort);
  const accessible = total.filter((nodeId) => reachable.has(nodeId) && experiment.nodes[nodeId].online);
  const latent = total.filter((nodeId) => !accessible.includes(nodeId));
  return {
    totalTraces: total.length,
    accessibleTraces: accessible.length,
    latentTraces: latent.length,
    traceNodes: total,
    counterfactualDistance: total.length,
    counterfactualExact: total.length === 0,
    operationCount: experiment.operationCount,
    onlineNodes: experiment.nodes.filter((node) => node.online).length,
    onlineEdges: experiment.edges.filter((edge) => edge.online).length,
  };
}

export function runBatch(options = {}, trials = 100) {
  const rows = [];
  const baseSeed = Number(options.seed ?? 42) >>> 0;
  for (let trial = 0; trial < trials; trial += 1) {
    const experiment = createExperiment({ ...options, seed: (baseSeed + trial * 2654435761) >>> 0 });
    writeBit(experiment);
    diffuseUntilStable(experiment);
    const fault = injectRandomFault(experiment, options.fault ?? "edge");
    const reading = readBit(experiment);
    const erasure = erase(experiment);
    const residual = measure(experiment);
    rows.push({
      trial: trial + 1,
      seed: experiment.seed,
      fault: fault ? `${fault.kind}:${fault.id}` : "none",
      readFound: reading.found,
      readCost: reading.cost,
      eraseWork: erasure.work,
      eraseDepth: erasure.depth,
      residualTraces: residual.totalTraces,
      accessibleTraces: residual.accessibleTraces,
      latentTraces: residual.latentTraces,
      exact: residual.counterfactualExact,
    });
  }
  const mean = (field) => rows.reduce((sum, row) => sum + row[field], 0) / rows.length;
  return {
    options: { ...options, seed: baseSeed },
    trials,
    summary: {
      exactEraseRate: rows.filter((row) => row.exact).length / rows.length,
      readSuccessRate: rows.filter((row) => row.readFound).length / rows.length,
      meanReadCost: mean("readCost"),
      meanEraseWork: mean("eraseWork"),
      meanEraseDepth: mean("eraseDepth"),
      meanResidualTraces: mean("residualTraces"),
    },
    rows,
  };
}

export function exportSnapshot(experiment) {
  return {
    schema: "memory-erasure-lab/v1",
    generatedAt: new Date().toISOString(),
    configuration: {
      topology: experiment.type,
      size: experiment.size,
      writePort: experiment.writePort,
      readPort: experiment.readPort,
      erasePort: experiment.erasePort,
      propagation: experiment.propagation,
      erasure: experiment.erasure,
      fault: experiment.fault,
      seed: experiment.seed,
    },
    nodes: experiment.nodes.map((node) => ({ ...node })),
    edges: experiment.edges.map((edge) => ({ ...edge })),
    measures: measure(experiment),
    lastRead: experiment.lastRead,
    lastErase: experiment.lastErase,
    writeHistory: [...experiment.writeHistory],
    events: [...experiment.events].reverse(),
  };
}
