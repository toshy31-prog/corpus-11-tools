import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildScoutMixView } from "./scout-mix-session.mjs";

const panel = await readFile(new URL("./scout-mixer-panel.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("./scout-mixer-panel.css", import.meta.url), "utf8");

const select = items => items;
const item = id => ({ id, title: id, artist: "Artist" });

function viewFor(groups) {
  return buildScoutMixView({ seedId: "seed", groups, limit: 6, select });
}

test("V2.2 distingue ouvrir, approfondir et réessayer sans changer l'action DIG", () => {
  const view = viewFor({
    label: { items: [], coverage: { state: "not_checked" } },
    remix: { items: [item("r1")], coverage: { state: "partial", hasMore: true } },
    featuring: { items: [], error: "provider down", coverage: { state: "partial" } },
    compilation: { items: [], coverage: { state: "complete", complete: true, hasMore: false } }
  });
  const by = Object.fromEntries(view.routes.map(route => [route.id, route]));
  assert.equal(by.label.canLoad, true);
  assert.equal(by.label.loadKind, "open");
  assert.equal(by.remix.canLoad, true);
  assert.equal(by.remix.loadKind, "continue");
  assert.equal(by.featuring.canLoad, true);
  assert.equal(by.featuring.loadKind, "retry");
  assert.equal(by.compilation.canLoad, false);
  assert.equal(by.compilation.loadKind, null);
});

test("V2.2 route meter expose bien loaded, eligible et presented séparément", () => {
  const view = viewFor({ label: { items: [item("a"), item("b")], coverage: { state: "partial" } } });
  const route = view.routes.find(value => value.id === "label");
  assert.equal(route.loaded, 2);
  assert.equal(route.eligible, 2);
  assert.equal(route.presented, 2);
});

test("sépare la pagination locale et la prochaine recherche avec une distance explicite", () => {
  assert.match(panel, /mix-transport-local/);
  assert.match(panel, /mix-transport-expand/);
  assert.match(panel, /DISTANCE DU PARCOURS/);
  assert.match(panel, /La prochaine recherche pourra suivre jusqu’à/);
  assert.match(panel, /loadKind===\"open\"/);
  assert.match(panel, /loadKind===\"continue\"/);
  assert.match(panel, /loadKind===\"retry\"/);
  assert.match(panel, /actionButton\("dig","Rechercher des pistes",onDig,expandTransport\)/);
});

test("V2.2 signale les sorties visuellement identiques sans fusion d'identité", () => {
  assert.match(panel, /mix-output-collision/);
  assert.match(panel, /CANDIDATS DISTINCTS/);
  assert.match(panel, /MÊME VIDÉO · CANDIDATS DISTINCTS/);
  assert.doesNotMatch(panel, /same title.*merge/i);
  assert.match(css, /SYNTH V2\.2 — transport, route meters and collision visibility/);
});
