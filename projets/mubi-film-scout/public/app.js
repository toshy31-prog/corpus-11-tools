import { buildQuickPreset } from "./presets.mjs";
import { installStudio } from "./studio.mjs";
import { sanitizePreferences, normalizeCollection } from "./discovery.mjs";

const storageKey = "mubi-film-scout.preferences.v1";
const tokenKey = "mubi-film-scout.tmdb-token";
const searchTimeoutMs = 45_000;
const form = document.querySelector("#search-form");
const statusNode = document.querySelector("#status");
const moviesNode = document.querySelector("#movies");
const resultHead = document.querySelector("#result-head");
const resultStep = document.querySelector("#result-step");
const resultTitle = document.querySelector("#result-title");
const appliedNode = document.querySelector("#applied");
const tokenInput = document.querySelector("#token");
const sourceCenter = document.querySelector("#source-center");
const sourceSummary = document.querySelector("#source-summary");
const sourceMessage = document.querySelector("#source-message");
const saveSourcesButton = document.querySelector("#save-sources");
const clearSourcesButton = document.querySelector("#clear-sources");
const runDiagnosticButton = document.querySelector("#run-diagnostic");
const diagnosticServer = document.querySelector("#diagnostic-server");
const diagnosticTmdb = document.querySelector("#diagnostic-tmdb");
const diagnosticGuardian = document.querySelector("#diagnostic-guardian");
const diagnosticNyt = document.querySelector("#diagnostic-nyt");
const diagnosticOmdb = document.querySelector("#diagnostic-omdb");
const diagnosticSearch = document.querySelector("#diagnostic-search");
const memoryCount = document.querySelector("#memory-count");
const interpretationNode = document.querySelector("#interpretation");
const resultsSection = document.querySelector("#results-section");
const submitButton = document.querySelector("#submit-search");
const submitLabel = submitButton.querySelector(".button-label");
const understandingNode = document.querySelector("#understanding");
const lensCountNode = document.querySelector("#lens-count");
const resultViews = document.querySelector("#result-views");
const programmeCount = document.querySelector("#programme-count");
const catalogueCount = document.querySelector("#catalogue-count");
const catalogueSection = document.querySelector("#catalogue-section");
const catalogueGrid = document.querySelector("#catalogue-grid");
const catalogueQuery = document.querySelector("#catalogue-query");
const catalogueProgress = document.querySelector("#catalogue-progress");
const catalogueMore = document.querySelector("#catalogue-more");
const catalogueFetchMore = document.querySelector("#catalogue-fetch-more");
const catalogueSort = document.querySelector("#catalogue-sort");
const catalogueLanguage = document.querySelector("#catalogue-language");
const catalogueVerified = document.querySelector("#catalogue-verified");
const catalogueFreshness = document.querySelector("#catalogue-freshness");
const restoreDismissedButton = document.querySelector("#restore-dismissed");
const shortlistCountNode = document.querySelector("#shortlist-count");
const shortlistSection = document.querySelector("#shortlist-section");
const shortlistGrid = document.querySelector("#shortlist-grid");
const comparisonNode = document.querySelector("#comparison");
const compareShortlistButton = document.querySelector("#compare-shortlist");
const clearShortlistButton = document.querySelector("#clear-shortlist");
const selectionFeedback = document.querySelector("#selection-feedback");
const importFile = document.querySelector("#import-file");

let preferences = loadPreferences();
let connections = {};
let diagnostics = {};
let activeRequest = null;
let requestSequence = 0;
let surpriseMode = false;
let catalogueMovies = [];
let catalogueVisible = 24;
let interpretationHasContent = false;
let catalogueTotalPages = 1;
let catalogueLoadedPages = new Set();
let catalogueFetchedAt = null;
let catalogueBusy = false;
let lastSearchRequest = null;
let currentProgramme = [];
let importSequence = 0;
let preferencesUnsaved = false;
let studio;

const sourceInputs = {
  tmdb: tokenInput,
  guardian: document.querySelector("#guardian-key"),
  nyt: document.querySelector("#nyt-key"),
  omdb: document.querySelector("#omdb-key")
};

const diagnosticSourceNodes = {
  tmdb: diagnosticTmdb,
  guardian: diagnosticGuardian,
  nyt: diagnosticNyt,
  omdb: diagnosticOmdb
};

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return sanitizePreferences({
      seen: [],
      shortlist: [],
      dismissed: [],
      compare: [],
      evaluations: [],
      ...stored
    });
  } catch {
    return { seen: [], shortlist: [], dismissed: [], compare: [], evaluations: [] };
  }
}

function savePreferences() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
    preferencesUnsaved = false;
  } catch {
    preferencesUnsaved = true;
  }
  updateMemoryCount();
  return !preferencesUnsaved;
}

function updateMemoryCount() {
  const seen = preferences.seen.length;
  const kept = preferences.shortlist.length;
  memoryCount.textContent = `${seen} vu${seen > 1 ? "s" : ""} · ${kept} à garder${preferencesUnsaved ? " · Choix non sauvegardés : exportez-les avant de fermer." : ""}`;
  shortlistCountNode.textContent = String(kept);
}

function renderConnections(nextConnections = {}) {
  connections = nextConnections;
  let optionalCount = 0;
  for (const id of Object.keys(sourceInputs)) {
    const state = connections[id] || { configured: false, origin: null };
    const node = document.querySelector(`#source-status-${id}`);
    node.classList.toggle("connected", state.configured);
    node.textContent = state.configured
      ? state.origin === "environment" ? "Configuré · système" : "Enregistré"
      : "Non connecté";
    if (id !== "tmdb" && state.configured) optionalCount += 1;
  }
  const tmdbReady = Boolean(connections.tmdb?.configured);
  sourceSummary.textContent = tmdbReady
    ? `TMDB prêt · ${optionalCount}/3 source${optionalCount > 1 ? "s" : ""} extérieure${optionalCount > 1 ? "s" : ""} active${optionalCount > 1 ? "s" : ""}`
    : "TMDB à connecter";
  sourceSummary.classList.toggle("ready", tmdbReady);
  if (!tmdbReady) sourceCenter.open = true;
  diagnostics.tmdbConfigured = tmdbReady;
  renderDiagnostics(diagnostics);
}

function formatDiagnosticDate(value) {
  if (!value) return "Jamais";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Inconnue" : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function renderDiagnostics(nextDiagnostics = {}) {
  diagnostics = { ...diagnostics, ...nextDiagnostics };
  diagnosticServer.textContent = diagnostics.server === false ? "Hors ligne" : "En ligne";
  diagnosticServer.className = diagnostics.server === false ? "error" : "ok";
  diagnosticSearch.textContent = formatDiagnosticDate(diagnostics.lastSuccessfulSearchAt);
  for (const [id, node] of Object.entries(diagnosticSourceNodes)) {
    const state = diagnostics.sourceChecks?.[id] || (id === "tmdb" ? {
      configured: diagnostics.tmdbConfigured,
      ok: diagnostics.lastTmdbCheckOk,
      latencyMs: diagnostics.lastTmdbLatencyMs
    } : { configured: connections[id]?.configured });
    node.className = "";
    if (!state.configured) {
      node.textContent = "Accès manquant";
    } else if (state.ok === true) {
      node.textContent = `Opérationnelle${state.latencyMs ? ` · ${state.latencyMs} ms` : ""}`;
      node.className = "ok";
    } else if (state.ok === false) {
      node.textContent = "Échec du dernier test";
      node.className = "error";
    } else {
      node.textContent = "Configurée · à tester";
    }
  }
}

