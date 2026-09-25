import { ANGLES, normalizeCollection, filmAngles, recompose, replaceProgrammeSlot, eligible, validBudget, relatedMovies, receptionContrast, doubleFeature, chooseTogether, itinerary, profileHypotheses, safeLink } from "./discovery.mjs";

export function installStudio(app) {
  const $ = (id) => document.getElementById(id);
  const esc = app.escapeHtml;
  const panel = document.querySelector(".search-panel");
  const form = $("search-form");
  let pool = [], locked = new Set(), excluded = new Set(), total = 0, epoch = 0, drawerEpoch = 0, effectiveFilters = {};
  let undo = null, draft = null, overrides = {}, activeCollection = "", activeAngle = "", contrastOnly = false;
  let profileEnabled = false, currentMovie = null, libraryQuery = "", libraryList = "";
  const pending = new Set(), collectionProgress = new Map();
  const storage = () => {
    const prefs = app.getPreferences();
    prefs.collections ||= []; prefs.profile ||= { preferredGenres: [], excludedGenres: [] };
    prefs.history ||= []; prefs.lists ||= {}; prefs.rejections ||= [];
    return prefs;
  };
  function node(tag, attributes = {}, content = "") {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    el.textContent = content;
    return el;
  }
  function button(label, action, parent, className = "secondary-button") {
    const b = node("button", { type: "button", class: className }, label);
    b.addEventListener("click", action); parent.append(b); return b;
  }
  function section(id, html, parent) { const el = node("div", { id, class: "studio-section" }); el.innerHTML = html; parent.append(el); return el; }
  function notify(message) { $("studio-notice").textContent = message; }
  async function api(path, body) {
    const controller = new AbortController(), stamp = epoch;
    pending.add(controller);
    const timeout = setTimeout(() => controller.abort(), path === "/api/enrich" ? 45_000 : 35_000);
    try {
    const response = await fetch(path, { method: "POST", headers: app.headers(), body: JSON.stringify(body), signal: controller.signal });
    const data = await response.json();
    if (stamp !== epoch) throw new DOMException("Requête périmée", "AbortError");
    if (!response.ok) throw new Error(data.message || "Requête indisponible.");
    return data;
    } finally { clearTimeout(timeout); pending.delete(controller); }
  }
  async function busy(button, task) {
    const stamp = epoch;
    button.disabled = true;
    try { return await task(); } catch (error) { if (stamp === epoch) notify(["TimeoutError", "AbortError"].includes(error.name) ? "Délai dépassé. Vous pouvez réessayer ; les films restent accessibles." : error.message); }
    finally { button.disabled = false; }
  }
  function allMovies() { return [...new Map([...app.getCatalogue(), ...storage().shortlist, ...pool].map((m) => [m.id, m])).values()]; }
  function workshopMovies() { return allMovies().filter((m) => eligible(m) && Number.isFinite(m.runtime) && m.runtime > 0 && !excluded.has(m.id)); }
  function merge(movies) {
    const invalid = movies.filter((m) => !m.verified || m.availability?.available === false).map((m) => m.id);
    const removed = app.getProgramme().filter((m) => invalid.includes(m.id));
    for (const id of invalid) locked.delete(id);
    const known = new Map(pool.map((m) => [m.id, m]));
    for (const m of movies) known.set(m.id, { ...known.get(m.id), ...m });
    pool = [...known.values()]; app.updateMovies(movies); updateWorkshopState();
    if (removed.length) {
      notify(`${removed.length} film(s) retiré(s) du programme : disponibilité MUBI non confirmée. Renouvelez les propositions pour les remplacer.`);
      $("interpretation").textContent = "Disponibilité réactualisée : les films non confirmés ont été retirés du programme.";
    }
  }

  const home = section("home-actions", "", document.querySelector(".hero"));
  button("Parcourir le catalogue", (e) => busy(e.currentTarget, () => app.browse()), home);
  button("Ma bibliothèque", () => { $("result-views").hidden = false; $("result-head").hidden = false; $("status").hidden = true; app.setResultView("shortlist"); $("shortlist-section").scrollIntoView({ behavior: "smooth" }); }, home, "ghost-button");
  button("Atelier de découverte ↓", () => { $("discovery-workshop").open = true; $("discovery-workshop").scrollIntoView({ behavior: "smooth" }); }, home, "ghost-button");
  const notice = node("p", { id: "studio-notice", role: "status", class: "studio-notice" });
  panel.before(notice);
  const summary = section("composer-summary", "", panel);
  summary.hidden = true;
  button("Modifier la soirée", () => { form.hidden = false; summary.hidden = true; $("active-criteria").hidden = false; }, summary);
  const submitRow = document.querySelector(".submit-row");
  document.querySelector(".evening-composer").after(submitRow);
  const chips = section("active-criteria", "", panel);
  const presetUndo = button("Annuler le dernier préréglage", () => {
    if (!undo) return;
    overrides = undo.overrides; app.restoreForm(undo.form); undo = null; presetUndo.hidden = true;
    refreshChips(); notify("Préréglage annulé. Relancez la composition pour actualiser les résultats.");
  }, panel, "text-button");
  presetUndo.hidden = true;

  const advanced = form.querySelector("details");
  section("rating-filters", '<div class="studio-columns"><label>Note TMDB minimale<input id="min-rating" type="number" min="0" max="10" step="0.1" value="6.8"></label><label>Votes TMDB minimum<input id="min-votes" type="number" min="0" max="1000000" value="40"></label><label>Durée exacte maximale (min)<input id="exact-runtime" type="number" min="40" max="600" value="120"></label></div><p class="field-hint">Années, durée, genres et seuils sont des contraintes. Ambiance, détour et angles sont des préférences, sans garantie de ressenti.</p>', advanced);
  for (const id of ["min-rating", "min-votes", "exact-runtime"]) $(id).addEventListener("change", () => {
    overrides = { ...overrides, minRating: Number($("min-rating").value), minVotes: Number($("min-votes").value), maxRuntime: Number($("exact-runtime").value) };
    refreshChips();
  });
  const assist = section("language-assistant", '<div class="studio-actions"><button id="parse-wish" type="button" class="text-button">Décoder en critères</button><button id="llm-wish" type="button" class="text-button">Interpréter avec le modèle local</button></div><p id="language-status" class="field-hint"></p><div id="language-draft" class="chips"></div><button id="apply-language" type="button" class="secondary-button" hidden>Appliquer ces critères</button>', form);
  document.querySelector(".wish-help").after(assist);
  $("wish").addEventListener("input", () => {
    draft = null; $("language-draft").replaceChildren(); $("apply-language").hidden = true;
    $("language-status").textContent = "Décodez la précision pour vérifier les critères compris avant de les appliquer.";
  });
  async function interpret(llm) {
    const wish = $("wish").value.trim();
    if (!wish) { notify("Écrivez d’abord une précision."); return; }
    const data = await api(llm ? "/api/language" : "/api/interpret", llm ? { text: wish, filters: app.getFilters() } : { wish, filters: app.getFilters() });
    draft = { ...data.filters };
    if (!llm && data.textQualitative?.length) draft.effect = { tense: "captivate", contemplative: "contemplate", light: "comfort", dark: "shake", poetic: "wonder", spectacle: "wonder" }[data.textQualitative[0].id] || draft.effect;
    $("language-status").textContent = llm ? data.notice : `${data.notice || "Vocabulaire assisté."} ${data.unrecognized?.length ? `Non interprété : ${data.unrecognized.join(" · ")}` : "Relisez les critères ; aucune compréhension générale du texte."}`;
    $("language-draft").replaceChildren();
    const baseline = { minRating: 6.8, maxRuntime: { short: 90, standard: 120, ample: 180, unlimited: 600 }[app.getFilters().timeBudget], ...app.getFilters() };
    for (const key of ["minYear", "maxYear", "maxRuntime", "minRating", "genres", "effect"]) {
      if (String(draft[key]) === String(baseline[key])) continue;
      button(`${{ minYear: "Depuis", maxYear: "Jusqu’à", maxRuntime: "Durée max", minRating: "Note min", genres: "Genres TMDB", effect: "Effet" }[key]} : ${draft[key]} ×`, (e) => { draft[key] = app.getFilters()[key]; e.currentTarget.remove(); }, $("language-draft"), "chip-button");
    }
    $("apply-language").hidden = false;
  }
  $("parse-wish").addEventListener("click", (e) => busy(e.currentTarget, () => interpret(false)));
  $("llm-wish").addEventListener("click", (e) => busy(e.currentTarget, () => interpret(true)));
  $("apply-language").addEventListener("click", () => { if (draft) applyFilters(draft); $("wish").value = ""; $("apply-language").hidden = true; notify("Critères appliqués. Vous pouvez les retirer ci-dessous avant de composer."); });
  function applyFilters(filters) {
    overrides = { minRating: filters.minRating, minVotes: filters.minVotes, maxRuntime: filters.maxRuntime };
    app.restoreForm({ ...app.getForm(), ...filters, wish: "" });
    $("min-rating").value = filters.minRating ?? 6.8; $("min-votes").value = filters.minVotes ?? 40; $("exact-runtime").value = filters.maxRuntime ?? 120;
    refreshChips();
  }
  function refreshChips() {
    chips.replaceChildren(node("strong", {}, "Critères de la prochaine recherche"));
    const f = app.getFilters();
    const add = (label, change) => button(`${label} ×`, () => { change(); refreshChips(); notify("Critère retiré. Les résultats affichés restent ceux de la dernière recherche jusqu’à la prochaine composition."); }, chips, "chip-button");
    add(`${f.minYear}–${f.maxYear}`, () => { $("min-year").value = 1874; $("max-year").value = new Date().getFullYear(); });
    add(`≤ ${f.maxRuntime || ({ short: 90, standard: 120, ample: 180, unlimited: 600 }[f.timeBudget])} min`, () => { overrides.maxRuntime = 600; $("exact-runtime").value = 600; document.querySelector('input[name="time-budget"][value="unlimited"]').checked = true; });
    add(`Note ≥ ${f.minRating ?? 6.8}`, () => { overrides.minRating = 0; $("min-rating").value = 0; });
    add(`Votes ≥ ${f.minVotes ?? 40}`, () => { overrides.minVotes = 0; $("min-votes").value = 0; });
    for (const input of document.querySelectorAll("#genres input:checked, #lenses input:checked")) add((input.closest("label").querySelector("strong") || input.closest("label").querySelector("span"))?.textContent || input.value, () => { input.checked = false; input.dispatchEvent(new Event("change", { bubbles: true })); });
    if (f.effect !== "open") add({ captivate: "Tension / suspense", contemplate: "Contemplatif", comfort: "Réconfortant", shake: "Sombre / intense", wonder: "Poétique / visuel" }[f.effect] || "Ambiance", () => { document.querySelector('input[name="effect"][value="open"]').checked = true; });
  }

  const controls = section("programme-tools", '<span id="pool-progress"></span><button id="replace-programme" class="secondary-button" type="button">Renouveler les films non verrouillés</button><button id="relax-search" class="text-button" type="button">Voir des élargissements chiffrés</button><div id="relaxations" class="studio-actions"></div>', $("results-section"));
  $("movies").before(controls); controls.hidden = true;
  $("replace-programme").addEventListener("click", () => replace());
  button("Réintégrer les films écartés ce soir", () => { excluded.clear(); app.renderCatalogue(); notify("Exclusions de session levées. Vous pouvez recomposer."); }, controls, "text-button");
  function replace(id) {
    if (controls.hidden) return;
    const current = app.getProgramme();
    const options = { filters: { ...effectiveFilters, seen: storage().seen }, locked: [...locked], excluded: [...excluded], previous: current.map((m) => m.id), detour: effectiveFilters.detour, profile: profileEnabled ? storage().profile : {} };
    const next = id ? replaceProgrammeSlot(pool, current, id, options) : recompose(pool, options);
    epoch++;
    app.setProgramme(next);
    notify(next.map((m) => m.id).join() === current.map((m) => m.id).join() ? "Aucune autre proposition admissible dans la réserve vérifiée. Élargissez la recherche ou ouvrez d’autres fiches." : "Programme recomposé dans la réserve vérifiée ; les contraintes sont conservées.");
    enrich(next.map((m) => m.id), epoch);
  }
  $("relax-search").addEventListener("click", (e) => busy(e.currentTarget, async () => {
    const stamp = epoch;
    const data = await api("/api/relaxations", app.getRequest() || { filters: app.getFilters() });
    if (stamp !== epoch) return;
    $("relaxations").replaceChildren(node("p", {}, "Totaux TMDB avant vérification détaillée et exclusion des films vus. Durée inchangée."));
    for (const alternative of data.alternatives) button(`${alternative.label} — ${alternative.total} titres`, () => { applyFilters(alternative.filters); app.search(); }, $("relaxations"));
    if (!data.alternatives.length) $("relaxations").append(node("p", {}, "Aucun élargissement disponible ou source momentanément inaccessible."));
  }));
  async function enrich(ids, stamp) {
    if (!ids.length) return;
    try {
      const data = await api("/api/enrich", { ids: ids.slice(0, 4) });
      if (stamp !== epoch) return;
      merge(data.movies);
      const info = Object.entries(data.coverage).map(([name, c]) => `${name} : ${c.matched}/${c.queried}${c.failed ? ` (${c.failed} échec)` : ""}`).join(" · ");
      $("source-progress").textContent = info || "Aucune source critique connectée.";
      $("source-details").textContent = Object.entries(data.coverage).flatMap(([name, c]) => (c.errors || []).map((error) => `${name} : ${error.message}`)).join(" · ") || "Les absences de correspondance ne sont pas des critiques négatives.";
      if (currentMovie && data.movies.some((m) => m.id === currentMovie.id)) { currentMovie = { ...currentMovie, ...data.movies.find((m) => m.id === currentMovie.id) }; renderDrawer(currentMovie); }
    } catch (error) { if (stamp === epoch) $("source-progress").textContent = "Critiques indisponibles pour le moment ; les films restent accessibles."; }
  }
  const quality = node("details", { id: "compact-diagnostics" });
  quality.innerHTML = '<summary>Sources et contrôle de la sélection <span id="source-progress"></span></summary><p id="source-details"></p>';
  $("interpretation").before(quality); quality.append($("interpretation"));
  quality.hidden = true;

  // Accessible modal drawer: native focus trap, Escape, focus restoration and no grid navigation.
  const drawer = node("dialog", { id: "movie-drawer", "aria-labelledby": "drawer-title" });
  drawer.innerHTML = '<button id="close-drawer" type="button" class="secondary-button">Fermer la fiche</button><div id="drawer-body"></div>';
  document.body.append(drawer);
  $("close-drawer").addEventListener("click", () => drawer.close());
  drawer.addEventListener("close", () => { drawerEpoch++; currentMovie = null; });
  async function openMovie(movie) {
    currentMovie = movie;
    const stamp = ++drawerEpoch;
    renderDrawer(movie); if (!drawer.open) drawer.showModal();
    try {
      const data = await api("/api/movie", { id: movie.id });
      if (stamp !== drawerEpoch) return;
      currentMovie = { ...movie, ...data.movie }; merge([currentMovie]); renderDrawer(currentMovie);
    } catch (error) { if (stamp === drawerEpoch) $("drawer-body").append(node("p", {}, "Détails indisponibles. La disponibilité de cette fiche n’a pas pu être actualisée.")); }
  }
  function renderDrawer(movie) {
    const root = $("drawer-body");
    const date = movie.checkedAt ? new Date(movie.checkedAt).toLocaleString("fr-FR") : "non vérifiée";
    const angles = filmAngles(movie, storage().collections);
    root.innerHTML = `<h2 id="drawer-title">${esc(movie.title)}</h2><p>${esc(movie.director || "Cinéaste inconnu")} · ${esc(movie.releaseDate?.slice(0, 4) || "Année inconnue")} · ${movie.runtime || "?"} min</p><p>${esc(movie.overview || "Synopsis non renseigné.")}</p><h3>Disponibilité</h3><p>${movie.verified ? "Offre avec abonnement MUBI France signalée par TMDB / JustWatch" : "Offre MUBI France non confirmée"} · relevé ${esc(date)}. À confirmer sur le service avant lecture.</p><p>Langue originale : ${esc(movie.originalLanguage || "inconnue")}. Langues audio et sous-titres disponibles : inconnus.</p><h3>Distribution</h3><p>${esc((movie.cast || []).map((c) => `${c.name} (${c.character})`).join(" · ") || "Non renseignée")}</p><h3>Réception, sans note globale</h3><p>TMDB : ${Number(movie.rating || 0).toFixed(1)}/10 · ${Number(movie.votes || 0)} votes. Moyenne des utilisateurs, pas une note de presse.</p>${app.renderPerspectives(movie.perspectives || [])}<p>${esc(receptionContrast(movie).explanation)}</p><p class="field-hint">IMDb : moyenne du public ; Metacritic : agrégation de presse ; Rotten Tomatoes : proportion d’avis positifs. Ces échelles ne s’additionnent pas. Les notes via OMDb peuvent être décalées.</p><h3>Angles documentés</h3>${angles.length ? angles.map((a) => `<p><strong>${esc(a.label)}</strong> · ${esc(a.kind)}<br>${esc(a.evidence)} <a href="${esc(safeLink(a.source))}" target="_blank" rel="noreferrer">Source ↗</a></p>`).join("") : "<p>Aucune annotation étayée sur nos cinq angles. Inconnu ne signifie pas absent.</p>"}<div id="drawer-actions" class="studio-actions"></div><h3>À partir de ce film</h3><label>Rapprocher sur <select id="related-aspect"><option value="director">le cinéaste</option><option value="theme">les mots-clés communs</option><option value="form">la forme documentée</option><option value="era">l’époque (± 5 ans)</option><option value="reception">la réception contrastée</option></select></label><button id="related-run" type="button" class="secondary-button">Explorer ce lien</button><div id="related-results"></div><h3>Mon retour explicite</h3><div id="taste-actions" class="studio-actions"></div><label>Liste <select id="movie-list"><option value="">À garder</option><option>Ce soir</option><option>À deux</option><option>Quand j’ai le temps</option></select></label><button id="assign-list" class="text-button" type="button">Garder dans cette liste</button><h3>Pas ce soir</h3><label>Motif facultatif<select id="reject-reason"><option value="">Sans motif</option><option value="long">Trop long</option><option value="dark">Trop sombre</option><option value="documentary">Pas de documentaire</option><option value="candidate">Déjà envisagé</option></select></label><button id="reject-movie" class="text-button" type="button">Écarter pour cette session</button>`;
    button("Charger / réessayer les critiques", (e) => busy(e.currentTarget, () => enrich([movie.id], epoch)), $("drawer-actions"));
    const link = node("a", { href: `https://www.themoviedb.org/movie/${movie.id}/watch?locale=FR`, target: "_blank", rel: "noreferrer" }, "Vérifier où regarder ↗"); $("drawer-actions").append(link);
    $("related-run").addEventListener("click", () => renderMini($("related-results"), relatedMovies(movie, allMovies(), $("related-aspect").value, storage().collections), "Aucun lien documenté dans les films chargés. Ouvrez d’autres fiches pour enrichir cette exploration."));
    for (const [label, liked] of [["J’ai aimé", true], ["Je n’ai pas aimé", false]]) button(label, () => {
      const p = storage(); p.history = [...p.history.filter((m) => m.id !== movie.id), { id: movie.id, title: movie.title, genreIds: movie.genreIds || [], liked, at: new Date().toISOString() }];
      app.save(); notify("Avis explicite enregistré. Il ne modifie pas vos préférences sans validation."); renderProfile();
    }, $("taste-actions"));
    $("movie-list").value = storage().lists[movie.id] || "";
    $("assign-list").addEventListener("click", () => { const p = storage(); p.lists[movie.id] = $("movie-list").value; if (!p.shortlist.some((m) => m.id === movie.id)) app.toggleShortlist(movie); app.save(); app.renderShortlist(); notify("Film gardé dans votre bibliothèque."); });
    $("reject-movie").addEventListener("click", () => {
      excluded.add(movie.id); storage().rejections.push({ id: movie.id, reason: $("reject-reason").value, at: new Date().toISOString(), scope: "session" });
      app.save(); drawer.close(); replace(movie.id); app.renderCatalogue();
      notify("Film écarté de cette session. Le motif est mémorisé, mais ne devient pas automatiquement une préférence durable.");
    });
  }
  function renderMini(root, movies, empty = "Aucun résultat admissible dans les films chargés.") {
    root.replaceChildren();
    if (!movies.length) { root.append(node("p", {}, empty)); return; }
    let shown = 0;
    function appendBatch() {
    root.querySelector(".mini-more")?.remove();
    for (const m of movies.slice(shown, shown + 48)) {
      const item = node("article", { class: "mini-film" });
      button(`${m.title} · ${m.runtime || "?"} min`, () => openMovie(m), item, "ghost-button");
      item.append(node("p", {}, m.compromise || (m.relationship || []).join(" · "))); root.append(item);
    }
    shown += 48;
    if (shown < movies.length) button(`Afficher la suite (${movies.length - shown} films)`, appendBatch, root, "secondary-button mini-more");
    }
    appendBatch();
  }

  const library = section("library-tools", '<label>Chercher dans ma bibliothèque<input id="library-query" type="search"></label><label>Liste<select id="library-list"><option value="">Toutes les listes</option><option>Ce soir</option><option>À deux</option><option>Quand j’ai le temps</option></select></label>', $("shortlist-section"));
  $("shortlist-grid").before(library);
  $("library-query").addEventListener("input", () => { libraryQuery = $("library-query").value.toLowerCase(); app.renderShortlist(); });
  $("library-list").addEventListener("change", () => { libraryList = $("library-list").value; app.renderShortlist(); });
  document.querySelector(".shortlist-heading p:last-child").textContent = "Sans limite de nombre imposée ; stockage dans ce navigateur. Exportez régulièrement vos choix. Jusqu’à quatre films comparables côte à côte.";

  const catalogueTools = section("catalogue-extra", '<label>Angle documenté<select id="angle-filter"><option value="">Tous, y compris inconnus</option></select></label><label>Collection<select id="collection-filter"><option value="">Toutes</option></select></label><label><input id="contrast-filter" type="checkbox"> Réceptions contrastées documentées</label><p id="catalogue-coverage" class="field-hint"></p>', $("catalogue-section"));
  $("catalogue-grid").before(catalogueTools);
  for (const a of ANGLES) $("angle-filter").append(new Option(a.label, a.id));
  $("angle-filter").addEventListener("change", () => { activeAngle = $("angle-filter").value; app.renderCatalogue(); });
  $("collection-filter").addEventListener("change", () => { activeCollection = $("collection-filter").value; app.renderCatalogue(); });
  $("contrast-filter").addEventListener("change", () => { contrastOnly = $("contrast-filter").checked; app.renderCatalogue(); });
  const more = button("Afficher davantage", (e) => busy(e.currentTarget, () => app.more()), document.querySelector(".catalogue-footer-actions"));
  $("catalogue-more").classList.add("replaced-control"); $("catalogue-fetch-more").classList.add("replaced-control");

  const workshop = node("details", { id: "discovery-workshop", class: "workshop" });
  workshop.innerHTML = '<summary>Atelier — collections, goûts, choix à deux et programmes</summary><p>Ces outils utilisent les films chargés et les fiches vérifiées. Aucun compte supplémentaire ni apprentissage caché.</p><div id="workshop-content"></div>';
  document.querySelector("main").append(workshop);
  section("collections-tool", '<h3>Collections et annotations</h3><p>Import JSON avec identifiants TMDB, ordre, notes et sources. Les liens sont des références : le site ne les aspire pas. Une collection importée ne prouve pas la disponibilité MUBI.</p><input id="collection-file" type="file" accept="application/json"><button id="collection-example" type="button" class="text-button">Télécharger le modèle</button><button id="collection-seed" type="button" class="text-button">Ajouter le petit parcours éditorial fourni</button><div id="collection-list"></div>', $("workshop-content"));
  $("collection-example").addEventListener("click", () => download("collection-modele.json", { name: "Ma rétrospective", source: "https://www.themoviedb.org/movie/242582", films: [{ id: 242582, title: "Night Call", order: 1, angles: ["city"], note: "Votre lecture éditoriale à justifier par la source.", source: "https://www.themoviedb.org/movie/242582" }] }));
  $("collection-file").addEventListener("change", async () => {
    const stamp = epoch;
    try {
      const file = $("collection-file").files[0]; if (!file) return;
      if (file.size > 2_000_000) throw new Error("Collection limitée à 2 Mo.");
      const collection = normalizeCollection(JSON.parse(await file.text()));
      if (stamp !== epoch) return;
      storage().collections.push(collection); app.save(); refreshCollections(); notify("Collection importée. Vérifiez ses films pour constituer un parcours MUBI.");
    } catch (error) { notify(error.message); } finally { $("collection-file").value = ""; }
  });
  $("collection-seed").addEventListener("click", (e) => busy(e.currentTarget, async () => {
    const stamp = epoch;
    const collection = await fetch("./editorial.json").then((r) => r.json());
    if (stamp !== epoch) return;
    if (!storage().collections.some((c) => c.name === collection.name)) storage().collections.push(normalizeCollection(collection));
    app.save(); refreshCollections(); notify("Parcours éditorial ajouté. Sa disponibilité doit être vérifiée, film par film.");
  }));
  function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const link = node("a", { href: url, download: name }); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function refreshCollections() {
    $("collection-filter").replaceChildren(new Option("Toutes", ""));
    $("itinerary-collection").replaceChildren();
    $("collection-list").replaceChildren();
    storage().collections.forEach((collection, index) => {
      $("collection-filter").append(new Option(collection.name, String(index)));
      $("itinerary-collection").append(new Option(collection.name, String(index)));
      const row = node("div", { class: "studio-actions" }); row.append(node("span", {}, `${collection.name} · ${collection.films.length} films`));
      const checked = collectionProgress.get(collection) || new Set(); collectionProgress.set(collection, checked);
      const remaining = collection.films.filter((f) => !checked.has(f.id));
      button(remaining.length ? `Vérifier ${Math.min(20, remaining.length)} films (${checked.size}/${collection.films.length} consultés)` : "Revérifier les fiches", (e) => busy(e.currentTarget, async () => {
        const stamp = epoch;
        if (!remaining.length) checked.clear();
        const batch = collection.films.filter((f) => !checked.has(f.id)).slice(0, 20);
        let count = 0;
        for (const f of batch) {
          if (stamp !== epoch || !storage().collections.includes(collection)) return;
          try { const { movie } = await api("/api/movie", { id: f.id }); merge([movie]); checked.add(f.id); count++; } catch { /* Failed films remain retryable. */ }
        }
        if (stamp !== epoch || !storage().collections.includes(collection)) return;
        notify(`${count}/${batch.length} fiches consultées dans ce lot ; ${checked.size}/${collection.films.length} au total. Seules les offres MUBI confirmées sont admissibles.`);
        refreshCollections();
        renderMini($("workshop-results"), collection.films.map((f) => allMovies().find((m) => m.id === f.id) || { ...f, title: f.title || `TMDB ${f.id}` }));
      }), row, "text-button");
      button("Retirer la collection", () => { if (!confirm("Retirer cette collection locale ?")) return; storage().collections.splice(index, 1); app.save(); activeCollection = ""; refreshCollections(); app.renderCatalogue(); }, row, "text-button");
      $("collection-list").append(row);
    });
    updateWorkshopState();
  }
  section("profile-tool", '<h3>Mes goûts explicites</h3><label><input id="use-profile" type="checkbox"> Utiliser mon profil pour recomposer le programme</label><label>Genres à privilégier<select id="profile-like" multiple size="4"></select></label><label>Genres à exclure<select id="profile-veto" multiple size="4"></select></label><button id="save-profile" type="button" class="secondary-button">Enregistrer ce profil</button><button id="reset-profile" type="button" class="text-button">Réinitialiser le profil</button><div id="profile-hypotheses"></div><div id="profile-history"></div>', $("workshop-content"));
  $("use-profile").addEventListener("change", () => { profileEnabled = $("use-profile").checked; notify("Profil " + (profileEnabled ? "actif pour la prochaine recomposition." : "désactivé.")); });
  const selected = (id) => [...$(id).querySelectorAll("input:checked")].map((o) => Number(o.value));
  $("save-profile").addEventListener("click", () => { storage().profile = { preferredGenres: selected("profile-like"), excludedGenres: selected("profile-veto") }; app.save(); notify("Profil explicite enregistré. Activez-le pour l’utiliser."); });
  $("reset-profile").addEventListener("click", () => { storage().profile = { preferredGenres: [], excludedGenres: [] }; app.save(); renderProfile(); notify("Préférences de genres réinitialisées ; les avis restent conservés."); });
  function renderProfile() {
    for (const [id, values] of [["profile-like", storage().profile.preferredGenres], ["profile-veto", storage().profile.excludedGenres]]) for (const o of $(id).querySelectorAll("input")) o.checked = (values || []).includes(Number(o.value));
    $("profile-hypotheses").replaceChildren();
    for (const h of profileHypotheses(storage().history)) button(`Genre ${h.id} : ${h.label}`, () => { storage().profile.preferredGenres = [...new Set([...storage().profile.preferredGenres, h.id])]; app.save(); renderProfile(); }, $("profile-hypotheses"), "text-button");
    $("profile-history").replaceChildren(node("p", {}, `${storage().history.length} avis explicites. Les clics et les films simplement gardés ne valent pas appréciation.`));
    for (const h of storage().history.slice(-20)) button(`${h.title} — ${h.liked ? "aimé" : "pas aimé"} · oublier`, () => { storage().history = storage().history.filter((m) => m.id !== h.id); app.save(); renderProfile(); }, $("profile-history"), "text-button");
  }
  section("together-tool", '<h3>Choisir à deux, sans compte</h3><div class="studio-columns"><label>A souhaite<select id="a-likes" multiple size="4"></select></label><label>A exclut<select id="a-veto" multiple size="4"></select></label><label>B souhaite<select id="b-likes" multiple size="4"></select></label><label>B exclut<select id="b-veto" multiple size="4"></select></label></div><label>Durée maximale<input id="together-budget" type="number" min="40" max="600" value="120"></label><button id="choose-together" class="secondary-button" type="button">Trouver un accord</button>', $("workshop-content"));
  $("choose-together").addEventListener("click", () => {
    const value = Number($("together-budget").value);
    const budget = validBudget(value) ? value : null;
    renderMini($("workshop-results"), budget ? chooseTogether(workshopMovies(), { preferredGenres: selected("a-likes"), excludedGenres: selected("a-veto") }, { preferredGenres: selected("b-likes"), excludedGenres: selected("b-veto") }, budget) : [], budget ? "Aucun accord dans la réserve vérifiée. Aucun veto n’a été assoupli." : "Saisissez une durée entre 40 et 600 minutes.");
  });
  section("programme-builder", '<h3>Double séance</h3><label>Budget total, entracte de 10 min inclus<input id="double-budget" type="number" min="90" max="900" value="240"></label><label>Lien<select id="double-mode"><option value="contrast">Contraste</option><option value="echo">Écho documenté</option></select></label><button id="build-double" type="button" class="secondary-button">Composer deux films</button><h3>Parcours de trois films</h3><label>Collection ordonnée<select id="itinerary-collection"></select></label><button id="build-itinerary" type="button" class="secondary-button">Construire le parcours</button><p>Ordre éditorial importé, pas une progression d’accessibilité inventée. Vérifiez d’abord les fiches de la collection.</p>', $("workshop-content"));
  const workshopResults = section("workshop-results", "", $("workshop-content"));
  const workshopNav = node("nav", { class: "workshop-nav", "aria-label": "Outils de découverte" });
  const workshopHint = node("p", { id: "workshop-hint", role: "status" });
  $("workshop-content").before(workshopNav, workshopHint);
  const workshopPanels = [["programme-builder", "Une séance"], ["together-tool", "À deux"], ["profile-tool", "Mes goûts"], ["collections-tool", "Collections"]];
  let currentPanel = "programme-builder";
  function choosePanel(id) {
    currentPanel = id;
    for (const [panelId] of workshopPanels) $(panelId).hidden = panelId !== id;
    for (const b of workshopNav.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.panel === id));
    $("workshop-results").replaceChildren(); updateWorkshopState();
  }
  for (const [id, title] of workshopPanels) {
    const b = button(title, () => choosePanel(id), workshopNav);
    b.dataset.panel = id; b.setAttribute("aria-controls", id);
  }
  function updateWorkshopState() {
    const verified = workshopMovies().length;
    $("choose-together").disabled = verified < 1;
    $("build-double").disabled = verified < 2;
    $("build-itinerary").disabled = !storage().collections.length;
    $("itinerary-collection").disabled = !storage().collections.length;
    $("workshop-hint").textContent = currentPanel === "profile-tool" ? "Choisissez vos genres par simple clic. Vos goûts ne sont utilisés que si vous activez le profil." : currentPanel === "collections-tool" ? "Ajoutez le parcours fourni ou importez votre collection." : !verified ? "Composez d’abord une sélection ou ouvrez des fiches : ces outils ont besoin de films vérifiés." : `${verified} films vérifiés disponibles pour cet atelier.${!storage().collections.length && currentPanel === "programme-builder" ? " Pour un parcours de trois films, ajoutez d’abord une collection." : ""}`;
  }
  choosePanel(currentPanel);
  $("build-double").addEventListener("click", () => {
    const value = Number($("double-budget").value);
    const budget = validBudget(value, 90, 900) ? value : null;
    const programme = budget ? doubleFeature(workshopMovies(), budget, $("double-mode").value) : null;
    renderMini(workshopResults, programme?.films || [], budget ? "Aucune paire documentée sous ce budget. Durées inconnues exclues." : "Saisissez un budget entre 90 et 900 minutes.");
    if (programme) workshopResults.prepend(node("p", {}, `${programme.total} min, entracte de 10 min inclus. ${programme.reason}`));
  });
  $("build-itinerary").addEventListener("click", () => {
    const collection = storage().collections[Number($("itinerary-collection").value)];
    if (!collection) { notify("Importez ou ajoutez d’abord une collection."); return; }
    const films = itinerary(allMovies(), collection); renderMini(workshopResults, films);
    workshopResults.prepend(node("p", {}, `${films.length}/3 étapes disponibles et vérifiées dans « ${collection.name} ». Les autres ne sont pas inventées.`));
  });

  return {
    restoreImportedForm() {
      const saved = storage().form || {};
      overrides = Object.fromEntries(["minRating", "minVotes", "maxRuntime"].filter((key) => Number.isFinite(saved[key])).map((key) => [key, saved[key]]));
      $("min-rating").value = overrides.minRating ?? 6.8; $("min-votes").value = overrides.minVotes ?? 40;
      $("exact-runtime").value = overrides.maxRuntime ?? ({ short: 90, standard: 120, ample: 180, unlimited: 600 }[saved.timeBudget] || 120);
      refreshChips();
    },
    reset() {
      epoch++; drawerEpoch++;
      for (const controller of pending) controller.abort();
      pending.clear(); collectionProgress.clear(); pool = []; locked.clear(); excluded.clear();
      total = 0; effectiveFilters = {}; undo = null; draft = null; overrides = {};
      activeCollection = ""; activeAngle = ""; contrastOnly = false; profileEnabled = false; currentMovie = null;
      libraryQuery = ""; libraryList = "";
      for (const id of ["library-query", "library-list", "angle-filter"]) $(id).value = "";
      $("contrast-filter").checked = false; $("use-profile").checked = false;
      for (const input of workshop.querySelectorAll('input[type="checkbox"]')) input.checked = false;
      drawer.close(); workshopResults.replaceChildren(); $("relaxations").replaceChildren();
      $("language-draft").replaceChildren(); $("apply-language").hidden = true;
      controls.hidden = true; quality.hidden = true; presetUndo.hidden = true; summary.hidden = true;
      form.reset(); $("max-year").value = new Date().getFullYear(); form.hidden = false; chips.hidden = false;
      refreshChips(); notify("");
    },
    clearLibraryFilters() { libraryQuery = ""; libraryList = ""; $("library-query").value = ""; $("library-list").value = ""; app.renderShortlist(); },
    filterOverrides: () => overrides,
    beforePreset() { undo = { form: app.getForm(), overrides: { ...overrides } }; presetUndo.hidden = false; notify("Le préréglage change l’ambiance, les années et les angles ; votre durée reste conservée. Annulation disponible."); },
    onFormChange(target) {
      const limit = { short: 90, standard: 120, ample: 180, unlimited: 600 }[document.querySelector('input[name="time-budget"]:checked').value];
      if (target?.name === "time-budget") $("exact-runtime").value = limit;
      overrides.maxRuntime = Math.min(Number($("exact-runtime").value) || limit, limit);
      refreshChips();
    },
    onReady(data) {
      $("llm-wish").disabled = !data.llmConfigured;
      if (!data.llmConfigured) $("language-status").textContent = "Modèle local non configuré. Le décodage assisté fonctionne sans modèle ni nouvelle clé.";
      for (const id of ["profile-like", "profile-veto", "a-likes", "a-veto", "b-likes", "b-veto"]) {
        const old = $(id), parent = old.parentElement;
        const field = node("fieldset", { id, class: "genre-pills" });
        field.append(node("legend", {}, parent.firstChild.textContent));
        for (const [value, label] of data.genres) {
          const option = node("label"); const input = node("input", { type: "checkbox", value });
          option.append(input, node("span", {}, label)); field.append(option);
        }
        parent.replaceWith(field);
      }
      const saved = storage().form || {};
      overrides = Object.fromEntries(["minRating", "minVotes", "maxRuntime"].filter((k) => Number.isFinite(saved[k])).map((k) => [k, saved[k]]));
      $("min-rating").value = overrides.minRating ?? 6.8; $("min-votes").value = overrides.minVotes ?? 40;
      $("exact-runtime").value = overrides.maxRuntime ?? ({ short: 90, standard: 120, ample: 180, unlimited: 600 }[saved.timeBudget] || 120);
      refreshCollections(); renderProfile(); refreshChips();
    },
    refreshPersonalData() { refreshCollections(); renderProfile(); app.renderShortlist(); app.renderCatalogue(); },
    onSearchStart() { epoch++; notify(""); },
    onResults(data) {
      epoch++; pool = data.pool || data.movies || []; locked = new Set(); total = data.totalResults || 0; effectiveFilters = data.filters || {};
      form.hidden = true; summary.hidden = false;
      summary.querySelector("p")?.remove(); summary.prepend(node("p", {}, "Votre sélection est prête. Les critères actifs figurent avec les résultats."));
      chips.hidden = true;
      controls.hidden = false; quality.hidden = false;
      $("pool-progress").textContent = `${pool.length} films dans la réserve vérifiée.`;
      $("source-progress").textContent = "Critiques en cours de chargement…";
      $("relaxations").replaceChildren(); app.renderCatalogue();
      updateWorkshopState();
      if (profileEnabled || excluded.size) replace(); else enrich(data.movies.map((m) => m.id), epoch);
    },
    decorateCard(card, movie, kind) {
      const actions = node("div", { class: "studio-card-actions" });
      button("Ouvrir la fiche", () => openMovie(movie), actions, "text-button");
      if (kind === "programme") {
        const lock = button(locked.has(movie.id) ? "Verrouillé ✓" : "Verrouiller", () => { locked.has(movie.id) ? locked.delete(movie.id) : locked.add(movie.id); lock.textContent = locked.has(movie.id) ? "Verrouillé ✓" : "Verrouiller"; lock.setAttribute("aria-pressed", String(locked.has(movie.id))); }, actions, "text-button");
        lock.setAttribute("aria-pressed", String(locked.has(movie.id)));
        button("Remplacer", () => { if (locked.has(movie.id)) { notify("Déverrouillez ce film pour le remplacer."); return; } replace(movie.id); }, actions, "text-button");
      }
      card.append(actions);
    },
    catalogueAccepts(movie) {
      if (excluded.has(movie.id)) return false;
      if (activeCollection !== "" && !storage().collections[Number(activeCollection)]?.films.some((f) => f.id === movie.id)) return false;
      if (activeAngle && !filmAngles(movie, storage().collections).some((a) => a.id === activeAngle)) return false;
      return !contrastOnly || receptionContrast(movie).contrasted;
    },
    setCatalogueTotal(value) { total = Number(value) || 0; },
    libraryAccepts: (movie) => (!libraryQuery || movie.title.toLowerCase().includes(libraryQuery)) && (!libraryList || storage().lists[movie.id] === libraryList),
    onCatalogueRendered(info) {
      more.hidden = info.visible >= info.filtered && !info.next;
      more.disabled = info.busy;
      more.textContent = info.busy ? "Chargement…" : "Afficher davantage";
      $("catalogue-coverage").textContent = `${info.loaded} titres chargés${total ? ` / ${total} annoncés par la source lors de la recherche` : ""}. Les angles et réceptions filtrent seulement les données documentées dans les fiches chargées.`;
    }
  };
}
