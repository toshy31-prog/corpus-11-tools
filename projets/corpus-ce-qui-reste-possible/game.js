import {
  ACTOR_ORDER,
  CAMPAIGN,
  advanceToDeadline,
  changePerspective,
  createInitialState,
  formatClock,
  getActorKnowledge,
  getAvailableActions,
  getOutcome,
  performAction,
} from "./engine.js";

const STORAGE_KEY = `corpus-game:${CAMPAIGN.id}:state-${CAMPAIGN.stateVersion}`;
const LEGACY_STORAGE_KEY = "corpus-ce-qui-reste-possible-v2";
const $ = (selector) => document.querySelector(selector);

const actorMeta = Object.fromEntries(Object.entries(CAMPAIGN.actors).map(([id, actor]) => [id, {
  color: actor.color, label: actor.name.split(" ")[0], scene: actor.scene,
}]));

const toneColors = {
  alert: "#b84e42", care: "#668b72", relay: "#7698ad", discovery: "#d09238",
  refusal: "#8e6884", cost: "#ad674f", action: "#487f72", world: "#7a766c", loss: "#ad4139", neutral: "#7a766c",
};

function migrateLegacyState(parsed) {
  if (parsed?.version === CAMPAIGN.stateVersion && parsed.campaignId === CAMPAIGN.id) return parsed;
  if (parsed?.version !== 2) return null;
  const initial = createInitialState();
  const world = Object.fromEntries(Object.keys(initial.world).map((flag) => [flag, Boolean(parsed.world?.[flag])]));
  world.recordPublication = parsed.completed?.includes("sora-publish-record") || false;
  world.storyPublication = parsed.completed?.includes("sora-publish-story") || false;
  const legacySchedules = {
    "deliver-freeze": ["mara-freeze", "mara"],
    "individual-replacement": ["nilo-alone", "nilo"],
    "seek-replacement-contractor": ["nilo-hold", "nilo"],
  };
  const scheduled = (parsed.scheduled || []).flatMap((item) => {
    const mapping = legacySchedules[item.type];
    if (!mapping) return [];
    const [sourceAction, actor] = mapping;
    const spec = CAMPAIGN.actions.find((action) => action.id === sourceAction)?.scheduled?.[0];
    return spec ? [{ at: item.at, actor, sourceAction, spec: structuredClone(spec) }] : [];
  });
  const events = (parsed.events || []).map((event) => {
    if (typeof event === "string") return event;
    return CAMPAIGN.timeline.find((candidate) => candidate.hour === event)?.id;
  }).filter(Boolean);
  const { pressure: _pressure, ...legacy } = parsed;
  return { ...initial, ...legacy, version: CAMPAIGN.stateVersion, campaignId: CAMPAIGN.id, world, scheduled, events };
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const restored = migrateLegacyState(JSON.parse(raw));
    return restored || createInitialState();
  } catch {
    return createInitialState();
  }
}

let state = restoreState();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $("#save-state").textContent = "état conservé sur cet appareil";
}

