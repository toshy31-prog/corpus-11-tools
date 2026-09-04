#!/usr/bin/env node
import { readFileSync } from "node:fs";

export function validateWorlds(spec) {
  const errors = [];
  const must = (value, label) => { if (!value || (Array.isArray(value) && value.length === 0)) errors.push(`missing:${label}`); };
  must(spec.provenance === "internal_synthetic", "provenance");
  must(spec.scalar_winner_forbidden, "scalar_winner_forbidden");
  for (const world of spec.worlds ?? []) {
    must(world.initial?.length === spec.axes?.length, `${world.id}.initial`);
    must(world.threshold?.length === spec.axes?.length, `${world.id}.threshold`);
    must(world.events?.every((event) => event.length === spec.axes.length), `${world.id}.events`);
    for (const competitor of spec.competitors ?? []) {
      const plan = world.plans?.[competitor];
      must(plan, `${world.id}.${competitor}.plan`);
      let spent = 0;
      for (const actionName of plan ?? []) {
        const action = world.actions?.[actionName];
        must(action, `${world.id}.action.${actionName}`);
        spent += action?.cost ?? 0;
        must(action?.effect?.length === spec.axes.length, `${world.id}.effect.${actionName}`);
      }
      if (spent > spec.common_action_budget) errors.push(`budget:${world.id}.${competitor}:${spent}`);
    }
  }
  return errors;
}

const spec = JSON.parse(readFileSync(new URL("./worlds.json", import.meta.url)));
const errors = validateWorlds(spec);
console.log(JSON.stringify({ id: spec.id, valid: errors.length === 0, lifecycleCeiling: "internal_development_only", errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