function setSourceMessage(message, type = "") {
  sourceMessage.textContent = message;
  sourceMessage.className = `source-message ${type}`.trim();
}

async function saveSources() {
  const submitted = Object.fromEntries(
    Object.entries(sourceInputs).map(([id, input]) => [id, input.value.trim()])
  );
  if (!Object.values(submitted).some(Boolean)) {
    setSourceMessage("Saisissez au moins un accès ; les champs vides conservent les accès existants.", "error");
    return;
  }
  saveSourcesButton.disabled = true;
  setSourceMessage("Enregistrement local…");
  try {
    const response = await fetch("/api/connections/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connections: submitted })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "L’enregistrement a échoué.");
    for (const input of Object.values(sourceInputs)) input.value = "";
    if (submitted.tmdb) sessionStorage.removeItem(tokenKey);
    renderConnections(data.connections);
    setSourceMessage("Accès enregistrés. Vous n’aurez plus à les ressaisir sur cette machine.", "success");
  } catch (error) {
    setSourceMessage(error.message, "error");
  } finally {
    saveSourcesButton.disabled = false;
  }
}

async function clearSources() {
  if (!window.confirm("Oublier tous les accès enregistrés localement ? Les variables système ne seront pas modifiées.")) return;
  clearSourcesButton.disabled = true;
  try {
    const response = await fetch("/api/connections/clear", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "L’effacement a échoué.");
    sessionStorage.removeItem(tokenKey);
    for (const input of Object.values(sourceInputs)) input.value = "";
    renderConnections(data.connections);
    setSourceMessage("Les accès locaux ont été oubliés.", "success");
  } catch (error) {
    setSourceMessage(error.message, "error");
  } finally {
    clearSourcesButton.disabled = false;
  }
}

async function runDiagnostic() {
  const token = tokenInput.value.trim() || sessionStorage.getItem(tokenKey) || "";
  let receivedDiagnostics = false;
  runDiagnosticButton.disabled = true;
  setSourceMessage("Test des sources configurées…");
  try {
    const response = await fetch("/api/diagnostics/run", {
      method: "POST",
      headers: token ? { "x-tmdb-token": token } : {}
    });
    const data = await response.json();
    if (data.diagnostics) {
      receivedDiagnostics = true;
      renderDiagnostics(data.diagnostics);
    }
    if (!response.ok) throw new Error(data.message || "Le diagnostic a échoué.");
    const summary = data.summary;
    setSourceMessage(
      summary?.failed?.length
        ? `${summary.operational}/${summary.tested} source(s) opérationnelle(s). Vérifiez les accès signalés en rouge.`
        : `${summary?.operational || 0}/${summary?.tested || 0} source(s) opérationnelle(s).`,
      summary?.failed?.length ? "error" : "success"
    );
  } catch (error) {
    if (!receivedDiagnostics) renderDiagnostics({ lastTmdbCheckOk: false, lastTmdbCheckAt: new Date().toISOString() });
    setSourceMessage(error.message, "error");
  } finally {
    runDiagnosticButton.disabled = false;
  }
}

function setLoading() {
  resultHead.hidden = true;
  interpretationNode.hidden = true;
  moviesNode.replaceChildren();
  resultViews.hidden = true;
  catalogueSection.hidden = true;
  shortlistSection.hidden = true;
  selectionFeedback.hidden = true;
  statusNode.hidden = false;
  resultsSection.setAttribute("aria-busy", "true");
  statusNode.className = "empty-state loading";
  statusNode.innerHTML = '<span class="loader" aria-hidden="true"></span><p>Je compose votre programme…</p>';
}

function setMessage(message, type = "empty") {
  resultHead.hidden = true;
  interpretationNode.hidden = true;
  moviesNode.replaceChildren();
  resultViews.hidden = true;
  catalogueSection.hidden = true;
  shortlistSection.hidden = true;
  selectionFeedback.hidden = true;
  statusNode.hidden = false;
  statusNode.className = `empty-state ${type}`;
  statusNode.innerHTML = `<span class="empty-mark">${type === "error" ? "!" : "M"}</span><p>${escapeHtml(message)}</p>`;
  resultsSection.setAttribute("aria-busy", "false");
}

function escapeHtml(value = "") {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function currentFilters() {
  return {
    minYear: document.querySelector("#min-year").value,
    maxYear: document.querySelector("#max-year").value,
    effect: document.querySelector('input[name="effect"]:checked').value,
    timeBudget: document.querySelector('input[name="time-budget"]:checked').value,
    detour: document.querySelector('input[name="detour"]:checked').value,
    sort: surpriseMode ? "surprise" : "quality",
    hideSeen: document.querySelector("#hide-seen").checked,
    genres: [...document.querySelectorAll("#genres input:checked")].map((input) => Number(input.value)),
    lenses: [...document.querySelectorAll("#lenses input:checked")].map((input) => input.value),
    seen: preferences.seen
    , ...studio?.filterOverrides()
  };
}

function applyQuickPreset(kind) {
  studio?.beforePreset();
  const preset = buildQuickPreset(kind);
  document.querySelector("#wish").value = preset.wish;
  document.querySelector("#min-year").value = preset.minYear;
  document.querySelector("#max-year").value = preset.maxYear;

  for (const [name, value] of [
    ["effect", preset.effect],
    ["detour", preset.detour]
  ]) {
    document.querySelector(`input[name="${name}"][value="${value}"]`).checked = true;
  }

  const genres = new Set(preset.genres);
  for (const input of document.querySelectorAll("#genres input")) {
    input.checked = genres.has(Number(input.value));
  }
  const lenses = new Set(preset.lenses);
  for (const input of document.querySelectorAll("#lenses input")) {
    input.checked = lenses.has(input.value);
  }
}

function formState() {
  const filters = currentFilters();
  return {
    wish: document.querySelector("#wish").value,
    minYear: filters.minYear,
    maxYear: filters.maxYear,
    minRating: filters.minRating,
    minVotes: filters.minVotes,
    maxRuntime: filters.maxRuntime,
    effect: filters.effect,
    timeBudget: filters.timeBudget,
    detour: filters.detour,
    hideSeen: filters.hideSeen,
    genres: filters.genres,
    lenses: filters.lenses
  };
}

function saveFormState() {
  preferences.form = formState();
  savePreferences();
}

function restoreFormState() {
  const state = preferences.form;
  if (!state) return;
  document.querySelector("#wish").value = state.wish || "";
  for (const id of ["min-year", "max-year"]) {
    document.querySelector(`#${id}`).value = state[id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] ?? "";
  }
  for (const [name, value] of [["effect", state.effect], ["time-budget", state.timeBudget], ["detour", state.detour]]) {
    const input = document.querySelector(`input[name="${name}"][value="${CSS.escape(value || "")}"]`);
    if (input) input.checked = true;
  }
  document.querySelector("#hide-seen").checked = state.hideSeen !== false;
  const genres = new Set(state.genres || []);
  for (const input of document.querySelectorAll("#genres input")) input.checked = genres.has(Number(input.value));
  const lenses = new Set((state.lenses || []).slice(0, 2));
  for (const input of document.querySelectorAll("#lenses input")) input.checked = lenses.has(input.value);
}

function updateLensAvailability() {
  const inputs = [...document.querySelectorAll("#lenses input")];
  const selected = inputs.filter((input) => input.checked);
  for (const input of inputs) input.disabled = selected.length >= 2 && !input.checked;
  if (lensCountNode) {
    lensCountNode.textContent = `${selected.length}/2 angle${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`;
  }
}

function durationSummary(filters) {
  const budget = { short: 90, standard: 120, ample: 180, unlimited: 600 }[filters.timeBudget] || 180;
  const requested = Number(filters.maxRuntime);
  const maximum = Math.min(budget, Number.isFinite(requested) ? Math.round(Math.min(600, Math.max(40, requested))) : 180);
  if (filters.timeBudget === "unlimited" && maximum === 600) return "catalogue sans filtre de durée";
  return `${maximum} minutes maximum`;
}

function updateUnderstanding() {
  const effect = document.querySelector('input[name="effect"]:checked')?.value || "open";
  const timeBudget = document.querySelector('input[name="time-budget"]:checked')?.value || "ample";
  const detour = document.querySelector('input[name="detour"]:checked')?.value || "faithful";
  const effectLabels = {
    captivate: "vous captiver",
    contemplate: "vous laisser contempler",
    comfort: "vous réconforter",
    shake: "vous secouer",
    wonder: "vous émerveiller",
    open: "ne viser aucun effet précis"
  };
  const duration = durationSummary({ ...currentFilters(), timeBudget });
  const detourLabels = {
    faithful: "classer quatre réponses proches",
    sidestep: "équilibrer proximité et contraste",
    adventurous: "maximiser les écarts entre les quatre films"
  };
  const detourReach = { faithful: "5 zones du catalogue", sidestep: "8 zones du catalogue", adventurous: "12 zones du catalogue" };
  const selectedLenses = [...document.querySelectorAll("#lenses input:checked")]
    .map((input) => input.closest("label")?.querySelector("strong")?.textContent)
    .filter(Boolean);
  const hasFreeText = Boolean(document.querySelector("#wish").value.trim());
  understandingNode.innerHTML = `
    <strong>Effet réel sur la sélection</strong>
    <p>${escapeHtml(effectLabels[effect])} · ${escapeHtml(duration)} · ${escapeHtml(detourLabels[detour])} · ${escapeHtml(detourReach[detour])}.</p>
    ${selectedLenses.length ? `<p>Angles actifs : ${selectedLenses.map(escapeHtml).join(" + ")}.</p>` : ""}
    ${hasFreeText ? "<p>La précision libre sera testée contre le vocabulaire annoncé, sans prétendre à une compréhension générale.</p>" : ""}`;
}

function movieSnapshot(movie) {
  return {
    ...movie,
    id: Number(movie.id),
    title: movie.title || "Sans titre",
    originalTitle: movie.originalTitle || "",
    releaseDate: movie.releaseDate || "",
    rating: Number(movie.rating) || 0,
    runtime: Number(movie.runtime) || 0,
    originalLanguage: movie.originalLanguage || "",
    poster: movie.poster || null,
    offerLink: movie.offerLink || "",
    verified: movie.verified === true,
    checkedAt: movie.checkedAt || catalogueFetchedAt || null
  };
}

function isKept(id) {
  return preferences.shortlist.some((movie) => Number(movie.id) === Number(id));
}

function markSeen(id, button, card) {
  preferences.seen = [...new Set([...preferences.seen, id])];
  preferences.shortlist = preferences.shortlist.filter((movie) => Number(movie.id) !== Number(id));
  preferences.compare = preferences.compare.filter((movieId) => Number(movieId) !== Number(id));
  savePreferences();
  button.textContent = "Déjà vu ✓";
  button.disabled = true;
  if (document.querySelector("#hide-seen").checked) {
    card.classList.add("dismissed");
    setTimeout(() => card.remove(), 280);
  }
  renderShortlist();
  renderCatalogue();
}

function toggleShortlist(movie) {
  const id = Number(movie.id);
  if (isKept(id)) {
    preferences.shortlist = preferences.shortlist.filter((item) => Number(item.id) !== id);
    preferences.compare = preferences.compare.filter((movieId) => Number(movieId) !== id);
  } else {
    preferences.shortlist = [...preferences.shortlist, movieSnapshot(movie)];
  }
  savePreferences();
  renderShortlist();
  renderCatalogue();
  renderProgrammeActionStates();
}

function dismissMovie(id) {
  preferences.dismissed = [...new Set([...preferences.dismissed, Number(id)])];
  preferences.shortlist = preferences.shortlist.filter((movie) => Number(movie.id) !== Number(id));
  preferences.compare = preferences.compare.filter((movieId) => Number(movieId) !== Number(id));
  savePreferences();
  renderShortlist();
  renderCatalogue();
}

function renderProgrammeActionStates() {
  for (const button of moviesNode.querySelectorAll("[data-action='keep']")) {
    const kept = isKept(button.dataset.movieId);
    button.textContent = kept ? "Gardé ✓" : "À garder";
    button.setAttribute("aria-pressed", String(kept));
  }
}

function renderMovies(data) {
  statusNode.hidden = true;
  resultsSection.setAttribute("aria-busy", "false");
  resultHead.hidden = false;
  resultViews.hidden = false;
  appliedNode.replaceChildren(...data.applied.map((label) => {
    const chip = document.createElement("span");
    chip.textContent = label;
    return chip;
  }));
  moviesNode.replaceChildren();
  currentProgramme = data.movies || [];
  catalogueMovies = data.catalogue || [];
  catalogueVisible = 24;
  catalogueTotalPages = Number(data.totalPages) || 1;
  catalogueLoadedPages = new Set(data.exploredPages || [1]);
  catalogueFetchedAt = data.fetchedAt || new Date().toISOString();
  catalogueQuery.value = "";
  programmeCount.textContent = String(data.movies.length);
  catalogueCount.textContent = String(catalogueMovies.length);
  refreshCatalogueLanguages();
  renderCatalogue();
  renderShortlist();
  setResultView("programme");
  selectionFeedback.hidden = false;

  interpretationNode.replaceChildren();
  const coverageLabels = Object.entries(data.sourceCoverage || {}).map(([source, coverage]) => {
    const label = { guardian: "Guardian", nyt: "NYT", omdb: "OMDb" }[source] || source;
    if (coverage.failed === coverage.queried && coverage.failed) return `${label} : indisponible`;
    if (!coverage.matched && !coverage.failed) return `${label} : aucune correspondance trouvée`;
    return `${label} : ${coverage.matched}/${coverage.queried} films enrichis${coverage.failed ? " (résultat partiel)" : ""}`;
  });
  const coverageMessage = coverageLabels.length ? `Regards extérieurs — ${coverageLabels.join(" · ")}.` : null;
  const failedChecks = (data.qualityChecks || []).filter(({ passed }) => !passed).map(({ label }) => label);
  const qualityMessage = failedChecks.length ? `Contrôles à revoir : ${failedChecks.join(" · ")}.` : "Contrôles du programme : contraintes, unicité et disponibilités conformes.";
  const messages = [data.interpretationNotice, qualityMessage, coverageMessage, ...(data.warnings || [])].filter(Boolean);
  interpretationHasContent = messages.length > 0;
  interpretationNode.hidden = !interpretationHasContent;
  for (const message of messages) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    interpretationNode.append(paragraph);
  }

  if (!data.movies.length) {
    statusNode.hidden = false;
    statusNode.textContent = "Aucun film vérifié avec ces contraintes. Le catalogue et les élargissements restent accessibles.";
  }
  renderProgramme();
  studio?.onResults(data);
}

function renderProgramme() {
  moviesNode.replaceChildren();
  programmeCount.textContent = String(currentProgramme.length);
  for (const [index, movie] of currentProgramme.entries()) {
    const card = document.createElement("article");
    card.className = "movie-card";
    const year = movie.releaseDate?.slice(0, 4) || "—";
    const posterUrl = safeExternalUrl(movie.poster, ["image.tmdb.org"]);
    const offerUrl = safeExternalUrl(
      movie.offerLink,
      ["www.themoviedb.org", "themoviedb.org"],
      `https://www.themoviedb.org/movie/${Number(movie.id)}/watch?locale=FR`
    );
    const poster = posterUrl
      ? `<img src="${posterUrl}" alt="Affiche de ${escapeHtml(movie.title)}" loading="lazy">`
      : '<div class="poster-missing">Sans affiche</div>';
    const reasons = (movie.why || []).length
      ? `<div class="why">${movie.why.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>`
      : "";
    const runtime = movie.runtime ? `${movie.runtime} min` : "durée inconnue";
    const language = movie.originalLanguage ? movie.originalLanguage.toUpperCase() : "—";
    const role = movie.role || { label: `Proposition ${index + 1}`, description: "Une piste pour votre soirée." };
    card.innerHTML = `
      <div class="poster-wrap">${poster}<span class="rank">${String(index + 1).padStart(2, "0")}</span></div>
      <div class="movie-copy">
        <div class="programme-role">
          <p>${escapeHtml(role.label)}</p>
          <span>${escapeHtml(role.description)}</span>
        </div>
        <p class="movie-meta">${year} <span>•</span> ${runtime} <span>•</span> Langue originale ${language}</p>
        <h3>${escapeHtml(movie.title)}</h3>
        <p>${escapeHtml(movie.director || "Cinéaste non renseigné")}</p>
        ${movie.originalTitle !== movie.title ? `<p class="original-title">${escapeHtml(movie.originalTitle)}</p>` : ""}
        ${reasons}
        <p class="overview">${escapeHtml(movie.overview || "Aucun synopsis français disponible.")}</p>
        <div class="card-actions">
          <a href="${offerUrl}" target="_blank" rel="noreferrer">Voir où regarder ↗</a>
          <button type="button" data-action="keep" data-movie-id="${Number(movie.id)}" aria-pressed="${isKept(movie.id)}">${isKept(movie.id) ? "Gardé ✓" : "À garder"}</button>
          <button type="button" data-action="seen">Déjà vu</button>
        </div>
      </div>`;
    card.querySelector("[data-action='keep']").addEventListener("click", () => toggleShortlist(movie));
    card.querySelector("[data-action='seen']").addEventListener("click", (event) => markSeen(movie.id, event.currentTarget, card));
    studio?.decorateCard(card, movie, "programme");
    moviesNode.append(card);
  }
}

function normalizedCatalogueQuery() {
  return catalogueQuery.value.trim().toLocaleLowerCase("fr-FR");
}

function filteredCatalogueMovies() {
  const query = normalizedCatalogueQuery();
  const language = catalogueLanguage.value;
  const dismissed = new Set(preferences.dismissed.map(Number));
  const seen = new Set(preferences.seen.map(Number));
  const filtered = catalogueMovies.filter((movie) => {
    if (studio && !studio.catalogueAccepts(movie)) return false;
    if (dismissed.has(Number(movie.id))) return false;
    if (document.querySelector("#hide-seen").checked && seen.has(Number(movie.id))) return false;
    if (catalogueVerified.checked && !movie.verified) return false;
    if (language && movie.originalLanguage !== language) return false;
    return !query || [movie.title, movie.originalTitle]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase("fr-FR").includes(query));
  });
  const sort = catalogueSort.value;
  if (sort === "rating") filtered.sort((left, right) => right.rating - left.rating || left.title.localeCompare(right.title, "fr"));
  if (sort === "recent") filtered.sort((left, right) => String(right.releaseDate).localeCompare(String(left.releaseDate)));
  if (sort === "oldest") filtered.sort((left, right) => String(left.releaseDate || "9999").localeCompare(String(right.releaseDate || "9999")));
  return filtered;
}

