import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const script = `
import { mountScoutMixerPanel } from '/scout-mixer-panel.mjs';
import { buildScoutMixView, consumeMixPage } from '/scout-mix-session.mjs';
import { createScoutPatch, setScoutParameter } from '/scout-parameters.mjs';
const groups={curator:{items:Array.from({length:37},(_,i)=>({id:'video:'+i,title:'Vidéo non-Topic '+i,artist:''})),coverage:{complete:true}},featuring:{items:[{id:'guest',title:'Collaboration test',artist:'Zuukou Mayzie & Guest'},{id:'same',title:'Solo test',artist:'Zuukou Mayzie'}],coverage:{complete:true}}};
let patch=createScoutPatch({otherArtistsOnly:true}),history={};
const read=(options={})=>({...buildScoutMixView({seedId:'seed',seedArtist:'Zuukou Mayzie',groups,patch,history,select:(items,{exclude})=>items.filter(x=>!exclude.includes(x.id)),...options}),seedLabel:'Test isolé du filtre',workflow:'browse'});
mountScoutMixerPanel({parent:document.querySelector('main'),read,onParameter:(id,value)=>{patch=setScoutParameter(patch,id,value)},onNext:directionFilter=>{history=consumeMixPage(history,read({directionFilter}))},onRewind:()=>{history={}},onDig:()=>{throw Error('Aucun réseau autorisé dans ce test')},renderCard:item=>Object.assign(document.createElement('article'),{textContent:item.title})});
`;
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('content-type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="fr"><title>Test Scout — filtres artistes</title><link rel="stylesheet" href="/styles.css"><main style="max-width:1000px;margin:auto;padding:20px"></main><script type="module" src="/fixture.mjs"></script></html>');}if(p==='/fixture.mjs'){res.setHeader('content-type','text/javascript');return res.end(script);}if(!/^\/[a-z0-9-]+\.(mjs|css)$/.test(p)){res.writeHead(404);return res.end();}res.setHeader('content-type',p.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(new URL('../public'+p,import.meta.url)));}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1',()=>console.log('http://localhost:'+server.address().port));
