import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panel = await readFile(new URL("./scout-mixer-panel.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("./scout-mixer-panel.css", import.meta.url), "utf8");

test("l’action de catalogue est explicite et distincte de la pagination locale", () => {
  assert.match(panel, /const digPlan=make\("small","mix-dig-plan"\)/);
  assert.match(panel, /dig\.textContent=view\.busy\?"Recherche en cours…"/);
  assert.match(panel, /Autres pistes chargées/);
  assert.match(panel, /digPlan\.textContent=/);
  assert.match(panel, /à ouvrir/);
  assert.match(panel, /à poursuivre/);
  assert.match(panel, /à réessayer/);
});

test("V2.3 sépare visuellement état de route et meter IN OUT", () => {
  assert.match(panel, /mix-route-status/);
  assert.match(panel, /mix-route-meter/);
  assert.match(panel, /k\.stateLabel\.textContent=/);
  assert.match(panel, /k\.meter\.textContent=/);
  assert.match(panel, /chargées ·/);
  assert.match(panel, /masquées par le filtre/);
  assert.match(panel, /encore à parcourir/);
});

test("V2.3 reste une couche de présentation", () => {
  assert.match(css, /SYNTH V2\.3 — compact transport wording and route meter clarity/);
  assert.doesNotMatch(panel, /fetch\(/);
  assert.doesNotMatch(panel, /same_identity/);
  assert.doesNotMatch(panel, /confidence/);
});
