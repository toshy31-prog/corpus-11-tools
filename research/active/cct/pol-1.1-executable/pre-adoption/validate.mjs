#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validateReadiness } from "./contract.mjs";

const source = process.argv[2] ? new URL(process.argv[2]) : new URL("./readiness-contract.json", import.meta.url);
const spec = JSON.parse(readFileSync(source));
const errors = validateReadiness(spec);
console.log(JSON.stringify({ id: spec.id, valid: errors.length === 0, lifecycleCeiling: spec.lifecycle?.highest_established, admissionStatus: spec.lifecycle?.state, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
