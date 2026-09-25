import test from "node:test";
import assert from "node:assert/strict";
import { createSourceCharacterPatch, sourceCharacterPresetMatch } from "./source-character-patch.mjs";

const lensIds = ["forgotten", "deep-cut", "crossroads", "off-center", "wildcard", "fresh", "network"];
const presets = {
  fresh: { lenses: ["fresh"], temperature: 0 },
  network: { lenses: ["network", "crossroads"], temperature: 20 },
  archive: { lenses: ["forgotten", "deep-cut"], temperature: 15 },
  surprise: { lenses: ["off-center", "wildcard"], temperature: 100 }
};

test("le patch source V1 a un défaut ARCHIVE versionné", () => {
  assert.deepEqual(createSourceCharacterPatch({}, { lensIds, presets }), {
    schemaVersion: 1,
    preset: "archive",
    lenses: ["forgotten", "deep-cut"],
    temperature: 15
  });
});

test("un patch custom survit à la normalisation sans faux preset", () => {
  const patch = createSourceCharacterPatch({ schemaVersion: 1, preset: "", lenses: ["off-center", "wildcard"], temperature: 60 }, { lensIds, presets });
  assert.equal(patch.schemaVersion, 1);
  assert.equal(patch.preset, "");
  assert.deepEqual(patch.lenses, ["off-center", "wildcard"]);
  assert.equal(patch.temperature, 60);
});

test("migration legacy mission, filtrage et bornage restent déterministes", () => {
  assert.equal(createSourceCharacterPatch({ mission: "network" }, { lensIds, presets }).preset, "network");
  const custom = createSourceCharacterPatch({ lenses: ["fresh", "fake", "fresh"], temperature: 900 }, { lensIds, presets });
  assert.deepEqual(custom.lenses, ["fresh"]);
  assert.equal(custom.temperature, 100);
  assert.equal(custom.preset, "");
  assert.equal(sourceCharacterPresetMatch({ lenses: ["crossroads", "network"], temperature: 20 }, presets), "network");
});
