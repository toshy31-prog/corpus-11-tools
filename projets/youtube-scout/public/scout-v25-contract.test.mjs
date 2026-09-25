import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const mixer = await readFile(new URL("./scout-mixer-panel.mjs", import.meta.url), "utf8");
const dial = await readFile(new URL("./scout-dial.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");
const libraryState = await readFile(new URL("./library-state.mjs", import.meta.url), "utf8");

test("V2.5 persiste SOURCE CHARACTER hors de la session DIG avec schéma versionné", () => {
  assert.match(app, /SOURCE_CHARACTER_KEY = "youtube-scout\.source-character\.v1"/);
  assert.match(app, /function loadSourceCharacterPatch\(\)/);
  assert.match(app, /function persistSourceCharacterPatch\(\)/);
  assert.match(app, /sourceCharacterState = loadSourceCharacterPatch\(\)/);
  assert.match(app, /localStorage\.setItem\(SOURCE_CHARACTER_KEY/);
  assert.match(libraryState, /"sourceCharacter"/);
});

test("V2.5 sauvegarde et restaure le patch source sans le confondre avec activeDig", () => {
  assert.match(app, /sourceCharacter: SOURCE_CHARACTER_KEY/);
  assert.match(app, /local\.sourceCharacter = currentSourceCharacter\(\)/);
  assert.match(app, /payload\.local\.sourceCharacter/);
  assert.doesNotMatch(app, /activeDig\.sourceCharacter/);
});

test("V2.5 partage le même comportement rotatif entre DIG et TEMPERATURE", () => {
  assert.match(mixer, /enhanceScoutDial/);
  assert.match(app, /enhanceScoutDial\(nodes\.sourceTemperature/);
  assert.match(dial, /pointerdown/);
  assert.match(dial, /pointermove/);
  assert.match(dial, /event\.shiftKey \? 700 : 140/);
  assert.match(dial, /dblclick/);
  assert.match(dial, /wheel/);
  assert.match(dial, /input\.addEventListener\("input"/);
});

test("V2.5 compacte SOURCE sans transformer les lentilles en faux gains continus", () => {
  assert.match(css, /SYNTH V2\.5 — persistent source patch \+ shared rotary control \+ compact source bank/);
  assert.match(css, /source-character-lenses[\s\S]*repeat\(3/);
  assert.match(css, /mission-picker[\s\S]*repeat\(4/);
  assert.doesNotMatch(app, /sourceLens.*weight/i);
});
