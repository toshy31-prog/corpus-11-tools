import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRichScenario, validateRichDocument } from "./interpreter.mjs";

const document = JSON.parse(await readFile(new URL("../kryos-bridges-v1.1.1.frozen.json", import.meta.url), "utf8"));

test("Kryos 1.1.1 validates under rich v3", () => {
  assert.deepEqual(validateRichDocument(document).errors, []);
});

test("a global rule fires once and records its trace", () => {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial();
  trial.world.state.structural_integrity = 19;
  scenario.act({ world: trial.world, action: "bridge_toll", round: 0, exogenous: trial.exogenous });
  assert.deepEqual(trial.world.trace.at(-1).triggeredGlobalRules, ["structural_collapse"]);
  const tradeAfterFirst = trial.world.state.trade_volume;
  scenario.act({ world: trial.world, action: "bridge_toll", round: 1, exogenous: trial.exogenous });
  assert.equal(trial.world.trace.at(-1).triggeredGlobalRules.includes("structural_collapse"), false);
  assert.equal(trial.world.state.trade_volume, tradeAfterFirst - 5);
});

test("round-specific cascade cannot fire before round eight", () => {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial();
  trial.world.state.structural_integrity = 49;
  scenario.act({ world: trial.world, action: "bridge_toll", round: 0, exogenous: trial.exogenous });
  assert.equal(trial.world.state.cascading_failure_triggered, 0);
  scenario.act({ world: trial.world, action: "bridge_toll", round: 7, exogenous: trial.exogenous });
  assert.equal(trial.world.state.cascading_failure_triggered, 1);
});

test("invalid or visible global flags are rejected", () => {
  const mutated = structuredClone(document);
  mutated.view.hidden = mutated.view.hidden.filter((name) => name !== "ecosystem_collapse_triggered");
  const result = validateRichDocument(mutated);
  assert.match(result.errors.join("\n"), /flag must be hidden/);
});
