import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeReachability, validateCampaign } from "./campaign-validator.js";

const campaign = JSON.parse(await readFile(new URL("./campaigns/sereine.campaign.json", import.meta.url), "utf8"));

test("Sereine passes declarative validation without errors", () => {
  const errors = validateCampaign(campaign).filter((item) => item.level === "error");
  assert.deepEqual(errors, []);
});

test("the reachability result names its over-approximation", () => {
  const result = analyzeReachability(campaign);
  assert.deepEqual(result.unreachable, []);
  assert.equal(result.method, "positive fixed-point over-approximation");
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
