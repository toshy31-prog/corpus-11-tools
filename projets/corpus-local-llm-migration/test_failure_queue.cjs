const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync(__dirname+'/portal/app.js','utf8');
function setup(){
 const calls=[];
 const c={Date,nativeSave(){},nativeRender(){},nativeApi:async(s,p)=>calls.push(p),temporalMessageContext:()=>'',CorpusPersonalization:{context:()=>''},personalization:{},agentResponseInstructions:()=>'',agentConfig:{reasoning:'direct'}};
 vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf('function nativeTurnFailure('),src.indexOf('async function nativeRefresh(')),c);
 vm.runInContext(src.slice(src.indexOf('async function nativePump('),src.indexOf('function createConversationComposer(')),c);
 const item={id:'queued',text:'suite',images:[]};
 const s={id:'s',ready:true,paused:false,busy:false,queue:[item],draft:'conserver',images:[{url:'keep'}],messages:[{info:{id:'u',role:'user'}},{info:{id:'a',role:'assistant',parentID:'u',finish:'unknown',time:{completed:2}}}]};
 return {c,calls,s,item};
}
test('failure pauses automatic and steering sends without losing queued content or draft',async()=>{
 const {c,calls,s,item}=setup();c.nativeObserveFailure(s);
 await c.nativePump(s);await c.nativePump(s,item);
 assert.equal(calls.length,0);assert.equal(s.paused,true);assert.equal(s.queue[0],item);assert.equal(s.draft,'conserver');assert.equal(s.images[0].url,'keep');
 // Even an unrelated UI action which clears pause cannot bypass the failure.
 s.paused=false;await c.nativePump(s);assert.equal(calls.length,0);
});
test('explicit acknowledgement resumes once; polling does not undo the acknowledgement',async()=>{
 const {c,calls,s}=setup();c.nativeObserveFailure(s);s.failureAcknowledged=true;s.paused=false;
 c.nativeObserveFailure(s);await c.nativePump(s);
 assert.deepEqual(calls,['/prompt_async']);assert.equal(s.queue.length,0);
});
test('historic failure does not block new turn; fresh failure pauses again',()=>{
 const {c,s}=setup();c.nativeObserveFailure(s);s.failureAcknowledged=true;
 s.messages.push({info:{id:'u2',role:'user'}});c.nativeObserveFailure(s);assert.equal(s.failure,null);
 s.messages.push({info:{id:'b',role:'assistant',parentID:'u2',error:{name:'APIError'}}});c.nativeObserveFailure(s);
 assert.equal(s.failure.id,'b');assert.equal(s.failureAcknowledged,false);assert.equal(s.paused,true);
});
