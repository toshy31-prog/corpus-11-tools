import assert from "node:assert/strict";
import test from "node:test";
import { createEngine } from "../core/engine.mjs";

function fixturePlugin() {
  return {
    manifest: { id: "fixture", version: "1", title: "Fixture",
      observer: { allowedOperations: ["inspect"], maxSteps: 1, successThreshold: 1 },
      reversalConditions: ["fixture mismatch"] },
    createState: () => ({ value: 0 }),
    operations: { increment: ({ state, input }) => { state.value += input.by ?? 1; return state.value; } },
    perturbations: {},
    observers: {
      inspect: ({ state }) => state.value,
      try_mutation: ({ state }) => { state.value = 999; return state.value; },
      sample: ({ random }) => random.next(),
    },
    criteria: {}, controls: {}, classifiers: {},
  };
}

test("core executes opaque plugin state and journals mutations", () => {
  const engine = createEngine(fixturePlugin(), { seed: 12 });
  assert.equal(engine.operate("increment", { by: 3 }), 3);
  assert.equal(engine.observe("inspect"), 3);
  assert.equal(engine.snapshot().journal[0].mutated, true);
  assert.equal(engine.snapshot().journal[1].mutated, false);
});

test("observer receives an isolated state and random stream", () => {
  const engine = createEngine(fixturePlugin(), { seed: 12 });
  const before = engine.snapshot().randomState;
  assert.equal(engine.observe("try_mutation"), 999);
  engine.observe("sample");
  assert.equal(engine.observe("inspect"), 0);
  assert.equal(engine.snapshot().randomState, before);
});

test("contract rejects an implicit observer class", () => {
  const plugin = fixturePlugin();
  delete plugin.manifest.observer;
  assert.throws(() => createEngine(plugin), /manifest\.observer\.allowedOperations/);
});

test("an experiment can narrow or replace the default observer class", () => {
  const observer = { allowedOperations: ["inspect"], maxSteps: 0, successThreshold: 0.75 };
  const engine = createEngine(fixturePlugin(), { observer });
  assert.deepEqual(engine.snapshot().plugin.observer, observer);
});

test("contract requires a reversal condition", () => {
  const plugin = fixturePlugin();
  delete plugin.manifest.reversalConditions;
  assert.throws(() => createEngine(plugin), /reversalConditions/);
});

test("unknown handlers fail closed", () => {
  const engine = createEngine(fixturePlugin());
  assert.throws(() => engine.operate("missing"), /Unknown operations handler/);
});
