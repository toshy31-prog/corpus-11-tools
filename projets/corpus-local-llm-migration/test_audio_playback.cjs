const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/portal/app.js','utf8');
const start=src.indexOf('async function stopCorpusSpeech('),end=src.indexOf('\nfunction ',start);
const code=src.slice(start,end);
(async()=>{
 let pending,played=0,calls=[];
 const voiceState={generation:0,pendingJob:null,playback:null};
 const context={voiceState,window:{speechSynthesis:{cancel(){}}},status(){},setTimeout,
  Audio:class{constructor(url){this.url=url;}async play(){played++;}pause(){}},
  fetchJSON:async(url,options)=>{const req=JSON.parse(options.body);calls.push(req);if(req.action==='create')return await new Promise(resolve=>pending=resolve);return {};}};
 vm.createContext(context);vm.runInContext(code,context);
 const reading=context.speakCorpus('Bonjour','corpus:neural');await new Promise(setImmediate);
 await context.stopCorpusSpeech();pending({id:'created-late',state:'queued'});await reading;
 assert.equal(played,0);assert.ok(calls.some(x=>x.action==='cancel'&&x.id==='created-late'));
 calls=[];pending=null;
 const first=context.speakCorpus('premier','corpus:neural'),second=context.speakCorpus('second','corpus:neural');
 await new Promise(setImmediate);assert.equal(calls.filter(x=>x.action==='create').length,1);
 assert.equal(calls[0].prompt,'second');pending({id:'second',state:'completed',url:'/audio.wav'});
 await Promise.all([first,second]);assert.equal(played,1);
 await assert.rejects(()=>context.speakCorpus('a'.repeat(1201),'corpus:neural'),/1200/);
 console.log('Voix : arrêt pendant création, double clic et borne de texte vérifiés.');
})().catch(e=>{console.error(e);process.exitCode=1;});
