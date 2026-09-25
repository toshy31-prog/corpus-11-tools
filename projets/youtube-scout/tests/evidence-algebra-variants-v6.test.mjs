import test from "node:test";
import assert from "node:assert/strict";

import {
  relationBetweenNames,
  RELATIONS
} from "../lib/evidence-algebra.mjs";

const cases = [
  [
    "Detroit Experiment",
    "The Detroit Experiment",
    RELATIONS.CREDIT_VARIANT
  ],
  [
    "Dj Dee Nasty",
    "Dee Nasty",
    RELATIONS.CREDIT_VARIANT
  ],
  [
    "Aemris",
    "Æmris",
    RELATIONS.ORTHOGRAPHIC_VARIANT
  ],
  [
    "PØLI",
    "POLI",
    RELATIONS.ORTHOGRAPHIC_VARIANT
  ],
  [
    "Lucci",
    "Lucci (Click Clack Gang)",
    RELATIONS.CREDIT_VARIANT
  ],
  [
    "Earwax (IT)",
    "Earwax",
    RELATIONS.CREDIT_VARIANT
  ]
];

for (const [a, b, expected] of cases) {
  test(`${a} ↔ ${b}`, () => {
    assert.equal(
      relationBetweenNames(a, b),
      expected
    );

    assert.equal(
      relationBetweenNames(b, a),
      expected
    );
  });
}

test(
  "des noms seulement vaguement proches restent concurrents",
  () => {
    assert.equal(
      relationBetweenNames(
        "DA",
        "DA Uzi"
      ),
      RELATIONS.COMPETING_IDENTITY
    );

    assert.equal(
      relationBetweenNames(
        "Ken Hayakawa",
        "Kei Hayakawa"
      ),
      RELATIONS.COMPETING_IDENTITY
    );
  }
);