function person(x, y, color, scale = 1) {
  return `<g class="scene-person" transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="0" cy="-22" r="8" fill="${color}"/><path d="M-10-11 Q0-18 10-11 L13 20 L-13 20Z" fill="${color}"/>
    <path d="M-7 20 L-9 44 M7 20 L9 44" stroke="#202621" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function inaScene() {
  const w = state.world;
  return `<svg viewBox="0 0 900 410" role="img" aria-label="La maison d'Ina, la rive, le chemin et la vallée">
    <defs><linearGradient id="inaSky" x2="0" y2="1"><stop stop-color="#b9c9c0"/><stop offset="1" stop-color="#d9c9a8"/></linearGradient></defs>
    <rect width="900" height="410" fill="url(#inaSky)"/>
    <path d="M0 180 Q150 79 290 163 T570 143 T900 126 V410 H0Z" fill="#708774"/>
    <path d="M0 250 Q160 196 350 244 T720 218 T900 224 V410 H0Z" fill="#a7ab77"/>
    <path d="M0 344 Q180 269 360 335 T710 302 T900 315 V410 H0Z" fill="#668f91" opacity=".9"/>
    <path d="M65 362 Q210 270 390 301 T742 253" fill="none" stroke="#dbcba8" stroke-width="12" stroke-dasharray="3 8"/>
    <g transform="translate(150 196)"><path d="M0 54 L57 12 L121 54V128H0Z" fill="#ded5c2"/><path d="M-8 57 L58 4 L129 57" fill="none" stroke="#7d5142" stroke-width="14"/><rect x="46" y="82" width="25" height="46" fill="#5b493e"/><rect x="84" y="69" width="20" height="21" fill="#8eabb1"/></g>
    <g fill="#526c4f">${[305,350,400].map((x) => `<circle cx="${x}" cy="248" r="24"/><rect x="${x-3}" y="244" width="6" height="43" fill="#574b35"/>`).join("")}</g>
    ${w.stakesPlaced ? `<g stroke="#c04637" stroke-width="5">${[480,550,620].map((x) => `<path d="M${x} 272v62m-9-49h18"/>`).join("")}</g>` : ""}
    ${w.roadClosed ? `<g transform="translate(600 258)"><rect width="164" height="13" fill="#d7a83d"/><path d="M18 13v52m127-52v52" stroke="#252b28" stroke-width="9"/><text x="82" y="-8" text-anchor="middle" font-family="DM Mono" font-size="12">ROUTE FERMÉE</text></g>` : ""}
    ${w.machinesArrived ? `<g class="machine-moving" transform="translate(692 257)"><rect width="90" height="42" rx="4" fill="#d7a83d"/><circle cx="18" cy="48" r="14" fill="#292d2a"/><circle cx="72" cy="48" r="14" fill="#292d2a"/><path d="M70 3l61-39 8 8-48 48" fill="none" stroke="#d7a83d" stroke-width="13"/><path d="M128-40h27v24h-27z" fill="#d7a83d"/></g>` : ""}
    ${person(250, 310, "#d07459", 1.06)}
  </svg><div class="scene-caption">${w.forcedDisplacement ? "Les maisons sont debout. La famille n'y est plus." : w.roadClosed ? "La route carrossable est fermée. Un tracé n'est pas encore un passage." : "Le four, le véhicule et le troupeau passent entre trois maisons que le dossier compte séparément."}</div>`;
}

function maraScene() {
  const w = state.world;
  const paper = w.recordsCompared ? "HABITATION / SAISONNIÈRE" : "PARCELLE 8—14";
  return `<svg viewBox="0 0 900 410" role="img" aria-label="Le bureau de Mara, ses registres et le terminal provincial">
    <rect width="900" height="410" fill="#aab8aa"/><rect x="0" y="0" width="900" height="70" fill="#7e9183"/>
    <rect x="54" y="55" width="252" height="274" fill="#46534c"/><g fill="#d6ceb9">${[0,1,2,3].map((i)=>`<rect x="72" y="${78+i*60}" width="216" height="42"/><circle cx="266" cy="${99+i*60}" r="4" fill="#6e675c"/>`).join("")}</g>
    <rect x="355" y="240" width="475" height="28" fill="#63584c"/><rect x="392" y="268" width="22" height="104" fill="#554a40"/><rect x="777" y="268" width="22" height="104" fill="#554a40"/>
    <g transform="translate(461 122) rotate(-3)"><rect width="188" height="126" fill="#f0eadb" stroke="#7c776d"/><text x="18" y="33" font-family="DM Mono" font-size="12" fill="#565b57">${paper}</text><path d="M18 51h150M18 70h115M18 89h144" stroke="#9b978e"/><circle cx="153" cy="105" r="12" fill="none" stroke="#b84e42" stroke-width="3"/></g>
    ${w.freezeSent ? `<g transform="translate(678 102)"><rect width="156" height="117" fill="#f6f1e5" stroke="#486a5a" stroke-width="4"/><text x="78" y="38" text-anchor="middle" font-family="DM Mono" font-size="11">SUSPENSION</text><path d="M28 59h100M28 76h84" stroke="#7f8b84"/><circle cx="119" cy="92" r="17" fill="none" stroke="#486a5a" stroke-width="3"/></g>` : ""}
    ${person(350, 265, "#456b56", 1.05)}
  </svg><div class="scene-caption">${w.freezeSent ? "La suspension est partie. Le papier n'a encore arrêté aucune machine." : w.recordsCompared ? "Deux catégories incompatibles occupent le même bureau." : "Le registre montre un état. Il ne montre pas le passage qui l'a produit."}</div>`;
}

function niloScene() {
  const w = state.world;
  const stopped = w.permitFrozen || w.depotHold;
  return `<svg viewBox="0 0 900 410" role="img" aria-label="Le dépôt, ses six conducteurs et les engins du chantier">
    <rect width="900" height="410" fill="#9ea69c"/><rect y="278" width="900" height="132" fill="#77766b"/><path d="M0 278H900" stroke="#d5c6a2" stroke-width="5"/>
    <path d="M85 263V89H409V263" fill="#4a554f"/><path d="M67 90L247 25 429 90" fill="#35413b"/>
    <g transform="translate(463 202)" class="${stopped ? "" : "machine-moving"}"><rect width="224" height="79" rx="5" fill="#d7a83d"/><rect x="35" y="-54" width="91" height="58" fill="#c79832"/><rect x="48" y="-43" width="61" height="37" fill="#718b8c"/><circle cx="43" cy="87" r="28" fill="#292d2a"/><circle cx="181" cy="87" r="28" fill="#292d2a"/><path d="M184-3l114-73 11 12-88 94" fill="none" stroke="#d7a83d" stroke-width="22"/><path d="M294-86h48v43h-48z" fill="#d7a83d"/></g>
    <g>${[0,1,2,3,4,5].map((i)=>person(125+i*43, 287, i < (w.crewOrganized ? 4 : 0) ? "#d7a83d" : "#c2c5be", .65)).join("")}</g>
    ${w.freezeReceived ? `<g transform="translate(712 87) rotate(4)"><rect width="122" height="95" fill="#f6f1e5" stroke="#486a5a" stroke-width="3"/><text x="61" y="29" text-anchor="middle" font-family="DM Mono" font-size="9">SUSPENSION REÇUE</text><path d="M17 46h87M17 61h70" stroke="#777"/></g>` : ""}
    ${stopped ? `<g transform="translate(535 166)"><rect width="89" height="34" rx="17" fill="#17201d"/><text x="44" y="22" text-anchor="middle" fill="#f6f1e5" font-family="DM Mono" font-size="12">À L'ARRÊT</text></g>` : ""}
  </svg><div class="scene-caption">${w.permitFrozen ? "Le planning, les clés et les personnes portent désormais le même arrêt." : w.depotHold ? "Le dépôt refuse le départ. Un autre dépôt peut encore être cherché." : w.individualRefusal ? "Une machine manque un conducteur. Le système cherche déjà un autre corps." : "Un planning ne conduit rien. Six personnes rendent son ordre exécutable."}</div>`;
}

function soraScene() {
  const w = state.world;
  return `<svg viewBox="0 0 900 410" role="img" aria-label="Le studio de Sora, le micro et les sources de la rédaction">
    <rect width="900" height="410" fill="#879da7"/><rect x="55" y="48" width="790" height="298" rx="7" fill="#26343a"/>
    <rect x="80" y="75" width="420" height="238" fill="#151e22"/>
    <path d="M100 200 ${[0,1,2,3,4,5,6,7,8,9,10].map((i)=>`L${112+i*34} ${200 + (i%3-1)*42}`).join(" ")}" fill="none" stroke="#7698ad" stroke-width="4"/>
    <g transform="translate(542 77)">${[0,1,2,3,4,5,6,7,8,9,10].map((i)=>`<rect x="${(i%3)*84}" y="${Math.floor(i/3)*53}" width="69" height="39" fill="#ebe8de" transform="rotate(${(i%4)-2})"/>`).join("")}</g>
    ${w.protectedStory ? `<g transform="translate(618 287)"><circle r="42" fill="#d07459"/><path d="M-11-17v34a11 11 0 0022 0v-34a11 11 0 00-22 0zm-12 34a23 23 0 0046 0M0 40v22" fill="none" stroke="#f6f1e5" stroke-width="5"/></g>` : ""}
    ${person(453, 298, "#7698ad", 1)}
    ${w.administrativePublication ? `<text x="287" y="286" text-anchor="middle" fill="#e7b357" font-family="DM Mono" font-size="12">COMMUNIQUÉ DIFFUSÉ</text>` : ""}
  </svg><div class="scene-caption">${w.protectedStory ? "Une voix est ici, mais son adresse et ses pièces brutes n'y sont pas." : w.administrativePublication ? "Le communiqué est devenu le premier récit public. La vitesse a déjà distribué le terrain." : "Onze articles sont ouverts. La quantité ne dit pas encore combien de sources existent."}</div>`;
}

function genericScene() {
  const actor = state.actors[state.perspective];
  return `<svg viewBox="0 0 900 410" role="img" aria-label="${actor.place}">
    <rect width="900" height="410" fill="#a7bbb1"/>
    <circle cx="450" cy="190" r="94" fill="${actor.color}" opacity=".24"/>
    ${person(450, 270, actor.color, 1.2)}
  </svg><div class="scene-caption">${actor.name} agit depuis ${actor.place}. Cette position utilise encore la scène générique du moteur.</div>`;
}

const scenes = { ina: inaScene, mara: maraScene, nilo: niloScene, sora: soraScene };

function renderActors() {
  $("#actor-list").innerHTML = ACTOR_ORDER.map((id) => {
    const actor = state.actors[id];
    const incoming = actor.inbox.length;
    return `<button class="actor-button ${id === state.perspective ? "is-current" : ""}" style="--actor:${actorMeta[id].color}" data-actor="${id}" aria-pressed="${id === state.perspective}">
      <strong>${actor.name}</strong><span>${actor.role}<br>${actor.place}</span>${incoming ? `<em title="${incoming} relais reçu(s)">${incoming}</em>` : ""}
    </button>`;
  }).join("");
  $("#actor-list").querySelectorAll("[data-actor]").forEach((button) => button.addEventListener("click", () => {
    state = changePerspective(state, button.dataset.actor);
    save(); render();
  }));
}

function renderScene() {
  const actor = state.actors[state.perspective];
  const meta = actorMeta[state.perspective];
  document.documentElement.style.setProperty("--actor", meta.color);
  $("#actor-role").textContent = actor.role;
  $("#scene-title").textContent = meta.scene;
  $("#place-label").textContent = actor.place;
  $("#scene").innerHTML = (scenes[state.perspective] || genericScene)();
  const beat = state.lastBeat;
  const beatColor = toneColors[beat.tone] || toneColors.neutral;
  $("#last-beat").style.setProperty("--beat", beatColor);
  $("#last-beat").innerHTML = `<h3>${beat.title}</h3><p>${beat.body}</p>${beat.quote ? `<blockquote>${beat.quote}</blockquote>` : ""}`;
}

function renderActions() {
  const actions = getAvailableActions(state);
  $("#action-count").textContent = state.ended ? "échéance atteinte" : `${actions.length} possibilité${actions.length === 1 ? "" : "s"}`;
  $("#action-list").innerHTML = actions.length ? actions.map((action) => `<button class="action-card" style="--actor:${actorMeta[action.actor].color}" data-action="${action.id}">
    <span class="verb">${action.verb}</span><span class="duration">${action.duration} h</span><h3>${action.title}</h3><p>${action.description}</p><small class="tension" title="${action.tension}">Tension · ${action.tension}</small>
  </button>`).join("") : `<p class="no-actions">${state.ended ? "L'échéance est passée. Le bilan ne referme pas ce qui reste à faire." : "Rien de plus n'est faisable depuis cette position avant vendredi. Habitez quelqu'un d'autre ou laissez le temps courir."}</p>`;
  $("#action-list").querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => doAction(button.dataset.action)));
}

function renderKnowledge() {
  const facts = getActorKnowledge(state);
  $("#knowledge-list").innerHTML = facts.map((fact) => `<article class="knowledge-card"><span>${fact.id.replaceAll("-", " ")}</span><p>${fact.text}</p></article>`).join("");
}

function renderRelays() {
  const relays = state.relays.filter((relay) => relay.from === state.perspective || relay.to === state.perspective).slice(0, 6);
  $("#relay-list").innerHTML = relays.length ? relays.map((relay) => {
    const incoming = relay.to === state.perspective;
    const other = state.actors[incoming ? relay.from : relay.to]?.name || (incoming ? relay.from : relay.to);
    return `<article class="relay-card"><strong>${incoming ? "Reçu de" : "Envoyé à"} ${other}</strong><p>${relay.purpose}</p><small>${formatClock(relay.hour)} · ${relay.channel}</small></article>`;
  }).join("") : `<p class="empty-relay">Aucun support n'est encore arrivé ici.<br />Le savoir du joueur ne remplit pas cette colonne.</p>`;
}

