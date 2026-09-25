import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const root = new URL("../public/", import.meta.url);
async function fixtureScript() {
const app = await readFile(new URL("app.js", root), "utf8");
const actualRender = app.slice(app.indexOf("function renderArtistCorrection("), app.indexOf("async function searchDepartureArtistChoices("));
return `
import { typedDepartureModel, declaredDepartureArtist, departureArtistUpdate, departureArtistsUpdate, hasExplicitDepartureArtist, catalogueArtistChoices, catalogueArtistReference, artistChoiceRank } from '/departure-workflow.mjs';
import { splitArtistNames } from '/artist-names.mjs';
import { departureArtistIds } from '/music-sorting.mjs';
import { mountScoutMixerPanel } from '/scout-mixer-panel.mjs';
import { buildScoutMixView, consumeMixPage } from '/scout-mix-session.mjs';
import { createScoutPatch, setScoutParameter } from '/scout-parameters.mjs';
const credits = 'Deen Burbigo, Eff Gee, Ratu$, Esso Luxueux, Stutt, robdbloc, Blaz Pit';
const seed = { id: 'video:youtube:fixture1234', type: 'track', title: 'Saboteur', label: 'Saboteur', departureArtist: { name: credits, source: 'user' } };
const choice = (name,i) => catalogueArtistChoices({ entities: [{ id: 'artist:discogs:'+i, type:'artist', name, externalIds:{discogs:String(i)} }] },name)[0];
const groups = splitArtistNames(credits).map((query,i)=>({query, state:'complete', candidates:[choice(query,i+1)]}));
groups[2].candidates.push(choice('Ratu Mukherjee',88));
groups[5].candidates=[];
const registry = {groups,candidates:groups.flatMap(group=>group.candidates),sourceStates:{}};
let explorationGraph={entities:{[seed.id]:{...seed,type:'video'}},edges:{}}, activeDig={seed,identityChoices:{seedId:seed.id,registry}}, compositionGeneration=0;
const artistCorrections={}, CORRECTIONS_KEY='fixture';
const seedVideo=()=>({id:'fixture1234'}), resolvedArtist=()=>null, beginDepartureReview=()=>{}, saveLocalObject=()=>{}, renderActiveSeed=()=>{}, persistExplorationSession=async()=>{};
const setActiveDig=delta=>Object.assign(activeDig,delta), refreshExplorationGraph=async()=>{};
const output=document.querySelector('#outcome');
const openExploration=async()=>{output.textContent='DECLARATION: '+declaredDepartureArtist(explorationGraph,seed.id)+'\\nCHOIX: '+departureArtistIds(explorationGraph,seed.id).join(', ');};
const searchDepartureArtistChoices=async()=>registry;
const fetch=async(url,options)=>{
  if(url.startsWith('/api/music/artist-choices'))return {ok:true,json:async()=>({candidates:[choice('robdbloc',6)],sourceStates:{discogs:'ok'}})};
  if(document.querySelector('#fail-save').checked)return {ok:false};
  const delta=JSON.parse(options.body);
  for(const n of delta.entities)explorationGraph.entities[n.id]=n;
  for(const e of delta.edges)explorationGraph.edges[e.from+':'+e.kind+':'+e.to]=e;
  return {ok:true};
};
${actualRender}
renderArtistCorrection(document.querySelector('#fixture'),seed.id);
const mixerHost=document.createElement('section'); document.querySelector('main').append(mixerHost);
const songs=Array.from({length:8},(_,i)=>({id:'track:'+i,type:'track',title:'Album répétitif — piste '+i,artist:'Cookin Soul',releaseId:'one-album'}));
const videos=[{id:'video:youtube:doc',type:'video',title:'Danyl : Documentaire | Grünt'}, {id:'video:youtube:promo',type:'video',title:'Grünt #74 Ce soir 18h'}, {id:'video:youtube:session',type:'video',title:'Le Rat Luciano | Grünt #74'}];
let patch=createScoutPatch(), history={};
const read=(options={})=>({...buildScoutMixView({seedId:seed.id,groups:{remix:{items:songs},curator:{items:videos}},patch,history,select:(items,{exclude})=>items.filter(item=>!exclude.includes(item.id)),...options}),seedLabel:'Mélange synthétique',workflow:'browse'});
mountScoutMixerPanel({parent:mixerHost,read,onParameter:(id,value)=>{patch=setScoutParameter(patch,id,value)},onNext:directionFilter=>{history=consumeMixPage(history,read({directionFilter}))},onRewind:()=>{history={}},renderCard:item=>Object.assign(document.createElement('article'),{textContent:item.title})});
`;
}
const server = createServer(async (req,res)=>{
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/') {res.setHeader('content-type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><title>Scout — test isolé des participants</title><body><main style="max-width:900px;margin:auto;padding:24px"><h1>Test isolé : participants</h1><p>Données fictives, aucune connexion ni bibliothèque personnelle.</p><label><input id="fail-save" type="checkbox">Simuler une panne de sauvegarde</label><pre id="outcome">Aucun choix enregistré</pre><section id="fixture"></section></main><script type="module" src="/fixture.mjs"></script></body></html>');}
    if(path==='/fixture.mjs'){res.setHeader('content-type','text/javascript');return res.end(await fixtureScript());}
    if(!/^\/[a-z0-9-]+\.(mjs|css)$/.test(path)){res.writeHead(404);return res.end();}
    res.setHeader('content-type',path.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(new URL(path.slice(1),root)));
  } catch {res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1',()=>console.log('Fixture: http://localhost:'+server.address().port));
