import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const mixer = await readFile(new URL("./scout-mix-session.mjs", import.meta.url), "utf8");
const panel = await readFile(new URL("./scout-mixer-panel.mjs", import.meta.url), "utf8");

test("V2.7 contract: app possède une seule source canonique de profils de départ", () => {
  assert.match(app, /from "\/departure-profile\.mjs"/);
  assert.match(app, /createDepartureProfile\(activeDig\.seed/);
  assert.match(app, /departureCoverage\(seed, \{ graph: explorationGraph \}\)/);
});

test("V2.7 contract: le mixer reçoit des plans mais ne gagne aucune autorité de preuve", () => {
  assert.match(mixer, /routePlans = \{\}/);
  assert.match(mixer, /const plan = routePlans\?\.\[id\] \|\| null/);
  assert.doesNotMatch(mixer, /confirmed_user|confirmed_cross_id|corroborated/);
  assert.doesNotMatch(mixer, /fetch\(/);
});

test("V2.7 contract: le rack expose le mode de départ et des états honnêtes", () => {
  assert.match(panel, /mix-source-mode/);
  assert.match(panel, /"n\/a":"Non applicable à ce départ"/);
  assert.match(panel, /unsupported:"Source manquante pour ce départ"/);
  assert.match(panel, /mediated:"Recherche via les crédits"/);
});
