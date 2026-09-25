import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

test("V2.4 expose les lentilles canoniques de scout.js au lieu de dupliquer une liste métier", () => {
  assert.match(app, /\bLENSES,\n\s+artistCollaborationProfile/);
  assert.match(app, /for \(const lens of LENSES\)/);
  assert.match(app, /input\.dataset\.sourceLens = lens\.id/);
  assert.match(html, /id="source-character-lenses"/);
});

test("V2.4 branche temperature et lenses sur currentFilters existant", () => {
  const begin = app.indexOf("function currentFilters()");
  const end = app.indexOf("function buildRanked(", begin);
  const body = app.slice(begin, end);
  assert.match(body, /currentSourceCharacter\(\)/);
  assert.match(body, /temperature: character\.temperature/);
  assert.match(body, /lenses: character\.lenses/);
  assert.doesNotMatch(body, /mission\.temperature/);
  assert.doesNotMatch(body, /mission\.lenses/);
});

test("V2.4 conserve les quatre missions comme presets et permet un état custom local", () => {
  assert.match(app, /function applyMission\(name, button\)/);
  assert.match(app, /sourceCharacterState = \{ preset: name, lenses: \[\.\.\.mission\.lenses\], temperature: mission\.temperature \}/);
  assert.match(app, /function setSourceCharacterFromUi\(\)/);
  assert.match(app, /const preset = matchingSourcePreset\(next\)/);
  assert.match(html, /data-mission="fresh"/);
  assert.match(html, /data-mission="network"/);
  assert.match(html, /data-mission="archive"/);
  assert.match(html, /data-mission="surprise"/);
});

test("V2.4 dit explicitement que SOURCE CHARACTER ne pilote pas le mix courant", () => {
  assert.match(html, /ne changent pas votre recherche en cours/);
  assert.match(html, /id="source-temperature" type="range" min="0" max="100" step="1"/);
  assert.match(css, /SYNTH V2\.4 — source character \/ motion/);
});

test("V2.4 ne remplace ni rankVideos ni composeProgramme", () => {
  assert.match(app, /rankVideos\(usableLibrary, filters, context\)/);
  assert.match(app, /let programme = composeProgramme\(currentRanked\.slice\(0, 4\)\)/);
  assert.match(app, /rankFreshDepartures\(/);
  assert.doesNotMatch(app, /function rankSourceCharacter/);
});
