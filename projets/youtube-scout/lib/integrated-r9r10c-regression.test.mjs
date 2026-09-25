import test from "node:test";
import assert from "node:assert/strict";
import { buildScoutMixView } from "../public/scout-mix-session.mjs";
import { journeyGuidance } from "../public/journey-state.mjs";
const select=(items)=>items;
const curatorItems=()=>Array.from({length:20},(_,i)=>({id:`video:youtube:v${i}xxxx`,title:`T${i}`,channelId:"UC1234567890123456789012"}));

test("R10C: une seule route disponible reste parcourable même à Spread 1",()=>{
 const view=buildScoutMixView({seedId:"seed",groups:{curator:{items:curatorItems(),coverage:{state:"partial",hasMore:true}}},patch:{shape:{spread:1}},limit:6,select});
 assert.equal(view.items.length,6);
 assert.equal(view.candidates,20);
 assert.equal(view.hasNextPage,true);
 assert.equal(view.routes.find(x=>x.id==="curator").distinctCurators,1);
});
test("R10C: Spread 0 autorise l'approfondissement du même curator",()=>{
 const view=buildScoutMixView({seedId:"seed",groups:{curator:{items:curatorItems(),coverage:{state:"partial",hasMore:true}}},patch:{shape:{spread:0}},limit:6,select});
 assert.equal(view.items.length,6);
});
test("R9: Time Travel disputé est filtré mais Nexxor reste confirmable",()=>{
 const seed={id:"video:seed",type:"track"};
 const old={id:"artist:musicbrainz:11111111-1111-1111-1111-111111111111",type:"artist",name:"Time Travel",externalIds:{musicbrainz:"11111111-1111-1111-1111-111111111111"}};
 const nx={id:"artist:musicbrainz:174ad015-820c-44ee-ac38-752e7871ad4c",type:"artist",name:"Nexxor",externalIds:{musicbrainz:"174ad015-820c-44ee-ac38-752e7871ad4c"}};
 const graph={entities:{[old.id]:old,[nx.id]:nx},edges:{e:{from:seed.id,to:old.id,kind:"probable_artist",status:"confirmed_user"}}};
 const groups={label:{coverage:{state:"needs_confirmation"},confirmationCandidates:[
   {id:"artist:discogs:2334338",type:"artist",name:"Time Travel",externalIds:{discogs:"2334338"}}, nx
 ]}};
 const g=journeyGuidance({seed,graph,groups,dossier:{state:"partial"},disputedArtistIds:[old.id]});
 assert.equal(g.candidates.some(x=>x.name==="Time Travel"),false);
 assert.equal(g.candidates.some(x=>x.name==="Nexxor"),true);
});
