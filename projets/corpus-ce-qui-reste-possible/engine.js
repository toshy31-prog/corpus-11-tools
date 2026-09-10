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
    lastBeat: {
      actor: "ina",
      title: "La lettre sur la table",
      body: "Ina relit l'heure, pas le motif. Vendredi, 07 h. Dehors, les pêches sont presque mûres et personne n'a encore déplacé les bêtes.",
      quote: "Ils ont compté trois maisons. Ils n'ont pas compté ce qui passe entre elles.",
      tone: "alert",
    },
    log: [{
      id: "opening",
      actor: "ina",
      hour: 0,
      title: "Une décision arrive avant ses conséquences",
      body: "L'arrêté est reçu mardi matin. Il ne produit encore ni départ, ni suspension, ni réparation.",
      tone: "alert",
    }],
  };
}

const actionBeats = {
  "ina-mandate": { title: "Une limite avant la preuve", body: "Les factures pourront aller au recours. Ni l'adresse, ni les enregistrements bruts ne devront être publiés.", quote: "Aidez-nous, oui. Parler à notre place, non.", tone: "care" },
  "ina-bills": { title: "Douze hivers dans une boîte", body: "Électricité, soins à domicile, réparations du toit : les pièces contredisent la catégorie « saisonnière » sans expliquer qui l'a changée.", quote: "Une maison saisonnière qui reçoit l'infirmière chaque janvier.", tone: "discovery" },
  "ina-send-mara": { title: "Reçu n'est pas encore agi", body: "Mara possède maintenant les pièces et leur mandat. Aucun permis n'est encore suspendu.", quote: "Je peux les recevoir. Je ne promets pas encore ce que le registre acceptera.", tone: "relay" },
  "ina-harvest": { title: "Ce qui peut encore être porté", body: "La récolte quitte la vallée. La terre, le four et la saison suivante restent sur place.", quote: "Ce n'est pas gagner. C'est ne pas tout devoir en plus.", tone: "care" },
  "ina-path": { title: "Le passage change de mémoire", body: "Quatre personnes apprennent à lire les pierres de marée. Si la route ferme, l'accès restera fragile mais praticable.", quote: "La carte dira où. Les pieds doivent encore savoir quand.", tone: "care" },
  "ina-interview": { title: "Une voix, pas une extraction", body: "Sora reçoit une version publiable. L'enregistrement brut reste sous le contrôle d'Ina.", quote: "Vous pouvez raconter la coupure. Pas donner notre porte en spectacle.", tone: "relay" },
  "ina-decline": { title: "Un non qui reste un non", body: "Sora note le refus sans l'expliquer par la peur, l'ignorance ou l'accord tacite.", quote: "Je ne vous dois pas ma voix pour mériter de rester.", tone: "refusal" },
  "mara-compare": { title: "Deux fiches, aucune transition", body: "« Habitation principale » devient « dépendance saisonnière ». Aucun acte n'autorise ce changement de catégorie.", quote: "Le système montre l'état final. Il a perdu le passage qui devait le rendre valable.", tone: "discovery" },
  "mara-copy": { title: "L'anomalie ne tient plus dans un tiroir", body: "Deux copies circulent sans les coordonnées d'Ina. La destruction d'un dossier ne suffirait plus à effacer la contradiction.", quote: "Je partage ce qu'ils doivent pouvoir contester, pas ce qu'ils n'ont pas à posséder.", tone: "relay" },
  "mara-request": { title: "La preuve demandée à celle qui supporte l'erreur", body: "Ina sait désormais exactement ce qui manque au bureau. L'appel ne lui rend ni temps, ni accès, ni présomption de résidence.", quote: "Je peux ouvrir la voie. Je ne peux pas produire votre vie à votre place.", tone: "cost" },
  "mara-freeze": { title: "La signature quitte le bureau", body: "La suspension est envoyée. Elle n'est pas encore reçue par le dépôt et le permis reste matériellement actif jusque-là.", quote: "À partir d'ici, le réseau peut encore échouer.", tone: "relay" },
  "nilo-crew": { title: "Six personnes deviennent un seuil", body: "Quatre conducteurs donnent mandat à Nilo pour refuser ensemble un départ juridiquement douteux. Deux ne se prononcent pas.", quote: "Seul, je suis remplaçable. Ensemble, pas aujourd'hui.", tone: "care" },
  "nilo-alone": { title: "Un refus réel, un arrêt très court", body: "Nilo est écarté du planning. Une agence cherche déjà un remplaçant. Son refus existe même s'il ne suffit pas à arrêter le chantier.", quote: "Ils peuvent prendre mon badge. Ils ne prendront pas mon oui.", tone: "refusal" },
  "nilo-hold": { title: "Le moteur reste froid", body: "Le planning indique toujours « départ confirmé ». Dans le dépôt, aucune clé ne tourne. La compagnie contacte déjà un autre opérateur.", quote: "Le tableau peut dire parti. L'engin est devant moi.", tone: "action" },
  "nilo-acknowledge": { title: "L'ordre devient capacité d'arrêt", body: "Nilo annule le départ dans le planning, retire les clés et fait contresigner les six conducteurs. Le gel devient opposable au dépôt.", quote: "Maintenant seulement, la signature agit ici.", tone: "action" },
  "sora-call-ina": { title: "La demande attend sa réponse", body: "Ina reçoit les conditions proposées. Le silence ou le refus ne seront pas publiés comme un aveu.", quote: "Je peux offrir un micro. Je ne peux pas réclamer une voix.", tone: "relay" },
  "sora-trace-loop": { title: "Onze titres, une seule origine", body: "Chaque article reprend la même dépêche, traduite deux fois puis raccourcie. Aucun journaliste n'a visité la vallée.", quote: "La répétition faisait foule. La chaîne tient dans une pièce.", tone: "discovery" },
  "sora-relay-release": { title: "La première version devient le décor", body: "Le projet circule comme une opération compensée. Les corrections futures devront désormais défaire ce point de départ.", quote: "C'était publiable. Ce n'était pas le monde entier.", tone: "cost" },
  "sora-publish-record": { title: "La contradiction entre dans l'espace public", body: "L'article décrit le changement de catégorie et son absence de trace. La compagnie annonce un audit sans suspendre le chantier.", quote: "Nous publions la faille, pas la famille.", tone: "action" },
  "sora-publish-story": { title: "Ce que « trois foyers » ne pouvait pas porter", body: "La diffusion fait entendre le four partagé, les soins et le troupeau. L'adresse et les documents bruts restent hors antenne.", quote: "Le lieu n'est pas devenu une preuve. Il est redevenu habité.", tone: "care" },
  "sora-assembly": { title: "La suite n'a plus un seul détenteur", body: "Trois groupes se donnent des tâches et des mandats distincts. Même si vous quittez une position, la coordination peut continuer.", quote: "Personne ne prend tout. C'est la condition pour que ça tienne.", tone: "care" },
};

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
    beat = action.result || actionBeats[action.id] || { title: action.title, body: action.description, tone: "neutral" };
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
  const stopped = state.world.permitFrozen || state.world.depotHold;
  let heading = "Le monde a changé avant le recours";
  let summary = "L'ordre a produit ses effets. Les voies encore ouvertes commencent désormais depuis un déplacement réalisé.";
  if (stopped) {
    heading = "Ce matin, personne ne part";
    summary = state.world.permitFrozen
      ? "La chaîne juridique a atteint les personnes capables d'arrêter les machines. Le fond reste à juger."
      : "Un veto collectif tient encore. Sa continuité dépend de celles et ceux qui peuvent le maintenir.";
  }
  return {
    heading,
    summary,
    dimensions: [
      { label: "Sécurité immédiate", state: stopped ? "préservée" : "perdue", detail: stopped ? "L'expulsion n'est pas exécutée à l'échéance." : "La famille est déplacée sous contrainte." },
      { label: "Capacité de rester", state: stopped ? (state.world.roadClosed ? "entravée" : "ouverte") : "fermée", detail: state.world.routeTransmitted ? "Le passage de marée maintient une relation fragile au lieu." : "La fermeture de la route coupe des usages absents du dossier." },
      { label: "Recours", state: state.world.permitFrozen ? "effectif" : state.world.freezeSent ? "émis, non effectif" : state.world.recordsCompared ? "possible" : "faible", detail: state.world.permitFrozen ? "La suspension est reçue, appliquée et observable au dépôt." : state.world.freezeSent ? "Une signature existe, sans capacité d'arrêt vérifiée." : "Aucune suspension opposable n'agit sur le chantier." },
      { label: "Moyens de vivre", state: state.world.harvestSaved ? "partiellement préservés" : "exposés", detail: state.world.harvestSaved ? "La récolte est sauvée ; la saison suivante ne l'est pas." : "Récolte, bêtes et revenus absorbent encore la perte." },
      { label: "Capacité collective", state: state.world.publicAssembly ? "distribuée" : state.world.crewOrganized ? "locale" : "dépendante", detail: state.world.publicAssembly ? "Plusieurs groupes disposent de tâches et de mandats distincts." : "La suite repose encore sur peu de personnes et de canaux." },
      { label: "Mémoire", state: state.world.recordsDistributed ? "répartie" : state.world.recordsCompared ? "centralisée" : "lacunaire", detail: state.world.recordsDistributed ? "Des copies expurgées survivent dans plusieurs milieux." : "La contradiction dépend encore d'un tiroir ou n'a pas été rendue visible." },
      { label: "Parole d'Ina", state: state.world.protectedStory ? "transmise sous mandat" : state.world.interviewDeclined ? "retirée" : state.world.mandateDefined ? "protégée" : "sans cadre", detail: state.world.protectedStory ? "Le récit circule sans pièces brutes ni adresse." : state.world.interviewDeclined ? "Le refus est conservé sans être transformé en aveu." : "Aucune permission de diffusion n'a été établie." },
      { label: "Coût du refus", state: state.world.niloLostWork ? "porté par Nilo" : state.world.crewOrganized ? "mutualisé" : "invisible", detail: state.world.niloLostWork ? "Le chantier a absorbé son refus ; Nilo en conserve la sanction." : "Le collectif réduit sans supprimer le risque individuel." },
      { label: "Rive humide", state: state.world.wetlandDamaged ? "endommagée" : "non terrassée", detail: state.world.wetlandDamaged ? "Le remblai demeure même si une décision ultérieure change." : "L'absence de terrassement ne garantit pas la protection future du milieu." },
    ],
  };
}
