import test from "node:test";
import assert from "node:assert/strict";
import { CctV014Runtime, loadV014Spec, validateV014Spec } from "./runtime-v014.mjs";

const ontology = {
  hold: { tags: ["hold_noncoercive"], burden: 0, actor: "local-service", traceable: true },
  rescue: { tags: ["vital_minimum", "recourse_open", "attributable_receipt"], burden: 2, actor: "continuity-team", traceable: true },
  portable: { tags: ["rights_portability", "recourse_open", "vital_access_independent", "return_option"], burden: 3, actor: "external-defender", traceable: true },
  preserve: { tags: ["provisional_signed", "preserve_divergence", "recourse_open"], burden: 2, actor: "archive-pair", traceable: true },
  combined: { tags: ["vital_minimum", "recourse_open", "attributable_receipt", "provisional_signed", "preserve_divergence"], burden: 5, actor: "joint-cell", traceable: true },
  crackdown: { tags: ["unattributed_coercion", "competence_extension", "erase_divergence"], burden: 1, actor: "executive", traceable: true },
  local_permission: { tags: ["local_veto", "rights_conditioned_on_local_permission"], burden: 1, actor: "local-authority", traceable: true },
};

function view({ tick = 0, signals = [], keyGrants = [], keyRevocations = [], evidence = [], actionOntology = ontology } = {}) {
  return { cct: { tick, signals, keyGrants, keyRevocations, evidence, actionOntology }, publicState: { visible: 10 } };
}

function grants(mechanismId, keys) {
  return keys.map((key) => ({ mechanismId, key, authorityTrace: `${mechanismId}:${key}:signed` }));
}

const vital = [
  { id: "v1", kind: "vital_denial", subject: "person-a", channel: "offline", failureDomain: "local-analog", confirmed: true },
  { id: "v2", kind: "vital_denial", subject: "person-a", channel: "signed", failureDomain: "federal-digital", confirmed: true },
];
const divergence = [
  { id: "d1", kind: "information_divergence", subject: "order-a", affects: "coercion", channel: "local", failureDomain: "offline-ledger", confirmed: true },
  { id: "d2", kind: "information_divergence", subject: "order-a", affects: "coercion", channel: "archive", failureDomain: "remote-archive", confirmed: true },
];

test("candidate structure is valid", () => assert.deepEqual(validateV014Spec(loadV014Spec()), []));

test("emergency waits for the second key", () => {
  const runtime = new CctV014Runtime();
  const result = runtime.decide({ view: view({ signals: vital, keyGrants: grants("M14-01", ["continuity"]) }), allowedActions: ["hold", "rescue", "crackdown"] });
  assert.equal(result.action, "hold");
  assert.equal(runtime.snapshot().mechanisms["M14-01"].phase, "awaiting_keys");
});

test("active emergency selects protection and excludes competence extension", () => {
  const runtime = new CctV014Runtime();
  const result = runtime.decide({ view: view({ signals: vital, keyGrants: grants("M14-01", ["continuity", "contradictor"]) }), allowedActions: ["crackdown", "rescue", "hold"] });
  assert.equal(result.action, "rescue");
  assert.equal(runtime.snapshot().mechanisms["M14-01"].phase, "active");
  assert.deepEqual(result.governance.satisfiedTags, ["attributable_receipt", "recourse_open", "vital_minimum"]);
});

test("expiry requires restitution and blocks silent renewal", () => {
  const runtime = new CctV014Runtime();
  runtime.decide({ view: view({ tick: 0, signals: vital, keyGrants: grants("M14-01", ["continuity", "contradictor"]) }), allowedActions: ["rescue", "hold"] });
  runtime.decide({ view: view({ tick: 2 }), allowedActions: ["rescue", "hold"] });
  const state = runtime.snapshot().mechanisms["M14-01"];
  assert.equal(state.phase, "restitution_due");
  assert.deepEqual(state.keys, []);
});

