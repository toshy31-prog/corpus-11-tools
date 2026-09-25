// Navigation and presentation only. Catalogue evidence remains owned by the
// engine; selecting a tab never confirms an identity or marks a track heard.
import { MUSIC_SORTS, sortMusic } from "./music-sorting.mjs";
export const WORKSPACE_DIRECTIONS = [
  ["label", "Labels", "Explorer les maisons de disques liées à ce départ."],
  ["remix", "Remixeurs", "Suivre un crédit de remix ou de production."],
  ["featuring", "Collaborations", "Passer par les artistes crédités ensemble."],
  ["compilation", "Compilations", "Ouvrir les disques et compilations partagés."],
  ["alias", "Alias & projets", "Retrouver les autres noms et groupes d’un artiste."],
  ["curator", "Chaînes", "Explorer les publications de la même chaîne YouTube."],
  ["scene", "Territoires", "Un contexte géographique documenté, pas une similarité musicale."],
  ["era", "Époque", "Même période parmi les pistes déjà reliées par un label, un crédit, un projet ou une chaîne. Une décennie commune ne suffit pas."]
];
export function workspaceView(hash = "") {
  return /^#(?:notebook|carnet)/.test(hash) ? "notebook" : /^#(?:source-panel|sources|backup|catalogue-tools)/.test(hash) ? "sources" : "explore";
}
export function directionState(direction, { front, groups = {} } = {}) {
  const branch = front?.branches?.find(item => item.direction === direction);
  const group = groups[direction];
  if (["paused", "explored", "dismissed"].includes(branch?.status)) return { kind: "paused", label: "De côté", count: 0 };
  if (group?.loading) return { kind: "loading", label: "En cours", count: group.items?.length || 0 };
  const count = group?.items?.length || (branch?.current ? 1 : 0);
  if (count) return { kind: "ready", label: `${count} piste${count > 1 ? "s" : ""}`, count };
  if (group?.error) return { kind: "error", label: "À réessayer", count: 0 };
  if (group?.coverage?.state === "needs_confirmation") return { kind: "pending", label: "À confirmer", count: 0 };
  if (group?.coverage?.hasMore) return { kind: "pending", label: "À poursuivre", count: 0 };
  if (group?.coverage?.complete) return { kind: "empty", label: "Parcourue", count: 0 };
  return { kind: "unknown", label: group ? "À compléter" : "À explorer", count: 0 };
}

