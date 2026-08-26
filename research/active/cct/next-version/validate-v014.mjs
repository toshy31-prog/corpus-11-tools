#!/usr/bin/env node
import { loadV014Spec, validateV014Spec } from "./runtime-v014.mjs";

const errors = validateV014Spec(loadV014Spec());
console.log(JSON.stringify({
  version: "0.14-candidate",
  valid: errors.length === 0,
  lifecycleCeiling: "locally_tested",
  errors,
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
