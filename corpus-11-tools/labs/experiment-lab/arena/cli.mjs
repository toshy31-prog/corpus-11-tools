#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const scenarioCommands = {
  thermal: { script: "run-demo.mjs", regime: "internal_synthetic" },
  braess: { script: "run-braess.mjs", regime: "mixed" },
  ilyana: { script: "run-ilyana-bell.mjs", regime: "internal_synthetic" },
  campaign: { script: "run-capability-campaign.mjs", regime: "internal_synthetic" },
  transport: { script: "run-hidden-cost-transport.mjs", regime: "internal_synthetic" },
  declarative: { script: "run-declarative.mjs", regime: "internal_synthetic" },
};

function usage() {
  return `Open Experiment Arena

Usage:
  node arena/cli.mjs list
  node arena/cli.mjs demo <fixture>
  node arena/cli.mjs status
  node arena/cli.mjs test

Fixtures: ${Object.keys(scenarioCommands).join(", ")}

These are developer demonstrations, not user cases or external evidence.
`;
}

export function formatScenarioList() {
  return `${Object.entries(scenarioCommands).map(([id, fixture]) => (
    `${id}\t${fixture.regime}\t${fixture.script}`
  )).join("\n")}\n`;
}

export function formatLifecycleStatus(registry) {
  const entries = Object.entries(registry.entries);
  let output = `Lifecycle entries: ${entries.length}\n`;
  for (const [id, entry] of entries) output += `${entry.status}\t${entry.scope}\t${id}\n`;
  return `${output}Boundary: local statuses do not validate or invalidate source capabilities.\n`;
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { cwd: here, stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const [command, argument] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(usage());
  } else if (command === "list") {
    process.stdout.write(formatScenarioList());
  } else if (command === "demo") {
    if (!scenarioCommands[argument]) {
      process.stderr.write(`Unknown fixture: ${argument ?? "(missing)"}\n${usage()}`);
      process.exitCode = 2;
    } else {
      runNode([resolve(here, scenarioCommands[argument].script)]);
    }
  } else if (command === "status") {
    const registry = JSON.parse(readFileSync(resolve(here, "lifecycle/registry.json"), "utf8"));
    process.stdout.write(formatLifecycleStatus(registry));
  } else if (command === "test") {
    runNode(["--test", resolve(here, "tests")]);
  } else {
    process.stderr.write(`Unknown command: ${command}\n${usage()}`);
    process.exitCode = 2;
  }
}
