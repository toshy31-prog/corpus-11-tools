import test from 'node:test';
import assert from 'node:assert/strict';
import { videoArtistEvidence } from './video-credits.mjs';
import { artistSearchHint, catalogueArtistChoices, catalogueArtistReference } from '../public/departure-workflow.mjs';
import { guessArtist } from './scout.mjs';

for(const [title,artist] of [['47 PHIL FODEN','TH'],['GREEN DAY','YH 261'],['John Gotti (Freestyle)','Jeune Morty'],['EVERYWHERE I GO / BABY I GOT U','DAVIDDEUXFOIS']]) {
  test(`description credit for ${title} wins over title parsing`,()=>{
    const video={title,channelTitle:'Various uploads',description:`Provided to YouTube by DistroKid\n\n${title} · ${artist}\n\nAn album\nReleased on: 2020-01-01`};
    assert.equal(videoArtistEvidence(video).name,artist);
    assert.equal(guessArtist(video).name,artist);
    assert.equal(artistSearchHint(title),'');
  });
}
test('Topic is evidence for a query even without category, never an external ID',()=>{
  const result=guessArtist({title:'GREEN DAY',channelTitle:'YH 261 - Topic'});
  assert.equal(result.name,'YH 261'); assert.equal(result.externalIds,undefined);
});
test('multiple credited artists are retained, duplicates do not multiply credits',()=>{
  assert.equal(videoArtistEvidence({title:'GREEN DAY',description:'GREEN DAY · YH 261 · Nilma · YH 261 · Nilma'}).name,'YH 261 & Nilma');
});
test('generic channels and unrelated description lines do not invent artists',()=>{
  assert.equal(videoArtistEvidence({title:'Song',channelTitle:'Music - Topic',description:'Other title · Wrong\nProvided to YouTube by TuneCore'}),null);
});
test('TH searches exact names or documented aliases, never the and substring candidates',()=>{
  const names=['The Black Tone','Dj.Booth','State Of The Art','93MillionMilesFromTheSun','TH','TH (2)'];
  const graph={entities:names.map((name,i)=>({id:`artist:discogs:${i+1}`,type:'artist',name}))};
  assert.deepEqual(catalogueArtistChoices(graph,'TH').map(c=>c.name),['TH','TH (2)']);
  assert.deepEqual(catalogueArtistChoices(graph,'TH 93'),[]);
});
test('direct artist links are narrowly allowlisted',()=>{
  assert.deepEqual(catalogueArtistReference('https://www.discogs.com/fr/artist/3860526-Nexxor'),{source:'discogs',id:'3860526'});
  for(const url of ['http://localhost:4181','https://www.discogs.com.evil.test/artist/1','https://www.discogs.com/release/1','https://user@www.discogs.com/artist/1']) assert.equal(catalogueArtistReference(url),null);
});