function refreshCatalogueLanguages() {
  const selected = catalogueLanguage.value;
  const languages = [...new Set(catalogueMovies.map((movie) => movie.originalLanguage).filter(Boolean))].sort();
  catalogueLanguage.replaceChildren(new Option("Toutes", ""), ...languages.map((language) => new Option(language.toUpperCase(), language)));
  if (languages.includes(selected)) catalogueLanguage.value = selected;
}

function renderCatalogue() {
  const filtered = filteredCatalogueMovies();
  const visible = filtered.slice(0, catalogueVisible);
  catalogueGrid.replaceChildren();
  for (const movie of visible) {
    const card = document.createElement("article");
    card.className = "catalogue-card";
    const posterUrl = safeExternalUrl(movie.poster, ["image.tmdb.org"]);
    const offerUrl = safeExternalUrl(
      movie.offerLink,
      ["www.themoviedb.org", "themoviedb.org"],
      `https://www.themoviedb.org/movie/${Number(movie.id)}/watch?locale=FR`
    );
    const year = movie.releaseDate?.slice(0, 4) || "—";
    card.innerHTML = `
      <a class="catalogue-poster" href="${offerUrl}" target="_blank" rel="noreferrer">
        ${posterUrl ? `<img src="${posterUrl}" alt="Affiche de ${escapeHtml(movie.title)}" loading="lazy">` : '<span class="poster-missing">Sans affiche</span>'}
        ${movie.verified ? '<span class="verified-badge">Vérifié</span>' : ""}
      </a>
      <div class="catalogue-copy">
        <p>${year}${movie.originalLanguage ? ` · Langue originale ${escapeHtml(movie.originalLanguage.toUpperCase())}` : ""}</p>
        <h3><a href="${offerUrl}" target="_blank" rel="noreferrer">${escapeHtml(movie.title)}</a></h3>
        <span>${movie.rating ? `${movie.rating.toFixed(1)}/10` : "Non noté"}</span>
        <div class="catalogue-actions">
          <button type="button" data-action="keep" aria-pressed="${isKept(movie.id)}">${isKept(movie.id) ? "Gardé ✓" : "+ Garder"}</button>
          <button type="button" data-action="seen">Vu</button>
          <button type="button" data-action="dismiss" aria-label="Écarter ${escapeHtml(movie.title)}">Écarter</button>
        </div>
      </div>`;
    card.querySelector("[data-action='keep']").addEventListener("click", () => toggleShortlist(movie));
    card.querySelector("[data-action='seen']").addEventListener("click", (event) => markSeen(movie.id, event.currentTarget, card));
    card.querySelector("[data-action='dismiss']").addEventListener("click", () => dismissMovie(movie.id));
    studio?.decorateCard(card, movie, "catalogue");
    catalogueGrid.append(card);
  }
  catalogueProgress.textContent = filtered.length
    ? `${visible.length} titre${visible.length > 1 ? "s" : ""} affiché${visible.length > 1 ? "s" : ""} sur ${filtered.length}`
    : "Aucun titre ne correspond à ce filtre.";
  catalogueMore.hidden = visible.length >= filtered.length;
  restoreDismissedButton.hidden = preferences.dismissed.length === 0;
  const nextPage = nextCataloguePage();
  catalogueFetchMore.hidden = nextPage === null;
  catalogueFetchMore.textContent = catalogueBusy ? "Chargement…" : nextPage ? `Charger la page ${nextPage}` : "Catalogue parcouru";
  catalogueFetchMore.disabled = catalogueBusy;
  catalogueFreshness.textContent = catalogueFetchedAt
    ? `Disponibilité signalée, dernière consultation ${formatDiagnosticDate(catalogueFetchedAt)} · ${catalogueLoadedPages.size}/${catalogueTotalPages} page(s) chargée(s).`
    : "";
  studio?.onCatalogueRendered({ visible: visible.length, filtered: filtered.length, loaded: catalogueMovies.length, next: nextPage, busy: catalogueBusy });
}

