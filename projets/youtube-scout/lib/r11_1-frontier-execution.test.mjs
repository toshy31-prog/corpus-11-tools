import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scheduleDiscoveryFrontiers } from "./discovery-frontier.mjs";

test("R11.1: Spread dispersif ouvre chaque route avant de repaginer la route productive", () => {
  const frontier={byDirection:{
    label:{canExpand:true,firstBranches:12,state:"available"},
    curator:{canExpand:true,firstBranches:1,state:"partial"},
    remix:{canExpand:true,firstBranches:0,state:"stalled"},
    featuring:{canExpand:true,firstBranches:0,state:"stalled"}
  }};
  const plan=scheduleDiscoveryFrontiers(frontier,{spread:1,budget:4,maxPerDirection:3});
  assert.equal(new Set(plan.map(x=>x.direction)).size,4);
});

test("R11.1: une fois les routes ouvertes, une route peut être reprise sans dépasser le cap", () => {
  const frontier={byDirection:{
    label:{canExpand:true,firstBranches:8,state:"available"},
    curator:{canExpand:true,firstBranches:1,state:"partial"}
  }};
  const plan=scheduleDiscoveryFrontiers(frontier,{spread:1,budget:6,maxPerDirection:3});
  const counts=plan.reduce((m,x)=>(m[x.direction]=(m[x.direction]||0)+1,m),{});
  assert.ok(counts.label<=3 && counts.curator<=3);
});

test("R11.1: DIG relit la frontière après chaque chargement", () => {
  const app=readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
  assert.match(app,/while \(completed < maxOperations/);
  assert.match(app,/const view = getScoutMixerView\(\);/);
  assert.match(app,/exploreWorkspaceDirection\(direction, \{ explore: true \}\)/);
});

test("R11.1: une identité déjà connue reprend les catalogues au lieu de se réidentifier", () => {
  const app=readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
  assert.match(app,/Reprendre les catalogues/);
  assert.match(app,/identityKnown[\s\S]{0,500}loadScoutMixerDirections/);
});

test("R11.1: l'UI sépare profondeur cible et profondeur observée", () => {
  const panel=readFileSync(new URL("../public/scout-mixer-panel.mjs",import.meta.url),"utf8");
  assert.match(panel,/atteinte observée/);
  assert.match(panel,/maxObservedDepth/);
});

test("R11.1B: la boucle de frontière conserve le binding historique des actions de carte", () => {
  const app=readFileSync(new URL("../public/app.js",import.meta.url),"utf8");
  assert.match(app,/renderCard: createScoutCatalogueCard/);
  assert.match(app,/load: direction => exploreWorkspaceDirection\(direction, \{ explore: true \}\)/);
  assert.match(app,/onStop: \(\) => \{ cancelWorkspaceSearch\(\); \}/);
});
