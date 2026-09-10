const issue = (level, code, path, message) => ({ level, code, path, message });

function duplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

function walkKeys(value, visit, path = "campaign") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, `${path}.${key}`);
    walkKeys(child, visit, `${path}.${key}`);
  }
}

export function analyzeReachability(campaign) {
  const actors = campaign.actors || {};
  const known = Object.fromEntries(Object.entries(actors).map(([id, actor]) => [id, new Set(actor.initialKnowledge || [])]));
  const world = new Set();
  const reached = new Set();
  let changed = true;

  while (changed) {
    changed = false;
    for (const action of campaign.actions || []) {
      if (reached.has(action.id) || !known[action.actor]) continue;
      const requires = action.requires || {};
      const hasKnowledge = (requires.knowledge || []).every((fact) => known[action.actor].has(fact));
      const hasAnyKnowledge = !(requires.anyKnowledge || []).length
        || requires.anyKnowledge.some((fact) => known[action.actor].has(fact));
      const hasWorld = (requires.world || []).every((flag) => world.has(flag));
      if (!hasKnowledge || !hasAnyKnowledge || !hasWorld) continue;

      reached.add(action.id);
      changed = true;
      for (const flag of action.grants?.world || []) world.add(flag);
      for (const grant of action.grants?.knowledge || []) known[grant.actor]?.add(grant.fact);
      for (const relay of action.relays || []) known[relay.to]?.add(relay.fact);
      for (const conditional of action.conditionalGrants || []) {
        for (const flag of conditional.grants?.world || []) world.add(flag);
        for (const grant of conditional.grants?.knowledge || []) known[grant.actor]?.add(grant.fact);
        for (const relay of conditional.relays || []) known[relay.to]?.add(relay.fact);
      }
      for (const scheduled of action.scheduled || []) {
        for (const flag of scheduled.grants?.world || []) world.add(flag);
        for (const grant of scheduled.grants?.knowledge || []) known[grant.actor]?.add(grant.fact);
        for (const relay of scheduled.relays || []) known[relay.to]?.add(relay.fact);
        for (const branch of scheduled.branches || []) {
          for (const flag of branch.grants?.world || []) world.add(flag);
          for (const grant of branch.grants?.knowledge || []) known[grant.actor]?.add(grant.fact);
          for (const relay of branch.relays || []) known[relay.to]?.add(relay.fact);
        }
      }
    }
  }
  return {
    reached,
    unreachable: (campaign.actions || []).filter((action) => !reached.has(action.id)).map((action) => action.id),
    known,
    world,
    method: "positive fixed-point over-approximation",
  };
}

