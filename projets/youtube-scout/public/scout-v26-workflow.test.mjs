import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const workspace = await readFile(new URL("./workspace.mjs", import.meta.url), "utf8");
const mixer = await readFile(new URL("./scout-mixer-panel.mjs", import.meta.url), "utf8");
const workspaceCss = await readFile(new URL("./workspace.css", import.meta.url), "utf8");
const mixerCss = await readFile(new URL("./scout-mixer-panel.css", import.meta.url), "utf8");

test("V2.6 rend le départ précédent visible dans le rack via l'action existante", () => {
  assert.match(app, /async function returnToPreviousDeparture\(\)/);
  assert.match(app, /previousDeparture: previous/);
  assert.match(app, /journeyTrail: journeySeeds\.slice\(-4\)/);
  assert.match(app, /onBack: returnToPreviousDeparture/);
  assert.match(mixer, /mix-source-back/);
  assert.match(mixer, /view\.previousDeparture/);
  assert.match(mixerCss, /\.mix-source-back/);
  assert.match(mixerCss, /\.mix-source-trail/);
});

test("le retour conserve le choix précédent mais pas son ancien graphe", () => {
  assert.match(app, /navigationStack: seedChanged && activeDig\.seed/);
  assert.match(app, /navigationStack: seedChanged.*\{ seed: activeDig\.seed \}/);
  const back = app.slice(app.indexOf("async function returnToPreviousDeparture"), app.indexOf("function render", app.indexOf("async function returnToPreviousDeparture")));
  assert.match(back, /openExploration\(\{ seed: prior.seed, configure: true \}\)/);
  assert.doesNotMatch(back, /\.\.\.prior|prior\.front|prior\.catalogueGroups/);
  assert.doesNotMatch(app, /journeyHistoryStore/);
});

test("la sélection directe précède les suggestions facultatives et repliées", () => {
  assert.match(workspace, /suggestionPicker\.open = false/);
  assert.match(workspace, /pickerMode = mode/);
  assert.match(workspace, /legacyPickerControls\.hidden = true/);
  assert.doesNotMatch(workspace, /Directions au démarrage/);
  assert.match(workspaceCss, /\.seed-dialog #suggestion-picker/);
  assert.match(workspaceCss, /\.seed-direct-title/);
});

test("V2.6 limite la liste au repos et l'élargit seulement avec une intention explicite", () => {
  assert.match(workspace, /choiceLimit = 8/);
  assert.match(workspace, /value\.trim\(\) \? 24 : 8/);
  assert.match(workspace, /choiceLimit \+= 12/);
  assert.match(workspace, /Math\.min\(12, remaining\)/);
});

test("V2.6 reste une couche workflow sans nouveau moteur de découverte", () => {
  assert.doesNotMatch(workspace, /rankVideos/);
  assert.doesNotMatch(workspace, /selectDiscoveries/);
  assert.doesNotMatch(mixer, /fetch\(/);
});
