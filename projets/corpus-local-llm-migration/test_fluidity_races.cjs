'use strict';
// Delayed APIs/FileReader exercise production closures without opening a browser,
// starting the model, modifying user storage or sending network requests.
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const source=readFileSync(__dirname+'/portal/app.js','utf8');
function production(name){
 const match=new RegExp('^(?:async )?function '+name+'\\(', 'm').exec(source);
 assert(match,'Missing production function '+name);
 const start=match.index,firstEnd=source.indexOf('\n',start);
 if(source.slice(start,firstEnd).endsWith('}'))return source.slice(start,firstEnd);
 const end=source.indexOf('\n}',firstEnd);assert(end>start,'Missing function end '+name);
 return source.slice(start,end+2);
}
function load(context,...names){for(const name of names)vm.runInContext(production(name),context);}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const copy=value=>JSON.parse(JSON.stringify(value));
class Element{
 constructor(tag,text,cls){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.dataset={};this.attributes={};this.style={};this.className=cls||'';this.textContent=text??'';this.value='';this.hidden=false;this.disabled=false;this.listeners=new Map();this.classList={add(){},remove(){},contains:()=>false,toggle(){}};}
 append(...nodes){for(const node of nodes){if(typeof node==='string')continue;node.remove();node.parentNode=this;this.children.push(node);}}
 prepend(...nodes){for(const node of nodes.reverse()){node.remove();node.parentNode=this;this.children.unshift(node);}}
 insertBefore(node,before){node.remove();const index=this.children.indexOf(before);node.parentNode=this;index<0?this.children.push(node):this.children.splice(index,0,node);}
 replaceWith(node){const parent=this.parentNode;if(parent){parent.insertBefore(node,this);this.remove();}}
 replaceChildren(...nodes){for(const node of this.children)node.parentNode=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,f){const list=this.listeners.get(k)||[];list.push(f);this.listeners.set(k,list);}
 getBoundingClientRect(){return {right:400,bottom:100};}
 dispatch(k,event={}){for(const f of this.listeners.get(k)||[])f(event);return this['on'+k]?.(event);}
 focus(){this.focused=true;}click(){return this.onclick?.({preventDefault(){},currentTarget:this});}
 closest(selector){for(let node=this;node;node=node.parentNode)if(selector==='form'&&node.tagName==='FORM'||selector==='dialog'&&node.tagName==='DIALOG')return node;return null;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){return this.descendants().filter(node=>selector.startsWith('#')?node.id===selector.slice(1):selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):node.tagName.toLowerCase()===selector);}
 descendants(){return this.children.flatMap(node=>[node,...node.descendants()]);}
 get isConnected(){for(let node=this;node;node=node.parentNode)if(node.tagName==='BODY')return true;return false;}
 get childNodes(){return this.children;}
 requestSubmit(){return this.onsubmit?.({preventDefault(){}});}
 showModal(){this.open=true;}close(){this.open=false;this.dispatch('close');}
}
function fixture(overrides={}){
 const body=new Element('body'),main=new Element('main'),header=new Element('header'),workspace=new Element('div',undefined,'workspace');body.append(main);main.append(header,workspace);
 const elements={body,main,header,workspace},storage=new Map(),api=[],readers=[],renders=[];let uuid=0;
 const doc={body,createElement:tag=>new Element(tag),getElementById:id=>body.descendants().find(n=>n.id===id)||null,querySelector:selector=>selector==='main'?main:selector==='main>header'?header:selector==='.workspace'?workspace:body.querySelector(selector),querySelectorAll:selector=>body.querySelectorAll(selector),addEventListener(){}};
 for(const id of ['chat','detail','current-title','history','history-messages']){const n=new Element('div');n.id=id;workspace.append(n);}
 class Reader{readAsDataURL(file){this.file=file;readers.push(this);}finish(value='data:image/png;base64,YQ=='){this.result=value;this.onload?.();}}
 const c=vm.createContext({Promise,Map,Set,Date,JSON,URL,AbortSignal,console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:doc,$:id=>doc.getElementById(id),el:(tag,text,cls)=>new Element(tag,text,cls),nativeSessions:new Map(),nativeCurrent:null,library:{root:'/Corpus',threads:[],documents:[]},locals:[{id:'A',directory:'/Corpus/A'},{id:'B',directory:'/Corpus/B'}],crypto:{randomUUID:()=>String(++uuid)},FileReader:Reader,agentConfig:{reasoning:'direct'},generalSettings:{sendKey:'enter',followup:'queue'},CorpusPersonalization:{context:()=>'',collect:()=>false},personalization:{},persistPersonalization(){},notifyCorpusCompletion(){},temporalContext:()=>'',agentResponseInstructions:()=>'',installChatOptions(){},iconButton(){},settingsIcon:()=>new Element('span'),refreshChatChanges(){},installChatScrollGuide:()=>()=>{},installInlineDictation(){},generalShouldSend:()=>false,nativeRender:s=>renders.push(s.id),nativeRefresh:async s=>{s.ready=true;},nativeApi:async(s,path,data)=>{api.push({id:s.id,path,data});return [];},installComposerExtras(s,form,input,toolbar,attach,file,addImages){s.mediaAdd=addImages;},requestSerial:0,historyRequest:0,history:{replaceState(){}},render(){},status(){},rememberConversation(){},loadHistory(){},sessionUrl:id=>'/session/'+id,subagentsBusy:()=>false,corpusHelpDialog(){const dialog=new Element('dialog'),content=new Element('div');dialog.append(content);body.append(dialog);return content;},...overrides});
 load(c,'normalizeNativeDocuments','nativeDocumentContext','nativeDocumentAttachments','nativeState','nativeSave','nativePump');
 if(source.includes('function createConversationComposer('))load(c,'createConversationComposer');
 load(c,'openNativeConversation');
 function open(id){c.openNativeConversation(id);return {state:c.nativeState(id),input:doc.getElementById('native-input'),form:doc.getElementById('native-input').closest('form'),stop:doc.getElementById('native-stop')};}
 return {c,open,api,storage,readers,renders,elements,doc};
}
const image={name:'pixel.png',mime:'image/png',url:'data:image/png;base64,YQ=='};
const imported={name:'notes.pdf',path:'/Corpus/.dev-local/corpus-attachments/'+ 'a'.repeat(64)+'/original.pdf',textPath:'/Corpus/.dev-local/corpus-attachments/'+ 'a'.repeat(64)+'/content.txt',preview:'REFERENCE ALPHA',characters:15};