test("renewal requires restitution, new need and fresh keys", () => {
  const runtime = new CctV014Runtime();
  runtime.decide({ view: view({ signals: vital, keyGrants: grants("M14-01", ["continuity", "contradictor"]) }), allowedActions: ["rescue", "hold"] });
  runtime.decide({ view: view({ tick: 2 }), allowedActions: ["rescue", "hold"] });
  runtime.decide({
    view: view({ tick: 3, evidence: [{ mechanismId: "M14-01", kind: "restitution_complete" }, { mechanismId: "M14-01", kind: "renewal_need" }], keyGrants: grants("M14-01", ["continuity", "contradictor"]) }),
    allowedActions: ["rescue", "hold"],
  });
  const state = runtime.snapshot().mechanisms["M14-01"];
  assert.equal(state.phase, "active");
  assert.equal(state.cycle, 2);
});

test("key revocation interrupts active authority", () => {
  const runtime = new CctV014Runtime();
  runtime.decide({ view: view({ signals: vital, keyGrants: grants("M14-01", ["continuity", "contradictor"]) }), allowedActions: ["rescue", "hold"] });
  runtime.decide({ view: view({ tick: 1, keyRevocations: [{ mechanismId: "M14-01", key: "contradictor" }] }), allowedActions: ["rescue", "hold"] });
  assert.equal(runtime.snapshot().mechanisms["M14-01"].phase, "restitution_due");
});

test("portable rights bypass local permission", () => {
  const runtime = new CctV014Runtime();
  const signal = [{ id: "r1", kind: "retaliation_risk", subject: "person-b", channel: "defender", failureDomain: "external-jurisdiction", confirmed: true }];
  const result = runtime.decide({ view: view({ signals: signal, keyGrants: grants("M14-02", ["extraterritorial_defender", "jurisdiction"]) }), allowedActions: ["local_permission", "portable", "hold"] });
  assert.equal(result.action, "portable");
});

test("information divergence is preserved", () => {
  const runtime = new CctV014Runtime();
  const result = runtime.decide({ view: view({ signals: divergence, keyGrants: grants("M14-03", ["archive", "contradictor"]) }), allowedActions: ["crackdown", "preserve", "hold"] });
  assert.equal(result.action, "preserve");
});

test("mechanism composition is order-independent on tested scope", () => {
  const run = (signals, keyGrants) => {
    const runtime = new CctV014Runtime();
    const result = runtime.decide({ view: view({ signals, keyGrants }), allowedActions: ["rescue", "preserve", "combined", "hold"] });
    return { action: result.action, phases: Object.fromEntries(Object.entries(runtime.snapshot().mechanisms).map(([id, state]) => [id, state.phase])) };
  };
  const allGrants = [...grants("M14-01", ["continuity", "contradictor"]), ...grants("M14-03", ["archive", "contradictor"])];
  const forward = run([...vital, ...divergence], allGrants);
  const reverse = run([...divergence].reverse().concat([...vital].reverse()), [...allGrants].reverse());
  assert.deepEqual(forward, reverse);
  assert.equal(forward.action, "combined");
});

test("action names have no inferred semantics", () => {
  const runtime = new CctV014Runtime();
  const renamed = { authoritarian_crackdown: { ...ontology.rescue }, benevolent_rescue: { ...ontology.crackdown } };
  const result = runtime.decide({ view: view({ signals: vital, keyGrants: grants("M14-01", ["continuity", "contradictor"]), actionOntology: renamed }), allowedActions: Object.keys(renamed) });
  assert.equal(result.action, "authoritarian_crackdown");
});

test("missing public action semantics fail closed", () => {
  const runtime = new CctV014Runtime();
  assert.throws(() => runtime.decide({ view: view(), allowedActions: ["unknown-action"] }), /CCT_ACTION_SEMANTICS_MISSING/);
});

test("time cannot regress", () => {
  const runtime = new CctV014Runtime();
  runtime.decide({ view: view({ tick: 2 }), allowedActions: ["hold"] });
  assert.throws(() => runtime.decide({ view: view({ tick: 1 }), allowedActions: ["hold"] }), /CCT_TIME_REGRESSION/);
});

test("mutations erasing safeguards are rejected", () => {
  const spec = loadV014Spec();
  spec.mechanisms[0].active.forbiddenTags.push("vital_minimum");
  spec.future_arena.matched_public_action_ontology = false;
  const errors = validateV014Spec(spec).join("\n");
  assert.match(errors, /obligation cannot be forbidden/);
  assert.match(errors, /matched_public_action_ontology/);
});
