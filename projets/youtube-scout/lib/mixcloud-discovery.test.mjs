import test from 'node:test';
import assert from 'node:assert/strict';
import { readMixcloudShows } from './mixcloud-discovery.mjs';
const show = { key:'/radio/show/', name:'Show', user:{key:'/radio/',name:'Radio'},tags:[{key:'/genres/jazz/',name:'Jazz'}],sections:[{track:{name:'Not a verified track'}}] };
const response = data => new Response(JSON.stringify(data), {headers:{'content-type':'application/json'}});
test('public metadata stays editorial, bounded and deduplicated', async()=>{
  const calls=[];
  const graph=await readMixcloudShows({username:'radio',maxPages:2,pageSize:1,fetch:async(u,o)=>{calls.push([u,o]);return response({data:[show,show],paging:{next:'https://evil.test/secret'}});}});
  assert.equal(calls.length,2); assert.ok(calls[1][0].endsWith('offset=1'));
  assert.equal(calls[0][1].redirect,'error'); assert.equal(calls[0][1].credentials,'omit');
  assert.deepEqual(graph.entities.map(x=>x.type),['show','user','tag']);
  assert.deepEqual(graph.edges.map(x=>x.kind),['uploaded_by','tagged_with']);
  assert.equal(graph.edges.length,2); assert.equal(graph.coverage.partial,true);
  assert.ok(graph.edges.every(x=>x.sourceUrl.startsWith('https://api.mixcloud.com/radio/cloudcasts/')));
});
test('rejects invalid keys, budgets, HTTP and HTML without fallback',async()=>{
  for(const username of ['me','../private','https://evil.test']) await assert.rejects(readMixcloudShows({username,fetch:()=>{throw Error('must not fetch');}}));
  await assert.rejects(readMixcloudShows({username:'radio',maxPages:6,fetch:()=>{}}));
  await assert.rejects(readMixcloudShows({username:'radio',fetch:async()=>({ok:false,status:429})}),/429/);
  await assert.rejects(readMixcloudShows({username:'radio',fetch:async()=>({ok:true,headers:new Headers({'content-type':'text/html'})})}),/JSON/);
  const graph=await readMixcloudShows({username:'radio',fetch:async()=>response({data:[{key:'//evil.test/show/'}]})});
  assert.equal(graph.entities.length,0);
});
test('deadline covers stalled transport and caller abort',async()=>{
  await assert.rejects(readMixcloudShows({username:'radio',timeoutMs:5,fetch:()=>new Promise(()=>{})}),/aborted|timeout/);
  const controller=new AbortController();
  const request=readMixcloudShows({username:'radio',signal:controller.signal,fetch:()=>{controller.abort();return new Promise(()=>{});}});
  await assert.rejects(request,/aborted/);
});
test('stream byte budget rejects before JSON decoding and cancels the body',async()=>{
  let cancelled = false;
  const body = new ReadableStream({start(c){c.enqueue(new Uint8Array(33));},cancel(){cancelled=true;}});
  await assert.rejects(readMixcloudShows({username:'radio',maxBytes:32,fetch:async()=>new Response(body,{headers:{'content-type':'application/json'}})}),/byte limit/);
  assert.equal(cancelled,true);
  const data={data:[]}; const length=new TextEncoder().encode(JSON.stringify(data)).length;
  assert.equal((await readMixcloudShows({username:'radio',maxBytes:length,fetch:async()=>response(data)})).coverage.pages,1);
  await assert.rejects(readMixcloudShows({username:'radio',maxBytes:0,fetch:async()=>response(data)}),/budget/);
});
test('body deadline cancels a stalled stream after headers',async()=>{
  let cancelled=false;
  const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});
  await assert.rejects(readMixcloudShows({username:'radio',timeoutMs:5,fetch:async()=>new Response(body,{headers:{'content-type':'application/json'}})}),/aborted|timeout/);
  assert.equal(cancelled,true);
});
