'use strict';
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const source=readFileSync(__dirname+'/portal/app.js','utf8');
function production(name){const start=source.indexOf('function '+name+'(');assert(start>=0);const end=source.indexOf('\nfunction ',start+9);return source.slice(start,end<0?undefined:end);}
function harness(){
 let focus,prefs={name:'Corpus',sources:['/reference']},writes=0,rendered=0,confirmed=false;
 class Node{
  constructor(tag,text='',className=''){Object.assign(this,{tag,textContent:text||'',className,children:[],attributes:{},value:'',disabled:false});}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes[name]=value;}
  get isConnected(){return this===body||!!this.parent?.isConnected;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
  showModal(){this.open=true;}
  close(){this.open=false;this.onclose?.();}
  escape(){let cancelled=false;this.oncancel?.({preventDefault(){cancelled=true;}});if(!cancelled)this.close();}
  focus(){focus=this;}
  setCustomValidity(value){this.validityMessage=value;}
  reportValidity(){this.reported=true;}
 }
 const body=new Node('body');
 const ctx=vm.createContext({Set,document:{body},library:{root:'/Corpus'},el:(...args)=>new Node(...args),corpusIcon:()=>new Node('svg'),corpusProjectPrefs:()=>({...prefs,sources:[...prefs.sources]}),saveCorpusProjectPrefs:value=>{writes++;prefs=value;return true;},removeCorpusProject:()=>{if(confirmed){writes++;prefs={...prefs,hidden:true};}},render:()=>rendered++,fetchJSON:()=>{throw Error('Unexpected API call');}});
 for(const name of ['editCorpusProject','createPermanentProject'])vm.runInContext(production(name),ctx);
 const nodes=root=>[root,...root.children.flatMap(nodes)];
 return {ctx,body,nodes,get focus(){return focus;},get prefs(){return prefs;},get writes(){return writes;},get rendered(){return rendered;},set confirmed(value){confirmed=value;},dialog:()=>body.children.at(-1),find:(root,predicate)=>nodes(root).find(predicate),button:(root,text)=>nodes(root).find(node=>node.tag==='button'&&node.textContent===text),input:root=>nodes(root).find(node=>node.tag==='input'),form:root=>nodes(root).find(node=>node.tag==='form')};
}
const submit={preventDefault(){}};
test('Edit stages changes; Cancel and Escape leave project settings unchanged',()=>{
 const h=harness();h.ctx.editCorpusProject();let dialog=h.dialog();assert.equal(h.focus,h.input(dialog));
 h.input(dialog).value='Changed';h.find(dialog,n=>n.attributes['aria-label']==='Retirer /reference').onclick();
 h.button(dialog,'Annuler').onclick();assert.equal(h.writes,0);assert.deepEqual(h.prefs.sources,['/reference']);assert.equal(dialog.isConnected,false);
 h.ctx.editCorpusProject();dialog=h.dialog();h.input(dialog).value='Other';dialog.escape();assert.equal(h.writes,0);assert.equal(dialog.isConnected,false);
});
test('Edit validates the name and saves only once on explicit submit',()=>{
 const h=harness();h.ctx.editCorpusProject();const dialog=h.dialog(),name=h.input(dialog);name.value='   ';h.form(dialog).onsubmit(submit);
 assert.equal(h.writes,0);assert.equal(name.reported,true);assert.equal(dialog.open,true);
 name.value=' Renamed ';name.oninput();h.find(dialog,n=>n.attributes['aria-label']==='Retirer /reference').onclick();h.form(dialog).onsubmit(submit);
 assert.equal(h.writes,1);assert.equal(h.prefs.name,'Renamed');assert.deepEqual(JSON.parse(JSON.stringify(h.prefs.sources)),[]);assert.equal(dialog.isConnected,false);
});
test('Real folder picker request stages the returned source until saved',async()=>{
 const h=harness(),calls=[];h.ctx.fetchJSON=async(url,options)=>{calls.push([url,JSON.parse(options.body)]);return {path:'/new-source'};};h.ctx.editCorpusProject();const dialog=h.dialog();await h.button(dialog,'＋ Ajouter un dossier').onclick();
 assert.deepEqual(calls,[['/corpus/api/environments',{action:'pick-project'}]]);assert.equal(h.writes,0);assert(h.find(dialog,n=>n.attributes['aria-label']==='Retirer /new-source'));
 h.form(dialog).onsubmit(submit);assert.deepEqual(JSON.parse(JSON.stringify(h.prefs.sources)),['/reference','/new-source']);
});
test('Declining project removal preserves the open edit dialog',async()=>{
 const h=harness();h.ctx.editCorpusProject();const dialog=h.dialog();await h.button(dialog,'Supprimer le projet local').onclick();assert.equal(h.writes,0);assert.equal(dialog.open,true);
 h.confirmed=true;await h.button(dialog,'Supprimer le projet local').onclick();assert.equal(h.prefs.hidden,true);assert.equal(dialog.isConnected,false);
});
test('Permanent worktree submit is guarded while pending and refreshes projects after success',async()=>{
 const h=harness(),calls=[];let finish;h.ctx.fetchJSON=(url,options)=>{calls.push([url,JSON.parse(options.body)]);return new Promise(resolve=>finish=resolve);};h.ctx.createPermanentProject();const dialog=h.dialog();assert.equal(h.focus,h.input(dialog));
 h.input(dialog).value=' New tree ';const pending=h.form(dialog).onsubmit(submit);await h.form(dialog).onsubmit(submit);assert.equal(calls.length,1);assert.deepEqual(calls[0],['/corpus/api/worktrees',{action:'create',permanent:true,name:'New tree'}]);dialog.escape();assert.equal(dialog.open,true);
 finish({created:'/managed/new',warnings:[]});await pending;assert.equal(h.rendered,1);assert.equal(h.button(dialog,'Créé').disabled,true);assert.equal(h.writes,0);h.button(dialog,'Fermer').onclick();assert.equal(dialog.isConnected,false);
});
test('Cancelling permanent worktree dialog makes no request; failures remain retryable',async()=>{
 const h=harness();h.ctx.createPermanentProject();let dialog=h.dialog();dialog.escape();assert.equal(dialog.isConnected,false);
 h.ctx.fetchJSON=async()=>{throw Error('Unavailable');};h.ctx.createPermanentProject();dialog=h.dialog();await h.form(dialog).onsubmit(submit);assert.equal(h.button(dialog,'Créer').disabled,false);assert.equal(h.button(dialog,'Annuler').disabled,false);assert.equal(dialog.open,true);
});