function nextCataloguePage() {
  for (let page = 1; page <= catalogueTotalPages; page += 1) {
    if (!catalogueLoadedPages.has(page)) return page;
  }
  return null;
}

async function loadNextCataloguePage() {
  const sequence = requestSequence;
  const page = nextCataloguePage();
  if (!page || catalogueBusy || !lastSearchRequest) return;
  const token = tokenInput.value.trim() || sessionStorage.getItem(tokenKey) || "";
  catalogueBusy = true;
  renderCatalogue();
  try {
    const response = await fetch("/api/catalogue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-tmdb-token": token } : {})
      },
      body: JSON.stringify({
        ...lastSearchRequest,
        filters: { ...lastSearchRequest.filters, seen: preferences.seen },
        page
      }),
      signal: AbortSignal.timeout(20_000)
    });
    const data = await response.json();
    if (sequence !== requestSequence) return;
    if (!response.ok) throw new Error(data.message || "Impossible de charger cette page.");
    catalogueLoadedPages.add(data.page);
    catalogueTotalPages = data.totalPages;
    studio?.setCatalogueTotal(data.totalResults);
    catalogueFetchedAt = data.fetchedAt;
    catalogueMovies = [...new Map([...catalogueMovies, ...(data.movies || [])].map((movie) => [Number(movie.id), movie])).values()];
    catalogueVisible += 24;
    catalogueCount.textContent = String(catalogueMovies.length);
    refreshCatalogueLanguages();
    if (!catalogueSection.hidden) {
      resultTitle.textContent = `${catalogueMovies.length} titre${catalogueMovies.length > 1 ? "s" : ""} chargé${catalogueMovies.length > 1 ? "s" : ""}`;
    }
  } catch (error) {
    window.alert(error.message);
  } finally {
    if (sequence === requestSequence) { catalogueBusy = false; renderCatalogue(); }
  }
}

