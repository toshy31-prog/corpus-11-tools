'use strict';
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const source=readFileSync(__dirname+'/portal/app.js','utf8');
const start=source.indexOf('function nativeOperationReport(');
const end=source.indexOf('\nfunction paintNativeOperationCard(',start);
assert.ok(start>=0&&end>start,'nativeOperationReport is present');
function report(state,config={approval:'ask'}){
 const ctx=vm.createContext({agentConfig:config});
 vm.runInContext(source.slice(start,end),ctx);
 return JSON.parse(JSON.stringify(ctx.nativeOperationReport(state,config)));
}

test('Repères du fil distinguent file, sélection d’outils et demande d’autorisation',()=>{
 const value=report({ready:true,paused:true,queue:[{toolSelection:{mode:'manual',tools:{read:true,edit:false,bash:true}}}],messages:[]});
 assert.equal(value.action,'File en pause · 1 message');
 assert.equal(value.tools,'2 outils choisis');
 assert.match(value.policy,/demande avant exécution/);
 assert.equal(value.canVerify,false);
});

test('Un tour terminé ne devient pas une preuve vérifiée dans le repère',()=>{
 const value=report({ready:true,queue:[],messages:[{info:{role:'assistant',finish:'stop',time:{completed:2}}}]},{approval:'deny'});
 assert.equal(value.action,'Prêt à recevoir une demande');
 assert.match(value.trace,/preuve d’exécution reste à vérifier/);
 assert.match(value.policy,/refusées par défaut/);
 assert.equal(value.canVerify,true);
});

test('Les états interrompus restent explicitement incomplets',()=>{
 const value=report({ready:true,queue:[],messages:[{info:{role:'assistant',finish:'error',time:{completed:2},error:{name:'Error'}}}]});
 assert.match(value.trace,/interrompu ou en erreur/);
});

function discard(state,decision=true){
 const start=source.indexOf('async function discardQueuedMessages(');
 const end=source.indexOf('\nfunction paintNativeOperationCard(',start);
 assert.ok(start>=0&&end>start,'discardQueuedMessages is present');
 let saved=0,rendered=0,prompt='';
 const ctx=vm.createContext({corpusConfirm:async text=>{prompt=text;return decision;},nativeSave:()=>saved++,nativeRender:()=>rendered++});
 vm.runInContext(source.slice(start,end),ctx);
 return ctx.discardQueuedMessages(state).then(value=>({value,saved,rendered,prompt}));
}

test('Annuler la file requiert une décision explicite et ne déclenche aucun envoi',async()=>{
 const state={queue:[{id:'a'},{id:'b'}],paused:false,notice:''};
 const result=await discard(state,true);
 assert.equal(result.value,true);
 assert.equal(state.queue.length,0);
 assert.equal(state.paused,true);
 assert.match(state.notice,/aucune nouvelle demande envoyée/);
 assert.equal(result.saved,1);
 assert.equal(result.rendered,1);
 assert.match(result.prompt,/2 messages en attente/);
});

test('Refuser l’annulation conserve intégralement la file',async()=>{
 const state={queue:[{id:'a'}],paused:false,notice:''};
 const result=await discard(state,false);
 assert.equal(result.value,false);
 assert.equal(state.queue.length,1);
 assert.equal(result.saved,0);
 assert.equal(result.rendered,0);
});
