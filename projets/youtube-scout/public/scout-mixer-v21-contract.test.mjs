import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panel = await readFile(new URL("./scout-mixer-panel.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("./scout-mixer-panel.css", import.meta.url), "utf8");
const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

test("V2.1 place le rack avant les inspecteurs sans dupliquer les briques historiques", () => {
  assert.match(panel, /scout-source-inspector/);
  assert.match(panel, /sourceInspector\.append\(sourceSummary\)/);
  assert.match(panel, /\[activeSeed,sessionActions,lineage\]/);
  assert.match(panel, /nextStep\.append\(seedAction\)/);
  assert.doesNotMatch(panel, /scout-route-inspector|direction-panel/);
});

test("V2.1 garde les gestes locaux séparés du DIG réseau", () => {
  assert.match(panel, /Autres pistes chargées/);
  assert.match(panel, /actionButton\("dig","Rechercher des pistes",onDig,expandTransport\)/);
  assert.match(panel, /view\.routes\.filter\(r=>r\.canLoad\)/);
  assert.doesNotMatch(panel, /DIG · .*à charger/);
});

test("V2.1 rend la sortie compacte tout en réutilisant le renderer existant", () => {
  assert.match(panel, /const card=renderCard\(original,route\)/);
  assert.match(panel, /card\.classList\.add\("mix-output-card"\)/);
  assert.match(css, /SYNTH V2\.1 — instrument-first layout/);
  assert.match(css, /\.mix-output-card/);
});

test("le range reste présent pour le clavier même quand le slider visuel disparaît", () => {
  assert.match(panel, /input\.type="range"/);
  assert.match(css, /input\[type=range\]:focus-visible/);
});

test("le moniteur source lit l'état de guidance déjà rendu", () => {
  const begin = app.indexOf("function renderActiveSeed()");
  const end = app.indexOf("function currentJourneyGuidance()", begin);
  const body = app.slice(begin, end);
  assert.ok(body.indexOf("renderSeedGuidance();") >= 0);
  assert.ok(body.indexOf("renderSeedGuidance();") < body.indexOf("renderScoutMixerPanel()"));
});
