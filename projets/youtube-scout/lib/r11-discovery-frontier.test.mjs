import test from "node:test";
import assert from "node:assert/strict";
import {
  summarizeDiscoveryFrontier,
  scheduleDiscoveryFrontiers,
  convergeDiscoveryCandidates
} from "./discovery-frontier.mjs";

const candidate=(id,direction,steps,motifAt=0)=>({
  target:{id,type:"track",label:id}, direction, steps, motifAt, signature:`${direction}:${id}`
});
const step=(a,rel,b)=>({from:{id:a},relation:rel,to:{id:b}});

test("R11: Depth mesure des relations observées, pas un nombre de requêtes",()=>{
  const branches=[{direction:"curator",status:"active",candidates:[
    candidate("track:c","curator",[step("seed","published_by","channel:a"),step("channel:a","published","video:b"),step("video:b","embodies","track:c")])
  ]}];
  const f=summarizeDiscoveryFrontier(branches,{depth:6});
  assert.equal(f.maxObservedDepth,3);
  assert.equal(f.depthLimit,6);
  assert.equal(f.byDirection.curator.firstBranches,1);
});

test("R11: 100 observations du même premier curator restent une seule première branche",()=>{
  const candidates=Array.from({length:100},(_,i)=>candidate(`track:${i}`,"curator",[
    step("seed","published_by","channel:one"),step("channel:one","published",`track:${i}`)
  ]));
  const f=summarizeDiscoveryFrontier([{direction:"curator",status:"active",candidates}],{depth:6});
  assert.equal(f.byDirection.curator.targets,100);
  assert.equal(f.byDirection.curator.firstBranches,1);
});

test("R11: Spread réalloue le budget sans changer la preuve",()=>{
  const frontier={byDirection:{
    curator:{canExpand:true,firstBranches:1,state:"available"},
    label:{canExpand:true,firstBranches:4,state:"available"},
    compilation:{canExpand:true,firstBranches:5,state:"available"}
  }};
  const deep=scheduleDiscoveryFrontiers(frontier,{spread:0,budget:6,weights:{curator:2,label:1,compilation:1}});
  const wide=scheduleDiscoveryFrontiers(frontier,{spread:1,budget:6,weights:{curator:2,label:1,compilation:1}});
  assert.ok(deep.filter(x=>x.direction==="curator").length >= wide.filter(x=>x.direction==="curator").length);
  assert.ok(new Set(wide.map(x=>x.direction)).size >= 2);
});

test("R11: la convergence de présentation conserve tous les chemins",()=>{
  const a=candidate("track:x","label",[step("seed","issued_by","label:a"),step("label:a","released","track:x")]);
  const b=candidate("track:x","curator",[step("seed","published_by","channel:b"),step("channel:b","published","track:x")]);
  const [x]=convergeDiscoveryCandidates([a,b]);
  assert.equal(x.provenance.length,2);
  assert.deepEqual(new Set(x.directions),new Set(["label","curator"]));
});

test("R11: une branche indisponible ne reçoit aucun budget",()=>{
  const plan=scheduleDiscoveryFrontiers({byDirection:{
    remix:{canExpand:false,state:"unavailable",firstBranches:10},
    label:{canExpand:true,state:"available",firstBranches:1}
  }},{budget:3,spread:1});
  assert.deepEqual(new Set(plan.map(x=>x.direction)),new Set(["label"]));
});

test("R11: le budget ne peut pas paginer indéfiniment une seule direction",()=>{
  const plan=scheduleDiscoveryFrontiers({byDirection:{
    curator:{canExpand:true,state:"available",firstBranches:1}
  }},{budget:8,spread:0,maxPerDirection:3});
  assert.equal(plan.length,3);
});