test('Write, erase and navigate preserve only the latest draft of each session',()=>{
 const {open,storage}=fixture();let a=open('A');a.input.value='secret draft';a.input.oninput();a.input.value='';a.input.oninput();
 const b=open('B');b.input.value='draft B';b.input.oninput();a=open('A');assert.equal(a.input.value,'');
 assert.equal(JSON.parse(storage.get('corpus.queue.A')).draft,'');assert.equal(open('B').input.value,'draft B');
});

test('Double submit queues and transmits one immutable message',async()=>{
 const gate=deferred(),requests=[];const {open}=fixture({nativeApi:(s,path,data)=>{requests.push({id:s.id,path,data});return gate.promise;}});
 const a=open('A');a.input.value='Send once';a.input.oninput();const first=a.form.requestSubmit(),second=a.form.requestSubmit();await flush();
 assert.equal(requests.length,1);assert.equal(a.state.queue.length,1);assert.equal(a.input.value,'');gate.resolve();await Promise.all([first,second]);assert.equal(a.state.queue.length,0);
});

test('Typing and queuing another message during a pending send preserves FIFO and both texts',async()=>{
 const gate=deferred(),requests=[];const {c,open}=fixture({nativeApi:(s,path,data)=>{requests.push(data.parts[0].text);return requests.length===1?gate.promise:Promise.resolve();}});
 const a=open('A');a.input.value='First';const first=a.form.requestSubmit();await flush();a.input.value='Second';await a.form.requestSubmit();
 assert.deepEqual(copy(a.state.queue.map(x=>x.text)),['First','Second']);assert.deepEqual(requests,['First']);gate.resolve();await first;
 assert.deepEqual(copy(a.state.queue.map(x=>x.text)),['Second']);a.state.busy=false;a.state.notBefore=0;await c.nativePump(a.state);assert.deepEqual(requests,['First','Second']);
});

