import test from 'node:test';
import assert from 'node:assert/strict';
import { sortMusic, musicalReleaseDate, isOtherArtist, departureArtistIds } from './music-sorting.mjs';
import { buildScoutMixView, consumeMixPage, reconcileDirectionFilter, emptyMixMessage } from './scout-mix-session.mjs';
import { createScoutPatch, setScoutParameter } from './scout-parameters.mjs';
import { normalizeNotebookItem } from './library-state.mjs';
import { dateDescription } from './discovery-model.mjs';
import { seedPickerChoices } from './seed-picker-model.mjs';

test('natural title sort handles numbers and accents without changing input', () => {
  const items=['Zulu','Écho','10 pistes','2 pistes','00 intro'].map(title=>({title}));
  const before=JSON.stringify(items);
  assert.deepEqual(sortMusic(items,'title').map(x=>x.title),['00 intro','2 pistes','10 pistes','Écho','Zulu']);
  assert.equal(JSON.stringify(items),before);
});
test('musical dates never fall back to uploads or known reissues', () => {
  assert.equal(musicalReleaseDate({publishedAt:'2026-01-01'}),'');
  assert.equal(musicalReleaseDate({dates:{release:'2018',isReissue:true}}),'');
  assert.equal(musicalReleaseDate({dates:{release:'2018',original:'1975',isReissue:true}}),'1975');
  for(const sort of ['release-new','release-old']) assert.equal(sortMusic([{id:'unknown',publishedAt:'2026'}, {id:'known',dates:{original:'1975'}}],sort).at(-1).id,'unknown');
});
test('structured music descriptions supply release dates, never invalid dates or arbitrary numbers', () => {
  const video={id:'youtube01',title:'GREEN DAY',channelTitle:'YH 261 - Topic',publishedAt:'2026-01-01',description:'Provided to YouTube by DistroKid\nGREEN DAY · YH 261 · Nilma\nReleased on: 2023-02-28'};
  assert.equal(musicalReleaseDate(video),'2023-02-28');
  assert.match(dateDescription(video),/Sortie : 2023-02-28/);
  for(const releaseDate of ['2023-02-29','2023-00-12','2023-12-32','0000']) assert.equal(musicalReleaseDate({releaseDate}),'');
  assert.equal(musicalReleaseDate({description:'Released on: 2023-02-28'}),'');
  const [choice]=seedPickerChoices({track:[{id:'video:youtube:youtube01',type:'track',label:video.title}]},{library:[video],query:'Nilma'});
  assert.equal(choice.artist,'YH 261 & Nilma');
  assert.equal(choice.releaseDate,'2023-02-28');
  assert.match(choice.subtitle,/indiqué sur YouTube/);
  assert.match(dateDescription({dates:{release:'2018',isReissue:true}}),/Première sortie non renseignée/);
});
test('notebook retains musical dates, without inventing dates for old saves', () => {
  const item=normalizeNotebookItem({id:'test',dates:{original:'1975',release:'2018',isReissue:true},publishedAt:'2026'});
  assert.equal(musicalReleaseDate(normalizeNotebookItem(JSON.parse(JSON.stringify(item)))),'1975');
  assert.equal(musicalReleaseDate(normalizeNotebookItem({id:'old',publishedAt:'2026'})),'');
});
test('other artists excludes the departure, collaborations, shared IDs and unknowns', () => {
  const source={name:'Nexxor',artistIds:['artist:discogs:1','artist:musicbrainz:x']};
  for(const item of [{artist:'Nexxor'}, {artist:'Nexxor (2)'}, {artist:'Corps A Core & Nexxor'}, {artist:'Alias',artistIds:['artist:musicbrainz:x']}, {artist:''}, {artist:'Artiste non renseigné'}]) assert.equal(isOtherArtist(item,source),false);
  assert.equal(isOtherArtist({artist:'Corps A Core',artistIds:['artist:discogs:2']},source),true);
});
test('artist filter expands only trusted exact identity, never collaborators', () => {
  const graph={entities:Object.fromEntries(['a','b','c','d'].map(id=>[id,{id,type:'artist'}])),edges:[
    {from:'video',to:'a',kind:'probable_artist',status:'confirmed_user'},
    {from:'a',to:'b',kind:'same_identity',status:'confirmed_cross_id'},
    {from:'b',to:'c',kind:'same_identity',status:'candidate'},
    {from:'a',to:'d',kind:'collaborated_with',status:'observed'}]};
  assert.deepEqual(departureArtistIds(graph,'video'),['a','b']);
  graph.edges.push({from:'a',to:'release',kind:'credited_on_release',status:'observed'});
  assert.deepEqual(departureArtistIds(graph,'release'),['a','b']);
});
const select=(items,{exclude})=>items.filter(item=>!exclude.includes(item.id));
const item=(id,artist='Other',direction='label')=>({id,title:id,artist,direction,path:[{}]});
test('sorting and filtering operate before pagination and preserve original groups', () => {
  const groups={label:{items:[item('10'),item('2'),item('0','Seed'),item('unknown','')]},featuring:{items:[item('1','Third','featuring')]}}, before=JSON.stringify(groups);
  const patch=createScoutPatch({sort:'title',otherArtistsOnly:true});
  const options={seedId:'seed',seedArtist:'Seed',groups,patch,select,limit:2};
  const first=buildScoutMixView(options);
  assert.deepEqual(first.items.map(x=>x.id),['1','2']);
  const next=buildScoutMixView({...options,history:consumeMixPage({},first)});
  assert.deepEqual(next.items.map(x=>x.id),['10']);
  assert.equal(JSON.stringify(groups),before);
});
test('broad label is opt-in but remains available with a documented credit or explicit label departure', () => {
  const distant={...item('pop'),anchor:{id:'Atlantic'},relationship:{distant:true,catalogueSize:10000}};
  const options={seedId:'seed',groups:{label:{items:[distant]}},select};
  assert.equal(buildScoutMixView(options).items.length,0);
  assert.equal(buildScoutMixView({...options,patch:{includeDistant:true}}).items.length,1);
  assert.equal(buildScoutMixView({...options,seedId:'Atlantic'}).items.length,1);
  assert.equal(buildScoutMixView({...options,groups:{...options.groups,curator:{items:[{...item('pop'),direction:'curator'}]}}}).routes.find(r=>r.id==='label').distantHidden,1);
  assert.equal(buildScoutMixView({...options,groups:{...options.groups,featuring:{items:[item('pop','Other','featuring')]}}}).routes.find(r=>r.id==='label').distantHidden,0);
});
test('link relevance is categorical, not a sonic percentage', () => {
  const items=['curator','label','compilation','remix'].map(direction=>item(direction,'Artist',direction));
  assert.deepEqual(sortMusic(items,'relation').map(x=>x.id),['remix','compilation','label','curator']);
});
test('display settings survive patch normalization, preserve routes and reject unknown sorts', () => {
  let patch=createScoutPatch({directionWeights:{label:.4},shape:{depth:9,spread:.25}});
  patch=setScoutParameter(setScoutParameter(setScoutParameter(patch,'scope.otherArtists',true),'scope.distant',true),'view.sort','release-old');
  assert.deepEqual(createScoutPatch(JSON.parse(JSON.stringify(patch))),patch);
  assert.equal(patch.directionWeights.label,.4); assert.equal(patch.shape.depth,9);
  assert.equal(setScoutParameter(patch,'view.sort','arbitrary').sort,'explore');
});
test('disabled direction filter clears and source failure never says start again as if unsearched', () => {
  assert.equal(reconcileDirectionFilter('label',[{id:'label',enabled:false}]),'');
  assert.match(emptyMixMessage({routes:[{enabled:true,state:'unavailable'}]}),/indisponible/);
  assert.match(emptyMixMessage({routes:[{enabled:true,artistHidden:3}]}),/artistes inconnus/);
});
