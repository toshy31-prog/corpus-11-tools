import test from "node:test";
import assert from "node:assert/strict";

import {
  relationBetweenNames,
  RELATIONS
} from "../lib/evidence-algebra.mjs";

const creditVariants = [
  ["Detroit Experiment", "The Detroit Experiment"],
  ["Dj Dee Nasty", "Dee Nasty"],
  ["Lucci", "Lucci (Click Clack Gang)"],
  ["Earwax (IT)", "Earwax"]
];

for (const [a, b] of creditVariants) {
  test(`algèbre centrale : ${a} ↔ ${b} reste une variante de crédit`, () => {
    assert.equal(
      relationBetweenNames(a, b),
      RELATIONS.CREDIT_VARIANT
    );
  });
}

const orthographicVariants = [
  ["Aemris", "Æmris"],
  ["PØLI", "POLI"]
];

for (const [a, b] of orthographicVariants) {
  test(`algèbre centrale : ${a} ↔ ${b} reste orthographique`, () => {
    assert.equal(
      relationBetweenNames(a, b),
      RELATIONS.ORTHOGRAPHIC_VARIANT
    );
  });
}

test("DA et DA Uzi restent concurrents", () => {
  assert.equal(
    relationBetweenNames("DA", "DA Uzi"),
    RELATIONS.COMPETING_IDENTITY
  );
});

test("Ken et Kei Hayakawa restent concurrents", () => {
  assert.equal(
    relationBetweenNames("Ken Hayakawa", "Kei Hayakawa"),
    RELATIONS.COMPETING_IDENTITY
  );
});