test('A delayed send settles only its original conversation after navigation',async()=>{
 const gate=deferred(),requests=[];const {open}=fixture({nativeApi:(s,path,data)=>{requests.push({id:s.id,path,data});return gate.promise;}});
 const a=open('A');a.input.value='Message A';const sending=a.form.requestSubmit();await flush();const b=open('B');b.input.value='Keep draft B';b.input.oninput();
 gate.resolve();await sending;assert.equal(requests[0].id,'A');assert.equal(b.state.draft,'Keep draft B');assert.equal(b.state.queue.length,0);assert.equal(b.input.value,'Keep draft B');
});

test('A delayed stop targets its captured session and preserves the other session',async()=>{
 const gate=deferred(),requests=[];const {open}=fixture({nativeApi:(s,path)=>{requests.push([s.id,path]);return gate.promise;}});
 const a=open('A');a.state.busy=true;const stopping=a.stop.onclick();const b=open('B');b.state.busy=true;
 gate.resolve();await stopping;assert.deepEqual(requests,[['A','/abort']]);assert.equal(a.state.paused,true);assert.equal(b.state.paused,true);assert.equal(b.state.busy,true);
});

test('An uncertain send preserves its attachments and pauses instead of retrying silently',async()=>{
 const {open,c,api}=fixture();c.nativeApi=async(s,path,data)=>{api.push({id:s.id,path,data});throw Error('connection lost after upload');};
 const a=open('A');a.state.images=[image];a.state.documents=[imported];a.input.value='Review attachments';await a.form.requestSubmit();
 assert.equal(a.state.paused,true);assert.equal(a.state.queue.length,1);assert.equal(a.state.queue[0].images[0].name,image.name);assert.equal(a.state.queue[0].documents[0].path,imported.path);assert.match(a.state.notice,/non confirmé/);
 await c.nativePump(a.state);assert.equal(api.length,1);
});

test('Reload retains queued file identities and draft attachments, without automatic replay',()=>{
 const first=fixture(),a=first.open('A');a.state.queue=[{id:'queued',text:'Read',images:[image],documents:[imported]}];a.state.images=[image];a.state.documents=[imported];a.state.draft='Next';first.c.nativeSave(a.state);
 const second=fixture({localStorage:{getItem:k=>first.storage.get(k),setItem(){}}}),restored=second.open('A').state;
 assert.equal(restored.paused,true);assert.equal(restored.queue[0].documents[0].path,imported.path);assert.equal(restored.images[0].url,image.url);assert.equal(restored.documents[0].path,imported.path);assert.equal(restored.draft,'Next');assert.equal(second.api.length,0);
});

test('Sending while image bytes are still loading cannot drop the chosen attachment',async()=>{
 const {open,readers,api}=fixture();const a=open('A');a.input.value='Describe the chosen image';const adding=a.state.mediaAdd([{name:'slow.png',type:'image/png',size:1}]);
 await a.form.requestSubmit();assert.equal(api.length,0,'Do not send the text before its chosen image is ready');assert.equal(a.input.value,'Describe the chosen image');
 readers[0].finish();await adding;await a.form.requestSubmit();assert.equal(api.length,1);assert.equal(api[0].data.parts.filter(x=>x.type==='file').length,1);
});

test('Concurrent image reads enforce the attachment limit after both promises resolve',async()=>{
 const {open,readers}=fixture();const a=open('A');a.state.images=Array.from({length:11},(_,i)=>({...image,name:'kept-'+i+'.png'}));
 const one=a.state.mediaAdd([{name:'one.png',type:'image/png',size:1}]),two=a.state.mediaAdd([{name:'two.png',type:'image/png',size:1}]);
 readers[0].finish();readers[1]?.finish();await Promise.all([one,two]);assert.equal(a.state.images.length,12);
});

