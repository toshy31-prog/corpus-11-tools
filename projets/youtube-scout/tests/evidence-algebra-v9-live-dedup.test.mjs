import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  namesAreNonCompeting
} from "../lib/evidence-algebra.mjs";

test(
  "le live engine ne maintient plus nonCompetingVariants",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../scripts/live-track-resolution-engine.mjs",
          import.meta.url
        ),
        "utf8"
      );

    assert.equal(
      source.includes(
        "const nonCompetingVariants"
      ),
      false
    );

    assert.equal(
      source.includes(
        "namesAreNonCompeting("
      ),
      true
    );

    assert.equal(
      source.includes(
        "function searchArtistVariantsFromProjection("
      ),
      true
    );
  }
);

test(
  "variantes validées restent non concurrentes",
  () => {
    for (const [a, b] of [
      ["PØLI", "POLI"],
      ["Aemris", "Æmris"],
      ["Detroit Experiment", "The Detroit Experiment"],
      ["Dj Dee Nasty", "Dee Nasty"],
      ["Lucci", "Lucci (Click Clack Gang)"],
      ["Earwax (IT)", "Earwax"]
    ]) {
      assert.equal(
        namesAreNonCompeting(a, b),
        true,
        `${a} / ${b}`
      );
    }
  }
);

test(
  "concurrents validés restent concurrents",
  () => {
    for (const [a, b] of [
      ["DA", "DA Uzi"],
      ["Ken Hayakawa", "Kei Hayakawa"],
      ["Mirwais", "David Gravell"],
      ["Kaiser (Italy)", "Kaiser (K S R)"]
    ]) {
      assert.equal(
        namesAreNonCompeting(a, b),
        false,
        `${a} / ${b}`
      );
    }
  }
);
