import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import planGuard from './plan_guard.mjs';

// Independent contract tests. The production functions run against an in-memory
// API; no model, service, network access or persistent user data is involved.
const appSource = fs.readFileSync(new URL('./portal/app.js', import.meta.url), 'utf8');
const clone = value => structuredClone(value);
const user = (id, created) => ({info: {id, role: 'user', time: {created}}, parts: []});
const answer = (id, parentID, completed, text='Ancien résultat') => ({
  info: {id, parentID, role: 'assistant', finish: 'stop', time: {created: completed - 10, completed}},
  parts: [{type: 'text', text}],
});
const child = {id: 'ses_child', parentID: 'ses_parent', title: 'Sous-travail', time: {created: 100, updated: 200}};
const oldMessages = [user('usr_1', 100), answer('asst_1', 'usr_1', 200)];
function taskMessage(callID, status, start, end) {
  return {info: {id: 'parent_'+callID, role: 'assistant', parentID: 'usr_parent'}, parts: [{
    id: 'part_'+callID, callID, type: 'tool', tool: 'task',
    state: {status, time: {start, ...(end ? {end} : {})}, metadata: {sessionId: child.id}, input: {description: 'Analyse bornée'}},
  }]};
}
function frontendContext(fetchJSON=async()=>{throw Error('Unexpected API call');}, fetchPage) {
  const start = appSource.indexOf('// Sous-agents natifs :');
  const end = appSource.indexOf('function subagentAvatar(', start);
  assert.ok(start>=0 && end>start, 'Production subagent functions are present');
  const fetch = fetchPage || (async path=>({ok:true,json:async()=>fetchJSON(path),headers:{get:()=>null}}));
  const box = {fetchJSON, fetch, AbortSignal, Date, console, toolActivity: p=>p.tool, chatProject: ()=>'/project',localApiError:code=>Error('HTTP '+code)};
  vm.createContext(box);
  vm.runInContext(appSource.slice(start,end)+ '\nrenderSubagentSurfaces=()=>{};globalThis.api={subagentState,refreshSubagents,subagentGroup,readSubagentMessages,mergeSubagentMessages,loadOlderSubagentMessages};',box);
  return box.api;
}

test('subagent live activity and permissions override an old completed answer', () => {
  const api=frontendContext();
  assert.equal(api.subagentState(child,oldMessages,{type:'busy'},[]).state,'running');
  assert.equal(api.subagentState(child,oldMessages,{type:'retry',message:'Nouvel essai'},[]).state,'retry');
  assert.equal(api.subagentState(child,oldMessages,{type:'busy'},[{id:'perm_1',sessionID:child.id}]).state,'permission');
});

test('a new child user turn cannot inherit the previous completed result', () => {
  const api=frontendContext();
  const state=api.subagentState(child,[...oldMessages,user('usr_2',300)],undefined,[]);
  assert.notEqual(state.state,'completed');
  assert.equal(state.end,null);
});

test('failure and cancellation remain distinct from a successful child result', () => {
  const api=frontendContext();
  for(const name of ['UnknownError','AbortedError']) {
    const rows=[...oldMessages,user('usr_2',300),{
      info:{id:'asst_2',parentID:'usr_2',role:'assistant',time:{created:310,completed:320},error:{name,data:{message:name}}},parts:[],
    }];
    assert.notEqual(api.subagentState(child,rows,undefined,[]).state,'completed');
  }
});

test('resuming the same task ID invalidates a completed child cache before status catches up', async () => {
  let reads=0;
  const resumedMessages=[...oldMessages,user('usr_2',300)];
  const api=frontendContext(async path=>{
    if(path.endsWith('/children'))return [clone(child)];
    if(path==='/permission')return [];
    if(path.includes('/message')){reads++;return clone(resumedMessages);}
    throw Error('Unexpected API '+path);
  });
  const group=api.subagentGroup('ses_parent');
  const previousTask=taskMessage('old','completed',100,200);
  group.children=[clone(child)];
  group.records.set(child.id,{
    ...api.subagentState(child,oldMessages,undefined,[],[previousTask]),
    session:clone(child),messages:clone(oldMessages),updated:200,readError:'',detailDirty:false,
  });
  await api.refreshSubagents({id:'ses_parent',messages:[previousTask,taskMessage('new','running',300)]},{});
  assert.equal(reads,1,'New parent task invocation requires a fresh child history even with unchanged session timestamp');
  const current=group.records.get(child.id);
  assert.notEqual(current.state,'completed','Old success is not reused for a new invocation');
  assert.equal(current.messages.at(-1).info.id,'usr_2');
});

