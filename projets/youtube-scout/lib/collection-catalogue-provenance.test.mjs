import test from "node:test";
import assert from "node:assert/strict";
import { discogsTrackCatalogueProvenance, musicBrainzRecordingCatalogueProvenance, catalogueProvenanceGraph, validateCatalogueProvenance } from "./collection-catalogue-provenance.mjs";

const release={ id:700,title:"Synthetic album",released:"2024-01-02",artists:[{id:70,name:"Artist"}],labels:[{id:77,name:"Fixture Records",catno:"FIX-1"}],formats:[{name:"Vinyl",descriptions:["12\""]}],tracklist:[{title:"First",position:"A1"},{title:"Exact",position:"A2",duration:"5:00"}]};
const video={id:"abcdefghijk",departureRevision:"r1"};
const recording={resolvedDiscogsTrack:{release,trackEntityId:"track:discogs:700:1"}};

test("Discogs exact serializes only canonical source facts and reconstructs canonical graph",()=>{
 const p=discogsTrackCatalogueProvenance(video,recording);
 assert.deepEqual(Object.keys(p),["revision","discogsTrack"]);
 assert.equal(p.discogsTrack.release.track.title,"Exact");
 const g=catalogueProvenanceGraph({...video,catalogueProvenance:p});
 assert.ok(g.entities.some(e=>e.id==="track:discogs:700:1"));
 assert.ok(g.entities.some(e=>e.id==="release:discogs:700"));
 assert.ok(g.entities.some(e=>e.id==="label:discogs:77"));
 const embodies=g.edges.find(e=>e.kind==="embodies");
 assert.deepEqual({status:embodies.status,source:embodies.source,revision:embodies.departureRevision},{status:"resolved",source:"discogs",revision:"r1"});
 const issued=g.edges.find(e=>e.kind==="issued_by");
 assert.equal(issued.status,"observed"); assert.equal(issued.catalogueNumber,"FIX-1");
});
test("stale provenance is inert after departure revision changes",()=>{
 const p=discogsTrackCatalogueProvenance(video,recording);
 assert.deepEqual(catalogueProvenanceGraph({...video,departureRevision:"r2",catalogueProvenance:p}),{entities:[],edges:[],claims:[]});
});
test("validation rejects arbitrary graph-shaped or unknown fields",()=>{
 const p=discogsTrackCatalogueProvenance(video,recording);
 assert.throws(()=>validateCatalogueProvenance({...p,edges:[]}),/inconnu/);
});

test("MusicBrainz exact serializes the authoritative resolution and reconstructs its label path",()=>{
 const video={id:"abcdefghijk",departureRevision:"r1"};
 const recording={resolved:{id:"rec-1",title:"Exact",releases:[{id:"rel-1",title:"Release",date:"2024-01-01",country:"FR",labels:[{id:"lab-1",name:"Exact Label",catalogueNumber:"CAT-1"}]}]}};
 const p=musicBrainzRecordingCatalogueProvenance(video,recording);
 const g=catalogueProvenanceGraph({...video,catalogueProvenance:p});
 assert.ok(g.entities.some(e=>e.id==="label:musicbrainz:lab-1"));
 assert.ok(g.edges.some(e=>e.from==="release:musicbrainz:rel-1" && e.to==="label:musicbrainz:lab-1" && e.kind==="issued_by" && e.status==="observed" && e.catalogueNumber==="CAT-1"));
});
