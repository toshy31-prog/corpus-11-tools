'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync(__dirname+'/portal/app.js','utf8');
function harness(){
 let focus;
 class Node{
  constructor(tag,text,cls){Object.assign(this,{tag,textContent:text,className:cls,children:[],attrs:{},events:{}});}
  append(...nodes){nodes.forEach(n=>{n.parent=this;this.children.push(n);});}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,v){this.events[k]=v;}
  showModal(){this.open=true;}
  close(){this.open=false;this.events.close?.();}
  remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
  focus(){focus=this;}
  select(){this.selected=true;}
 }
 const body=new Node('body');const ctx=vm.createContext({Promise,document:{body},el:(...a)=>new Node(...a)});
 vm.runInContext(source.slice(source.indexOf('function corpusInputDialog('),source.indexOf('function corpusHelpDialog('))+'\nthis.ask=corpusPrompt;this.confirm=corpusConfirm;',ctx);
 const nodes=root=>[root,...root.children.flatMap(nodes)];
 return {ctx,body,get focus(){return focus;},dialog:()=>body.children.at(-1),find:(tag)=>nodes(body).find(n=>n.tag===tag),button:text=>nodes(body).find(n=>n.tag==='button'&&n.textContent===text)};
}
test('Prompt keeps initial value; cancellation resolves null without native browser dialogs',async()=>{
 const h=harness(),pending=h.ctx.ask('Nom du chat','Ancien');assert.equal(h.find('input').value,'Ancien');assert.equal(h.focus,h.find('input'));h.find('input').value='Non sauvegardé';h.button('Annuler').onclick();assert.equal(await pending,null);assert.equal(h.body.children.length,0);
});
test('Prompt validates blank name and resolves only explicit form submission',async()=>{
 const h=harness(),pending=h.ctx.ask('Nom');h.find('input').value='  ';h.find('form').onsubmit({preventDefault(){}});assert.equal(h.dialog().open,true);h.find('input').value='Nouveau';h.find('form').onsubmit({preventDefault(){}});assert.equal(await pending,'Nouveau');assert.equal(h.body.children.length,0);
});
test('Sensitive confirmation defaults to cancel; only explicit submit returns true',async()=>{
 const h=harness();let pending=h.ctx.confirm('Action ?');assert.equal(h.focus,h.button('Annuler'));h.dialog().close();assert.equal(await pending,false);pending=h.ctx.confirm('Action ?');h.find('form').onsubmit({preventDefault(){}});assert.equal(await pending,true);
});
test('Production no longer invokes unsupported blocking browser prompts or confirms',()=>{
 assert.doesNotMatch(source,/\b(?:prompt|confirm)\s*\(/);
});