function renderShortlist() {
  document.querySelector("#export-shortlist-text").disabled = preferences.shortlist.length === 0;
  shortlistGrid.replaceChildren();
  const compareIds = new Set(preferences.compare.map(Number));
  for (const movie of preferences.shortlist) {
    if (studio && !studio.libraryAccepts(movie)) continue;
    const card = document.createElement("article");
    card.className = "shortlist-card";
    const posterUrl = safeExternalUrl(movie.poster, ["image.tmdb.org"]);
    card.innerHTML = `
      <label class="compare-choice">
        <input type="checkbox" ${compareIds.has(Number(movie.id)) ? "checked" : ""}>
        <span>Comparer</span>
      </label>
      ${posterUrl ? `<img src="${posterUrl}" alt="Affiche de ${escapeHtml(movie.title)}" loading="lazy">` : '<div class="shortlist-poster-missing">Sans affiche</div>'}
      <div><h3>${escapeHtml(movie.title)}</h3><p>${movie.releaseDate?.slice(0, 4) || "—"} · ${movie.runtime ? `${movie.runtime} min` : "durée inconnue"}</p><button type="button">Retirer</button></div>`;
    const checkbox = card.querySelector("input");
    checkbox.addEventListener("change", () => {
      const id = Number(movie.id);
      if (checkbox.checked && preferences.compare.length >= 4) {
        checkbox.checked = false;
        window.alert("Comparez quatre films au maximum.");
        return;
      }
      preferences.compare = checkbox.checked
        ? [...new Set([...preferences.compare, id])]
        : preferences.compare.filter((movieId) => Number(movieId) !== id);
      savePreferences();
      compareShortlistButton.disabled = preferences.compare.length < 2;
      comparisonNode.hidden = true;
    });
    card.querySelector("button").addEventListener("click", () => toggleShortlist(movie));
    studio?.decorateCard(card, movie, "library");
    shortlistGrid.append(card);
  }
  if (!shortlistGrid.children.length) {
    const empty = document.createElement("p");
    empty.className = "shortlist-empty";
    empty.textContent = preferences.shortlist.length ? "Aucun film ne correspond aux filtres de votre bibliothèque." : "Aucun film gardé. Utilisez « À garder » dans le programme ou le catalogue.";
    shortlistGrid.append(empty);
    if (preferences.shortlist.length) {
      const clear = document.createElement("button"); clear.type = "button"; clear.textContent = "Effacer les filtres";
      clear.addEventListener("click", () => studio?.clearLibraryFilters()); shortlistGrid.append(clear);
    }
  }
  compareShortlistButton.disabled = preferences.compare.length < 2;
  comparisonNode.hidden = true;
}

