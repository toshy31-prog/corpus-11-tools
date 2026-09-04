#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { executeCampaign } from "./runtime.mjs";
import { validateWorlds } from "./validate-worlds.mjs";

const spec = JSON.parse(readFileSync(new URL("./worlds.json", import.meta.url)));
const errors = validateWorlds(spec);
if (errors.length) throw new Error(`CCT_POL_11_ARENA_INVALID\n${errors.join("\n")}`);
const report = executeCampaign(spec);
writeFileSync(new URL("./internal-campaign-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ campaign: report.campaign, worlds: report.results.length, promotion_forbidden: true }, null, 2));
