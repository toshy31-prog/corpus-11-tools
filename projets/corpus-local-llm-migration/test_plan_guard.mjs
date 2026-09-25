import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import planGuard from './plan_guard.mjs';

const rule=(permission,action,pattern='*')=>({permission,pattern,action});
const mission=()=>({subagent_type:'corpus-worker',description:'Vérifier un fichier',prompt:'Lire src/main.py et rapporter les faits, sans modification.'});
function fixture(count=1) {
 const parent={id:'ses_parent',agent:'corpus',directory:'/project',projectID:'project',permission:[rule('bash','ask'),rule('edit','ask')]};
 const child={id:'ses_child',agent:'corpus-worker',parentID:parent.id,directory:'/project',projectID:'project',permission:[]};
 const parts=Array.from({length:count},(_,i)=>({type:'tool',tool:'task',id:'part_'+i,callID:'call_'+i,state:{status:'running',input:mission()}}));
 const rows=[{info:{id:'user_1',role:'user',agent:'corpus'},parts:[]},{info:{id:'assistant_1',role:'assistant',agent:'corpus',parentID:'user_1',time:{created:1}},parts}];
 const sessions=new Map([[parent.id,parent],[child.id,child]]),histories=new Map([[parent.id,rows]]),updates=[];
 const client={session:{
  get:async({path})=>sessions.has(path.id)?{data:structuredClone(sessions.get(path.id))}:{error:'not found'},
  messages:async({path,query})=>{assert.equal(query.limit,100);return {data:structuredClone(histories.get(path.id)||[])};},
  update:async({path,body})=>{updates.push({id:path.id,...structuredClone(body)});const current=sessions.get(path.id);current.permission.push(...structuredClone(body.permission));return {data:structuredClone(current)};},
 }};
 const before=(hooks,index=0,args=mission(),sessionID=parent.id)=>hooks['tool.execute.before']({sessionID,tool:'task',callID:'call_'+index},{args});
 return {parent,child,parts,rows,sessions,histories,updates,client,before};
}

