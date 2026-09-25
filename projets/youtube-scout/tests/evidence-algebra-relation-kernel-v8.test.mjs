import test from "node:test";
import assert from "node:assert/strict";

import {
  relationBetweenNames,
  namesAreNonCompeting,
  RELATIONS
} from "../lib/evidence-algebra.mjs";

for (const [a, b] of [
  ["PØLI", "POLI"],
  ["Aemris", "Æmris"],
  ["Detroit Experiment", "The Detroit Experiment"],
  ["Dj Dee Nasty", "Dee Nasty"],
  ["Lucci", "Lucci (Click Clack Gang)"],
  ["Earwax (IT)", "Earwax"]
]) {
  test(`${a} / ${b} n'est pas une rivalité`, () => {
    assert.equal(namesAreNonCompeting(a, b), true);
  });
}

for (const [a, b] of [
  ["DA", "DA Uzi"],
  ["Ken Hayakawa", "Kei Hayakawa"],
  ["Mirwais", "David Gravell"],
  ["Kaiser (Italy)", "Kaiser (K S R)"]
]) {
  test(`${a} / ${b} reste concurrent`, () => {
    assert.equal(relationBetweenNames(a, b), RELATIONS.COMPETING_IDENTITY);
    assert.equal(namesAreNonCompeting(a, b), false);
  });
}
