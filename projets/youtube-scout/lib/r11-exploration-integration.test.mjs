import test from "node:test";
import assert from "node:assert/strict";
import { createExplorationSession } from "./exploration.mjs";

test("R11: une session expose une frontière lisible sans modifier le graphe",()=>{
  const graph={entities:{
    seed:{id:"seed",type:"artist",name:"Seed"},
    rel:{id:"rel",type:"release",title:"R"},
    lab:{id:"lab",type:"label",name:"L"},
    tr:{id:"tr",type:"track",title:"T"}
  },edges:{
    a:{from:"seed",to:"rel",kind:"primary_artist",status:"observed"},
    b:{from:"rel",to:"lab",kind:"issued_by",status:"observed"},
    c:{from:"rel",to:"tr",kind:"appears_on",status:"observed"}
  }};
  const s=createExplorationSession({state:graph,seed:{id:"seed",type:"artist",label:"Seed"},directions:["label"],depth:6});
  assert.equal(s.frontier.depthLimit,6);
  assert.ok(s.frontier.byDirection.label);
  assert.equal(graph.entities.seed.name,"Seed");
});
