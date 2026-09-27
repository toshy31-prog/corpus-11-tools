import test from 'node:test';
import assert from 'node:assert/strict';
import {artistChoiceRank,catalogueArtistChoices} from './departure-workflow.mjs';
test('leading article variant is a low-ranked proposal, not an exact identity',()=>{
 assert.equal(artistChoiceRank({name:'Tsee Muds'},'The Tsee Muds'),1);
 assert.equal(artistChoiceRank({name:'The Tsee Muds'},'Tsee Muds'),1);
 assert.equal(artistChoiceRank({name:'The Tsee Muds'},'The Tsee Muds'),3);
 assert.equal(artistChoiceRank({name:'Unrelated',aliases:['The Tsee Muds']},'The Tsee Muds'),2);
 // Existing token fallback permits repeated words; this patch does not alter it.
 assert.equal(artistChoiceRank({name:'The'},'The The'),1);
 assert.equal(artistChoiceRank({name:'Who'},'The Who'),0);
 assert.equal(artistChoiceRank({name:'The Tsee Mud'},'The Tsee Muds'),0);
});
test('article variants retain distinct catalogue identities and do not mutate graph',()=>{
 const graph={entities:[{id:'artist:discogs:1',type:'artist',name:'Tsee Muds',externalIds:{discogs:'1'}},{id:'artist:discogs:2',type:'artist',name:'The Tsee Muds',externalIds:{discogs:'2'}}]};
 const before=JSON.stringify(graph), choices=catalogueArtistChoices(graph,'The Tsee Muds');
 assert.equal(choices.length,2); assert.deepEqual(choices.map(c=>c.sourceId),['2','1']);
 assert.deepEqual(choices[1].equivalentIds,['artist:discogs:1']);
 assert.equal(JSON.stringify(graph),before);
});