function renderComparison() {
  const selected = preferences.shortlist.filter((movie) => preferences.compare.map(Number).includes(Number(movie.id))).slice(0, 4);
  if (selected.length < 2) return;
  const rows = [
    ["Année", (movie) => movie.releaseDate?.slice(0, 4) || "—"],
    ["Durée", (movie) => movie.runtime ? `${movie.runtime} min` : "Inconnue"],
    ["Langue", (movie) => movie.originalLanguage?.toUpperCase() || "—"],
    ["Note TMDB", (movie) => movie.rating ? `${movie.rating.toFixed(1)}/10` : "Non noté"],
    ["Disponibilité", (movie) => movie.verified ? "Vérifiée pendant la recherche" : "Signalée par le catalogue"]
  ];
  comparisonNode.innerHTML = `<h3>Comparaison factuelle</h3><div class="comparison-scroll"><table><thead><tr><th>Critère</th>${selected.map((movie) => `<th>${escapeHtml(movie.title)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th>${label}</th>${selected.map((movie) => `<td>${escapeHtml(value(movie))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  comparisonNode.hidden = false;
}

function setResultView(view) {
  const showCatalogue = view === "catalogue";
  const showShortlist = view === "shortlist";
  moviesNode.hidden = showCatalogue || showShortlist;
  catalogueSection.hidden = !showCatalogue;
  shortlistSection.hidden = !showShortlist;
  selectionFeedback.hidden = view !== "programme";
  interpretationNode.hidden = view !== "programme" || !interpretationHasContent;
  resultStep.textContent = showCatalogue ? "02 — L’exploration" : showShortlist ? "03 — Votre choix" : "02 — Le programme";
  resultTitle.textContent = showCatalogue
    ? `${catalogueMovies.length} titre${catalogueMovies.length > 1 ? "s" : ""} chargé${catalogueMovies.length > 1 ? "s" : ""}`
    : showShortlist ? `${preferences.shortlist.length} film${preferences.shortlist.length > 1 ? "s" : ""} à garder` : "Votre sélection";
  for (const button of resultViews.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.resultView === view));
  }
}

function formatPerspectiveDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("fr-FR", { year: "numeric", month: "short" });
}

function renderPerspectives(perspectives) {
  if (!perspectives.length) return "";
  const items = perspectives.map((perspective) => {
    const allowedHosts = {
      guardian: ["theguardian.com", "www.theguardian.com"],
      nyt: ["nytimes.com", "www.nytimes.com"],
      omdb: ["imdb.com", "www.imdb.com"]
    }[perspective.source] || [];
    const url = safeExternalUrl(perspective.url, allowedHosts);
    const headline = escapeHtml(perspective.headline || perspective.kind || "Source extérieure");
    const title = url ? `<a href="${url}" target="_blank" rel="noreferrer">${headline} ↗</a>` : `<strong>${headline}</strong>`;
    const details = [perspective.byline, formatPerspectiveDate(perspective.publishedAt)].filter(Boolean).map(escapeHtml).join(" · ");
    const match = perspective.match
      ? `<small class="match-evidence">Rapprochement ${perspective.match.certainty === "exact" ? "exact" : "probable"} · ${(perspective.match.evidence || []).map(escapeHtml).join(" · ")}</small>`
      : "";
    const ratings = (perspective.ratings || []).length
      ? `<div class="external-ratings">${perspective.ratings.map((rating) => `<span><small>${escapeHtml(rating.source)}</small>${escapeHtml(rating.value)}</span>`).join("")}</div>`
      : "";
    return `<article class="external-view">
      <div class="external-source"><span>${escapeHtml(perspective.label || perspective.source)}</span>${perspective.rating ? `<b>${escapeHtml(perspective.rating)}</b>` : ""}</div>
      ${title}
      ${perspective.summary ? `<p>${escapeHtml(perspective.summary)}</p>` : ""}
      ${details ? `<small>${details}</small>` : ""}
      ${match}
      ${ratings}
    </article>`;
  }).join("");
  return `<section class="external-views" aria-label="Regards extérieurs"><h4>Regards extérieurs</h4>${items}</section>`;
}

function safeExternalUrl(value, allowedHosts, fallback = "") {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedHosts.includes(url.hostname) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function setSearchBusy(busy) {
  submitButton.disabled = busy;
  submitLabel.textContent = busy ? "Composition en cours…" : "Composer ma soirée";
}

async function search(event) {
  event?.preventDefault();
  const requestId = ++requestSequence;
  studio?.onSearchStart();
  catalogueBusy = false;
  activeRequest?.abort();
  activeRequest = null;
  const token = tokenInput.value.trim() || sessionStorage.getItem(tokenKey) || "";
  if (!token && !connections.tmdb?.configured) {
    sourceCenter.open = true;
    tokenInput.focus();
    setMessage("Enregistrez une fois votre jeton TMDB dans le centre des sources.", "error");
    return;
  }
  if (tokenInput.value.trim()) sessionStorage.setItem(tokenKey, tokenInput.value.trim());
  saveFormState();
  lastSearchRequest = { wish: document.querySelector("#wish").value, filters: currentFilters(), progressive: true };

  const controller = new AbortController();
  activeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), searchTimeoutMs);
  setLoading();
  setSearchBusy(true);
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-tmdb-token": token } : {})
      },
      body: JSON.stringify(lastSearchRequest),
      signal: controller.signal
    });
    const data = await response.json();
    if (requestId !== requestSequence) return;
    if (!response.ok) throw new Error(data.message || "La recherche a échoué.");
    renderDiagnostics({ lastSuccessfulSearchAt: new Date().toISOString() });
    renderMovies(data);
  } catch (error) {
    if (requestId !== requestSequence) return;
    setMessage(error.name === "AbortError" ? "La recherche a dépassé 45 secondes. Réessayez." : error.message, "error");
  } finally {
    clearTimeout(timeout);
    if (requestId === requestSequence) {
      activeRequest = null;
      setSearchBusy(false);
    }
  }
}

function recordEvaluation(value) {
  const ids = currentProgramme.map(({ id }) => Number(id));
  if (!ids.length) return;
  preferences.evaluations = [
    ...preferences.evaluations.filter((item) => item.programmeIds?.join(",") !== ids.join(",")),
    {
      at: new Date().toISOString(),
      value,
      wish: lastSearchRequest?.wish || "",
      filters: lastSearchRequest?.filters || {},
      programmeIds: ids
    }
  ].slice(-100);
  savePreferences();
  for (const button of selectionFeedback.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.feedback === value));
  }
}

function exportShortlistText() {
  if (!preferences.shortlist.length) return;
  const singleLine = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const lines = preferences.shortlist.map((movie, index) => {
    const year = /^\d{4}/.exec(String(movie.releaseDate || ""))?.[0] || "année inconnue";
    const runtime = Number(movie.runtime);
    const duration = Number.isFinite(runtime) && runtime > 0 ? `${runtime} min` : "durée inconnue";
    return `${index + 1}. ${singleLine(movie.title) || "Sans titre"} (${year}) — ${duration}`;
  });
  const text = ["MUBI Film Scout — Films à garder", "", ...lines, "",
    "Liste conservée localement ; disponibilité à revérifier avant la séance.", ""].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `mubi-films-a-garder-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportLocalData() {
  const payload = {
    format: "mubi-film-scout-local-v1",
    exportedAt: new Date().toISOString(),
    preferences
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `mubi-film-scout-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function validatedImport(payload) {
  const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  if (!object(payload) || payload.format !== "mubi-film-scout-local-v1" || !object(payload.preferences)) {
    throw new Error("Format d’export non reconnu.");
  }
  const incoming = payload.preferences;
  const array = (value, label) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error(`Liste invalide : ${label}.`);
    return value;
  };
  const id = (value) => {
    if (!((typeof value === "number") || (typeof value === "string" && /^\d+$/.test(value)))
        || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new Error("Identifiant de film invalide.");
    return Number(value);
  };
  const ids = (value, label) => [...new Set(array(value, label).map(id))];
  const shortlist = [];
  for (const movie of array(incoming.shortlist, "films gardés")) {
    if (!object(movie)) throw new Error("Film gardé invalide.");
    const movieId = id(movie.id);
    for (const key of ["title", "originalTitle", "releaseDate", "originalLanguage", "poster", "offerLink", "checkedAt"]) {
      if (movie[key] != null && typeof movie[key] !== "string") throw new Error("Texte ou date d’un film invalide.");
    }
    for (const key of ["rating", "runtime"]) {
      if (movie[key] != null && (typeof movie[key] !== "number" || !Number.isFinite(movie[key]) || movie[key] < 0)) throw new Error("Note ou durée de film invalide.");
    }
    if (movie.verified != null && typeof movie.verified !== "boolean") throw new Error("Statut de film invalide.");
    if (!shortlist.some((item) => item.id === movieId)) shortlist.push({ ...movie, id: movieId });
  }
  const compare = ids(incoming.compare, "comparaison").filter((value) => shortlist.some((movie) => movie.id === value));
  if (compare.length > 4) throw new Error("L’export contient plus de quatre films à comparer.");
  const evaluations = array(incoming.evaluations, "évaluations").map((entry) => {
    if (!object(entry) || (entry.filters != null && !object(entry.filters))) throw new Error("Évaluation invalide.");
    for (const key of ["at", "value", "wish"]) {
      if (entry[key] != null && typeof entry[key] !== "string") throw new Error("Évaluation invalide.");
    }
    return { ...entry, programmeIds: ids(entry.programmeIds, "films évalués") };
  }).slice(-100);
  const result = { seen: ids(incoming.seen, "films vus"), dismissed: ids(incoming.dismissed, "films écartés"), shortlist, compare, evaluations };
  if (incoming.form !== undefined) {
    const form = incoming.form;
    if (!object(form)) throw new Error("Réglages de recherche invalides.");
    for (const key of ["wish", "effect", "timeBudget", "detour"]) {
      if (form[key] != null && typeof form[key] !== "string") throw new Error("Réglages de recherche invalides.");
    }
    const choices = {
      effect: ["captivate", "contemplate", "comfort", "shake", "wonder", "open"],
      timeBudget: ["standard", "short", "ample", "unlimited"],
      detour: ["sidestep", "faithful", "adventurous"],
    };
    const selected = {};
    for (const [key, values] of Object.entries(choices)) {
      selected[key] = form[key] ?? values[0];
      if (!values.includes(selected[key])) throw new Error(`Réglage de recherche inconnu : ${key}.`);
    }
    for (const key of ["minYear", "maxYear"]) {
      const year = form[key];
      if (year != null && year !== "" && !((typeof year === "number" && Number.isInteger(year) && year > 0)
          || (typeof year === "string" && /^\d+$/.test(year)))) throw new Error("Année de recherche invalide.");
    }
    if (form.hideSeen != null && typeof form.hideSeen !== "boolean") throw new Error("Réglages de recherche invalides.");
    const lenses = array(form.lenses, "angles de recherche");
    if (lenses.some((value) => typeof value !== "string")) throw new Error("Angle de recherche invalide.");
    result.form = { ...form, ...selected, genres: ids(form.genres, "genres"), lenses: [...new Set(lenses)] };
  }
  const collections = array(incoming.collections, "collections").map(normalizeCollection);
  for (const key of ["history", "rejections"]) array(incoming[key], key);
  if (incoming.profile != null && !object(incoming.profile)) throw new Error("Profil invalide.");
  if (incoming.lists != null && !object(incoming.lists)) throw new Error("Listes personnelles invalides.");
  if (incoming.profile) {
    ids(incoming.profile.preferredGenres, "genres préférés");
    ids(incoming.profile.excludedGenres, "genres exclus");
  }
  return sanitizePreferences({ ...incoming, ...result, collections });
}

async function importLocalData(file) {
  if (!file) return;
  const sequence = ++importSequence;
  const before = JSON.stringify(preferences);
  let previous = null;
  importFile.value = "";
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error("Fichier trop volumineux : limite de 2 Mo.");
    const payload = JSON.parse(await file.text());
    if (sequence !== importSequence) return;
    const next = validatedImport(payload);
    if (JSON.stringify(preferences) !== before) throw new Error("Vos choix ont changé pendant la lecture. Relancez l’import si vous souhaitez les remplacer.");
    // Validate the render before the single atomic storage write. A failed
    // render or write restores the in-memory choices; pending imports cannot win.
    previous = preferences;
    preferences = next;
    renderShortlist();
    renderCatalogue();
    renderProgrammeActionStates();
    studio?.refreshPersonalData();
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); }
    catch { throw new Error("Import non enregistré : le stockage est indisponible ou plein. Vos choix actuels sont conservés."); }
    previous = null;
    preferencesUnsaved = false;
    if (preferences.form) {
      restoreFormState();
      studio?.restoreImportedForm();
      updateLensAvailability();
      updateUnderstanding();
    }
    updateMemoryCount();
    window.alert("Choix locaux importés.");
  } catch (error) {
    if (sequence !== importSequence) return;
    if (previous) {
      preferences = previous;
      renderShortlist(); renderCatalogue(); renderProgrammeActionStates();
      studio?.refreshPersonalData(); updateMemoryCount();
    }
    window.alert(error.message || "Import impossible.");
  }
}

async function init() {
  const response = await fetch("/api/status");
  const data = await response.json();
  tokenInput.value = sessionStorage.getItem(tokenKey) || "";
  renderDiagnostics(data.diagnostics);
  renderConnections(data.connections);

  const currentYear = new Date().getFullYear();
  const minYearInput = document.querySelector("#min-year");
  const maxYearInput = document.querySelector("#max-year");
  minYearInput.max = String(currentYear);
  maxYearInput.max = String(currentYear);
  if (!maxYearInput.value) maxYearInput.value = String(currentYear);

  const genreRoot = document.querySelector("#genres");
  for (const [id, name] of data.genres) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${id}"><span>${escapeHtml(name)}</span>`;
    genreRoot.append(label);
  }
  const lensRoot = document.querySelector("#lenses");
  for (const lens of data.lenses) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(lens.id)}"><span><strong>${escapeHtml(lens.label)}</strong><small>${escapeHtml(lens.description)}</small></span>`;
    lensRoot.append(label);
  }
  restoreFormState();
  updateLensAvailability();
  updateMemoryCount();
  renderShortlist();
  studio?.onReady(data);
  updateUnderstanding();
}

form.addEventListener("submit", search);
form.addEventListener("change", (event) => {
  surpriseMode = false;
  updateLensAvailability();
  studio?.onFormChange(event.target);
  updateUnderstanding();
  saveFormState();
});
saveSourcesButton.addEventListener("click", saveSources);
clearSourcesButton.addEventListener("click", clearSources);
runDiagnosticButton.addEventListener("click", runDiagnostic);
document.querySelector("#wish").addEventListener("input", () => {
  surpriseMode = false;
  updateUnderstanding();
});
resultViews.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-result-view]");
  if (button) setResultView(button.dataset.resultView);
});
catalogueQuery.addEventListener("input", () => {
  catalogueVisible = 24;
  renderCatalogue();
});
for (const control of [catalogueSort, catalogueLanguage, catalogueVerified]) {
  control.addEventListener("change", () => {
    catalogueVisible = 24;
    renderCatalogue();
  });
}
catalogueMore.addEventListener("click", () => {
  catalogueVisible += 24;
  renderCatalogue();
});
catalogueFetchMore.addEventListener("click", loadNextCataloguePage);
compareShortlistButton.addEventListener("click", renderComparison);
clearShortlistButton.addEventListener("click", () => {
  if (!window.confirm("Vider la liste des films à garder ?")) return;
  preferences.shortlist = [];
  preferences.compare = [];
  savePreferences();
  renderShortlist();
  renderCatalogue();
  renderProgrammeActionStates();
});
restoreDismissedButton.addEventListener("click", () => {
  preferences.dismissed = [];
  savePreferences();
  renderCatalogue();
});
selectionFeedback.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-feedback]");
  if (button) recordEvaluation(button.dataset.feedback);
});
document.querySelector("#export-data").addEventListener("click", exportLocalData);
document.querySelector("#export-shortlist-text").addEventListener("click", exportShortlistText);
document.querySelector("#import-data").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => importLocalData(importFile.files?.[0]));
document.querySelector("#surprise").addEventListener("click", () => {
  applyQuickPreset("surprise");
  surpriseMode = true;
  updateLensAvailability();
  updateUnderstanding();
  search();
});
document.querySelector("#oblique").addEventListener("click", () => {
  applyQuickPreset("oblique");
  surpriseMode = false;
  updateLensAvailability();
  updateUnderstanding();
  search();
});
document.querySelector("#forget").addEventListener("click", () => {
  if (!window.confirm("Effacer les films vus, les films gardés, les évaluations et l’accès temporaire de cet onglet ?")) return;
  requestSequence += 1;
  importSequence += 1;
  activeRequest?.abort();
  activeRequest = null;
  setSearchBusy(false);
  currentProgramme = []; catalogueMovies = []; lastSearchRequest = null;
  catalogueLoadedPages = new Set(); catalogueTotalPages = 0; catalogueBusy = false; catalogueVisible = 24;
  studio?.reset();
  preferences = { seen: [], shortlist: [], dismissed: [], compare: [], evaluations: [] };
  let tokenCleared = true;
  try { sessionStorage.removeItem(tokenKey); }
  catch { tokenCleared = false; }
  tokenInput.value = "";
  const saved = savePreferences();
  renderShortlist();
  studio?.refreshPersonalData();
  if (saved && tokenCleared) {
    setMessage("Les choix locaux et le jeton temporaire de cet onglet ont été effacés.");
  } else {
    setMessage(`Effacement incomplet : ${[
      !saved && "les anciens choix peuvent rester enregistrés sur cet appareil",
      !tokenCleared && "le jeton temporaire peut rester enregistré dans cet onglet",
    ].filter(Boolean).join(" ; ")}.`, "error");
  }
});

