import test from "node:test";
import assert from "node:assert/strict";

import {
  runtimeRecordingPlan,
  primaryRuntimeQuery,
  secondaryRuntimeQuery
} from "./recording-resolution-runtime.mjs";

test("la jonction runtime produit une requête sans transformer l'artiste appelant en identité", () => {
  const plan = runtimeRecordingPlan({
    title: "Dot Allison - Substance (Felix da Housecat Remix)",
    artist: "Dot Allison",
    durationSeconds: 360
  });

  const query = primaryRuntimeQuery(plan);

  assert.ok(query);
  assert.ok(query.title);
  assert.ok(query.artist);

  assert.equal(
    Object.prototype.hasOwnProperty.call(query, "externalIds"),
    false
  );
});

test("le fallback artiste runtime reste explicitement une projection de recherche", () => {
  const plan = runtimeRecordingPlan({
    title: "Track Without Reliable Boundary",
    artist: "Known Artist"
  });

  const query = primaryRuntimeQuery(plan);

  assert.ok(query);
  assert.equal(query.artist, "Known Artist");

  if (query.kind === "runtime_known_artist_fallback") {
    assert.deepEqual(
      query.basis,
      ["caller_probable_artist"]
    );
  }
});

test("une seconde hypothèse reste distincte de la première", () => {
  const plan = runtimeRecordingPlan({
    title: "Artist A - Track",
    artist: "Artist B"
  });

  const first = primaryRuntimeQuery(plan);
  const second = secondaryRuntimeQuery(plan, first);

  if (second) {
    assert.notDeepEqual(
      [second.artist, second.title, second.version],
      [first.artist, first.title, first.version]
    );
  }
});