test('A delayed image is visible after leaving and reopening the owning conversation',async()=>{
 const {open,readers,doc}=fixture();const a=open('A'),adding=a.state.mediaAdd([{name:'slow.png',type:'image/png',size:1}]);open('B');open('A');
 readers[0].finish();await adding;assert.equal(doc.getElementById('native-input').closest('form').querySelectorAll('img').length,1,'Render into the current owner form, not its detached predecessor');
});

test('A late media insertion appends to the latest owner draft without overwriting newer typing',()=>{
 const f=fixture();f.c.installComposerApproval=()=>{};f.c.corpusIcon=()=>new Element('span');f.c.metadataJSON=async()=>({plugins:[]});f.c.window={};f.c.availableConversations=()=>[];
 load(f.c,'installComposerExtras');const a=f.open('A');a.input.value='Old';a.input.oninput();const oldAppend=a.state.mediaAppend;f.open('B');const reopened=f.open('A');reopened.input.value='New text';reopened.input.oninput();oldAppend('Media result');
 assert.equal(reopened.state.draft,'New text\n\nMedia result');assert.equal(reopened.input.value,'New text\n\nMedia result');
});

test('Stopping during a pending prompt also stops a prompt accepted after the first abort',async()=>{
 const gate=deferred(),requests=[];const {open}=fixture({nativeApi:(s,path)=>{requests.push(path);return path==='/prompt_async'?gate.promise.then(()=>{requests.push('accepted');}):Promise.resolve();}});
 const a=open('A');a.input.value='Slow transmission';const sending=a.form.requestSubmit();await flush();const stopping=a.stop.onclick();await flush();
 gate.resolve();await Promise.all([sending,stopping]);assert.equal(a.state.paused,true);assert(requests.lastIndexOf('/abort')>requests.indexOf('accepted'),'An abort must be issued after acceptance, even when an earlier abort raced upload');
});

test('Creating a conversation cannot replace a later user-selected conversation',async()=>{
 const gate=deferred(),opened=[];const c=vm.createContext({library:{root:'/Corpus'},locals:[],requestSerial:0,nativeCurrent:null,agentConfig:{reasoning:'direct'},agentSessionDefaults:()=>({}),fetchJSON:()=>gate.promise,status(){},render(){},openSession:id=>opened.push(id)});load(c,'start');
 const button={disabled:false},creating=c.start(null,null,button);c.requestSerial++;c.nativeCurrent='B';gate.resolve({id:'A',title:'Conversation Corpus'});await creating;
 assert.deepEqual(opened,[]);assert.equal(c.locals.some(s=>s.id==='A'),true,'Created session remains discoverable');assert.equal(button.disabled,false);
});

test('Native API uses the captured session directory even when another session is current',async()=>{
 const requests=[],f=fixture({fetch:async(url,options)=>{requests.push({url,options});return {ok:true,status:204};}});load(f.c,'nativeApi');f.c.nativeCurrent='B';await f.c.nativeApi(f.c.nativeState('A'),'/abort',{});
 assert.equal(requests[0].url,'/session/A/abort');assert.equal(requests[0].options.headers['x-opencode-directory'],'/Corpus/A');
});

test('Configuration changes apply immediately and persist; rejected storage stays explicitly temporary',()=>{
 const f=fixture();load(f.c,'drawAgentConfiguration');const content=new Element('article');f.c.drawAgentConfiguration(content);
 const access=content.descendants().find(n=>n.getAttribute('aria-label')==='Accès aux fichiers');access.value='read';access.onchange();
 assert.equal(f.c.agentConfig.access,'read');assert.equal(JSON.parse(f.storage.get('corpus.agent-config.v1')).access,'read');
 f.c.localStorage.setItem=()=>{throw Error('quota');};access.value='project';access.onchange();assert.equal(f.c.agentConfig.access,'project');assert(content.descendants().some(n=>/cet onglet uniquement/.test(n.textContent)));
});

