import { ACTIVE_CAMPAIGN } from "./campaign.generated.js";

export const CAMPAIGN = ACTIVE_CAMPAIGN;
export const DEADLINE_HOURS = CAMPAIGN.deadline;

const actorSeed = Object.fromEntries(Object.entries(CAMPAIGN.actors).map(([id, actor]) => [id, {
  name: actor.name,
  role: actor.role,
  place: actor.place,
  color: actor.color,
  knowledge: [...actor.initialKnowledge],
  inbox: [],
}]));

export const ACTOR_ORDER = Object.freeze(Object.keys(CAMPAIGN.actors));
export const KNOWLEDGE = Object.freeze({ ...CAMPAIGN.knowledge });
export const ACTIONS = Object.freeze(CAMPAIGN.actions.map((action) => Object.freeze({ ...action })));

const clone = (value) => structuredClone(value);
const knows = (state, actor, fact) => Boolean(state.actors[actor]?.knowledge.includes(fact));

function learn(state, actor, fact, via = null) {
  if (!state.actors[actor]) return;
  if (!knows(state, actor, fact)) state.actors[actor].knowledge.push(fact);
  if (via && !state.actors[actor].inbox.includes(via)) state.actors[actor].inbox.push(via);
}

function addTrace(state, id, holder, permissions = []) {
  state.traces[id] = { id, holders: [holder], permissions: [...permissions], createdAt: state.elapsed };
}

function passTrace(state, id, from, to, channel, purpose) {
  const trace = state.traces[id];
  if (trace && !trace.holders.includes(to)) trace.holders.push(to);
  state.relays.unshift({ id: `${state.turn}-${id}-${to}`, trace: id, from, to, channel, purpose, hour: state.elapsed });
}

function addLog(state, actor, title, body, tone = "neutral") {
  state.log.unshift({ id: `${state.turn}-${state.elapsed}-${title}`, actor, title, body, tone, hour: state.elapsed });
}

export function conditionsMet(state, requirements = {}, actor = state.perspective) {
  const hasKnowledge = (requirements.knowledge || []).every((fact) => knows(state, actor, fact));
  const lacksKnowledge = (requirements.notKnowledge || []).every((fact) => !knows(state, actor, fact));
  const hasAnyKnowledge = !(requirements.anyKnowledge || []).length
    || requirements.anyKnowledge.some((fact) => knows(state, actor, fact));
  const hasWorld = (requirements.world || []).every((flag) => state.world[flag]);
  const lacksWorld = (requirements.notWorld || []).every((flag) => !state.world[flag]);
  const hasAnyWorld = !(requirements.anyWorld || []).length
    || requirements.anyWorld.some((flag) => state.world[flag]);
  return hasKnowledge && lacksKnowledge && hasAnyKnowledge && hasWorld && lacksWorld && hasAnyWorld;
}

function applyConsequences(state, node, actor) {
  for (const flag of node.grants?.world || []) state.world[flag] = true;
  for (const flag of node.clears?.world || []) state.world[flag] = false;
  for (const grant of node.grants?.knowledge || []) learn(state, grant.actor, grant.fact, grant.via);
  for (const trace of node.creates || []) addTrace(state, trace.id, trace.holder || actor, trace.permissions);

  for (const relay of node.relays || []) {
    const from = relay.from || actor;
    learn(state, relay.to, relay.fact, `${relay.channel} · ${relay.purpose}`);
    passTrace(state, relay.trace || relay.fact, from, relay.to, relay.channel, relay.purpose);
  }

  for (const conditional of node.conditionalGrants || []) {
    if (conditionsMet(state, conditional.when, actor)) applyConsequences(state, conditional, actor);
  }

  if (node.cancelsScheduledFrom?.length) {
    state.scheduled = state.scheduled.filter((item) => !node.cancelsScheduledFrom.includes(item.sourceAction));
  }

  for (const scheduled of node.scheduled || []) {
    if (scheduled.scheduleWhen && !conditionsMet(state, scheduled.scheduleWhen, actor)) continue;
    state.scheduled.push({
      at: state.elapsed + scheduled.after,
      actor,
      sourceAction: node.id,
      spec: clone(scheduled),
    });
  }
}

function executeNode(state, node, actor) {
  if (node.when && !conditionsMet(state, node.when, actor)) return null;
  applyConsequences(state, node, actor);
  let result = node.result || null;
  if (node.branches) {
    const branch = node.branches.find((candidate) => !candidate.when || conditionsMet(state, candidate.when, actor));
    if (branch) result = executeNode(state, branch, actor) || result;
  }
  return result;
}

export function applyDeclaredNode(inputState, node, actor = inputState.perspective) {
  const state = clone(inputState);
  executeNode(state, node, actor);
  return state;
}

