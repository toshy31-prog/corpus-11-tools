export function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

export function evaluateWorld(world, competitor, axes) {
  const plan = world.plans[competitor];
  let state = [...world.initial];
  let spent = 0;
  const trace = [];
  for (let tick = 0; tick < world.events.length; tick += 1) {
    state = add(state, world.events[tick]);
    const actionName = plan[tick];
    if (actionName) {
      const action = world.actions[actionName];
      spent += action.cost;
      state = add(state, action.effect);
    }
    trace.push({ tick, action: actionName ?? null, state: Object.fromEntries(axes.map((axis, index) => [axis, state[index]])) });
  }
  const final = Object.fromEntries(axes.map((axis, index) => [axis, state[index]]));
  const breaches = axes.filter((axis, index) => state[index] < world.threshold[index]);
  return { competitor, spent, final, breaches, trace };
}

export function executeCampaign(spec) {
  return {
    campaign: spec.id,
    provenance: spec.provenance,
    promotion_forbidden: spec.scalar_winner_forbidden,
    results: spec.worlds.map((world) => ({
      world: world.id,
      results: spec.competitors.map((competitor) => evaluateWorld(world, competitor, spec.axes))
    }))
  };
}
