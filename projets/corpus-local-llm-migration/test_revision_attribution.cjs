'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(__dirname+'/portal/app.js','utf8');
function load(context,name){const start=source.indexOf('function '+name+'(');assert(start>=0);const next=source.indexOf('\nfunction ',start+9);vm.runInContext(source.slice(start,next<0?undefined:next),context);}
const diffs=[{file:'external.txt',additions:3,deletions:1,patch:'@@ -1 +1 @@\n-before\n+after'}];
const user=(id='user')=>({info:{id,role:'user',summary:{diffs}},parts:[{type:'text',text:'Aucun outil'}]});
const assistant=(id='answer',parts=[],parentID='user',completed=1)=>({info:{id,role:'assistant',parentID,time:{completed}},parts});
const tool=(status='completed',name='read')=>({type:'tool',tool:name,state:{status}});
const context=vm.createContext({});load(context,'turnObservedProjectChanges');const observed=context.turnObservedProjectChanges;

test('Snapshot patch alone never attributes concurrent changes to a tool-free answer',()=>{
 const answer=assistant('answer',[{type:'step-start'},{type:'text',text:'AUDIT_OK'},{type:'step-finish'},{type:'patch',files:['external.txt']}]);
 assert.equal(observed([user(),answer],answer),null);
});
test('A tool in another user turn never enables the current answer card',()=>{
 const old=assistant('old',[tool()],'old-user'),answer=assistant();
 assert.equal(observed([user('old-user'),old,user(),answer],answer),null);
});
test('A pending tool request is not evidence of execution',()=>{
 const answer=assistant('answer',[tool('pending','edit')]);assert.equal(observed([user(),answer],answer),null);
});
test('A response still streaming does not show a final snapshot card',()=>{
 const answer=assistant('answer',[tool('completed','edit')],'user',undefined);delete answer.info.time.completed;
 assert.equal(observed([user(),answer],answer),null);
});
test('Only the final assistant step shows observed changes after a tool ran',()=>{
 const step=assistant('step',[tool('completed','edit')]),answer=assistant(),messages=[user(),step,answer];
 assert.equal(observed(messages,step),null);assert.equal(observed(messages,answer),diffs);
});
test('Failed tools may have partial effects, but snapshots remain merely observed',()=>{
 const answer=assistant('answer',[tool('error','bash')]);assert.equal(observed([user(),answer],answer),diffs);
});
test('Missing or empty snapshot changes produce no card',()=>{
 const answer=assistant('answer',[tool()]);for(const parent of [{info:{id:'user',role:'user'}},{info:{id:'user',role:'user',summary:{diffs:[]}}}])assert.equal(observed([parent,answer],answer),null);
});
test('Remaining cards explicitly describe project observations without assigning authorship',()=>{
 class Node{constructor(tag,text='',className=''){Object.assign(this,{tag,textContent:text||'',className,children:[]});}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}}
 const c=vm.createContext({el:(...args)=>new Node(...args),corpusIcon:()=>new Node('svg')});load(c,'turnChangesCard');const card=c.turnChangesCard(diffs);
 const all=node=>[node,...node.children.flatMap(all)];assert(all(card).some(node=>node.textContent==='Changements observés dans le projet pendant cette réponse'));assert(card.title.includes('d’autres actions ou conversations'));
});
