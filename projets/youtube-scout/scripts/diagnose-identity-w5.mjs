import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createIdentityCandidateIndex} from '../lib/identity-candidate-index.mjs';
import {decideTrackCandidate} from '../lib/track-candidate-score.mjs';

// Descriptive partition, not a counterfactual attribution or a new decision rule.
export function classifyOutcome({absent, goldRetrieved, bestCorrect, decision}) {
  if (absent) return 'gold_absent_from_catalogue';
  if (!goldRetrieved) return 'gold_missing_from_top10';
  if (!bestCorrect) return 'gold_retrieved_but_not_ranked_first';
  if (decision.decision === 'auto_accept') return 'correct_automatic';
  if (decision.best.score < .78) return 'correct_first_score_below_suggestion';
  if (decision.best.score < .90) return 'correct_first_score_below_auto';
  return 'correct_first_margin_or_guard';
}
const increment = (counts,key) => {counts[key]=(counts[key]||0)+1;};
export function diagnose(data) {
  const labelled=r=>Object.hasOwn(data.labels||{},r.id) && typeof data.labels[r.id]==='string' && data.labels[r.id].trim().length>0;
  if(!data.references.every(labelled))throw Error('Missing reference labels');
  for(const split of data.splits)for(const q of split.queries) {
    if(!labelled(q))throw Error('Missing query label');
    if(!Object.hasOwn(split.absent||{},q.id)||typeof split.absent[q.id]!=='boolean')throw Error('Missing absence label');
  }
  const refs=new Map(data.references.map(r=>[r.id,r]));
  const index=createIdentityCandidateIndex(data.references,{mode:'hybrid'});
  const track=r=>({id:r.id,title:r.title,artists:r.artist?[r.artist]:[],source:'unknown'});
  return data.splits.map(split=> {
    const counts={}, reasons={}, flags={}, correctFirstComponents={};
    let automatic=0, falseAutomatic=0;
    for(const query of split.queries) {
      const hits=index.search(query,{k:10}).map(h=>h.candidate.id);
      const gold=id=>data.labels[id]===data.labels[query.id];
      const decision=decideTrackCandidate(track(query),hits.map(id=>track(refs.get(id))));
      const bestCorrect=Boolean(decision.best && gold(decision.best.candidate.id));
      increment(counts,classifyOutcome({absent:split.absent[query.id],goldRetrieved:hits.some(gold),bestCorrect,decision}));
      increment(reasons,decision.reason);
      if(decision.decision==='auto_accept') {automatic++; if(!bestCorrect)falseAutomatic++;}
      else {
        if(!query.artist)increment(flags,'query_artist_missing');
        if(!query.title)increment(flags,'query_title_missing');
        if(bestCorrect) {
          const best=decision.best, ref=refs.get(best.candidate.id);
          if(!ref.artist)increment(flags,'correct_first_artist_missing');
          if(!ref.title)increment(flags,'correct_first_title_missing');
          for(const [name,value] of Object.entries(best.components)) {
            const bin=value===null?'unavailable':value===1?'exact':value<.45?'below_045':value<.95?'045_to_095':'095_to_1';
            increment(correctFirstComponents,`${name}:${bin}`);
          }
          for(const p of best.penalties)increment(flags,`correct_first_penalty:${p.reason||p.type||JSON.stringify(p)}`);
        }
      }
    }
    if(Object.values(counts).reduce((a,b)=>a+b,0)!==split.queries.length)throw Error('Partition incomplete');
    return {split:split.name,queries:split.queries.length,automatic,falseAutomatic,counts,reasons,nonAutomaticOverlappingFlags:flags,nonAutomaticCorrectFirstComponents:correctFirstComponents};
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(diagnose(JSON.parse(readFileSync(0,'utf8'))),null,2));
