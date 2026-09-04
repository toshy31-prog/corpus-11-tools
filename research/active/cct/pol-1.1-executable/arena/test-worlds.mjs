import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateWorlds } from "./validate-worlds.mjs";
import { executeCampaign } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./worlds.json", import.meta.url)));

test("worlds are matched, bounded and predeclared", () => assert.deepEqual(validateWorlds(spec), []));

test("removing a competitor plan or overspending is rejected", () => {
  const mutated = structuredClone(spec);
  delete mutated.worlds[0].plans["CCT-POL-1.1"];
  mutated.worlds[1].plans["central-emergency-administration"].push("price_cap");
  assert.deepEqual(validateWorlds(mutated).sort(), [
    "budget:economic-reconcentration.central-emergency-administration:4",
    "missing:climate-shock-margin.CCT-POL-1.1.plan"
  ]);
});

test("internal execution produces vectors, not a global winner", () => {
  const report = executeCampaign(spec);
  assert.equal(report.promotion_forbidden, true);
  assert.equal(report.results.length, 4);
  for (const world of report.results) assert.equal(world.results.length, 3);
});
