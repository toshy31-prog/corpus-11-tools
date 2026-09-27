import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyOutcome,diagnose} from './diagnose-identity-w5.mjs';
test('partition separates catalogue, retrieval, ranking, score and automatic stages',()=>{
 const base={absent:false,goldRetrieved:true,bestCorrect:true,decision:{decision:'suggested',best:{score:.8}}};
 assert.equal(classifyOutcome({...base,absent:true}),'gold_absent_from_catalogue');
 assert.equal(classifyOutcome({...base,goldRetrieved:false}),'gold_missing_from_top10');
 assert.equal(classifyOutcome({...base,bestCorrect:false}),'gold_retrieved_but_not_ranked_first');
 assert.equal(classifyOutcome(base),'correct_first_score_below_auto');
 assert.equal(classifyOutcome({...base,decision:{decision:'rejected',best:{score:.5}}}),'correct_first_score_below_suggestion');
 assert.equal(classifyOutcome({...base,decision:{decision:'suggested',best:{score:.92}}}),'correct_first_margin_or_guard');
 assert.equal(classifyOutcome({...base,decision:{decision:'auto_accept',best:{score:.97}}}),'correct_automatic');
});
test('perfect metadata accepts; missing artist does not become automatic from title alone',()=>{
 const result=diagnose({references:[{id:'r',artist:'Björk',title:'Jóga'}],labels:{r:'c',q:'c',m:'c'},splits:[{name:'fixture',queries:[{id:'q',artist:'Bjork',title:'Joga'},{id:'m',artist:'',title:'Joga'}],absent:{q:false,m:false}}]})[0];
 assert.equal(result.automatic,1); assert.equal(result.falseAutomatic,0);
 assert.equal(result.counts.correct_first_score_below_suggestion,1);
 assert.equal(result.nonAutomaticOverlappingFlags.query_artist_missing,1);
});
test('missing or empty truth labels and missing absence labels fail closed',()=>{
 const base=()=>({references:[{id:'r',artist:'A',title:'T'}],labels:{r:'c',q:'c'},splits:[{name:'fixture',queries:[{id:'q',artist:'A',title:'T'}],absent:{q:false}}]});
 for(const key of ['r','q'])for(const value of [undefined,'']) {
  const data=base(); data.labels[key]=value; assert.throws(()=>diagnose(data),/label/);
 }
 const data=base(); delete data.splits[0].absent.q; assert.throws(()=>diagnose(data),/absence label/);
});
