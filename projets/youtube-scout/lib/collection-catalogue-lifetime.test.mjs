import test from "node:test";
import assert from "node:assert/strict";
import { discogsTrackCatalogueProvenance, musicBrainzRecordingCatalogueProvenance, collectionProvenanceGraph } from "./collection-catalogue-provenance.mjs";
import { projectActiveCollectionGraph, buildSeedCatalog } from "./exploration.mjs";
import { EphemeralExplorations } from "./ephemeral-exploration.mjs";

test("exact Discogs resolution survives a new ephemeral context only through active collection provenance", async () => {
  const video={id:"abcdefghijk",title:"Artist - Exact",departureRevision:"r1",playlistIds:["active"],playlistNames:["Active"]};
  const release={id:700,title:"Album",released:"2024-01-02",artists:[{id:70,name:"Artist"}],labels:[{id:77,name:"Fixture Records",catno:"FIX-1"}],formats:[],tracklist:[{title:"Exact",position:"A1"}]};
  const recording={resolvedDiscogsTrack:{release,trackEntityId:"track:discogs:700:0"}};
  const stored={...video,catalogueProvenance:discogsTrackCatalogueProvenance(video,recording)};

  const personal={snapshot:()=>({entities:{},edges:{}}),commitPersonalGraph:async()=>{}};
  const explorations=new EphemeralExplorations({personal});
  const tokenA=await explorations.start("video:youtube:abcdefghijk");
  const sessionA=explorations.get(tokenA);
  await explorations.context.run(sessionA,()=>explorations.store.ingestGraph({entities:[{id:"artist:temporary:A",type:"artist",name:"A"}]}));
  explorations.close(tokenA);

  const tokenB=await explorations.start("label:discogs:77");
  const sessionB=explorations.get(tokenB);
  const bSnapshot=await explorations.context.run(sessionB,()=>explorations.store.snapshot());
  assert.equal(bSnapshot.entities["artist:temporary:A"],undefined);
  assert.equal(bSnapshot.entities["label:discogs:77"],undefined);

  const durable=collectionProvenanceGraph([stored]);
  const projected=projectActiveCollectionGraph(durable,[stored]);
  assert.ok(projected.entities["label:discogs:77"]);
  assert.equal(buildSeedCatalog(projected,[stored]).label.some(seed=>seed.id==="label:discogs:77"),true);
  explorations.close(tokenB);
});

test("exact MusicBrainz resolution survives a new ephemeral context only through active collection provenance", async () => {
  const video={id:"mbabcdefgh1",title:"Artist - Exact",departureRevision:"r1",playlistIds:["active"],playlistNames:["Active"]};
  const recording={resolved:{id:"rec-1",title:"Exact",releases:[{id:"rel-1",title:"Release",date:"2024-01-01",country:"FR",labels:[{id:"lab-1",name:"Mechatronica",catalogueNumber:"MEC-1"}]}]}};
  const stored={...video,catalogueProvenance:musicBrainzRecordingCatalogueProvenance(video,recording)};
  const personal={snapshot:()=>({entities:{},edges:{}}),commitPersonalGraph:async()=>{}};
  const explorations=new EphemeralExplorations({personal});
  const tokenA=await explorations.start("video:youtube:mbabcdefgh1");
  const sessionA=explorations.get(tokenA);
  await explorations.context.run(sessionA,()=>explorations.store.ingestGraph({entities:[{id:"artist:temporary:A",type:"artist",name:"A"}]}));
  explorations.close(tokenA);
  const tokenB=await explorations.start("label:musicbrainz:lab-1");
  const sessionB=explorations.get(tokenB);
  const bSnapshot=await explorations.context.run(sessionB,()=>explorations.store.snapshot());
  assert.equal(bSnapshot.entities["artist:temporary:A"],undefined);
  assert.equal(bSnapshot.entities["label:musicbrainz:lab-1"],undefined);
  const durable=collectionProvenanceGraph([stored]);
  const projected=projectActiveCollectionGraph(durable,[stored]);
  assert.ok(projected.entities["label:musicbrainz:lab-1"]);
  assert.equal(buildSeedCatalog(projected,[stored]).label.some(seed=>seed.id==="label:musicbrainz:lab-1"),true);
  explorations.close(tokenB);
});
