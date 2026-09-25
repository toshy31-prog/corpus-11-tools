import test from "node:test";
import assert from "node:assert/strict";
import { selectDiscoveries, matchesRecording, deduplicatePaths, dateDescription } from "../public/discovery-model.mjs";
test("déduplique les uploads sans fusionner les remixes et change les candidats à la relance", () => {
 const items = [{id:"a",artist:"One",title:"Song (Official Audio)"},{id:"b",artist:"One",title:"Song"},{id:"c",artist:"One",title:"Song (Two Remix)"},{id:"d",artist:"Two",title:"Different"}];
 assert.equal(selectDiscoveries(items).length,3);
 const first = selectDiscoveries(items,{limit:2});
 assert.equal(first[1].artist,"Two");
 assert.ok(selectDiscoveries(items,{exclude:first.map(i=>i.id)}).every(i=>!first.some(f=>f.id===i.id)));
 assert.ok(!selectDiscoveries(items,{exclude:["a"]}).some(item=>item.id==="b"), "another upload of an already explored recording must not return");
});
test("l’écoute exige l’artiste, le titre et la version", () => {
 const song={artist:"Art Of Tones",title:"Violation",type:"recording"};
 assert.equal(matchesRecording({title:"Art Of Tones - Violation (Official Video)"}, song),true);
 assert.equal(matchesRecording({title:"Art Of Tones - Violation (Other Remix)"}, song),false);
 assert.equal(matchesRecording({title:"Other - Violation"}, song),false);
});
test("fusionne les explications répétées et distingue annonce et upload", () => {
 const paths=deduplicatePaths([{kind:"label",entity:"Local Talk",source:"Discogs"},{kind:"label",entity:"Local Talk",source:"MusicBrainz"}]);
 assert.equal(paths.length,1); assert.equal(paths[0].sources.length,2);
 assert.match(dateDescription({publishedAt:"2026-01-01"}),/Publication YouTube/);
 assert.match(dateDescription({dates:{release:"2030-01-01"}},new Date("2026-01-01")),/Annoncé/);
});
test("les alphabets non latins restent distincts et les noms courts ne correspondent pas à des fragments", () => {
 const items=[{id:"jp1",artist:"佐藤",title:"夜"},{id:"jp2",artist:"山田",title:"朝"}];
 assert.equal(selectDiscoveries(items).length,2);
 assert.equal(matchesRecording({title:"Martin - Hurt"},{artist:"Art",title:"Hurt",type:"recording"}),false);
 assert.equal(matchesRecording({title:"佐藤 - 夜"},{artist:"佐藤",title:"夜",type:"recording"}),true);
});
test("varier les artistes et approfondir le catalogue changent réellement la sélection", () => {
 const items=[{id:"a",artist:"One",title:"First"},{id:"b",artist:"One",title:"Second"},{id:"c",artist:"Two",title:"Third"}];
 assert.deepEqual(selectDiscoveries(items,{limit:2,focus:"breadth"}).map(i=>i.id),["a","c"]);
 assert.deepEqual(selectDiscoveries(items,{limit:2,focus:"depth"}).map(i=>i.id),["a","b"]);
});


test("spread continu interpole entre approfondissement et dispersion", () => {
  const items=[{id:"a",artist:"One",title:"First"},{id:"b",artist:"One",title:"Second"},{id:"c",artist:"Two",title:"Third"}];
  assert.deepEqual(selectDiscoveries(items,{limit:2,spread:0}).map(i=>i.id),["a","b"]); assert.deepEqual(selectDiscoveries(items,{limit:2,spread:1}).map(i=>i.id),["a","c"]); assert.deepEqual(selectDiscoveries(items,{limit:2,focus:"depth"}).map(i=>i.id),["a","b"]); assert.deepEqual(selectDiscoveries(items,{limit:2,focus:"breadth"}).map(i=>i.id),["a","c"]);
});