test('native message pagination uses the opaque response cursor and deduplicates overlapping pages',async()=>{
  const requests=[];
  const cursor='eyJpZCI6Im1zZy_opaque+/=';
  const api=frontendContext(undefined,async path=>{
    requests.push(path);
    return {ok:true,json:async()=>[user('usr_0',50),clone(oldMessages[0])],headers:{get:name=>name==='X-Next-Cursor'?null:null}};
  });
  const group=api.subagentGroup('ses_parent');
  group.records.set(child.id,{session:clone(child),messages:clone(oldMessages),nextCursor:cursor});
  await api.loadOlderSubagentMessages(group,child.id);
  assert.equal(requests[0],'/session/ses_child/message?limit=100&before='+encodeURIComponent(cursor));
  const record=group.records.get(child.id);
  assert.deepEqual(Array.from(record.messages,row=>row.info.id),['usr_0','usr_1','asst_1']);
  assert.equal(record.nextCursor,null);
  assert.equal(record.historyLoaded,true);
});

test('a failed older-page read preserves the existing child history and cursor',async()=>{
  const api=frontendContext(undefined,async()=>({ok:false,status:503}));
  const group=api.subagentGroup('ses_parent');
  group.records.set(child.id,{session:clone(child),messages:clone(oldMessages),nextCursor:'opaque'});
  await api.loadOlderSubagentMessages(group,child.id);
  assert.equal(group.historyError,'HTTP 503');
  assert.equal(group.records.get(child.id).nextCursor,'opaque');
  assert.deepEqual(group.records.get(child.id).messages,oldMessages);
});

test('native task failure overrides final text, while a later successful resumed turn supersedes the old failure',()=>{
  const api=frontendContext();
  const failed=taskMessage('failed','error',100,210);
  assert.equal(api.subagentState(child,oldMessages,undefined,[],[failed]).state,'error');
  const next=[...oldMessages,user('usr_2',300),answer('asst_2','usr_2',400,'Résultat repris')];
  assert.equal(api.subagentState(child,next,undefined,[],[failed,taskMessage('new','completed',300,410)]).state,'completed');
});

const mission = () => ({description:'Contrôle local borné',prompt:'Lis le fichier README.md et relève ses sections.',subagent_type:'corpus-worker'});
function guardFixture(count=1) {
  const parent={id:'ses_parent',directory:'/project',projectID:'prj_1',agent:'corpus',permission:[]};
  const sessions=new Map([[parent.id,parent]]),histories=new Map(),updates=[];
  const rows=[{info:{id:'usr_1',role:'user',agent:'corpus'},parts:[]}];
  for(let index=1;index<=count;index++)rows.push({
    info:{id:'msg_'+String(index).padStart(3,'0'),role:'assistant',agent:'corpus',parentID:'usr_1',time:{created:index}},
    parts:[{id:'prt_'+String(index).padStart(3,'0'),callID:'call'+index,type:'tool',tool:'task',state:{status:'running',input:mission()}}],
  });
  histories.set(parent.id,rows);
  const calls=[];
  const client={session:{
    async get(request){calls.push(['get',clone(request)]);const result=sessions.get(request.path.id);if(fixture.onGet)await fixture.onGet(request.path.id);return result?{data:clone(result)}:{error:{message:'not found'}};},
    async messages(request){calls.push(['messages',clone(request)]);if(fixture.onMessages)await fixture.onMessages(request.path.id);return {data:clone(histories.get(request.path.id)||[])};},
    async update(request){calls.push(['update',clone(request)]);updates.push(clone(request));const current=sessions.get(request.path.id);current.permission=[...(current.permission||[]),...clone(request.body.permission)];return {data:clone(current)};},
  }};
  const fixture={parent,sessions,histories,rows,updates,calls,client,onGet:null,onMessages:null,
    async hooks(){return planGuard({client});},
    async before(hooks,index=1,args=mission(),sessionID=parent.id,tool='task'){
      const output={args:clone(args)};
      await hooks['tool.execute.before']({sessionID,tool,callID:'call'+index},output);
      return output.args;
    },
    addChild(overrides={}){
      const item={id:'ses_child',directory:'/project',projectID:'prj_1',agent:'corpus-worker',parentID:parent.id,permission:[],...overrides};
      sessions.set(item.id,item);histories.set(item.id,[]);return item;
    },
  };
  return fixture;
}

test('the guard refuses to load without its authoritative session API',async()=>{
  await assert.rejects(planGuard(),/API/);
});

