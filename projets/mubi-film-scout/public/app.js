const storageKey = "mubi-film-scout.preferences.v1";
const tokenKey = "mubi-film-scout.tmdb-token";
const form = document.querySelector("#search-form");
const statusNode = document.querySelector("#status");
const moviesNode = document.querySelector("#movies");
const resultHead = document.querySelector("#result-head");
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
const diagnosticSearch = document.querySelector("#diagnostic-search");
const memoryCount = document.querySelector("#memory-count");
const interpretationNode = document.querySelector("#interpretation");
const resultsSection = document.querySelector("#results-section");
const submitButton = document.querySelector("#submit-search");
const submitLabel = submitButton.querySelector(".button-label");
const understandingNode = document.querySelector("#understanding");

let preferences = loadPreferences();
let connections = {};
let diagnostics = {};
let activeRequest = null;
let requestSequence = 0;

const sourceInputs = {
  tmdb: tokenInput,
  guardian: document.querySelector("#guardian-key"),
  nyt: document.querySelector("#nyt-key"),
  omdb: document.querySelector("#omdb-key")
};

function loadPreferences() {
  try {
    return { seen: [], ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
  } catch {
    return { seen: [] };
  }
}

function savePreferences() {
  localStorage.setItem(storageKey, JSON.stringify(preferences));
  updateMemoryCount();
}

function updateMemoryCount() {
  const count = preferences.seen.length;
  memoryCount.textContent = `${count} film${count > 1 ? "s" : ""} déjà vu${count > 1 ? "s" : ""} mémorisé${count > 1 ? "s" : ""}`;
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
    ? `TMDB prêt · ${optionalCount}/3 source${optionalCount > 1 ? "s" : ""} d’avis préparée${optionalCount > 1 ? "s" : ""}`
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
  diagnosticTmdb.className = "";
  if (diagnostics.lastTmdbCheckOk === true) {
    diagnosticTmdb.textContent = `Opérationnelle${diagnostics.lastTmdbLatencyMs ? ` · ${diagnostics.lastTmdbLatencyMs} ms` : ""}`;
    diagnosticTmdb.className = "ok";
  } else if (diagnostics.lastTmdbCheckOk === false) {
    diagnosticTmdb.textContent = "Échec du dernier test";
    diagnosticTmdb.className = "error";
  } else {
    diagnosticTmdb.textContent = diagnostics.tmdbConfigured ? "Configurée · à tester" : "Jeton manquant";
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
  setSourceMessage("Test de la connexion TMDB…");
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
    setSourceMessage("TMDB répond correctement.", "success");
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
  statusNode.hidden = false;
  resultsSection.setAttribute("aria-busy", "true");
  statusNode.className = "empty-state loading";
  statusNode.innerHTML = '<span class="loader" aria-hidden="true"></span><p>Je compose votre programme…</p>';
}

function setMessage(message, type = "empty") {
  resultHead.hidden = true;
  interpretationNode.hidden = true;
  moviesNode.replaceChildren();
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
    minRating: document.querySelector("#min-rating").value,
    minVotes: document.querySelector("#min-votes").value,
    maxRuntime: document.querySelector("#max-runtime").value,
    effect: document.querySelector('input[name="effect"]:checked').value,
    timeBudget: document.querySelector('input[name="time-budget"]:checked').value,
    detour: document.querySelector('input[name="detour"]:checked').value,
    sort: document.querySelector("#sort").value,
    hideSeen: document.querySelector("#hide-seen").checked,
    genres: [...document.querySelectorAll("#genres input:checked")].map((input) => Number(input.value)),
    lenses: [...document.querySelectorAll("#lenses input:checked")].map((input) => input.value),
    seen: preferences.seen
  };
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
  const timeLabels = { short: "90 minutes maximum", standard: "2 heures maximum", ample: "3 heures maximum" };
  const detourLabels = {
    faithful: "rester près de la demande",
    sidestep: "introduire un pas de côté",
    adventurous: "chercher franchement l’inattendu"
  };
  const hasFreeText = Boolean(document.querySelector("#wish").value.trim());
  understandingNode.innerHTML = `
    <strong>Ce que le Scout utilisera réellement</strong>
    <p>${escapeHtml(effectLabels[effect])} · ${escapeHtml(timeLabels[timeBudget])} · ${escapeHtml(detourLabels[detour])}.</p>
    ${hasFreeText ? "<p>La précision libre sera testée contre le vocabulaire annoncé, sans prétendre à une compréhension générale.</p>" : ""}`;
}

function markSeen(id, button, card) {
  preferences.seen = [...new Set([...preferences.seen, id])];
  savePreferences();
  button.textContent = "Déjà vu ✓";
  button.disabled = true;
  if (document.querySelector("#hide-seen").checked) {
    card.classList.add("dismissed");
    setTimeout(() => card.remove(), 280);
  }
}

function renderMovies(data) {
  statusNode.hidden = true;
  resultsSection.setAttribute("aria-busy", "false");
  resultHead.hidden = false;
  appliedNode.replaceChildren(...data.applied.map((label) => {
    const chip = document.createElement("span");
    chip.textContent = label;
    return chip;
  }));
  moviesNode.replaceChildren();

  interpretationNode.replaceChildren();
  const messages = [data.interpretationNotice, ...(data.warnings || [])].filter(Boolean);
  interpretationNode.hidden = messages.length === 0;
  for (const message of messages) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    interpretationNode.append(paragraph);
  }

  if (!data.movies.length) {
    setMessage("Aucun film vérifié avec ces critères. Essayez une période plus large ou une note plus basse.");
    return;
  }

  for (const [index, movie] of data.movies.entries()) {
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
        <p class="movie-meta">${year} <span>•</span> ${movie.rating.toFixed(1)}/10 <span>•</span> ${runtime} <span>•</span> VO ${language}</p>
        <h3>${escapeHtml(movie.title)}</h3>
        ${movie.originalTitle !== movie.title ? `<p class="original-title">${escapeHtml(movie.originalTitle)}</p>` : ""}
        ${reasons}
        <p class="overview">${escapeHtml(movie.overview || "Aucun synopsis français disponible.")}</p>
        <div class="card-actions">
          <a href="${offerUrl}" target="_blank" rel="noreferrer">Voir où regarder ↗</a>
          <button type="button">Déjà vu</button>
        </div>
      </div>`;
    card.querySelector("button").addEventListener("click", (event) => markSeen(movie.id, event.currentTarget, card));
    moviesNode.append(card);
  }
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

  const controller = new AbortController();
  activeRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 30_000);
  setLoading();
  setSearchBusy(true);
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-tmdb-token": token } : {})
      },
      body: JSON.stringify({ wish: document.querySelector("#wish").value, filters: currentFilters() }),
      signal: controller.signal
    });
    const data = await response.json();
    if (requestId !== requestSequence) return;
    if (!response.ok) throw new Error(data.message || "La recherche a échoué.");
    renderDiagnostics({ lastSuccessfulSearchAt: new Date().toISOString() });
    renderMovies(data);
  } catch (error) {
    if (requestId !== requestSequence) return;
    setMessage(error.name === "AbortError" ? "La recherche a dépassé 30 secondes. Réessayez." : error.message, "error");
  } finally {
    clearTimeout(timeout);
    if (requestId === requestSequence) {
      activeRequest = null;
      setSearchBusy(false);
    }
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
  updateMemoryCount();
  updateUnderstanding();
}

form.addEventListener("submit", search);
form.addEventListener("change", updateUnderstanding);
saveSourcesButton.addEventListener("click", saveSources);
clearSourcesButton.addEventListener("click", clearSources);
runDiagnosticButton.addEventListener("click", runDiagnostic);
document.querySelector("#wish").addEventListener("input", updateUnderstanding);
document.querySelector("#surprise").addEventListener("click", () => {
  document.querySelector("#wish").value = "Surprends-moi avec un film bien noté de moins de 2h10";
  document.querySelector("#sort").value = "surprise";
  document.querySelector('input[name="effect"][value="open"]').checked = true;
  document.querySelector('input[name="detour"][value="adventurous"]').checked = true;
  updateUnderstanding();
  search();
});
document.querySelector("#oblique").addEventListener("click", () => {
  document.querySelector('input[name="detour"][value="adventurous"]').checked = true;
  for (const input of document.querySelectorAll("#lenses input")) input.checked = false;
  updateUnderstanding();
  search();
});
document.querySelector("#forget").addEventListener("click", () => {
  requestSequence += 1;
  activeRequest?.abort();
  activeRequest = null;
  setSearchBusy(false);
  preferences = { seen: [] };
  sessionStorage.removeItem(tokenKey);
  tokenInput.value = "";
  savePreferences();
  setMessage("Les films vus et le jeton de cet onglet ont été effacés.");
});

init().catch(() => setMessage("Impossible de joindre le serveur local.", "error"));
