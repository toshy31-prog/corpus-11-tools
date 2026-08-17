import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatLifecycleStatus, formatScenarioList, scenarioCommands } from "../cli.mjs";

const here = dirname(fileURLToPath(import.meta.url));
test("list exposes the stable scenario aliases", () => {
  const output = formatScenarioList();
  for (const name of ["thermal", "braess", "ilyana", "campaign", "transport", "declarative"]) {
    assert.match(output, new RegExp(`^${name}\\t`, "m"));
  }
});

test("status exposes quarantines with their local boundary", () => {
  const registry = JSON.parse(readFileSync(resolve(here, "../lifecycle/registry.json"), "utf8"));
  const output = formatLifecycleStatus(registry);
  assert.match(output, /Lifecycle entries: 2/);
  assert.match(output, /quarantined_local/);
  assert.match(output, /do not validate or invalidate source capabilities/);
});

test("unknown scenarios have no executable fallback", () => {
  assert.equal(scenarioCommands.unknown, undefined);
});