test('delegation opens only the configured worker and explicitly prevents recursion',async()=>{
  const fixture=guardFixture(),hooks=await fixture.hooks();
  const config={agent:{corpus:{permission:{edit:'ask'}},'corpus-worker':{permission:{bash:'ask'}}},permission:{task:'deny'}};
  await hooks.config(config);
  assert.equal(config.subagent_depth,1);
  assert.deepEqual(config.agent.corpus.permission.task,{'*':'deny','corpus-worker':'allow'});
  assert.equal(config.agent['corpus-worker'].permission.task,'deny');
  assert.equal(config.agent['corpus-worker'].permission.bash,'ask');
  assert.equal(config.permission.task,'deny');
});

test('implicit file or agent expansion is refused while ordinary paths remain usable',async()=>{
  const fixture=guardFixture(),hooks=await fixture.hooks();
  for(const reference of ['@/outside/private.txt','@../private.txt','@~/private.txt','@corpus-worker']){
    await assert.rejects(fixture.before(hooks,1,{...mission(),prompt:'Lis '+reference}),/@fichier|@agent/);
  }
  const result=await fixture.before(hooks);
  assert.equal(result.background,false);
  await assert.rejects(fixture.before(hooks,1,{...mission(),background:true}),/premier plan/);
  await assert.rejects(fixture.before(hooks,1,{...mission(),subagent_type:'general'}),/corpus-worker/);
});

test('bounded mission validation rejects empty and oversized payloads',async()=>{
  const fixture=guardFixture(),hooks=await fixture.hooks();
  for(const patch of [{prompt:''},{prompt:'x'.repeat(12001)},{description:''},{description:'x'.repeat(201)}]){
    await assert.rejects(fixture.before(hooks,1,{...mission(),...patch}),/mission courte/);
  }
});

test('the persistent turn budget counts prior failures across assistant steps and survives a guard restart',async()=>{
  const fixture=guardFixture(4);
  for(const row of fixture.rows.slice(1,4)){row.info.time.completed=10;row.parts[0].state.status='error';}
  await assert.rejects(fixture.before(await fixture.hooks(),4),/trois délégations/);
  await assert.rejects(fixture.before(await fixture.hooks(),4),/trois délégations/);
  fixture.rows.push({info:{id:'usr_2',role:'user',agent:'corpus'},parts:[]});
  fixture.rows[4].info.parentID='usr_2';
  assert.equal((await fixture.before(await fixture.hooks(),4)).background,false);
});

test('concurrent distinct task calls cannot exceed the persisted per-turn limit',async()=>{
  const fixture=guardFixture(6),hooks=await fixture.hooks();
  const results=await Promise.allSettled(Array.from({length:6},(_,index)=>fixture.before(hooks,index+1)));
  assert.deepEqual(results.map(result=>result.status),['fulfilled','fulfilled','fulfilled','rejected','rejected','rejected']);
});

test('different parent conversations keep independent budgets',async()=>{
  const fixture=guardFixture(4),hooks=await fixture.hooks();
  fixture.sessions.set('ses_other',{...clone(fixture.parent),id:'ses_other'});
  fixture.histories.set('ses_other',clone(fixture.rows.slice(0,2)));
  const result=await Promise.allSettled([fixture.before(hooks,4),fixture.before(hooks,1,mission(),'ses_other')]);
  assert.deepEqual(result.map(item=>item.status),['rejected','fulfilled']);
});

test('worker permissions retain ordered parent asks and read-only exceptions with a final task refusal',async()=>{
  const fixture=guardFixture();
  fixture.parent.permission=[
    {permission:'*',pattern:'*',action:'deny'},
    {permission:'read',pattern:'/project/*',action:'allow'},
    {permission:'bash',pattern:'*',action:'ask'},
    {permission:'external_directory',pattern:'*',action:'ask'},
    {permission:'edit',pattern:'*',action:'deny'},
    {permission:'corpus-browser_*',pattern:'*',action:'deny'},
  ];
  const worker=fixture.addChild({permission:[{permission:'*',pattern:'*',action:'deny'}]});
  fixture.rows[1].parts[0].state.metadata={sessionId:worker.id};
  const hooks=await fixture.hooks();
  await hooks['chat.message']({sessionID:worker.id,agent:'corpus-worker'});
  const expected=[...fixture.parent.permission,{permission:'task',pattern:'*',action:'deny'}];
  assert.deepEqual(fixture.updates[0].body.permission,expected);
  assert.deepEqual(fixture.sessions.get(worker.id).permission.slice(-expected.length),expected);
  await hooks['chat.message']({sessionID:worker.id});
  assert.equal(fixture.updates.length,1,'An unchanged child rule tail is not appended repeatedly');
});

