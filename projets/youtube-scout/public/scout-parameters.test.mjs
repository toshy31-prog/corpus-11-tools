import test from "node:test";
import assert from "node:assert/strict";

import {
  SCOUT_DIRECTIONS,
  SCOUT_PARAMETER_REGISTRY,
  createScoutPatch,
  scoutParameterValue,
  setScoutParameter
} from "./scout-parameters.mjs";

test("registre exactement les huit directions existantes du Scout", () => {
  assert.deepEqual(
    SCOUT_DIRECTIONS.map(({ id }) => id),
    [
      "label",
      "remix",
      "featuring",
      "compilation",
      "alias",
      "curator",
      "scene",
      "era"
    ]
  );

  assert.equal(SCOUT_PARAMETER_REGISTRY.length, 17);
  assert.ok(SCOUT_PARAMETER_REGISTRY.every(p => p.evidenceAuthority === false));
});

test("le patch neutre conserve toutes les directions à pleine puissance", () => {
  const patch = createScoutPatch();

  for (const { id } of SCOUT_DIRECTIONS) {
    assert.equal(patch.directionWeights[id], 1);
  }
});

test("les poids sont bornés sans inventer d'autres paramètres", () => {
  const patch = createScoutPatch({
    directionWeights: {
      label: 7,
      curator: -2,
      era: 0.35,
      faux: 0.9
    }
  });

  assert.equal(patch.directionWeights.label, 1);
  assert.equal(patch.directionWeights.curator, 0);
  assert.equal(patch.directionWeights.era, 0.35);
  assert.equal("faux" in patch.directionWeights, false);
});

test("un paramètre peut être réglé indépendamment", () => {
  const patch = setScoutParameter(
    createScoutPatch(),
    "direction.curator.weight",
    0.42
  );

  assert.equal(
    scoutParameterValue(
      patch,
      "direction.curator.weight"
    ),
    0.42
  );

  assert.equal(patch.directionWeights.label, 1);
});

test("un faux paramètre est refusé", () => {
  assert.throws(
    () =>
      setScoutParameter(
        createScoutPatch(),
        "truth.musicbrainz.confidence",
        0.2
      ),
    /Paramètre Scout inconnu/
  );
});


test("shape.depth et shape.spread sont des paramètres réels et bornés", () => {
  let patch=setScoutParameter(createScoutPatch(),"shape.depth",8); patch=setScoutParameter(patch,"shape.spread",0.35);
  assert.equal(patch.shape.depth,9); assert.equal(patch.shape.spread,0.35); assert.equal(scoutParameterValue(patch,"shape.depth"),9); assert.equal(scoutParameterValue(patch,"shape.spread"),0.35);
});

test("un patch V1 migre sans perdre les gains de routes", () => { const patch=createScoutPatch({schemaVersion:1,directionWeights:{label:0.4}}); assert.equal(patch.schemaVersion,2); assert.equal(patch.directionWeights.label,0.4); assert.deepEqual(patch.shape,{depth:6,spread:1}); });