function landingFixture(overrides={}){
 const f=fixture({Option:function(text,value){const node=new Element('option',text);node.value=value;return node;},corpusIcon:()=>new Element('span'),chatAction:async()=>({branch:'main'}),metadataJSON:async()=>({projects:[]}),agentSessionDefaults:()=>({}),fetchJSON:async()=>({id:'created',title:'Conversation Corpus'}),...overrides});
 f.c.openSession=id=>{f.c.requestSerial++;f.open(id);};f.c.landingDraft=null;load(f.c,'start','landingState','renderLanding');f.c.renderLanding();
 return {...f,state:f.c.landingState(),input:f.doc.getElementById('landing-input'),form:f.doc.getElementById('landing-input').closest('form')};
}

test('Home creates no backend session until a non-empty request is submitted',async()=>{
 const requests=[],f=landingFixture({fetchJSON:async(...args)=>{requests.push(args);return {id:'created'};}});await flush();assert.equal(requests.length,0);await f.form.requestSubmit();assert.equal(requests.length,0);assert.equal(f.api.length,0);assert.equal(f.c.nativeSessions.has('landing'),false,'The home draft is excluded from backend polling');
});

test('Home double-click sends one captured request to the returned session',async()=>{
 const gate=deferred(),requests=[],f=landingFixture({fetchJSON:(...args)=>{requests.push(args);return gate.promise;}});f.input.value='First request';f.input.oninput();f.state.images=[image];f.state.documents=[imported];
 const first=f.form.requestSubmit(),second=f.form.requestSubmit();await flush();assert.equal(requests.length,1);gate.resolve({id:'created',title:'Created'});await Promise.all([first,second]);
 assert.equal(f.api.length,1);assert.equal(f.api[0].id,'created');assert.equal(f.api[0].data.parts[0].text,'First request');assert.equal(f.api[0].data.parts.filter(p=>p.type==='file').length,1);assert.equal(f.api[0].data.parts.find(p=>p.synthetic).metadata.corpusDocuments[0].path,imported.path);
});

test('Late home creation leaves a later chat active and keeps new home typing and attachments',async()=>{
 const gate=deferred(),f=landingFixture({fetchJSON:()=>gate.promise});f.input.value='Captured first request';f.input.oninput();f.state.images=[image];const sending=f.form.requestSubmit();
 const later={...image,name:'later.png'},laterDoc={...imported,name:'later.pdf',path:imported.path.replaceAll('a'.repeat(64),'b'.repeat(64)),textPath:imported.textPath.replaceAll('a'.repeat(64),'b'.repeat(64))};
 f.input.value='Keep the new draft';f.input.oninput();f.state.images.push(later);f.state.documents=[laterDoc];f.c.requestSerial++;const b=f.open('B');b.input.value='Draft B';b.input.oninput();
 gate.resolve({id:'created',title:'Created'});await sending;
 assert.equal(f.c.nativeCurrent,'B');assert.equal(b.state.draft,'Draft B');assert.equal(f.state.draft,'Keep the new draft');assert.deepEqual(copy(f.state.images).map(x=>x.name),['later.png']);assert.equal(f.state.documents[0].name,'later.pdf');assert.equal(f.api[0].id,'created');assert.equal(f.api[0].data.parts[0].text,'Captured first request');assert.equal(f.api[0].data.parts.filter(p=>p.type==='file').length,1);
});

test('Failed home creation preserves its text and file choices for an explicit retry',async()=>{
 const f=landingFixture({fetchJSON:async()=>{throw Error('starting');}});f.input.value='Keep on error';f.input.oninput();f.state.images=[image];f.state.documents=[imported];await f.form.requestSubmit();
 assert.equal(f.state.draft,'Keep on error');assert.equal(f.state.images[0].url,image.url);assert.equal(f.state.documents[0].path,imported.path);assert.equal(f.api.length,0);assert.equal(f.state.creating,false);assert.equal(f.doc.getElementById('landing-send').disabled,false);
});

