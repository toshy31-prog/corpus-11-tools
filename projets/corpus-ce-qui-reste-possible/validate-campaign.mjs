import { readFile } from "node:fs/promises";
import { summarizeCampaign, validateCampaign } from "./campaign-validator.js";

const source = new URL(process.argv[2] || "./campaigns/sereine.campaign.json", import.meta.url);
const campaign = JSON.parse(await readFile(source, "utf8"));
const issues = validateCampaign(campaign);
const summary = summarizeCampaign(campaign, issues);

console.log(`${campaign.collection} Builder · ${campaign.title}`);
console.log(`${summary.actors} positions · ${summary.actions} actions · ${summary.events} seuils · ${summary.knowledge} savoirs`);
for (const item of issues) console.log(`${item.level === "error" ? "ERREUR" : "AVERTISSEMENT"} ${item.code} · ${item.path}\n  ${item.message}`);
console.log(`${summary.errors} erreur(s) · ${summary.warnings} avertissement(s)`);
if (summary.errors) process.exitCode = 1;