studio = installStudio({
  getPreferences: () => preferences,
  save: savePreferences,
  getProgramme: () => currentProgramme,
  setProgramme: (movies) => { currentProgramme = movies; renderProgramme(); },
  getCatalogue: () => catalogueMovies,
  updateMovies: (movies) => {
    const byId = new Map(movies.map((m) => [m.id, m]));
    catalogueMovies = catalogueMovies.map((m) => ({ ...m, ...byId.get(m.id) }));
    currentProgramme = currentProgramme.map((m) => ({ ...m, ...byId.get(m.id), role: m.role })).filter((m) => m.verified && m.availability?.available !== false);
    preferences.shortlist = preferences.shortlist.map((m) => ({ ...m, ...byId.get(m.id) }));
    renderProgramme(); renderCatalogue(); renderShortlist();
  },
  getFilters: currentFilters,
  getRequest: () => lastSearchRequest,
  getForm: formState,
  restoreForm: (state) => { preferences.form = state; restoreFormState(); updateUnderstanding(); updateLensAvailability(); },
  search, renderCatalogue, renderShortlist, setResultView,
  renderPerspectives, escapeHtml, toggleShortlist,
  headers: () => ({ "content-type": "application/json", ...(sessionStorage.getItem(tokenKey) ? { "x-tmdb-token": sessionStorage.getItem(tokenKey) } : {}) }),
  async browse() {
    requestSequence += 1;
    studio?.onSearchStart();
    activeRequest?.abort();
    catalogueBusy = false;
    setSearchBusy(false);
    lastSearchRequest = { wish: "", filters: { minYear: 1874, maxYear: new Date().getFullYear(), minRating: 0, minVotes: 0, effect: "open", timeBudget: "unlimited", maxRuntime: 600, hideSeen: false } };
    catalogueMovies = []; catalogueLoadedPages = new Set(); catalogueTotalPages = 1;
    statusNode.hidden = true; resultHead.hidden = false; resultViews.hidden = false;
    appliedNode.textContent = "Catalogue MUBI France · sans filtre de genre, époque ou note";
    setResultView("catalogue");
    await loadNextCataloguePage();
  },
  async more() {
    const before = catalogueMovies.length;
    catalogueVisible += 24; renderCatalogue();
    if (catalogueVisible > before) await loadNextCataloguePage();
  }
});
init().catch(() => setMessage("Impossible de joindre le serveur local.", "error"));