export function validateCampaign(campaign) {
  const issues = [];
  if (!campaign || typeof campaign !== "object") {
    return [issue("error", "CAMPAIGN_TYPE", "campaign", "La campagne doit être un objet JSON.")];
  }
  if (campaign.schemaVersion !== 2) issues.push(issue("error", "SCHEMA_VERSION", "campaign.schemaVersion", "Version de schéma attendue : 2."));
  if (!Number.isInteger(campaign.stateVersion) || campaign.stateVersion < 1) issues.push(issue("error", "STATE_VERSION", "campaign.stateVersion", "Une version d'état entière et positive est obligatoire."));
  if (!campaign.id) issues.push(issue("error", "CAMPAIGN_ID", "campaign.id", "Identifiant de campagne manquant."));
  if (!Number.isFinite(campaign.deadline) || campaign.deadline <= 0) issues.push(issue("error", "DEADLINE", "campaign.deadline", "L'échéance doit être un nombre positif."));

  const actors = campaign.actors || {};
  const actorIds = new Set(Object.keys(actors));
  const knowledgeIds = new Set(Object.keys(campaign.knowledge || {}));
  const worldFlags = new Set(campaign.worldFlags || []);
  const actions = campaign.actions || [];
  const actionIds = new Set(actions.map((action) => action.id));

  if (actorIds.size < 2) issues.push(issue("warning", "ACTOR_PLURALITY", "campaign.actors", "Moins de deux positions : le changement de perspective ne sera pas jouable."));
  if (!actorIds.has(campaign.initialPerspective)) issues.push(issue("error", "INITIAL_PERSPECTIVE", "campaign.initialPerspective", "La position initiale doit référencer un acteur déclaré."));

  for (const [actorId, actor] of Object.entries(actors)) {
    if (!actor.name || !actor.role || !actor.place) issues.push(issue("error", "ACTOR_FIELDS", `campaign.actors.${actorId}`, "Nom, rôle et lieu sont obligatoires."));
    for (const fact of actor.initialKnowledge || []) {
      if (!knowledgeIds.has(fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", `campaign.actors.${actorId}.initialKnowledge`, `Savoir inconnu : ${fact}.`));
    }
  }

  function validateRequirements(requirements = {}, path) {
    for (const fact of [...(requirements.knowledge || []), ...(requirements.notKnowledge || []), ...(requirements.anyKnowledge || [])]) {
      if (!knowledgeIds.has(fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", path, `Savoir inconnu : ${fact}.`));
    }
    for (const flag of [...(requirements.world || []), ...(requirements.notWorld || []), ...(requirements.anyWorld || [])]) {
      if (!worldFlags.has(flag)) issues.push(issue("error", "UNKNOWN_WORLD_FLAG", path, `État du monde inconnu : ${flag}.`));
    }
  }

  function validateNode(node, path, sourceActor) {
    validateRequirements(node.when, `${path}.when`);
    validateRequirements(node.scheduleWhen, `${path}.scheduleWhen`);
    for (const flag of node.grants?.world || []) {
      if (!worldFlags.has(flag)) issues.push(issue("error", "UNKNOWN_WORLD_FLAG", `${path}.grants.world`, `État inconnu : ${flag}.`));
    }
    for (const flag of node.clears?.world || []) {
      if (!worldFlags.has(flag)) issues.push(issue("error", "UNKNOWN_WORLD_FLAG", `${path}.clears.world`, `État inconnu : ${flag}.`));
    }
    for (const grant of node.grants?.knowledge || []) {
      if (!actorIds.has(grant.actor)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.grants.knowledge`, `Destinataire inconnu : ${grant.actor}.`));
      if (!knowledgeIds.has(grant.fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", `${path}.grants.knowledge`, `Savoir inconnu : ${grant.fact}.`));
      if (sourceActor && grant.actor !== sourceActor) {
        const relayed = (node.relays || []).some((relay) => relay.to === grant.actor && relay.fact === grant.fact);
        if (!relayed) issues.push(issue("error", "KNOWLEDGE_LEAK", `${path}.grants.knowledge`, `${grant.actor} apprend « ${grant.fact} » sans relais déclaré.`));
      }
    }
    for (const relay of node.relays || []) {
      if (relay.from && !actorIds.has(relay.from)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.relays`, `Émetteur inconnu : ${relay.from}.`));
      if (!actorIds.has(relay.to)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.relays`, `Destinataire inconnu : ${relay.to}.`));
      if (!knowledgeIds.has(relay.fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", `${path}.relays`, `Savoir inconnu : ${relay.fact}.`));
      if (!relay.channel || !relay.purpose) issues.push(issue("error", "INCOMPLETE_RELAY", `${path}.relays`, "Un relais exige un canal et une finalité."));
    }
    for (const trace of node.creates || []) {
      if (!trace.id || !actorIds.has(trace.holder || sourceActor)) issues.push(issue("error", "INVALID_TRACE", `${path}.creates`, "Une trace exige un identifiant et un détenteur déclaré."));
    }
    for (const source of node.cancelsScheduledFrom || []) {
      if (!actionIds.has(source)) issues.push(issue("error", "UNKNOWN_ACTION", `${path}.cancelsScheduledFrom`, `Action source inconnue : ${source}.`));
    }
    if (node.result) {
      if (!node.result.title || !node.result.body) issues.push(issue("error", "RESULT_FIELDS", `${path}.result`, "Un résultat exige un titre et un corps."));
      if (node.result.actor && !actorIds.has(node.result.actor)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.result.actor`, `Acteur de résultat inconnu : ${node.result.actor}.`));
    }
    for (const [index, conditional] of (node.conditionalGrants || []).entries()) validateNode(conditional, `${path}.conditionalGrants.${index}`, sourceActor);
    for (const [index, scheduled] of (node.scheduled || []).entries()) {
      if (!Number.isFinite(scheduled.after) || scheduled.after < 0) issues.push(issue("error", "SCHEDULE_DELAY", `${path}.scheduled.${index}`, "Un effet différé exige un délai positif ou nul."));
      validateNode(scheduled, `${path}.scheduled.${index}`, sourceActor);
    }
    for (const [index, branch] of (node.branches || []).entries()) validateNode(branch, `${path}.branches.${index}`, sourceActor);
  }

  for (const id of duplicates(actions.map((action) => action.id))) issues.push(issue("error", "DUPLICATE_ACTION", "campaign.actions", `Action dupliquée : ${id}.`));
  for (const action of actions) {
    const path = `campaign.actions.${action.id || "?"}`;
    if (!actorIds.has(action.actor)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.actor`, `Position inconnue : ${action.actor}.`));
    if (!action.title || !action.verb || !action.description) issues.push(issue("error", "ACTION_FIELDS", path, "Verbe, titre et description sont obligatoires."));
    if (!Number.isFinite(action.duration) || action.duration <= 0) issues.push(issue("error", "ACTION_DURATION", `${path}.duration`, "La durée doit être strictement positive."));
    if (action.duration > campaign.deadline) issues.push(issue("warning", "ACTION_AFTER_DEADLINE", `${path}.duration`, "Cette action ne peut jamais tenir dans la campagne."));
    validateRequirements(action.requires, `${path}.requires`);
    for (const [index, variant] of (action.durationVariants || []).entries()) {
      if (!Number.isFinite(variant.duration) || variant.duration <= 0) issues.push(issue("error", "ACTION_DURATION", `${path}.durationVariants.${index}`, "La durée variante doit être strictement positive."));
      validateRequirements({ world: variant.whenWorld, notWorld: variant.unlessWorld }, `${path}.durationVariants.${index}`);
    }
    validateNode(action, path, action.actor);
  }

  const timeline = campaign.timeline || [];
  for (const id of duplicates(timeline.map((event) => event.id))) issues.push(issue("error", "DUPLICATE_EVENT", "campaign.timeline", `Événement dupliqué : ${id}.`));
  let previousHour = -Infinity;
  for (const event of timeline) {
    if (!Number.isFinite(event.hour) || event.hour < 0 || event.hour > campaign.deadline) issues.push(issue("error", "EVENT_HOUR", `campaign.timeline.${event.id}`, "L'événement doit se trouver entre le début et l'échéance."));
    if (event.hour < previousHour) issues.push(issue("warning", "EVENT_ORDER", `campaign.timeline.${event.id}`, "Les événements ne sont pas ordonnés chronologiquement."));
    previousHour = event.hour;
    validateNode(event, `campaign.timeline.${event.id}`, null);
  }
  if (!timeline.some((event) => event.hour === campaign.deadline && event.endCampaign)) issues.push(issue("warning", "NO_DEADLINE_EVENT", "campaign.timeline", "Aucun événement terminal ne matérialise l'échéance."));

  const forbidden = new Set(["score", "totalScore", "justiceScore", "moralityScore", "pressure"]);
  walkKeys(campaign, (key, path) => {
    if (forbidden.has(key)) issues.push(issue("error", "GLOBAL_SCORE", path, "Le format ne doit pas réintroduire un score global."));
  });

  const reachability = analyzeReachability(campaign);
  for (const actionId of reachability.unreachable) {
    issues.push(issue("warning", "UNREACHABLE_ACTION", `campaign.actions.${actionId}`, "La surapproximation déclarative ne trouve aucun enchaînement ouvrant cette action."));
  }
  return issues;
}

export function summarizeCampaign(campaign, issues = validateCampaign(campaign)) {
  return {
    actors: Object.keys(campaign.actors || {}).length,
    knowledge: Object.keys(campaign.knowledge || {}).length,
    actions: (campaign.actions || []).length,
    events: (campaign.timeline || []).length,
    errors: issues.filter((item) => item.level === "error").length,
    warnings: issues.filter((item) => item.level === "warning").length,
  };
}