test('Closing a document preview leaves the draft unchanged; joining uses only the explicit button',()=>{
 const f=fixture(),joins=[];load(f.c,'openImportedDocument');const cancelled=f.c.openImportedDocument(imported,doc=>joins.push(doc));cancelled.close();assert.equal(joins.length,0);
 const joined=f.c.openImportedDocument(imported,doc=>joins.push(doc));joined.querySelector('.document-join').click();assert.equal(joins.length,1);assert.equal(joins[0].path,imported.path);assert.equal(joined.open,false);
});

test('Detached configuration diagnostics cannot overwrite another settings page',async()=>{
 const gate=deferred(),f=fixture({fetchJSON:()=>gate.promise});load(f.c,'drawAgentConfiguration');const old=new Element('article'),next=new Element('article','Current page');f.elements.body.append(old);f.c.drawAgentConfiguration(old);const button=old.descendants().find(n=>n.textContent==='Diagnostiquer');const pending=button.onclick();old.remove();f.elements.body.append(next);gate.resolve({all:[]});await pending;assert.equal(next.textContent,'Current page');assert.equal(next.children.length,0);assert.equal(button.disabled,false);
});

function metadataFactory(){const c=vm.createContext({Map,Promise,structuredClone,Date});load(c,'createMetadataCache');return c.createMetadataCache;}
test('Concurrent metadata consumers share one read and receive independently mutable copies',async()=>{
 const gate=deferred(),calls=[],cache=metadataFactory()(url=>{calls.push(url);return gate.promise;});const first=cache.get('/projects'),second=cache.get('/projects');await flush();assert.deepEqual(calls,['/projects']);const original={projects:[{name:'Corpus'}]};gate.resolve(original);const [a,b]=await Promise.all([first,second]);a.projects[0].name='Changed';original.projects[0].name='External mutation';assert.equal(b.projects[0].name,'Corpus');assert.equal((await cache.get('/projects')).projects[0].name,'Corpus');
});

test('Metadata cache isolates URLs and expires from completed reads rather than request start',async()=>{
 let time=0;const gate=deferred(),calls=[],cache=metadataFactory()(url=>{calls.push(url);return url==='/slow'&&calls.filter(x=>x===url).length===1?gate.promise:Promise.resolve({url});},()=>time);
 const initial=cache.get('/slow');await flush();time=40000;gate.resolve({url:'/slow'});await initial;await cache.get('/other');time=69999;await cache.get('/slow');assert.deepEqual(calls,['/slow','/other']);time=70000;await cache.get('/slow');assert.deepEqual(calls,['/slow','/other','/slow']);
});

test('Failed metadata reads reject all waiters and can be retried immediately',async()=>{
 let calls=0;const gate=deferred(),cache=metadataFactory()(()=>++calls===1?gate.promise:Promise.resolve({ok:true}));const first=cache.get('/projects'),second=cache.get('/projects');const caught=Promise.allSettled([first,second]);gate.reject(Error('temporarily offline'));const results=await caught;assert(results.every(x=>x.status==='rejected'));assert.equal(calls,1);assert.equal((await cache.get('/projects')).ok,true);assert.equal(calls,2);
});

test('Invalidation during a pending read prevents its late result from replacing fresh metadata',async()=>{
 const old=deferred(),fresh=deferred();let calls=0;const cache=metadataFactory()(()=>++calls===1?old.promise:fresh.promise);const a=cache.get('/projects');await flush();cache.clear();const b=cache.get('/projects');await flush();fresh.resolve({version:2});assert.equal((await b).version,2);old.resolve({version:1});assert.equal((await a).version,1);assert.equal((await cache.get('/projects')).version,2);assert.equal(calls,2);
});

test('An invalidated old metadata failure cannot evict a newer successful entry',async()=>{
 const old=deferred();let calls=0;const cache=metadataFactory()(()=>++calls===1?old.promise:Promise.resolve({version:2}));const a=cache.get('/projects');const observed=a.catch(e=>e.message);await flush();cache.clear();assert.equal((await cache.get('/projects')).version,2);old.reject(Error('old failure'));assert.equal(await observed,'old failure');assert.equal((await cache.get('/projects')).version,2);assert.equal(calls,2);
});

