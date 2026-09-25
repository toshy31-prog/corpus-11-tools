import test from "node:test";
import assert from "node:assert/strict";
import { guessArtist } from "../lib/scout.mjs";

test("une simple chaîne classée Musique reste une hypothèse faible", () => {
  const result = guessArtist({
    title: "Prototype",
    channelTitle: "Space Travel",
    categoryId: "10"
  });

  assert.equal(result?.name, "Space Travel");
  assert.equal(result?.confidence, 0.55);
  assert.equal(result?.basis, "chaîne classée Musique");
  assert.ok(result.confidence < 0.8);
});

test("une chaîne Topic reste une identité exploitable pour l'exploration", () => {
  const result = guessArtist({
    title: "Black Noise",
    channelTitle: "Kosh - Topic",
    categoryId: "10"
  });

  assert.equal(result?.name, "Kosh");
  assert.equal(result?.confidence, 0.96);
  assert.ok(result.confidence >= 0.8);
});

test("une simple syntaxe Artist - Title reste une hypothèse non corroborée", () => {
  const result = guessArtist({
    title: "Art Of Tones - Violation",
    channelTitle: "Curator",
    categoryId: "10"
  });

  assert.equal(result?.name, "Art Of Tones");
  assert.equal(result?.confidence, 0.72);
  assert.equal(result?.basis, "syntaxe de titre non corroborée");
  assert.ok(result.confidence < 0.8);
});

test("les titres éditorialisés ne deviennent pas des artistes exploitables du picker", () => {
  for (const title of [
    "\"Prototype\" - Nexxor - Statik Travel 21",
    "\"Space Travel\" - Nexxor - Statik Travel 21",
    "\"Time Travel\" - Nexxor - Statik Travel 21",
    "[DDM002] Hypnoise Theory - Dystopia",
    "[Analogic Density 06] Geotropism - Salamandar"
  ]) {
    const result = guessArtist({
      title,
      channelTitle: "",
      categoryId: "10"
    });

    assert.ok(result);
    assert.ok(result.confidence < 0.8, `${title} ne doit pas devenir une seed artiste forte`);
  }
});
