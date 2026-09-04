import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSky } from "./contract.mjs";

const root = new URL(".", import.meta.url);
const sky = JSON.parse(readFileSync(new URL("./cct-sky.json", root)));

test("the sky architecture preserves local continuity and remains only a written candidate", () => {
  assert.deepEqual(validateSky(sky), []);
  assert.equal(sky.not_established.includes("deployment"), true);
});

test("a mobile unit is rejected if it becomes a dependency or conditions survival", () => {
  const mutated = structuredClone(sky);
  mutated.non_negotiable.vector_is_not_the_only_vital_channel = false;
  mutated.non_negotiable.leaves_local_capacity_behind = false;
  mutated.non_negotiable.no_vital_access_conditioned_on_ideology_data_or_publicity = false;
  mutated.non_negotiable.departure_does_not_destroy_continuity = false;
  assert.deepEqual(validateSky(mutated).sort(), [
    "missing:non_negotiable.departure_does_not_destroy_continuity",
    "missing:non_negotiable.leaves_local_capacity_behind",
    "missing:non_negotiable.no_vital_access_conditioned_on_ideology_data_or_publicity",
    "missing:non_negotiable.vector_is_not_the_only_vital_channel"
  ]);
});
