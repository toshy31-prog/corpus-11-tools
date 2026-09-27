'use strict';
// Pure browser-side scope selection: no model, request, command, or storage.
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=readFileSync(__dirname+'/portal/app.js','utf8');
function production(name){
 const match=new RegExp('^function '+name+'\\(', 'm').exec(source);
 assert(match,'Missing production function '+name);
 const start=match.index, end=source.indexOf('\n}',start);
 assert(end>start,'Missing function end '+name);
 return source.slice(start,end+2);
}
function selector(){
 const context=vm.createContext({String,Set,Object});
 vm.runInContext(production('automaticToolNames'),context);
 vm.runInContext(production('conversationToolSnapshot'),context);
 return context;
}
test('Automatic scope stays empty for a conversational prompt',()=>{
 const c=selector();
 assert.deepEqual([...c.automaticToolNames('Explique ce sujet.')],[]);
 assert.deepEqual(JSON.parse(JSON.stringify(c.conversationToolSnapshot({},'Explique ce sujet.').tools)),{});
});
test('Automatic scope uses the smallest explicit local profile',()=>{
 const c=selector();
 assert.deepEqual([...c.automaticToolNames('Lis ce fichier et cherche dans le dossier.')],['glob','grep','read']);
 assert.deepEqual([...c.automaticToolNames('Modifie le fichier et lance le test.')],['bash','edit','read']);
});
test('Automatic scope composes explicit research and memory only',()=>{
 const c=selector();
 assert.deepEqual([...c.automaticToolNames('Cherche des sources externes sur internet et consulte la mémoire.')],['corpus-retrieval_memory_search','corpus-tools_research_request','corpus-tools_research_result']);
});
test('A manual conversation mask remains authoritative',()=>{
 const c=selector();
 const snapshot=c.conversationToolSnapshot({conversationTools:{read:true,edit:false,bash:true}},'Modifie et cherche sur internet');
 assert.equal(snapshot.mode,'manual');
 assert.deepEqual(JSON.parse(JSON.stringify(snapshot.tools)),{bash:true,edit:false,read:true});
});
