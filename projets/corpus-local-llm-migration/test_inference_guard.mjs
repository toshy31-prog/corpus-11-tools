import {test} from 'node:test';
import assert from 'node:assert/strict';
import guard from './inference_guard.mjs';

const user = id => ({info:{id,role:'user'},parts:[]});
const assistant = (id,parentID,extra={},parts=[]) => ({info:{id,parentID,role:'assistant',time:{created:1},...extra},parts});
async function fixture(rows) {
  const calls=[];
  const hooks=await guard({client:{session:{messages:async args=>{calls.push(args);return {data:rows};}}}});
  return {calls,run:(id='u',extra={})=>hooks['chat.params']({sessionID:'s',message:{id},agent:'corpus',model:{providerID:'corpus-local'},...extra},{})};
}
test('fresh step and normal tool continuation remain available',async()=>{
  const rows=[user('u'),assistant('a','u')], f=await fixture(rows);
  await f.run();
  rows[1].info.time.completed=2;rows[1].info.finish='tool-calls';
  rows[1].parts.push({type:'tool',state:{status:'completed'}});
  rows.push(assistant('b','u'));
  await f.run();
  assert.equal(f.calls[0].query.limit,100);
});
test('same-step replay after partial output is rejected even after plugin reload',async()=>{
  for(const type of ['step-start','text','reasoning','tool','step-finish']) {
    const rows=[user('u'),assistant('a','u',{},[{type}])];
    for(let reload=0;reload<2;reload++)await assert.rejects((await fixture(rows)).run(),/CORPUS_STEP_STOP/);
  }
});
test('abnormal finish, prior error and incomplete step block the next request',async()=>{
  for(const finish of ['unknown','other','error',undefined]) {
    const f=await fixture([user('u'),assistant('a','u',{finish,time:{created:1,completed:2}}),assistant('b','u')]);
    await assert.rejects(f.run(),/CORPUS_STEP_STOP/);
  }
  const f=await fixture([user('u'),assistant('a','u',{error:{name:'APIError'},time:{completed:2}}),assistant('b','u')]);
  await assert.rejects(f.run(),/CORPUS_STEP_STOP/);
});
test('new user turn can proceed after a historic failure; no global latch',async()=>{
  const f=await fixture([user('old'),assistant('a','old',{error:{},time:{completed:2}}),user('u'),assistant('b','u')]);
  await f.run();
});
test('unavailable, absent or ambiguous turn fails closed without provider calls',async()=>{
  for(const rows of [null,[],[user('u')],[user('u'),assistant('a','u'),assistant('b','u')]]) {
    await assert.rejects((await fixture(rows)).run(),/CORPUS_STEP_STOP/);
  }
  const hooks=await guard({client:{session:{messages:async()=>{throw Error('503');}}}});
  await assert.rejects(hooks['chat.params']({agent:'corpus',model:{providerID:'corpus-local'}}),error=>/CORPUS_STEP_STOP/.test(error.message)&&!error.message.includes('503'));
});
test('compaction and other providers are outside this guard',async()=>{
  const f=await fixture([]);await f.run('u',{agent:'compaction'});await f.run('u',{model:{providerID:'other'}});
  assert.equal(f.calls.length,0);
});
