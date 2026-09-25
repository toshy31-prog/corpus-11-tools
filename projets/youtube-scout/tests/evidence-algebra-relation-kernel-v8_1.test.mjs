import test from "node:test";
import assert from "node:assert/strict";

import {
  relationBetweenNames,
  namesAreNonCompeting,
  RELATIONS
} from "../lib/evidence-algebra.mjs";

test("Kaiser (Italy) et Kaiser (K S R) restent concurrents", () => {
  assert.equal(
    relationBetweenNames(
      "Kaiser (Italy)",
      "Kaiser (K S R)"
    ),
    RELATIONS.COMPETING_IDENTITY
  );

  assert.equal(
    namesAreNonCompeting(
      "Kaiser (Italy)",
      "Kaiser (K S R)"
    ),
    false
  );
});

test("Earwax (IT) et Earwax restent une variante de crédit", () => {
  assert.equal(
    relationBetweenNames(
      "Earwax (IT)",
      "Earwax"
    ),
    RELATIONS.CREDIT_VARIANT
  );
});

test("Lucci et Lucci (Click Clack Gang) restent une variante de crédit", () => {
  assert.equal(
    relationBetweenNames(
      "Lucci",
      "Lucci (Click Clack Gang)"
    ),
    RELATIONS.CREDIT_VARIANT
  );
});

test("PØLI et POLI restent une variante orthographique", () => {
  assert.equal(
    relationBetweenNames(
      "PØLI",
      "POLI"
    ),
    RELATIONS.ORTHOGRAPHIC_VARIANT
  );
});

test("DA et DA Uzi restent concurrents", () => {
  assert.equal(
    relationBetweenNames(
      "DA",
      "DA Uzi"
    ),
    RELATIONS.COMPETING_IDENTITY
  );
});