export function mountWorkspace({ root = document, getState, onStart, onSortNotebook, onSortSuggestions, onSuggest } = {}) {
  const $ = selector => root.querySelector(selector);
  let view = workspaceView(location.hash);
  let choiceLimit = 8, choices = [];
  let toastTimer, renderedChoices = "", choiceQuery = "";
  let selectedSeed = null, launching = false, pickerMode = "search", returnFocus = null;
  let shuffleKey = globalThis.crypto.randomUUID(), shuffleTurn = 0;
  const make = (tag, className, text) => { const element = root.createElement(tag); if (className) element.className = className; if (text) element.textContent = text; return element; };
  root.body.classList.add("workspace-app");
  const sidebar = make("aside", "workspace-sidebar");
  sidebar.innerHTML = `<a class="workspace-brand" href="#exploration"><span>◉</span> SCOUT <small>MUSIC EXPLORER</small></a><p class="sidebar-caption">Votre terrain de fouille</p><nav aria-label="Espaces du Scout"><a href="#exploration" data-view="explore"><span>◎</span> Explorer</a><a href="#notebook" data-view="notebook"><span>▤</span> Carnet <small id="nav-kept-count">0</small></a><a href="#source-panel" data-view="sources"><span>▥</span> Bibliothèque & sources</a></nav><div class="sidebar-bottom"><span class="local-dot"></span> Bibliothèque enregistrée ici<a href="#source-panel">Sources & sauvegarde ↗</a></div>`;
  root.body.prepend(sidebar);
  // Sections keep their IDs and original event handlers, inside three real views.
  const main = $("main");
  const explore = make("div", "workspace-view"); explore.id = "explore-view";
  const sources = make("div", "workspace-view"); sources.id = "sources-view";
  const notebook = make("div", "workspace-view"); notebook.id = "notebook-view";
  explore.append($("#exploration"), $("#discoveries"));
  const collaborations = make("details", "workspace-collaborations");
  collaborations.append(make("summary", "", "Crédits observés dans mes playlists"), $("#collaborations")); explore.append(collaborations);
  sources.append($("#source-panel")); notebook.append($("#notebook"));
  main.append(explore, notebook, sources);
  const topbar = make("header", "workspace-topbar");
  topbar.innerHTML = `<div><p id="workspace-kicker">LE PLAISIR DE CREUSER</p><h1 id="workspace-title" tabindex="-1">Explorer</h1></div><button type="button" id="workspace-change-seed" class="primary-button">＋ Nouveau départ</button>`;
  main.prepend(topbar);
  const runtime = make("details", "workspace-diagnostics"); runtime.append(make("summary", "", "État du serveur & diagnostic"), $("#runtime-status")); sources.append(runtime);
  $(".hero").remove();
  const notices = make("div", "workspace-notices"); notices.id = "workspace-notices"; notices.setAttribute("role", "status"); notices.setAttribute("aria-live", "polite"); root.body.append(notices);
  const sourceStatus = make("p", "workspace-library-summary"); sourceStatus.id = "workspace-library-summary"; $("#source-panel > .panel-heading").after(sourceStatus);

  const dialog = make("dialog", "seed-dialog"); dialog.id = "seed-dialog"; dialog.setAttribute("aria-labelledby", "seed-dialog-title");
  dialog.innerHTML = `<header><div><p class="step">1 · VOTRE POINT DE DÉPART</p><h2 id="seed-dialog-title">D’où part-on ?</h2><p class="dialog-intro">Trouvez un morceau, un artiste, un label ou une playlist.</p></div><button type="button" class="icon-button" aria-label="Fermer le choix du départ">✕</button></header>`;
  const pickerError = make("p", "seed-picker-error"); pickerError.setAttribute("role", "alert"); pickerError.hidden = true; dialog.append(pickerError);
  const picker = $("#departure-picker"); dialog.append(picker); root.body.append(dialog);
  picker.open = true;
  const suggestionPicker = $("#suggestion-picker");
  if (suggestionPicker) {
    suggestionPicker.open = false;
  }
  const results = make("div", "seed-results"); results.id = "seed-results"; results.setAttribute("aria-label", "Départs trouvés");
  $(".seed-builder").after(results);
  const moreChoices = make("button", "text-button", "Afficher davantage de départs"); moreChoices.type = "button"; moreChoices.id = "more-seed-choices"; results.after(moreChoices);
  // Retain engine bindings outside the dialog. The only visible tuning surface
  // is the exploration rack, never another set of controls in this picker.
  const legacyPickerControls = make("div", "legacy-picker-controls"); legacyPickerControls.hidden = true;
  legacyPickerControls.append($(".direction-picker"), $("#seed-metrics"), $("#exploration-depth").parentElement, $(".seed-choice"), $(".exploration-actions"));
  $("#exploration").append(legacyPickerControls);
  const resultsStatus = make("p", "seed-results-status"); resultsStatus.id = "seed-results-status"; resultsStatus.setAttribute("role", "status"); results.before(resultsStatus);
  const importLink = make("a", "seed-import-link", "Importer des playlists"); importLink.href = "#source-panel"; importLink.hidden = true; moreChoices.after(importLink);
  importLink.onclick = () => { closePicker(); navigate("sources", true); };
  const searchPane = make("section", "seed-search-pane"); searchPane.id = "seed-search-pane";
  for (const node of [...picker.children]) if (node !== suggestionPicker && node.tagName !== "SUMMARY") searchPane.append(node);
  searchPane.prepend(searchPane.querySelector(".seed-builder"));
  picker.prepend(searchPane);
  const modes = make("div", "picker-modes"); modes.setAttribute("role", "group"); modes.setAttribute("aria-label", "Méthode de choix du départ");
  const setPickerMode = mode => {
    const enteringSuggestions = mode === "suggest" && pickerMode !== "suggest";
    pickerMode = mode;
    selectSeed(null);
    searchPane.hidden = mode !== "search";
    if (suggestionPicker) { suggestionPicker.hidden = mode !== "suggest"; suggestionPicker.open = mode === "suggest"; }
    for (const button of modes.children) button.setAttribute("aria-pressed", String(button.dataset.pickerMode === mode));
    picker.scrollTop = 0;
    if (enteringSuggestions) run(() => onSuggest?.({ shuffleKey }));
  };
  for (const [mode, label] of [["search", "Rechercher"], ["suggest", "Me proposer des départs"]]) {
    const button = make("button", "", label); button.type = "button"; button.dataset.pickerMode = mode;
    button.onclick = () => setPickerMode(mode); modes.append(button);
  }
  picker.before(modes);
  const seedSortLabel = make("label", "seed-sort-label", "Trier les départs");
  const seedSort = make("select"); seedSort.id = "seed-sort"; seedSortLabel.htmlFor = seedSort.id;
  const localSorts = MUSIC_SORTS.filter(([id]) => id !== "relation");
  for (const [value, text] of localSorts) { const option = make("option", "", value === "explore" ? "Ordre proposé" : text); option.value = value; seedSort.append(option); }
  seedSort.value = "random";
  seedSortLabel.append(seedSort);
  const shuffle = make("button", "text-button", "Remélanger ↻"); shuffle.id = "seed-shuffle"; shuffle.type = "button"; shuffle.setAttribute("aria-label", "Remélanger les départs"); seedSortLabel.append(shuffle);
  const sortHelp = make("small", "seed-sort-help", "Date musicale connue uniquement, jamais l’upload. Dates inconnues à la fin."); sortHelp.id = "seed-sort-help"; seedSort.setAttribute("aria-describedby",sortHelp.id);
  modes.after(seedSortLabel, sortHelp);
  seedSort.onchange = () => { renderChoices(); onSortSuggestions?.({ shuffleKey }); sortHelp.hidden = !seedSort.value.startsWith("release-"); shuffle.hidden = seedSort.value !== "random"; }; sortHelp.hidden = true;
  shuffle.onclick = () => {
    shuffleKey = `${Date.now()}:${++shuffleTurn}`;
    selectSeed(null); renderChoices();
    onSortSuggestions?.({ shuffleKey });
    $("#seed-search").dispatchEvent(new Event("input", { bubbles: true }));
    picker.scrollTop = 0;
  };
  const footer = make("footer", "seed-picker-footer");
  const selection = make("div", "seed-selection"); selection.id = "seed-selection"; selection.setAttribute("role", "status");
  const selectionTitle = make("strong"), selectionContext = make("small"); selection.append(selectionTitle, selectionContext);
  const nextHint = make("p", "seed-next-hint", "L’identité sera vérifiée si nécessaire. Vous choisirez ensuite les directions à explorer.");
  const footerActions = make("div", "seed-footer-actions");
  const cancel = make("button", "text-button", "Annuler"); cancel.type = "button"; cancel.onclick = () => closePicker();
  const launch = make("button", "primary-button", "Explorer ce départ →"); launch.id = "launch-seed"; launch.type = "button"; launch.disabled = true;
  footerActions.append(cancel, launch); footer.append(selection, nextHint, footerActions); dialog.append(footer);
  function selectSeed(seed) {
    selectedSeed = seed;
    selectionTitle.textContent = seed ? seed.label : "Sélectionnez un départ";
    selectionTitle.title = seed?.label || "";
    selectionContext.textContent = seed ? [seed.typeLabel, seed.subtitle].filter(Boolean).join(" · ") : "Aucune recherche avant validation.";
    launch.disabled = !seed || launching;
    for (const button of results.querySelectorAll("[data-seed-id]")) {
      const selected = button.dataset.seedId === seed?.id;
      button.setAttribute("aria-pressed", String(selected));
      button.querySelector(".seed-result-check").textContent = selected ? "✓" : "";
    }
    for (const button of picker.querySelectorAll(".seed-button")) {
      const selected = button.dataset.seedId === seed?.id;
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? "Départ sélectionné ✓" : "Choisir ce départ";
    }
  }
  launch.onclick = async () => {
    if (!selectedSeed || launching) return;
    const seed = selectedSeed;
    launching = true; launch.disabled = true; launch.textContent = "Ouverture…"; pickerError.hidden = true;
    try { await run(() => onStart(seed)); }
    finally { launching = false; launch.textContent = "Explorer ce départ →"; launch.disabled = !selectedSeed; }
  };
  setPickerMode("search");
  // Suggestions have their own optional controls; they do not tune this journey.
  const suggestionOptions = make("details", "suggestion-options");
  suggestionOptions.append(make("summary", "", "Personnaliser ces suggestions"));
  const characterGrid = $(".source-character-grid");
  const filters = $("#max-duration")?.closest("details");
  if (characterGrid) { characterGrid.before(suggestionOptions); suggestionOptions.append(characterGrid); }
  if (filters) { filters.open = true; suggestionOptions.append(filters); }
  const starter = make("div", "workspace-empty"); starter.id = "workspace-empty";
  starter.innerHTML = `<span class="empty-record">◉</span><p class="step">UN MORCEAU PEUT EN CACHER CENT AUTRES</p><h2>Choisissez votre premier fil.</h2><p>Un morceau, son label, un remixeur. Chaque départ ouvre une fouille indépendante ; gardez vos découvertes dans le carnet.</p><div><button type="button" class="primary-button" data-find-seed>Choisir dans ma collection →</button><a class="outline-button" href="#source-panel">Importer mes playlists</a></div><small>Pas de recherche inventée. Les sources et les liens restent consultables pendant la fouille.</small>`;
  $("#exploration").prepend(starter);
  // A single results surface is owned by scout-mixer-panel. Keep legacy data
  // containers inert for compatibility with stored journeys, not as another UI.
  const legacy = make("div", "legacy-discovery-containers");
  legacy.hidden = true;
  legacy.append($("#exploration-branches"), $("#discoveries"));
  $("#exploration").append(legacy);
  const sessionActions = make("details", "workspace-session-actions");
  sessionActions.append(make("summary", "", "Actions du parcours"), $("#refresh-exploration"), $("#clear-exploration"));
  $("#active-seed").after(sessionActions);
  const sourceBody = $("#source-body"); sourceBody.dataset.userExpanded = "true"; sourceBody.hidden = false;
  const danger = make("details", "danger-zone"); danger.append(make("summary", "", "Réinitialiser les données importées"), $("#clear-library")); sourceBody.append(danger);
  const notebookToolbar = make("div", "notebook-filterbar");
  notebookToolbar.innerHTML = `<label>Retrouver une piste<input id="notebook-search" type="search" placeholder="Titre, artiste ou note…"></label><label>Classement<select id="notebook-filter"><option value="all">Toutes les pistes</option><option value="listen">À écouter</option><option value="explore">À creuser</option><option value="kept">Gardées</option></select></label><p id="notebook-filter-count" role="status"></p>`;
  $("#notebook-items").before(notebookToolbar);
  const notebookSortLabel = make("label", "", "Trier le carnet"), notebookSort = make("select"); notebookSort.id = "notebook-sort";
  for (const [value, text] of localSorts) { const option = make("option", "", value === "explore" ? "Dernières pistes gardées" : text); option.value = value; notebookSort.append(option); }
  notebookSortLabel.append(notebookSort); notebookToolbar.append(notebookSortLabel);
  notebookSort.onchange = () => { onSortNotebook?.(); filterNotebook(); };
  for (const id of ["notebook-search", "notebook-filter"]) $(`#${id}`).addEventListener("input", filterNotebook);
  function filterNotebook() {
    const query = $("#notebook-search").value.trim().toLocaleLowerCase("fr"); const status = $("#notebook-filter").value; let count = 0;
    for (const card of $("#notebook-items").children) {
      if (!card.classList.contains("notebook-card")) continue;
      const match = (!query || `${card.textContent} ${card.querySelector("textarea")?.value || ""}`.toLocaleLowerCase("fr").includes(query)) && (status === "all" || card.querySelector("select")?.value === status);
      card.hidden = !match; if (match) count++;
    }
    $("#notebook-filter-count").textContent = `${count} piste${count > 1 ? "s" : ""} affichée${count > 1 ? "s" : ""}`;
  }
  function notify(message, { error = false, action = null } = {}) {
    clearTimeout(toastTimer); notices.replaceChildren(make("span", "", message)); notices.classList.toggle("error", error); notices.hidden = false;
    if (action) { const button = make("button", "text-button", action.label); button.onclick = () => { action.run(); notices.hidden = true; }; notices.append(button); }
    const close = make("button", "icon-button", "✕"); close.setAttribute("aria-label", "Fermer la notification"); close.onclick = () => { notices.hidden = true; }; notices.append(close);
    toastTimer = setTimeout(() => { notices.hidden = true; }, error ? 15000 : 6500);
  }
  async function run(action) { try { await action(); } catch (error) { if (dialog.open) { pickerError.textContent = error.message; pickerError.hidden = false; } else notify(error.message, { error: true }); } finally { update(); } }
  function navigate(next, focus = false) {
    view = next; explore.hidden = view !== "explore"; sources.hidden = view !== "sources"; notebook.hidden = view !== "notebook";
    root.body.dataset.workspaceView = view;
    for (const link of sidebar.querySelectorAll("[data-view]")) { if (link.dataset.view === view) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); }
    $("#workspace-title").textContent = { explore: "Explorer", notebook: "Votre carnet", sources: "Bibliothèque & sources" }[view];
    $("#workspace-kicker").textContent = { explore: "SUIVEZ VOTRE CURIOSITÉ", notebook: "CE QUI MÉRITE DE REVENIR", sources: "LE POINT DE DÉPART, C’EST VOUS" }[view];
    if (view === "sources") sourceBody.hidden = false;
    if (focus) $("#workspace-title").focus({ preventScroll: true });
  }
  function openPicker() {
    if (dialog.open) return;
    returnFocus = root.activeElement;
    picker.open = true; pickerError.hidden = true; setPickerMode("search");
    $("#seed-type").value = "all"; $("#seed-search").value = "";
    $("#seed-search").dispatchEvent(new Event("input", { bubbles: true }));
    dialog.showModal(); $("#seed-search").focus(); picker.scrollTop = 0;
  }
  function closePicker() { if (dialog.open) { dialog.close(); selectSeed(null); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); } }
  function renderChoices(incoming = choices) {
    const query = `${$("#seed-type").value}:${$("#seed-search").value}`;
    if (query !== choiceQuery) { choiceLimit = $("#seed-search").value.trim() ? 24 : 8; selectSeed(null); }
    choiceQuery = query;
    choices = incoming;
    if (pickerMode === "search" && selectedSeed && !choices.some(item => item.id === selectedSeed.id)) selectSeed(null);
    const ordered = sortMusic(choices, seedSort.value, { shuffleKey });
    if ($("#seed-search").value.trim()) ordered.sort((a, b) => Number(a.searchRank ?? 3) - Number(b.searchRank ?? 3));
    const signature = JSON.stringify([choiceLimit, query, seedSort.value, choices.length, ordered.slice(0, choiceLimit).map(item => [item.id, item.label, item.subtitle])]);
    if (signature === renderedChoices) return; // Keep a focused/pressed button during background refreshes.
    renderedChoices = signature;
    results.replaceChildren();
    for (const item of ordered.slice(0, choiceLimit)) {
      const button = make("button", "seed-result"); button.type = "button"; button.dataset.seedId = item.id;
      const copy = make("span", "seed-result-copy"); copy.append(make("strong", "", item.label), make("small", "", item.subtitle));
      const mark = make("span", "seed-result-check"); mark.setAttribute("aria-hidden", "true");
      button.append(make("span", "seed-result-type", item.typeLabel || item.type), copy, mark);
      button.setAttribute("aria-pressed", String(selectedSeed?.id === item.id));
      if (selectedSeed?.id === item.id) mark.textContent = "✓";
      button.onclick = () => { pickerError.hidden = true; selectSeed(item); };
      results.append(button);
    }
    if (!choices.length) results.append(make("p", "finder-empty", getState().libraryCount || $("#seed-search").value.trim() || $("#seed-type").value !== "all" ? "Aucun résultat dans ce périmètre. Essayez un autre nom ou affichez tous les types." : "Aucun départ disponible ici. Connecter YouTube ne suffit pas : importez vos playlists dans Bibliothèque & sources."));
    resultsStatus.textContent = `${choices.length} départ${choices.length > 1 ? "s" : ""} · ${$("#seed-search").value.trim() ? "résultats de votre recherche" : "bibliothèque et références"}`;
    importLink.hidden = choices.length > 0;
    const remaining = Math.max(0, choices.length - choiceLimit);
    moreChoices.hidden = !remaining;
    if (remaining) {
      const batch = Math.min(12, remaining);
      moreChoices.textContent = `Afficher ${batch} départ${batch > 1 ? "s" : ""} de plus`;
    }
  }
  moreChoices.onclick = () => { choiceLimit += 12; renderChoices(); };
  function update() {
    const state = getState(); const active = Boolean(state.seed?.id);
    starter.hidden = active;
    sessionActions.hidden = !active;
    collaborations.hidden = !active || !state.libraryCount;
    $("#nav-kept-count").textContent = String(state.notebookCount || 0);
    sourceStatus.textContent = `${state.libraryCount || 0} vidéos dans ce navigateur · ${state.playlistCount || 0} playlists connues. Importez jusqu’à 5 000 vidéos uniques.`;
    $("#workspace-change-seed").textContent = active ? "＋ Changer de départ" : "＋ Choisir un départ";
    filterNotebook();
  }
  $("#workspace-change-seed").onclick = openPicker; starter.querySelector("[data-find-seed]").onclick = openPicker;
  dialog.querySelector("[aria-label]").onclick = closePicker;
  dialog.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    event.preventDefault(); event.stopPropagation(); closePicker();
  });
  dialog.addEventListener("click", event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closePicker(); } });
  window.addEventListener("hashchange", () => navigate(workspaceView(location.hash), true));
  root.addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openPicker(); } });
  notices.hidden = true; navigate(view); update();
  function syncSuggestionSelection(ids) {
    if (pickerMode === "suggest") selectSeed(ids.includes(selectedSeed?.id) ? selectedSeed : null);
  }
  return { update, notify, openPicker, closePicker, renderChoices, selectSeed, syncSuggestionSelection, getSeedShuffleKey: () => shuffleKey, navigate: next => { location.hash = next === "sources" ? "source-panel" : next === "notebook" ? "notebook" : "exploration"; navigate(next); } };
}
