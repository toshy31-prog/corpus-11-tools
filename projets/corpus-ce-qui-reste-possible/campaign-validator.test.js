import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeReachability, validateCampaign } from "./campaign-validator.js";

const campaign = JSON.parse(await readFile(new URL("./campaigns/sereine.campaign.json", import.meta.url), "utf8"));

test("Sereine passes declarative validation without errors", () => {
  const errors = validateCampaign(campaign).filter((item) => item.level === "error");
  assert.deepEqual(errors, []);
});

test("the reachability result explores branches and time", () => {
  const result = analyzeReachability(campaign);
  assert.deepEqual(result.unreachable, []);
  assert.equal(result.method, "bounded branch-and-time exploration");
  assert.equal(result.truncated, false);
  assert.ok(result.exploredStates > 1);
});

test("mutually exclusive choices cannot unlock an impossible conjunction", () => {
  const exclusive = structuredClone(campaign);
  exclusive.deadline = 4;
  exclusive.timeline = [{ id: "end", hour: 4, label: "Fin", when: "Bientôt", irreversible: false, endCampaign: true }];
  exclusive.actions = [
    { id: "choose-x", actor: "ina", verb: "Choisir", title: "Choisir X", description: "Ferme Y.", duration: 1, requires: { notWorld: ["recordsDistributed"] }, grants: { world: ["recordsCompared"] } },
    { id: "choose-y", actor: "ina", verb: "Choisir", title: "Choisir Y", description: "Ferme X.", duration: 1, requires: { notWorld: ["recordsCompared"] }, grants: { world: ["recordsDistributed"] } },
    { id: "need-both", actor: "ina", verb: "Cumuler", title: "Exiger les deux", description: "Cette action doit rester impossible.", duration: 1, requires: { world: ["recordsCompared", "recordsDistributed"] } },
  ];
  const result = analyzeReachability(exclusive);
  assert.deepEqual(result.unreachable, ["need-both"]);
  assert.equal(result.truncated, false);
});

test("the exploration respects the deadline", () => {
  const timed = structuredClone(campaign);
  timed.deadline = 2;
  timed.timeline = [{ id: "end", hour: 2, label: "Fin", when: "Bientôt", irreversible: false, endCampaign: true }];
  timed.actions = [
    { id: "slow", actor: "ina", verb: "Attendre", title: "Trop lent", description: "Dépasse le temps disponible.", duration: 3 },
  ];
  assert.deepEqual(analyzeReachability(timed).unreachable, ["slow"]);
});

test("cross-position knowledge without a relay is rejected", () => {
  const broken = structuredClone(campaign);
  const action = broken.actions.find((candidate) => candidate.id === "ina-send-mara");
  action.relays = [];
  const issues = validateCampaign(broken);
  assert.ok(issues.some((item) => item.code === "KNOWLEDGE_LEAK" && item.level === "error"));
});

test("a global score is rejected anywhere in the campaign", () => {
  const broken = structuredClone(campaign);
  broken.outcome = { score: 100 };
  assert.ok(validateCampaign(broken).some((item) => item.code === "GLOBAL_SCORE"));
});

test("a hidden pressure aggregate is rejected as a global score", () => {
  const broken = structuredClone(campaign);
  broken.pressure = 0;
  assert.ok(validateCampaign(broken).some((item) => item.code === "GLOBAL_SCORE"));
});

test("nested scheduled and timeline effects are validated", () => {
  const broken = structuredClone(campaign);
  broken.timeline[0].branches[0].grants = { world: ["perfectWorld"] };
  broken.actions.find((action) => action.id === "mara-freeze").scheduled[0].relays[0].to = "nobody";
  const codes = validateCampaign(broken).map((item) => item.code);
  assert.ok(codes.includes("UNKNOWN_WORLD_FLAG"));
  assert.ok(codes.includes("UNKNOWN_ACTOR"));
});

test("a new declarative action needs no matching JavaScript handler", () => {
  const extended = structuredClone(campaign);
  extended.actions.push({
    id: "ina-new-path",
    actor: "ina",
    verb: "Essayer",
    title: "Ouvrir une autre possibilité",
    duration: 1,
    description: "Une action entièrement décrite par la campagne.",
    grants: { world: ["routeTransmitted"] },
  });
  assert.deepEqual(validateCampaign(extended).filter((item) => item.level === "error"), []);
});

test("unknown knowledge and world flags are rejected", () => {
  const broken = structuredClone(campaign);
  broken.actions[0].requires = { knowledge: ["omniscience"], world: ["perfectWorld"] };
  const codes = validateCampaign(broken).map((item) => item.code);
  assert.ok(codes.includes("UNKNOWN_KNOWLEDGE"));
  assert.ok(codes.includes("UNKNOWN_WORLD_FLAG"));
});

test("identifiers and actor colors are safe to embed in the local interface", () => {
  const broken = structuredClone(campaign);
  broken.id = "bad\" onclick=\"alert(1)";
  broken.actors.ina.color = "red;display:none";
  broken.actions[0].id = "<script>";
  const codes = validateCampaign(broken).map((item) => item.code);
  assert.ok(codes.includes("CAMPAIGN_ID"));
  assert.ok(codes.includes("ACTOR_COLOR"));
  assert.ok(codes.includes("ACTION_ID"));
});

test("outcome branches use declared world flags and end with a fallback", () => {
  const broken = structuredClone(campaign);
  broken.outcome.variants[0].when = { world: ["perfectWorld"], knowledge: ["eviction"] };
  broken.outcome.dimensions[0].variants.at(-1).when = { world: ["permitFrozen"] };
  const codes = validateCampaign(broken).map((item) => item.code);
  assert.ok(codes.includes("UNKNOWN_WORLD_FLAG"));
  assert.ok(codes.includes("OUTCOME_PERSPECTIVE"));
  assert.ok(codes.includes("OUTCOME_FALLBACK"));
});

test("the outcome cannot collapse to one dimension", () => {
  const broken = structuredClone(campaign);
  broken.outcome.dimensions = broken.outcome.dimensions.slice(0, 1);
  assert.ok(validateCampaign(broken).some((item) => item.code === "OUTCOME_DIMENSIONS"));
});

test("the opening references a declared position and complete copy", () => {
  const broken = structuredClone(campaign);
  broken.opening.lastBeat.actor = "nobody";
  delete broken.opening.log.body;
  const codes = validateCampaign(broken).map((item) => item.code);
  assert.ok(codes.includes("UNKNOWN_ACTOR"));
  assert.ok(codes.includes("OPENING_FIELDS"));
});
