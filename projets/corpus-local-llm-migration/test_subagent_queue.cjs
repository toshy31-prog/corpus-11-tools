'use strict';
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=readFileSync(__dirname+'/portal/app.js','utf8');
function load(name,context,next){
 const start=source.indexOf('async function '+name+'(');
 assert(start>=0);
 vm.runInContext(source.slice(start,source.indexOf(next,start)),context);
}
function fixture(overrides={}){
 const calls=[];
 const c=vm.createContext({Promise,Date,locals:[],library:{root:'/Corpus'},nativeApi:async(s,p,data)=>{calls.push({p,data});return [];},fetchJSON:async()=>({}),CorpusPersonalization:{collect:()=>false,context:()=>''},personalization:{},persistPersonalization(){},notifyCorpusCompletion(){},nativeRender(){},nativeSave(){},agentResponseInstructions:()=>'',temporalContext:()=>'',agentConfig:{reasoning:'direct'},...overrides});
 load('nativeRefresh',c,'async function nativePump(');
 load('nativePump',c,'function openNativeConversation(');
 return {c,calls};
}
function state(){return {id:'parent',ready:false,busy:false,paused:false,queue:[{text:'Suite',images:[]}],messages:[],notice:''};}

test('Reload waits for child discovery before marking the parent ready or sending its queue',async()=>{
 let resolveChildren;const children=new Promise(resolve=>{resolveChildren=resolve;});
 const {c,calls}=fixture({refreshSubagents:()=>children,subagentsBusy:()=>true});
 const s=state(),refresh=c.nativeRefresh(s);
 await Promise.resolve();await Promise.resolve();
 assert.equal(s.ready,false);
 await c.nativePump(s);assert.equal(calls.filter(x=>x.p==='/prompt_async').length,0);
 resolveChildren();await refresh;
 assert.equal(s.ready,true);assert.equal(s.busy,true);
 await c.nativePump(s);assert.equal(s.queue.length,1);
 c.subagentsBusy=()=>false;await c.nativeRefresh(s);await c.nativePump(s);
 assert.equal(calls.filter(x=>x.p==='/prompt_async').length,1);assert.equal(s.queue.length,0);
});

test('An unavailable child inventory preserves the queue and blocks automatic sending',async()=>{
 const {c,calls}=fixture({refreshSubagents:async()=>{throw Error('children unavailable');},subagentsBusy:()=>false});
 const s=state();await c.nativeRefresh(s);
 assert.equal(s.ready,false);assert.match(s.notice,/children unavailable/);
 await c.nativePump(s);assert.equal(s.queue.length,1);assert.equal(calls.filter(x=>x.p==='/prompt_async').length,0);
});

test('Live child state blocks an ordinary queued message even if the parent previously looked idle',async()=>{
 const {c,calls}=fixture({subagentsBusy:()=>true});const s=state();s.ready=true;
 await c.nativePump(s);assert.equal(calls.length,0);assert.equal(s.queue.length,1);
 // User-directed steering remains possible; it is not an implicit replay.
 await c.nativePump(s,s.queue[0]);assert.equal(calls.length,1);assert.equal(s.queue.length,0);
});

test('A completed parent message does not notify while the observed family is still busy',()=>{
 let notifications=0;function Notification(){notifications++;}Notification.permission='granted';
 const c=vm.createContext({generalSettings:{notifications:'always'},document:{visibilityState:'visible'},Notification,window:{Notification}});
 const start=source.indexOf('function notifyCorpusCompletion(');
 vm.runInContext(source.slice(start,source.indexOf('function launchCorpusConfetti(',start)),c);
 const s={id:'parent',ready:true,busy:true};
 const messages=[{info:{id:'last',role:'assistant',time:{completed:1},finish:'stop'}}];
 c.notifyCorpusCompletion(s,messages,{});assert.equal(notifications,0);
 s.busy=false;c.notifyCorpusCompletion(s,messages,{});assert.equal(notifications,1);
 c.notifyCorpusCompletion(s,messages,{});assert.equal(notifications,1);
});