function renderTime() {
  $("#clock-label").textContent = formatClock(state.elapsed);
  const remaining = Math.max(0, state.deadline - state.elapsed);
  $("#countdown").textContent = state.ended ? "échéance atteinte" : `${remaining} h avant l'expulsion`;
  const progress = Math.min(100, (state.elapsed / state.deadline) * 100);
  $("#timeline-track").innerHTML = `<div id="timeline-fill" class="timeline-fill"></div><div class="timeline-now" id="timeline-now"><span>maintenant</span></div>${CAMPAIGN.timeline.map((event, index) => {
    const at = Math.min(100, event.hour / state.deadline * 100);
    return `<div class="milestone ${index === CAMPAIGN.timeline.length - 1 ? "end" : ""}" style="--at:${at}%"><i></i><span>${event.when}</span><strong>${event.label}</strong></div>`;
  }).join("")}`;
  $("#timeline-fill").style.width = `${progress}%`;
  $("#timeline-now").style.left = `${progress}%`;
  document.querySelectorAll(".milestone").forEach((node) => {
    const value = Number.parseFloat(node.style.getPropertyValue("--at"));
    node.classList.toggle("is-past", progress >= value);
  });
}

function renderJournal() {
  $("#journal-list").innerHTML = state.log.map((entry) => `<article class="journal-entry"><time>${formatClock(entry.hour)}<br>${state.actors[entry.actor]?.name || "Monde"}</time><div><h3>${entry.title}</h3><p>${entry.body}</p></div></article>`).join("");
}

