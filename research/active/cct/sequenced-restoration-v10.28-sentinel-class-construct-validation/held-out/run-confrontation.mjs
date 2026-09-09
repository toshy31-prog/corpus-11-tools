import assert from "node:assert/strict";
import { assessSentinelClassConstructValidation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
const alias = setup.sentinelExecutionDescriptors.find((entry) => entry.sentinelId === "sentinel-alias-startup");
alias.aliasResolutionDepth = 0;
const result = assessSentinelClassConstructValidation(setup);
assert.deepEqual(result.failures, ["sentinel_class_construct_not_supported"]);
assert.ok(result.constructAudits.find((audit) => audit.sentinelId === alias.sentinelId).failures.includes("alias_resolution_not_observed"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], invalidConstruct: "alias" }));
