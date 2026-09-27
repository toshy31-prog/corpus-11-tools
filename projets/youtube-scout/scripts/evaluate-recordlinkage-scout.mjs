import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createIdentityCandidateIndex} from "../lib/identity-candidate-index.mjs";
import {decideTrackCandidate} from "../lib/track-candidate-score.mjs";
const [python, csv] = process.argv.slice(2);
if (python!=="--stdin" && (!python || !csv)) throw Error("Usage: node scripts/evaluate-recordlinkage-scout.mjs PYTHON CSV | --stdin");
const data = JSON.parse(python==="--stdin" ? readFileSync(0,"utf8") : execFileSync(python, [new URL("./evaluate-recordlinkage-candidates.py", import.meta.url).pathname, csv], {encoding:"utf8", maxBuffer:20*1024*1024, timeout:120000}));
const refs = new Map(data.references.map(r=>[r.id,r]));
const asTrack = r=>({id:r.id,title:r.title,artists:r.artist?[r.artist]:[],source:"unknown"});
const results=[];
for (const split of data.splits) {
  const methods=[...split.methods];
  for (const mode of ["tokens","hybrid"]) {
    const start=performance.now(), index=createIdentityCandidateIndex(data.references,{mode});
    const hits=Object.fromEntries(split.queries.map(q=>[q.id,index.search(q,{k:10}).map(h=>h.candidate.id)]));
    methods.push({name:`scout_${mode}`,pairs:null,retrievalMs:performance.now()-start,hits});
  }
  for (const method of methods) {
    const stats={split:split.name,method:method.name,queries:split.queries.length,present:0,absent:0,recall1:0,recall5:0,recall10:0,autoPresent:0,falseAutoPresent:0,autoAbsent:0,nonAutomatic:0,returnedCandidates:0,pairs:method.pairs,retrievalMs:method.retrievalMs};
    const start=performance.now();
    for (const q of split.queries) {
      const hits=method.hits[q.id]||[], absent=split.absent[q.id], cid=data.labels[q.id];
      if(hits.length>10||new Set(hits).size!==hits.length||hits.some(id=>!refs.has(id)))throw Error("Invalid candidate output");
      stats[absent?"absent":"present"]++; stats.returnedCandidates+=hits.length;
      if(!absent)for(const k of [1,5,10])stats[`recall${k}`]+=Number(hits.slice(0,k).some(id=>data.labels[id]===cid));
      const decision=decideTrackCandidate(asTrack(q),hits.map(id=>asTrack(refs.get(id))));
      if(decision.decision==="auto_accept") {
        if(absent)stats.autoAbsent++;
        else {stats.autoPresent++;stats.falseAutoPresent+=Number(data.labels[decision.best.candidate.id]!==cid);}
      } else stats.nonAutomatic++;
    }
    results.push({...stats,decisionMs:performance.now()-start});
  }
}
console.log(JSON.stringify({sha256:data.sha256,recordlinkageVersion:data.recordlinkageVersion,references:refs.size,results},null,2));