export function createInitialState() {
  return {
    version: CAMPAIGN.stateVersion,
    campaignId: CAMPAIGN.id,
    elapsed: 0,
    deadline: DEADLINE_HOURS,
    turn: 0,
    perspective: CAMPAIGN.initialPerspective || ACTOR_ORDER[0],
    ended: false,
    completed: [],
    actors: clone(actorSeed),
    traces: {},
    relays: [],
    scheduled: [],
    events: [],
    world: Object.fromEntries(CAMPAIGN.worldFlags.map((flag) => [flag, false])),
    lastBeat: clone(CAMPAIGN.opening.lastBeat),
    log: [{
      id: "opening",
      ...clone(CAMPAIGN.opening.log),
      hour: 0,
    }],
  };
}

export function resolveDuration(action, state) {
  const variant = (action.durationVariants || []).find((candidate) => {
    const hasWorld = (candidate.whenWorld || []).every((flag) => state.world[flag]);
    const lacksWorld = (candidate.unlessWorld || []).every((flag) => !state.world[flag]);
    return hasWorld && lacksWorld;
  });
  return variant?.duration ?? action.duration;
}

export function getAvailableActions(state, actor = state.perspective) {
  return ACTIONS.filter((action) => {
    if (action.actor !== actor || state.completed.includes(action.id) || state.ended) return false;
    return conditionsMet(state, action.requires, action.actor)
      && state.elapsed + resolveDuration(action, state) <= state.deadline;
  }).map((action) => ({ ...action, duration: resolveDuration(action, state) }));
}

function processScheduled(state, from, to) {
  const due = state.scheduled.filter((item) => from < item.at && item.at <= to).sort((a, b) => a.at - b.at);
  for (const item of due) {
    const result = executeNode(state, item.spec, item.actor);
    if (result) addLog(state, result.actor || item.actor, result.title, result.body, result.tone);
  }
  state.scheduled = state.scheduled.filter((item) => item.at > to);
}

function processWorldEvents(state, from, to) {
  const due = CAMPAIGN.timeline
    .filter((event) => from < event.hour && to >= event.hour && !state.events.includes(event.id))
    .sort((a, b) => a.hour - b.hour);
  for (const event of due) {
    state.events.push(event.id);
    const result = executeNode(state, event, event.result?.actor || CAMPAIGN.initialPerspective);
    if (result) addLog(state, result.actor || CAMPAIGN.initialPerspective, result.title, result.body, result.tone);
    if (event.endCampaign) state.ended = true;
  }
}

function moveTime(state, duration, beforeWorldEvents = null) {
  const from = state.elapsed;
  const to = Math.min(state.deadline, from + duration);
  const thresholds = [...CAMPAIGN.timeline.map((event) => event.hour), state.deadline];
  const points = [...new Set([
    ...state.scheduled.filter((item) => from < item.at && item.at <= to).map((item) => item.at),
    ...thresholds.filter((hour) => from < hour && hour <= to),
    to,
  ])].sort((a, b) => a - b);
  let cursor = from;
  for (const point of points) {
    state.elapsed = point;
    processScheduled(state, cursor, point);
    if (point === to && beforeWorldEvents) beforeWorldEvents();
    processWorldEvents(state, cursor, point);
    cursor = point;
  }
}

export function performAction(inputState, actionId) {
  const state = clone(inputState);
  const action = getAvailableActions(state, state.perspective).find((item) => item.id === actionId);
  if (!action) throw new Error(`Action indisponible pour cette position: ${actionId}`);
  state.turn += 1;
  state.completed.push(action.id);
  let beat;
  moveTime(state, action.duration, () => {
    executeNode(state, action, action.actor);
    beat = action.result || { title: action.title, body: action.description, tone: "neutral" };
  });
  state.lastBeat = { actor: action.actor, ...beat };
  addLog(state, action.actor, beat.title, beat.body, beat.tone);
  return state;
}

export function changePerspective(inputState, actor) {
  if (!ACTOR_ORDER.includes(actor)) throw new Error(`Position inconnue: ${actor}`);
  const state = clone(inputState);
  state.perspective = actor;
  return state;
}

export function advanceToDeadline(inputState) {
  const state = clone(inputState);
  if (state.ended) return state;
  state.turn += 1;
  moveTime(state, state.deadline - state.elapsed);
  return state;
}

export function formatClock(elapsed) {
  const allWeekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const startIndex = Math.max(0, allWeekdays.indexOf(CAMPAIGN.start.weekday));
  const totalHours = CAMPAIGN.start.hour + elapsed;
  const day = allWeekdays[(startIndex + Math.floor(totalHours / 24)) % allWeekdays.length];
  const hours = String(totalHours % 24).padStart(2, "0");
  return `${day} · ${hours} h 00`;
}

export function getActorKnowledge(state, actor = state.perspective) {
  return state.actors[actor].knowledge.map((id) => ({ id, text: KNOWLEDGE[id] || id }));
}

export function getOutcome(state) {
  const select = (variants = []) => variants.find((variant) => !variant.when || conditionsMet(state, variant.when));
  const summary = select(CAMPAIGN.outcome.variants);
  return {
    heading: summary.heading,
    summary: summary.summary,
    dimensions: CAMPAIGN.outcome.dimensions.map((dimension) => {
      const { when: _condition, ...presentation } = select(dimension.variants);
      return { label: dimension.label, ...presentation };
    }),
  };
}
