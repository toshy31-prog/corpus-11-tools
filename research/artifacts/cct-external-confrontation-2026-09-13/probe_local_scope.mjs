// Local characterization only. These fixtures are not external submissions.
import assert from 'node:assert/strict';
import { compileOutcomes } from '../../active/cct/external-simple-rival-pilot-v0.1/outcome-engine.mjs';
const packet={fixture:true,candidateId:'cct',informationUsed:8,decisions:[
  {type:'network_allocation',dailyGrossLitersByZone:Array.from({length:3},()=>({north:90000,central:94000,south:84000}))},
  {type:'offline_access',zoneIds:['north','central','south']},
  {type:'appeal_channel',startHour:0,durationHours:72},
  {type:'temporary_authority',startHour:0,endHour:72}
]};
const base=compileOutcomes(packet);assert.equal(base.admitted,true);
assert.deepEqual(compileOutcomes({...packet,candidateId:'simple_rival'}),base);
assert.deepEqual(compileOutcomes({...packet,hydraulicMetadata:{pressurePsi:0}}),compileOutcomes({...packet,hydraulicMetadata:{pressurePsi:100}}));
console.log(JSON.stringify({scope:'local_characterization_not_external_evidence',same_decisions_same_outcomes_across_candidate_labels:true,unrecognized_pressure_metadata_does_not_affect_outcomes:true,base_outcomes:base.outcomes,interpretation:'Matching actions are evaluated identically by design. The engine does not establish which institution produces these actions or whether a hydraulic network can deliver them.'},null,2));
