import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  relationBetweenNames,
  RELATIONS
} from "../lib/evidence-algebra.mjs";

test("track-resolution n'embarque plus ses helpers de variante locaux", () => {
  const source = fs.readFileSync(
    new URL("../lib/track-resolution.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(source.includes("function probableCreditVariant"), false);
  assert.equal(source.includes("function sameLooseName"), false);
  assert.equal(source.includes("relationBetweenNames("), true);
});

test("relations orthographiques de référence", () => {
  for (const [a, b] of [
    ["PØLI", "POLI"],
    ["Aemris", "Æmris"]
  ]) {
    assert.equal(
      relationBetweenNames(a, b),
      RELATIONS.ORTHOGRAPHIC_VARIANT
    );
  }
});

test("variantes de crédit de référence", () => {
  for (const [a, b] of [
    ["Detroit Experiment", "The Detroit Experiment"],
    ["Dj Dee Nasty", "Dee Nasty"],
    ["Lucci", "Lucci (Click Clack Gang)"],
    ["Earwax (IT)", "Earwax"]
  ]) {
    assert.equal(
      relationBetweenNames(a, b),
      RELATIONS.CREDIT_VARIANT
    );
  }
});

test("concurrents de référence", () => {
  for (const [a, b] of [
    ["DA", "DA Uzi"],
    ["Ken Hayakawa", "Kei Hayakawa"],
    ["Mirwais", "David Gravell"],
    ["Kaiser (Italy)", "Kaiser (K S R)"]
  ]) {
    assert.equal(
      relationBetweenNames(a, b),
      RELATIONS.COMPETING_IDENTITY
    );
  }
});