test('Plan remains tool-free after a new guard instance, without a previous hook event',async()=>{
  const fixture=guardFixture();fixture.rows[1].info.agent='corpus-plan';
  for(const tool of ['read','task','bash','edit'])await assert.rejects(fixture.before(await fixture.hooks(),1,mission(),fixture.parent.id,tool),/Mode Plan/);
  fixture.rows[1].info.agent='corpus';fixture.rows[0].info.agent='corpus-plan';
  await assert.rejects(fixture.before(await fixture.hooks()),/mode Plan/);
});

test('task resume cannot cross parent, project, directory or worker role boundaries',async()=>{
  for(const patch of [
    {parentID:'ses_other'},{parentID:undefined},{projectID:'prj_other'},{directory:'/other'},{agent:'general'},
  ]){
    const fixture=guardFixture();fixture.addChild(patch);
    await assert.rejects(fixture.before(await fixture.hooks(),1,{...mission(),task_id:'ses_child'}),/étranger/);
  }
  const fixture=guardFixture();
  await assert.rejects(fixture.before(await fixture.hooks(),1,{...mission(),task_id:'ses_missing'}),/lecture des sessions/);
  await assert.rejects(fixture.before(await fixture.hooks(),1,{...mission(),task_id:'../ses_child'}),/identifiant/);
});

test('a valid idle worker can be resumed but a recorded task call cannot be replayed',async()=>{
  const fixture=guardFixture(),worker=fixture.addChild(),hooks=await fixture.hooks();
  assert.equal((await fixture.before(hooks,1,{...mission(),task_id:worker.id})).background,false);
  fixture.rows[1].parts[0].state.metadata={sessionId:worker.id};
  await assert.rejects(fixture.before(hooks),/déjà lancé/);
});

test('a persisted cancellation occurring during task validation blocks the late launch',async()=>{
  const fixture=guardFixture();fixture.addChild();
  fixture.onGet=async id=>{if(id==='ses_child'){fixture.rows[1].info.time.completed=100;fixture.rows[1].info.error={name:'AbortedError'};fixture.rows[1].parts[0].state.status='error';}};
  await assert.rejects(fixture.before(await fixture.hooks(),1,{...mission(),task_id:'ses_child'}),/terminé ou interrompu/);
});

test('stopping one parent prevents its worker tools without affecting another parent',async()=>{
  const fixture=guardFixture(),worker=fixture.addChild();
  fixture.rows[1].parts[0].state.metadata={sessionId:worker.id};
  const workerRow=clone(fixture.rows[1]);workerRow.info.agent='corpus-worker';workerRow.parts[0].tool='read';
  workerRow.parts[0].state.metadata=undefined;fixture.histories.set(worker.id,[workerRow]);
  fixture.sessions.set('ses_other',{...clone(fixture.parent),id:'ses_other'});
  fixture.histories.set('ses_other',clone(fixture.rows));
  fixture.histories.get('ses_other')[1].parts[0].state.metadata=undefined;
  const hooks=await fixture.hooks();
  await fixture.before(hooks,1,{},worker.id,'read');
  await assert.rejects(fixture.before(hooks,1,mission(),worker.id,'task'),/sous-délégation/);
  fixture.rows[1].info.error={name:'AbortedError'};fixture.rows[1].info.time.completed=100;
  await assert.rejects(fixture.before(hooks,1,{},worker.id,'read'),/absente ou interrompue/);
  await fixture.before(hooks,1,mission(),'ses_other');
});

test('an active child cannot be resumed through a second task and implicitly promoted to background',async()=>{
  const fixture=guardFixture(2),worker=fixture.addChild();
  fixture.rows[1].parts[0].state.metadata={sessionId:worker.id};
  await assert.rejects(fixture.before(await fixture.hooks(),2,{...mission(),task_id:worker.id}));
});

test('concurrent resumes of the same idle child allow only the first persisted task call',async()=>{
  const fixture=guardFixture(2),worker=fixture.addChild();
  for(const row of fixture.rows.slice(1))row.parts[0].state.input.task_id=worker.id;
  const hooks=await fixture.hooks();
  const results=await Promise.allSettled([1,2].map(index=>fixture.before(hooks,index,{...mission(),task_id:worker.id})));
  assert.deepEqual(results.map(result=>result.status),['fulfilled','rejected']);
});

test('an incomplete recent history and invalid SDK responses fail closed',async()=>{
  const fixture=guardFixture();fixture.rows.shift();
  await assert.rejects(fixture.before(await fixture.hooks()),/tour parent absent/);
  const invalid=guardFixture();invalid.client.session.messages=async()=>({data:{items:[]}});
  await assert.rejects(invalid.before(await invalid.hooks()),/historique invalide/);
  invalid.client.session.messages=async()=>({error:{message:'unavailable'}});
  await assert.rejects(invalid.before(await invalid.hooks()),/lecture des sessions/);
});
