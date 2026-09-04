#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validateMinimumUseCase } from "./contract.mjs";

const source = process.argv[2] ? new URL(process.argv[2]) : new URL("./intervention.json", import.meta.url);
const spec = JSON.parse(readFileSync(source));
const errors = validateMinimumUseCase(spec);
console.log(JSON.stringify({ id: spec.id, valid: errors.length === 0, status: spec.status, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
