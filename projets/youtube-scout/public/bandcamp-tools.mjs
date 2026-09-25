const MAX_IMPORT_BYTES = 400_000;

function text(value, field, { required = false, max = 500 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`Le champ « ${field} » est requis.`);
    return "";
  }
  if (typeof value !== "string" || value.length > max) throw new Error(`Le champ « ${field} » doit être un texte de ${max} caractères maximum.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`Le champ « ${field} » est requis.`);
  return cleaned;
}

export function validateBandcampImport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Le fichier doit contenir une seule sortie sous forme d’objet JSON.");
  const sourceUrl = text(value.sourceUrl, "sourceUrl", { required: true, max: 2000 });
  let url;
  try { url = new URL(sourceUrl); } catch { throw new Error("L’URL source Bandcamp n’est pas valide."); }
  if (url.protocol !== "https:" || !/(^|\.)bandcamp\.com$/i.test(url.hostname) || url.username || url.password || url.port) throw new Error("Indiquez une URL HTTPS de Bandcamp, sans identifiant ni mot de passe.");
  const artist = text(value.artist, "artist", { required: true });
  const title = text(value.title, "title", { required: true });
  const label = text(value.label, "label");
  const releaseDate = text(value.releaseDate, "releaseDate", { max: 10 });
  if (releaseDate && !/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(releaseDate)) throw new Error("La date doit être une année, une année-mois ou une date AAAA-MM-JJ.");
  if (releaseDate.length === 10 && new Date(`${releaseDate}T00:00:00Z`).toISOString().slice(0, 10) !== releaseDate) throw new Error("La date de sortie n’existe pas dans le calendrier.");
  if (value.tracks !== undefined && (!Array.isArray(value.tracks) || value.tracks.length > 500)) throw new Error("La liste des morceaux doit contenir au maximum 500 entrées.");
  const tracks = (value.tracks || []).map((track, index) => {
    if (!track || typeof track !== "object" || Array.isArray(track)) throw new Error(`Le morceau ${index + 1} doit contenir un titre.`);
    return { title: text(track.title, `tracks[${index}].title`, { required: true }), artist: text(track.artist, `tracks[${index}].artist`) || artist };
  });
  return { sourceUrl: url.href, artist, title, tracks, releaseDate, label };
}

export function normalizePlatformQuery(isrcValue, territoryValue) {
  const isrc = String(isrcValue || "").replace(/[\s-]/g, "").toUpperCase();
  const territory = String(territoryValue || "").trim().toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc)) throw new Error("L’ISRC doit contenir 12 caractères, par exemple FRABC2600001.");
  if (!/^[A-Z]{2}$/.test(territory)) throw new Error("Indiquez le code du pays en deux lettres, par exemple FR.");
  return { isrc, territory };
}

function createElement(document, tag, content, className) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  if (className) element.className = className;
  return element;
}

function observedLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)(?:spotify\.com|apple\.com|youtube\.com|youtu\.be)$/.test(url.hostname) ? url.href : "";
  } catch { return ""; }
}

function renderPlatformResults(container, data, query) {
  const document = container.ownerDocument;
  container.replaceChildren();
  container.append(createElement(document, "p", `${query.isrc} · ${query.territory}`, "platform-query"));
  const names = { youtube: "YouTube", spotify: "Spotify", applemusic: "Apple Music" };
  const statuses = { observed: "Présence observée", not_found: "Aucune correspondance ISRC trouvée", not_configured: "Catalogue non configuré", unavailable: "Source indisponible" };
  const list = createElement(document, "ul");
  for (const observation of Array.isArray(data.observations) ? data.observations : []) {
    const item = createElement(document, "li");
    const name = names[observation.platform] || "Autre catalogue";
    const status = statuses[observation.status] || "État inconnu";
    const url = observation.status === "observed" ? observedLink(observation.url) : "";
    const label = createElement(document, url ? "a" : "strong", `${name} · ${status}${url ? " ↗" : ""}`);
    if (url) { label.href = url; label.target = "_blank"; label.rel = "noreferrer"; }
    item.append(label);
    const description = [observation.artist, observation.title, observation.releaseDate].filter(Boolean).join(" · ");
    if (description) item.append(createElement(document, "span", description));
    list.append(item);
  }
  container.append(list);
  const queried = (data.observations || []).filter(({ status }) => ["observed", "not_found"].includes(status));
  container.append(createElement(document, "p", queried.length
    ? String(data.differential?.statement || "Aucun écart de catalogue observé.")
    : "Aucun catalogue n’a pu être interrogé. Aucun écart de disponibilité ne peut être établi.", "availability-differential"));
  if (queried.length) container.append(createElement(document, "p", "Cette comparaison concerne cet ISRC dans ce pays ; elle ne démontre pas une exclusivité.", "availability-verdict"));
}

export function bindCatalogueTools({ onImported, root = globalThis.document, fetcher = globalThis.fetch } = {}) {
  const fileInput = root.querySelector("#bandcamp-import");
  const importStatus = root.querySelector("#bandcamp-import-status");
  const compareForm = root.querySelector("#platform-compare-form");
  const results = root.querySelector("#platform-compare-results");
  if (!fileInput || !importStatus || !compareForm || !results || fileInput.dataset.bound) return;
  fileInput.dataset.bound = "true";
  root.querySelector("#bandcamp-entry-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button"); button.disabled = true;
    let saved = false;
    try {
      const metadata = validateBandcampImport({ sourceUrl: root.querySelector("#bandcamp-url").value, artist: root.querySelector("#bandcamp-artist").value, title: root.querySelector("#bandcamp-title").value, label: root.querySelector("#bandcamp-label").value, tracks: root.querySelector("#bandcamp-tracks").value.split(/\r?\n/).map(title => title.trim()).filter(Boolean).map(title => ({ title })) });
      importStatus.textContent = "Enregistrement de la sortie…";
      const response = await fetcher("/api/music/bandcamp/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(metadata), signal: AbortSignal.timeout(20_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "L’import a échoué.");
      saved = true;
      importStatus.textContent = `« ${metadata.title} » enregistrée avec sa source Bandcamp.`;
      await onImported?.(data);
    } catch (error) {
      importStatus.textContent = saved ? "Sortie enregistrée ; rechargez la vue pour l’afficher." : error.message || "Enregistrement impossible. Les champs sont conservés.";
    } finally { button.disabled = false; }
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileInput.disabled = true;
    importStatus.textContent = "Lecture du fichier…";
    let saved = false;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Le fichier dépasse 400 Ko. Importez une sortie à la fois.");
      let input;
      try { input = JSON.parse(await file.text()); } catch { throw new Error("Le fichier ne contient pas de JSON valide."); }
      const metadata = validateBandcampImport(input);
      importStatus.textContent = "Enregistrement de la sortie et de ses morceaux…";
      const response = await fetcher("/api/music/bandcamp/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(metadata), signal: AbortSignal.timeout(20_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "L’import Bandcamp a échoué.");
      saved = true;
      importStatus.textContent = `« ${metadata.title} » enregistrée avec sa source Bandcamp${metadata.tracks.length ? ` et ${metadata.tracks.length} morceau${metadata.tracks.length > 1 ? "x" : ""}` : ""}.`;
      fileInput.value = "";
      await onImported?.(data);
    } catch (error) {
      importStatus.textContent = saved ? "Sortie enregistrée. La vue n’a pas pu être actualisée ; rechargez la page." : error?.name === "TimeoutError" ? "Le serveur met trop de temps à répondre. Vérifiez le dossier avant de réessayer l’import." : error.message || "Impossible de lire ce fichier.";
    } finally { fileInput.disabled = false; }
  });
  compareForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = root.querySelector("#platform-compare-submit");
    button.disabled = true;
    results.textContent = "Comparaison en cours…";
    try {
      const query = normalizePlatformQuery(root.querySelector("#platform-isrc").value, root.querySelector("#platform-territory").value);
      const response = await fetcher(`/api/platform/availability?${new URLSearchParams(query)}`, { signal: AbortSignal.timeout(25_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "La comparaison a échoué.");
      renderPlatformResults(results, data, query);
    } catch (error) {
      results.textContent = error?.name === "TimeoutError" ? "La comparaison prend trop de temps. Réessayez quand les sources répondent." : error.message || "La comparaison est indisponible.";
    } finally { button.disabled = false; }
  });
}
