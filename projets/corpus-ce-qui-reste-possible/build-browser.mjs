import { readFile, writeFile } from "node:fs/promises";
import { validateCampaign } from "./campaign-validator.js";

const campaignText = await readFile(new URL("./campaigns/sereine.campaign.json", import.meta.url), "utf8");
const campaign = JSON.parse(campaignText);
const campaignErrors = validateCampaign(campaign).filter((item) => item.level === "error");
if (campaignErrors.length) {
  for (const item of campaignErrors) console.error(`ERREUR ${item.code} · ${item.path}\n  ${item.message}`);
  throw new Error(`Build interrompu : ${campaignErrors.length} erreur(s) dans la campagne.`);
}
const campaignDeclaration = `const ACTIVE_CAMPAIGN = Object.freeze(${JSON.stringify(campaign, null, 2)});\n`;

await writeFile(
  new URL("./campaign.generated.js", import.meta.url),
  `/* Generated from campaigns/sereine.campaign.json. */\nexport ${campaignDeclaration}`,
  "utf8",
);

function stripImports(source) {
  let result = source;
  while (/^import\s/.test(result)) result = result.replace(/^import[\s\S]*?;\s*/, "");
  return result;
}

const engine = stripImports(await readFile(new URL("./engine.js", import.meta.url), "utf8"))
  .replace(/^export\s+/gm, "");

const game = stripImports(await readFile(new URL("./game.js", import.meta.url), "utf8"));
const evolutionEngine = stripImports(await readFile(new URL("./evolution-engine.js", import.meta.url), "utf8"))
  .replace(/^export\s+/gm, "");
const evolutionGame = stripImports(await readFile(new URL("./evolution-game.js", import.meta.url), "utf8"));
const validator = stripImports(await readFile(new URL("./campaign-validator.js", import.meta.url), "utf8"))
  .replace(/^export\s+/gm, "");
const studio = stripImports(await readFile(new URL("./studio.js", import.meta.url), "utf8"));

const banner = `/* Generated from engine.js and game.js by build-browser.mjs. */\n`;
await writeFile(
  new URL("./browser.js", import.meta.url),
  `${banner}(() => {\n"use strict";\n${campaignDeclaration}${engine}\n${game}\n})();\n`,
  "utf8",
);

await writeFile(
  new URL("./studio-browser.js", import.meta.url),
  `/* Generated builder bundle. */\n(() => {\n"use strict";\n${campaignDeclaration}${validator}\n${studio}\n})();\n`,
  "utf8",
);

await writeFile(
  new URL("./evolution-browser.js", import.meta.url),
  `/* Generated from evolution-engine.js and evolution-game.js. */\n(() => {\n"use strict";\n${evolutionEngine}\n${evolutionGame}\n})();\n`,
  "utf8",
);
