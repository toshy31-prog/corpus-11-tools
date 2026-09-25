import test from "node:test";
import assert from "node:assert/strict";
import { buildQuickPreset } from "./presets.mjs";

test("le préréglage oblique repart d’un catalogue large", () => {
  assert.deepEqual(buildQuickPreset("oblique", 2026), {
    minYear: "1900",
    maxYear: "2026",
    effect: "open",
    timeBudget: "ample",
    detour: "adventurous",
    genres: [],
    wish: "",
    lenses: ["oblique"]
  });
});

test("le préréglage surprise ne conserve aucun filtre avancé", () => {
  const preset = buildQuickPreset("surprise", 2026);
  assert.deepEqual(preset.genres, []);
  assert.deepEqual(preset.lenses, []);
  assert.equal(preset.minYear, "1900");
  assert.equal(preset.maxYear, "2026");
  assert.equal(preset.effect, "open");
  assert.equal(preset.timeBudget, "ample");
  assert.equal(preset.wish, "Surprends-moi");
});

test("refuse un préréglage inconnu", () => {
  assert.throws(() => buildQuickPreset("inconnu", 2026), /Préréglage inconnu/);
});