test('Only mutating JSON API requests invalidate metadata; failed mutations also invalidate stale state',async()=>{
 let clears=0;const requests=[],c=vm.createContext({metadataCache:{clear:()=>clears++},fetch:async(url,options)=>{requests.push([url,options]);return {ok:options.method!=='DELETE',status:503,json:async()=>({ok:true})};}});load(c,'localApiError','fetchJSON');
 await c.fetchJSON('/read');await c.fetchJSON('/read',{method:'GET'});assert.equal(clears,0);await c.fetchJSON('/write',{method:'POST'});assert.equal(clears,1);await assert.rejects(c.fetchJSON('/delete',{method:'DELETE'}));assert.equal(clears,2);assert.equal(requests.length,4);
});

function bootstrapFixture(fetcher){
 const gates={index:deferred(),sessions:deferred(),metadata:deferred()},requests=[],routes=[],timers=[];
 const c=vm.createContext({Promise,URL,Set,AbortSignal,window:{},entryPath:'/corpus/index.html',location:{origin:'http://127.0.0.1:18743'},settingsCategories:[],document:{body:{removeAttribute(){}}},$:()=>null,requestSerial:0,bootstrapInFlight:null,bootstrapRetry:null,locals:[{id:'created-in-between'}],library:null,startupStage(){},status(){},restoreLocalImports(){},render(){},recoverLocalSessions(){},routeInitialPage:()=>routes.push('route'),metadataJSON:()=>gates.metadata.promise,fetchJSON:(url,options)=>{requests.push({url,method:options?.method||'GET'});return fetcher?fetcher(url,options):url.includes('/data/index')?gates.index.promise:gates.sessions.promise;},clearTimeout(){},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;}});
 load(c,'bootstrapCorpus');return {c,gates,requests,routes,timers};
}

test('Concurrent bootstrap clicks coalesce reads and never replay conversation writes',async()=>{
 const f=bootstrapFixture(),a=f.c.bootstrapCorpus(),b=f.c.bootstrapCorpus();await flush();assert.equal(f.requests.length,1);f.gates.index.resolve({root:'/Corpus',threads:[],documents:[]});await flush();f.gates.sessions.resolve([{id:'saved'}]);f.gates.metadata.resolve({});await Promise.all([a,b]);assert.equal(f.requests.length,2);assert(f.requests.every(x=>x.method==='GET'));assert.equal(f.routes.length,1);assert.deepEqual(copy(f.c.locals).map(x=>x.id),['saved','created-in-between']);assert.equal(f.c.bootstrapInFlight,null);
});

test('Late bootstrap results preserve navigation and local drafts instead of re-opening the initial page',async()=>{
 const f=bootstrapFixture(),pending=f.c.bootstrapCorpus();f.c.requestSerial++;f.gates.index.resolve({root:'/Corpus',threads:[],documents:[]});f.gates.sessions.resolve([]);f.gates.metadata.resolve({});await pending;assert.equal(f.routes.length,0);assert(f.requests.every(x=>x.method==='GET'));assert.equal(f.c.locals[0].id,'created-in-between');
});

test('Bootstrap failure schedules a read-only retry and releases the in-flight lock',async()=>{
 const f=bootstrapFixture(async()=>{throw Error('not ready');});f.gates.metadata.resolve({});await f.c.bootstrapCorpus();assert.equal(f.c.bootstrapInFlight,null);assert.equal(f.routes.length,0);assert.equal(f.timers.length,1);assert.equal(f.timers[0].delay,5000);assert(f.requests.every(x=>x.method==='GET'));
});

test('Navigation home or to another session cancels active dictation before hiding its controls',()=>{
 for(const target of ['goHome','openSession']){
  let aborted=0;const f=fixture({inlineDictationActive:()=>aborted++,renderLanding(){}});load(f.c,target);
  const original=f.c.document.querySelector;f.c.document.querySelector=selector=>original(selector);
  f.c[target]('B');assert.equal(aborted,1,target+' must stop capture');
 }
});

