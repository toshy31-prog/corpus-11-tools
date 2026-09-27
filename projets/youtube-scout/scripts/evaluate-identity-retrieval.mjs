import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createIdentityCandidateIndex} from "../lib/identity-candidate-index.mjs";
import {decideTrackCandidate} from "../lib/track-candidate-score.mjs";
const bytes=readFileSync(process.argv[2]), sha=createHash("sha256").update(bytes).digest("hex");
if(sha!=="527a94f24f7e813a9bc3fef35a635f13e195516966b308140a0dd2926afbb97d") throw Error("Unexpected corpus hash");
const rows=[];let row=[],cell="",quoted=false;const text=bytes.toString();
for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(cell.replace(/\r$/,""));cell="";if(c==='\n'){rows.push(row);row=[];}}else cell+=c;}
if(cell||row.length){row.push(cell);rows.push(row);}if(quoted)throw Error("Malformed CSV");
const headers=rows.shift();if(headers.join(",")!=="TID,CID,CTID,SourceID,id,number,title,length,artist,album,year,language")throw Error("Schema mismatch");
const records=rows.filter(r=>r.length>1).map(r=>{if(r.length!==headers.length)throw Error("Column mismatch");return Object.fromEntries(headers.map((h,i)=>[h,r[i]]));});
const groups=new Map();for(const r of records){if(!groups.has(r.CID))groups.set(r.CID,[]);groups.get(r.CID).push(r);}
const hash=id=>createHash("sha256").update(id).digest();
const absent=id=>hash(id)[1]%5===0;
const ids=[...groups.keys()].filter(id=>groups.get(id).length>1&&hash(id)[0]%5!==0).sort((a,b)=>hash(a).compare(hash(b))).slice(0,1000);
const clean=s=>["null","[unknown]"].includes(s)?"":s;
const adapt=r=>({id:r.TID,title:clean(r.title),artist:clean(r.artist)});
const refs=[...groups.values()].filter(g=>!absent(g[0].CID)).map(g=>adapt(g[0]));
const labels=new Map(records.map(r=>[r.TID,r.CID]));
const results=[];
for(const mode of ["exact","tokens","hybrid"]){const start=performance.now(),index=createIdentityCandidateIndex(refs,{mode});const buildMs=performance.now()-start;
 const stats={mode,queries:ids.length,present:0,absent:0,recall1:0,recall5:0,recall10:0,autoPresent:0,falseAutoPresent:0,autoAbsent:0,candidates:0};
 const diagnostic={misses:[],reasons:{}};
 const begin=performance.now();
 for(const id of ids){const q=adapt(groups.get(id)[1]);const hits=index.search(q,{k:10});stats.candidates+=hits.length;const missing=absent(id);stats[missing?"absent":"present"]++;
 if(!missing)for(const k of [1,5,10])stats[`recall${k}`]+=Number(hits.slice(0,k).some(h=>labels.get(h.candidate.id)===id));
 const asTrack=r=>({id:r.id,title:r.title,artists:r.artist?[r.artist]:[],source:"unknown"});
 const d=decideTrackCandidate(asTrack(q),hits.map(h=>asTrack(h.candidate)));
 if(mode==="hybrid"&&process.argv.includes("--diagnostic")){
 diagnostic.reasons[d.reason]=(diagnostic.reasons[d.reason]||0)+1;
 if(!missing&&!hits.some(h=>labels.get(h.candidate.id)===id)) diagnostic.misses.push({query:q,reference:adapt(groups.get(id)[0]),best:hits[0]?.candidate,decision:d.decision,reason:d.reason});
 }
 if(d.decision==="auto_accept"){if(missing)stats.autoAbsent++;else{stats.autoPresent++;stats.falseAutoPresent+=Number(labels.get(d.best.candidate.id)!==id);}}
 }results.push({...stats,buildMs,evaluationMs:performance.now()-begin,...(mode==="hybrid"&&process.argv.includes("--diagnostic")?{diagnostic}:{})});}
console.log(JSON.stringify({sha,referenceCount:refs.length,split:"CID SHA256 byte0 mod5 !=0; absent byte1 mod5==0; 1000 hash-sorted duplicate CIDs",results},null,2));