test('guard cannot load without the native session API',async()=>{
 await assert.rejects(planGuard(),/API de sessions/);
});
test('only a loaded guard opens the corpus worker target',async()=>{
 const f=fixture(),hooks=await planGuard({client:f.client});
 const config={agent:{corpus:{permission:{task:'deny',edit:'ask'}},'corpus-worker':{disable:true,permission:{task:'deny'}}}};
 await hooks.config(config);
 assert.deepEqual(config.agent.corpus.permission.task,{'*':'deny','corpus-worker':'allow'});
 assert.equal(config.agent.corpus.permission.edit,'ask');
 assert.equal(config.agent['corpus-worker'].permission.task,'deny');assert.equal(config.subagent_depth,1);
 assert.equal(config.agent['corpus-worker'].disable,false);
});
test('three simultaneous independent native task calls pass; fourth fails',async()=>{
 const f=fixture(4),hooks=await planGuard({client:f.client});
 const results=await Promise.allSettled([0,1,2,3].map(i=>f.before(hooks,i)));
 assert.deepEqual(results.map(r=>r.status),['fulfilled','fulfilled','fulfilled','rejected']);
 assert.match(results[3].reason.message,/trois délégations/);
});
test('budget spans assistant steps and survives guard restart',async()=>{
 const f=fixture(4);
 const fourth=f.parts.pop();f.rows[1].info.time.completed=2;
 f.parts.forEach(p=>{p.state.status='completed';});
 f.rows.push({info:{id:'assistant_2',parentID:'user_1',role:'assistant',agent:'corpus',time:{created:3}},parts:[fourth]});
 await assert.rejects(f.before(await planGuard({client:f.client}),3),/trois délégations/);
});
test('new user turn receives its own budget',async()=>{
 const f=fixture(4);f.rows[1].info.parentID='user_old';
 f.rows.unshift({info:{id:'user_old',role:'user',agent:'corpus'},parts:[]});
 const part={...structuredClone(f.parts[0]),id:'part_new',callID:'call_new'};
 f.rows.push({info:{id:'assistant_new',parentID:'user_1',role:'assistant',agent:'corpus'},parts:[part]});
 const hooks=await planGuard({client:f.client});
 await hooks['tool.execute.before']({sessionID:f.parent.id,tool:'task',callID:'call_new'},{args:mission()});
});
test('Plan remains blocked after restart without remembered in-memory state',async()=>{
 const f=fixture();f.rows[1].info.agent='corpus-plan';
 const hooks=await planGuard({client:f.client});
 for(const tool of ['read','bash','edit','task','corpus-browser_browser_request']){
  f.parts[0].tool=tool;
  await assert.rejects(hooks['tool.execute.before']({sessionID:f.parent.id,tool,callID:'call_0'},{args:mission()}),/Mode Plan/);
 }
});
test('same-parent worker resume passes; foreign parents, project and role fail',async()=>{
 const f=fixture(),hooks=await planGuard({client:f.client});
 await f.before(hooks,0,{...mission(),task_id:f.child.id});
 for(const [key,value] of [['parentID','ses_other'],['directory','/elsewhere'],['projectID','other'],['agent','general']]){
  const prior=f.child[key];f.child[key]=value;
  await assert.rejects(f.before(hooks,0,{...mission(),task_id:f.child.id}),/étranger/);f.child[key]=prior;
 }
 await assert.rejects(f.before(hooks,0,{...mission(),task_id:'ses_missing'}),/lecture des sessions/);
});
test('no recursive or background delegation, and no replay of a launched call',async()=>{
 const f=fixture(),hooks=await planGuard({client:f.client});
 await assert.rejects(f.before(hooks,0,{...mission(),background:true}),/premier plan/);
 await assert.rejects(f.before(hooks,0,{...mission(),subagent_type:'general'}),/corpus-worker/);
 f.parent.parentID='ses_ancestor';await assert.rejects(f.before(hooks),/sous-délégation/);delete f.parent.parentID;
 f.parts[0].state.metadata={sessionId:f.child.id};await assert.rejects(f.before(hooks),/déjà lancé/);
});
test('concurrent resumes of the same idle worker never silently become background extensions',async()=>{
 const f=fixture(2);f.parts.forEach(part=>{part.state.input.task_id=f.child.id;});
 const hooks=await planGuard({client:f.client});
 const results=await Promise.allSettled([0,1].map(i=>f.before(hooks,i,{...mission(),task_id:f.child.id})));
 assert.deepEqual(results.map(result=>result.status),['fulfilled','rejected']);
 assert.match(results[1].reason.message,/déjà actif/);
});
test('implicit file/agent mentions are refused before native attachment expansion',async()=>{
 const f=fixture(),hooks=await planGuard({client:f.client});
 for(const prompt of ['Lis @/outside/secret','Lis @../private','Lis @~/secret','Demande @explore']){
  await assert.rejects(f.before(hooks,0,{...mission(),prompt}),/mention @fichier/);
 }
 await f.before(hooks,0,{...mission(),prompt:'Consulte /project/src/main.py avec read.'});
});
test('all parent permission rules including ask and wildcard exceptions precede final recursion deny',async()=>{
 const f=fixture();f.parts[0].state.metadata={sessionId:f.child.id};
 f.parent.permission=[rule('*','deny'),rule('read','allow'),rule('read','ask','*.env'),rule('bash','ask','git status'),rule('external_directory','ask'),rule('task','allow','corpus-worker')];
 const hooks=await planGuard({client:f.client});
 await hooks['chat.message']({sessionID:f.child.id,agent:'corpus-worker'});
 assert.deepEqual(f.updates[0].permission,[...f.parent.permission,rule('task','deny')]);
 await hooks['chat.message']({sessionID:f.child.id,agent:'corpus-worker'});
 assert.equal(f.updates.length,1,'identical repeated inheritance must not grow permission history');
 f.parent.permission.push(rule('read','deny','private/*'));
 await hooks['chat.message']({sessionID:f.child.id,agent:'corpus-worker'});
 assert.deepEqual(f.updates[1].permission,[...f.parent.permission,rule('task','deny')]);
});
test('a worker cannot be run outside an active parent task or switch role',async()=>{
 const f=fixture(),hooks=await planGuard({client:f.client});
 await assert.rejects(hooks['chat.message']({sessionID:f.child.id,agent:'corpus-worker'}),/délégation parente/);
 f.parts[0].state.metadata={sessionId:f.child.id};
 await assert.rejects(hooks['chat.message']({sessionID:f.child.id,agent:'corpus'}),/changement de rôle/);
 f.parts[0].state.status='error';
 await assert.rejects(hooks['chat.message']({sessionID:f.child.id,agent:'corpus-worker'}),/interrompue/);
});
test('cancellation recorded during validation prevents a late launch',async()=>{
 const f=fixture(),original=f.client.session.messages;let calls=0;
 f.client.session.messages=async options=>{if(++calls===2)f.rows[1].info.time.completed=10;return original(options);};
 await assert.rejects(f.before(await planGuard({client:f.client})),/terminé ou interrompu/);
});
test('native contract supports guard before task expansion and permission hook before run loop',()=>{
 const contract=spawnSync('python3',[new URL('./corpus_paths.py',import.meta.url).pathname,'json'],{encoding:'utf8'});
 assert.equal(contract.status,0,contract.stderr);
 const sourceRoot=JSON.parse(contract.stdout).toolchain_sources;
 const base=pathToFileURL(join(sourceRoot,'opencode-1.18.32/packages/opencode/src')+'/');
 const prompt=readFileSync(new URL('session/prompt.ts',base),'utf8');
 const task=readFileSync(new URL('tool/task.ts',base),'utf8');
 const tools=readFileSync(new URL('session/tools.ts',base),'utf8');
 const bootstrap=readFileSync(new URL('project/bootstrap.ts',base),'utf8');
 const plugin=readFileSync(new URL('plugin/index.ts',base),'utf8');
 assert(tools.indexOf('"tool.execute.before"')<tools.indexOf('item.execute(args, ctx)'));
 assert(task.indexOf('yield* ctx.metadata(')<task.indexOf('ops.resolvePromptParts(params.prompt)'));
 assert(prompt.indexOf('"chat.message"')<prompt.indexOf('const prompt: (input: PromptInput)'));
 assert(bootstrap.includes('yield* plugin.init()'));
 assert(plugin.includes('flags.pure ? [] : (cfg.plugin_origins ?? [])'));
});
test('serialized runtime stays isolated and delegation closed until guard loads',()=>{
 const script=`import sys,json,tempfile\nfrom pathlib import Path\nsys.path.insert(0,sys.argv[1])\nimport corpus_local\nwith tempfile.TemporaryDirectory() as directory:\n corpus_local.BASE=Path(directory)\n env=corpus_local.environment(moe=True)\n print(json.dumps(env))\n`;
 const result=spawnSync('python3',['-c',script,new URL('./',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const env=JSON.parse(result.stdout),config=JSON.parse(env.OPENCODE_CONFIG_CONTENT);
 assert.equal(env.OPENCODE_PURE,undefined);assert.equal(env.OPENCODE_DISABLE_DEFAULT_PLUGINS,'1');
 assert.equal(env.OPENCODE_DISABLE_PROJECT_CONFIG,'1');assert.equal(env.OPENCODE_DISABLE_MODELS_FETCH,'1');
 assert.equal(env.npm_config_offline,'true');assert.equal(env.npm_config_fetch_retries,'0');
 assert.equal(config.permission.task,'deny');assert.equal(config.agent.corpus.permission.task,'deny');
 assert.equal(config.agent['corpus-worker'].mode,'subagent');assert.equal(config.agent['corpus-worker'].steps,6);
 assert.equal(config.agent['corpus-worker'].disable,true,'no worker target exists if the guard fails to load');
 assert.equal(config.agent['corpus-worker'].model,undefined,'native task inherits the parent model and variant');
 assert.equal(config.agent['corpus-worker'].permission.task,'deny');assert.equal(config.subagent_depth,1);
 assert.equal(config.agent['corpus-plan'].permission['*'],'deny');
 assert.deepEqual(config.enabled_providers,['corpus-local']);assert.equal(config.plugin.length,1);
 assert(config.plugin[0].endsWith('/plan_guard.mjs'));assert.equal(env.OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS,undefined);
});