function render() {
  $("#campaign-subtitle").textContent = CAMPAIGN.subtitle;
  $("#campaign-collection").textContent = CAMPAIGN.collection;
  $("#campaign-title").textContent = CAMPAIGN.title;
  $("#intro-premise").textContent = CAMPAIGN.premise;
  renderActors(); renderScene(); renderActions(); renderKnowledge(); renderRelays(); renderTime(); renderJournal();
}

function showBeat() {
  const beat = state.lastBeat;
  $("#beat-dialog").style.setProperty("--beat", toneColors[beat.tone] || toneColors.neutral);
  $("#beat-content").innerHTML = `<p class="overline">${formatClock(state.elapsed)} · ${state.actors[beat.actor].name}</p><h2>${beat.title}</h2><p>${beat.body}</p>${beat.quote ? `<blockquote>${beat.quote}</blockquote>` : ""}`;
  $("#beat-dialog").showModal();
}

function showOutcome() {
  const outcome = getOutcome(state);
  $("#outcome-content").innerHTML = `<p class="overline">Vendredi · 07 h 00 · Aucun score global</p><h2>${outcome.heading}</h2><p class="outcome-summary">${outcome.summary}</p><div class="outcome-grid">${outcome.dimensions.map((item) => `<article class="outcome-card"><span>${item.label}</span><strong>${item.state}</strong><p>${item.detail}</p></article>`).join("")}</div>`;
  $("#outcome-dialog").showModal();
}

function doAction(id) {
  try {
    state = performAction(state, id); save(); render(); showBeat();
  } catch (error) {
    $("#save-state").textContent = error.message;
  }
}

function restart() {
  state = createInitialState(); localStorage.removeItem(STORAGE_KEY); save(); render();
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
  $("#intro-dialog").showModal();
}

$("#continue-button").addEventListener("click", () => {
  $("#beat-dialog").close();
  if (state.ended) showOutcome();
});
$("#advance-button").addEventListener("click", () => {
  if (!state.ended) { state = advanceToDeadline(state); save(); render(); }
  showOutcome();
});
$("#journal-button").addEventListener("click", () => $("#journal-dialog").showModal());
$("[data-close='journal-dialog']").addEventListener("click", () => $("#journal-dialog").close());
$("#close-outcome").addEventListener("click", () => $("#outcome-dialog").close());
$("#restart-button").addEventListener("click", restart);
$("#outcome-restart").addEventListener("click", restart);
$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state, outcome: getOutcome(state) }, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "corpus-sereine-etat.json"; link.click(); URL.revokeObjectURL(link.href);
});

const hadSavedState = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
render();
if (!hadSavedState) $("#intro-dialog").showModal();
