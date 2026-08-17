import test from "node:test";
import assert from "node:assert/strict";

import {
  createExperiment,
  createTopology,
  diffuseUntilStable,
  erase,
  injectRandomFault,
  measure,
  readBit,
  runBatch,
  toggleNode,
  writeBit,
} from "./simulator.mjs";

test("les architectures produisent les nombres de liaisons attendus", () => {
  assert.equal(createTopology("line", 8).edges.length, 7);
  assert.equal(createTopology("ring", 8).edges.length, 8);
  assert.equal(createTopology("star", 8).edges.length, 7);
  assert.equal(createTopology("tree", 8).edges.length, 7);
  assert.equal(createTopology("mesh", 8).edges.length, 16);
});

test("la diffusion synchrone remplit une ligne connectée", () => {
  const experiment = createExperiment({ topology: "line", size: 5 });
  writeBit(experiment);
  const result = diffuseUntilStable(experiment);
  assert.equal(result.stable, true);
  assert.deepEqual(experiment.nodes.map((node) => node.bit), [1, 1, 1, 1, 1]);
});

test("le coût de lecture inclut le chemin jusqu'à la trace", () => {
  const experiment = createExperiment({ topology: "line", size: 5, writePort: 0, readPort: 4 });
  writeBit(experiment);
  const result = readBit(experiment);
  assert.equal(result.found, true);
  assert.equal(result.distance, 4);
  assert.equal(result.cost, 5);
});

test("une mémoire hors ligne conserve une trace latente après effacement", () => {
  const experiment = createExperiment({ topology: "line", size: 5, erasePort: 0, readPort: 0 });
  writeBit(experiment);
  diffuseUntilStable(experiment);
  toggleNode(experiment, 4);
  const result = erase(experiment);
  assert.equal(result.exact, false);
  assert.equal(measure(experiment).latentTraces, 1);
});

test("une panne aléatoire est reproductible à graine fixée", () => {
  const first = createExperiment({ topology: "ring", size: 8, seed: 123, fault: "edge" });
  const second = createExperiment({ topology: "ring", size: 8, seed: 123, fault: "edge" });
  assert.deepEqual(injectRandomFault(first), injectRandomFault(second));
});

test("l'effacement inverse suit l'historique réel des copies", () => {
  const experiment = createExperiment({ topology: "line", size: 5, erasure: "reverse" });
  writeBit(experiment);
  diffuseUntilStable(experiment);
  const result = erase(experiment);
  assert.equal(result.work, 5);
  assert.equal(result.depth, 5);
  assert.equal(result.exact, true);
});

test("une campagne répétée est strictement reproductible", () => {
  const options = { topology: "tree", size: 8, seed: 99, fault: "edge", erasure: "wave" };
  assert.deepEqual(runBatch(options, 20), runBatch(options, 20));
});