test('Opening settings cancels dictation before making the underlying editor inert',()=>{
 let aborted=0;const f=fixture({inlineDictationActive:()=>aborted++,settingsCategories:[['Personal',[['general','Général']]]],archivePanelRefresh:null,stopVoiceCapture(){},preferenceWarning:'',drawGeneralSettings(){},location:{href:'http://127.0.0.1:18743/corpus/index.html'},closeSettings(){}});
 const sidebar=new Element('aside');f.elements.body.append(sidebar);const original=f.doc.querySelector;f.doc.querySelector=selector=>{if(selector==='body>.sidebar'){assert.equal(aborted,1);return sidebar;}if(selector==='body>main')return f.elements.main;return original(selector);};
 load(f.c,'openSettings');f.c.openSettings('general');assert.equal(aborted,1);assert.equal(sidebar.inert,true);assert.equal(f.elements.main.inert,true);
});

function queueFixture(){
 const f=fixture({nativeStatus:()=>'',installQueueDragHandle(){},installQueueMore(){}});const opened=f.open('A');load(f.c,'nativeRender');const one={id:'one',text:'Original',images:[],documents:[]},two={id:'two',text:'Next',images:[],documents:[]};opened.state.queue=[one,two];f.c.nativeRender(opened.state);return {...f,...opened,one,two};
}

test('An in-flight message disables its own controls but leaves other queued messages editable',()=>{
 const f=queueFixture();f.state.inFlightId='one';f.state.sending=true;f.c.nativeRender(f.state);const rows=f.doc.getElementById('native-queue').children;
 assert(rows[0].querySelectorAll('button').every(n=>n.disabled));assert(rows[1].querySelectorAll('button').every(n=>!n.disabled));assert.equal(f.state.queue.length,2);
 f.state.inFlightId=null;f.state.sending=false;f.c.nativeRender(f.state);assert(f.doc.getElementById('native-queue').children[0].querySelectorAll('button').every(n=>!n.disabled));
});

test('Old remove/edit callbacks cannot mutate an item once transmission has started',()=>{
 const f=queueFixture(),row=f.doc.getElementById('native-queue').children[0];const remove=row.querySelectorAll('button').find(n=>n.textContent==='Supprimer'),edit=row.querySelectorAll('button').find(n=>n.textContent==='Modifier');
 f.state.inFlightId='one';remove.onclick();edit.onclick();assert.equal(f.state.queue.length,2);assert.equal(f.doc.querySelectorAll('dialog').length,0);
});

test('An editor opened earlier cannot save modifications after its item starts transmitting',()=>{
 const f=queueFixture(),row=f.doc.getElementById('native-queue').children[0];row.querySelectorAll('button').find(n=>n.textContent==='Modifier').onclick();const dialog=f.doc.querySelector('dialog'),field=dialog.querySelector('textarea'),save=dialog.querySelector('.queue-edit-save');field.value='Too late';f.state.inFlightId='one';save.onclick();assert.equal(f.one.text,'Original');
 f.state.inFlightId=null;save.onclick();assert.equal(f.one.text,'Too late');
});

test('A stale queue menu cannot open a side chat after its item starts transmitting',async()=>{
 let opened=0;const f=fixture({corpusIcon:()=>new Element('span'),innerWidth:1280,innerHeight:720,openQueuedParallelChat:()=>opened++});f.doc.removeEventListener=()=>{};load(f.c,'installQueueMore');const item={id:'one',text:'Queued',images:[]},state={queue:[item]},row=new Element('div');f.elements.body.append(row);f.c.installQueueMore(state,item,row,new Element('button'),new Element('button'),new Element('button'));row.querySelector('.queue-more').click();const action=f.doc.querySelector('.queue-popover').children[1];state.inFlightId='one';await action.onclick();assert.equal(opened,0);assert.equal(f.doc.querySelector('.queue-popover'),null);
});
