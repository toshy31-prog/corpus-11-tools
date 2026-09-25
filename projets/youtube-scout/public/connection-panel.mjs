const API_ROOT = "https://www.googleapis.com/youtube/v3";
export const API_KEY_STORAGE = "youtube-scout.api-key.v1";
export const OAUTH_SESSION_STORAGE = "youtube-scout.oauth-session.v1";
const CONSENT_CLIENT = "youtube-scout.oauth-consent-client.v1";
const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export function usableSession(value, clientId, now = Date.now()) {
  return Boolean(value && typeof value.accessToken === "string" && value.accessToken &&
    value.clientId === clientId && Number.isFinite(value.expiresAt) && value.expiresAt > now + 15_000);
}

/** Credentials never enter the graph, the notebook, exports or debug messages.
 * Browser-only grants require a gesture. Opt-in server grants can renew offline. */
export function createConnectionPanel({ root = document, local = localStorage, session = sessionStorage,
  fetchImpl = fetch, now = () => Date.now(), googleProvider, onToken = () => {},
  onOwnedPlaylists = async () => {}, onMessage = () => {}, onStatus = () => {}, renewable = false,
  navigate = url => globalThis.location.assign(url), schedule = setTimeout, unschedule = clearTimeout } = {}) {
  const $ = id => root.getElementById(id);
  let token = null, epoch = 0, timer, disposed = false;
  let service = null, renewing = null, renewalFailures = 0, locallyForgotten = false, hasServerGrant = false;
  let serverForgetUnconfirmed = false;
  const states = { oauth: "idle", key: "idle" };
  const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
  const write = (store, key, value) => { try { if (value === null) store.removeItem(key); else store.setItem(key, value); return true; } catch { return false; } };
  const keyValue = () => $("api-key").value.trim();
  const clientId = () => $("client-id").value.trim();
  function cancelChecks() {
    epoch++;
    for (const kind of Object.keys(states)) if (states[kind] === "checking") states[kind] = "idle";
  }
  function render({ collapse = false, open = false } = {}) {
    const connected = states.oauth === "ready";
    const publicReady = states.key === "ready";
    const checking = Object.values(states).includes("checking");
    const error = Object.values(states).includes("error");
    const expired = states.oauth === "expired";
    const ready = connected || publicReady;
    const parts = [];
    if (checking) parts.push("Vérification des accès…");
    else {
      if (connected) parts.push(token?.renewable ? "YouTube connecté · renouvellement automatique ✓" : "YouTube connecté · lecture seule ✓");
      else if (expired) parts.push("Accès Google expiré · reconnectez-vous pour les playlists privées");
      else if (states.oauth === "renewing") parts.push("Renouvellement de l’accès Google… · bibliothèque conservée");
      else if (states.oauth === "unavailable") parts.push("Google temporairement indisponible · nouvelle tentative automatique");
      else if (states.oauth === "error") parts.push("Accès Google non vérifié");
      if (publicReady) parts.push("Clé API vérifiée · accès public ✓");
      else if (states.key === "error") parts.push("Clé API non vérifiée");
      if (!parts.length) parts.push("Identifiants mémorisés · accès à vérifier");
    }
    $("connection-summary").textContent = parts.join(" · ");
    $("connection-overview").hidden = !token && !keyValue() && !expired && !error && !service?.configured;
    $("connection-state").textContent = checking ? "Vérification…" : connected ? "Connecté · lecture seule" : publicReady ? "Accès public vérifié" : expired ? "À reconnecter" : "Non connecté";
    $("connection-state").classList.toggle("connected", ready);
    $("connection-check-state").textContent = checking ? "Vérification…" : error ? "À vérifier" : ready ? "Vérifié · modifier" : expired ? "ID mémorisé" : "Configurer";
    $("connection-reconnect").hidden = connected || (!clientId() && !service?.configured);
    $("connection-reconnect").disabled = checking;
    $("connection-recheck").hidden = !token && !keyValue();
    $("connection-recheck").disabled = checking;
    $("refresh-owned-playlists").hidden = !connected;
    $("disconnect").hidden = !token && !hasServerGrant && !serverForgetUnconfirmed;
    $("connect").disabled = checking || serverForgetUnconfirmed;
    $("connect").textContent = connected ? "Changer ou renouveler l’accès" : service?.configured ? "Connecter avec renouvellement automatique →" : "Connecter YouTube →";
    $("verify-api-key").disabled = checking;
    if (open || error) $("youtube-settings").open = true;
    else if (collapse && ready && !checking) $("youtube-settings").open = false;
    onStatus({ oauth: states.oauth, publicAccess: states.key === "ready", connected, expiresAt: token?.expiresAt || 0,
      renewable: Boolean(service?.renewable), hasServerGrant, serverForgetUnconfirmed, configured: Boolean(service?.configured), message: parts.join(" · ") });
  }
  function clearToken(state = "idle") {
    unschedule(timer); token = null; states.oauth = state;
    write(session, OAUTH_SESSION_STORAGE, null); onToken("", 0);
  }
  function installToken(value) {
    token = value;
    unschedule(timer);
    timer = schedule(() => {
      if (value.renewable) void ensureAccessToken({ force: true });
      else { cancelChecks(); clearToken("expired"); render(); }
    }, Math.max(0, value.expiresAt - now() - (value.renewable ? 60_000 : 15_000)));
  }
  async function serverRequest(action, { method = "POST", body = {} } = {}) {
    const response = await fetchImpl(`/api/google-oauth/${action}`, { method, credentials: "same-origin", cache: "no-store",
      headers: { "X-Scout-Local": "1", ...(method === "GET" ? {} : { "content-type": "application/json" }) },
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw Object.assign(new Error("Accès Google indisponible"), { status: response.status });
    return response.json();
  }
  async function ensureAccessToken({ force = false, rejectedToken = "" } = {}) {
    if (disposed || locallyForgotten) return "";
    if (rejectedToken) {
      // A concurrent request may already have replaced the rejected access.
      // Reuse that replacement instead of spending another refresh.
      if (token?.accessToken !== rejectedToken && token?.expiresAt > now() + 15_000) return token.accessToken;
      if (token?.accessToken === rejectedToken) {
        clearToken(service?.renewable ? "renewing" : "expired");
        render();
      }
      force = true;
    }
    if (!force && token?.expiresAt > now() + (token?.renewable ? 60_000 : 15_000)) return token.accessToken;
    if (!service?.renewable) {
      if (token && token.expiresAt <= now() + 15_000) { clearToken("expired"); render(); }
      return token?.accessToken || "";
    }
    if (renewing) return renewing;
    const generation = epoch;
    states.oauth = "renewing"; render();
    const work = (async () => {
      try {
        const next = await serverRequest("token", { body: { force } });
        if (generation !== epoch || disposed || locallyForgotten) return "";
        if (!usableSession(next, service.clientId, now()) || next.renewable !== true) throw new Error("Invalid token response");
        renewalFailures = 0; hasServerGrant = true; installToken(next); states.oauth = "ready";
        // Server-backed access tokens live in memory, not browser storage.
        write(session, OAUTH_SESSION_STORAGE, null); onToken(next.accessToken, next.expiresAt); render({ collapse: true });
        return next.accessToken;
      } catch (error) {
        if (generation !== epoch || disposed || locallyForgotten) return "";
        if (error.status === 401 || error.status === 409) { service.renewable = false; clearToken("expired"); }
        else {
          if (!token || token.expiresAt <= now() + 15_000) clearToken("unavailable");
          states.oauth = "unavailable";
          unschedule(timer); timer = schedule(() => void ensureAccessToken({ force: true }), Math.min(120_000, 15_000 * 2 ** Math.min(3, renewalFailures++)));
        }
        render();
        return token?.expiresAt > now() + 15_000 ? token.accessToken : "";
      }
    })();
    renewing = work;
    try { return await work; } finally { if (renewing === work) renewing = null; }
  }
  function saveKey() {
    // Saving the unchanged field during an import must not cancel an OAuth check.
    if (read(local, API_KEY_STORAGE) !== (keyValue() || null)) { cancelChecks(); states.key = "idle"; }
    const saved = write(local, API_KEY_STORAGE, keyValue() || null);
    $("api-key-state").textContent = saved ? (keyValue() ? "Clé mémorisée dans ce navigateur · à vérifier. Hors sauvegardes exportées." : "Aucune clé mémorisée. Inutile si YouTube est connecté.") : "Mémorisation impossible : stockage du navigateur indisponible.";
    render(); return saved;
  }
  async function check(kind, credential, generation) {
    const url = new URL(`${API_ROOT}/${kind === "oauth" ? "channels" : "i18nRegions"}`);
    url.searchParams.set("part", kind === "oauth" ? "id" : "snippet");
    if (kind === "oauth") url.searchParams.set("mine", "true");
    else { url.searchParams.set("key", credential); url.searchParams.set("hl", "fr"); }
    try {
      const response = await fetchImpl(url, { headers: kind === "oauth" ? { authorization: `Bearer ${credential}` } : {}, signal: AbortSignal.timeout(15_000) });
      if (generation !== epoch || disposed) return;
      if (!response.ok) {
        if (kind === "oauth" && response.status === 401) clearToken("expired");
        else states[kind] = "error";
        // Never echo a provider response which might contain a credential.
        onMessage(`Vérification ${kind === "oauth" ? "YouTube" : "de la clé API"} impossible (HTTP ${response.status}). Réessayez ou vérifiez les restrictions et quotas Google.`, "error");
        return;
      }
      const data = await response.json();
      if (generation !== epoch || disposed) return;
      if (!Array.isArray(data.items)) throw new Error("Invalid verification response");
      states[kind] = "ready";
      if (kind === "oauth" && token) {
        onToken(token.accessToken, token.expiresAt);
        if (!token.renewable && !write(session, OAUTH_SESSION_STORAGE, JSON.stringify(token))) onMessage("Connecté, mais cet onglet ne peut pas mémoriser l’accès temporaire.", "error");
        write(local, CONSENT_CLIENT, token.clientId);
      }
      if (kind === "key") $("api-key-state").textContent = read(local, API_KEY_STORAGE) === credential ? "Clé vérifiée et mémorisée · accès public uniquement." : "Clé vérifiée · mémorisation indisponible.";
    } catch {
      if (generation !== epoch || disposed) return;
      states[kind] = "error";
      onMessage("Vérification impossible : réseau indisponible ou délai dépassé. Vos paramètres sont conservés.", "error");
    }
  }
  async function verify({ onlyKey = false } = {}) {
    cancelChecks();
    const generation = epoch;
    const work = [];
    if (!onlyKey && token) { states.oauth = "checking"; work.push(check("oauth", token.accessToken, generation)); }
    if (keyValue()) { states.key = "checking"; work.push(check("key", keyValue(), generation)); }
    render(); await Promise.all(work);
    if (generation === epoch && !disposed) render({ collapse: true });
    return states.oauth === "ready";
  }
  async function connect({ temporary = false } = {}) {
    if (serverForgetUnconfirmed) return onMessage("Terminez l’oubli de l’accès serveur avant de reconnecter YouTube.", "error");
    locallyForgotten = false;
    if (service?.configured && !temporary) {
      cancelChecks(); states.oauth = "checking"; render();
      const generation = epoch;
      try {
        const started = await serverRequest("start");
        if (generation !== epoch || disposed || locallyForgotten) return;
        const url = new URL(started.authorizationUrl);
        if (url.origin !== "https://accounts.google.com" || url.pathname !== "/o/oauth2/v2/auth") throw new Error();
        navigate(url.href);
      } catch { if (generation === epoch && !disposed) { states.oauth = "error"; render({ open: true }); onMessage("Connexion renouvelable indisponible. Vérifiez la configuration locale ; la bibliothèque est conservée.", "error"); } }
      return;
    }
    const id = clientId();
    if (!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(id)) {
      render({ open: true }); $("client-id").focus(); return onMessage("Ajoutez un identifiant client OAuth de type Application Web.", "error");
    }
    cancelChecks();
    const generation = epoch; states.oauth = "checking"; render();
    try {
      const google = await googleProvider();
      if (generation !== epoch || disposed) return;
      const fail = () => { if (generation === epoch) { states.oauth = "error"; render({ open: true }); onMessage("Connexion Google non terminée : fenêtre fermée, bloquée ou autorisation refusée.", "error"); } };
      const client = google.accounts.oauth2.initTokenClient({ client_id: id, scope: SCOPE,
        callback: async response => {
          if (generation !== epoch || disposed) return;
          if (response.error || !response.access_token || (response.scope && !response.scope.split(" ").includes(SCOPE))) return fail();
          const expiry = now() + Number(response.expires_in || 3600) * 1000;
          if (!Number.isFinite(expiry) || expiry <= now() + 15_000) return fail();
          installToken({ accessToken: response.access_token, expiresAt: expiry, clientId: id });
          const verified = await verify();
          if (verified) await onOwnedPlaylists();
        }, error_callback: fail });
      // Do not force consent again for a grant already verified in this browser.
      client.requestAccessToken({ prompt: read(local, CONSENT_CLIENT) === id ? "" : "consent" });
    } catch { if (generation === epoch) { states.oauth = "error"; render({ open: true }); onMessage("Le module Google n’est pas disponible. Réessayez la connexion.", "error"); } }
  }
  async function forget() {
    // Forget is explicit user intent even if the initial status lookup has not
    // answered yet. Unknown presence must not become a claimed server deletion.
    const serverBacked = Boolean(hasServerGrant || token?.renewable || serverForgetUnconfirmed || (renewable && service === null));
    locallyForgotten = true;
    cancelChecks(); const generation = epoch; clearToken();
    if (serverBacked) serverForgetUnconfirmed = true;
    render({ open: true });
    if (serverBacked) {
      try {
        const disconnected = await serverRequest("disconnect");
        if (generation !== epoch || disposed) return;
        if (disconnected.renewable !== false) throw new Error("Disconnect not confirmed");
        service = disconnected; hasServerGrant = false; serverForgetUnconfirmed = false; render({ open: true });
      }
      catch { if (generation !== epoch || disposed) return; states.oauth = "error"; render({ open: true }); return onMessage("Accès retiré de cet onglet, mais oubli sur le serveur local non confirmé. Réessayez ; aucune autorisation distante révoquée.", "error"); }
    }
    onMessage("Accès Google oublié dans cet onglet. ID et clé API conservés ; aucune autorisation distante révoquée.");
  }
  function invalidateOAuth(expectedToken, { renew = true } = {}) {
    if (expectedToken && expectedToken !== token?.accessToken) return;
    if (renew && token?.renewable && service?.renewable) { void ensureAccessToken({ force: true, rejectedToken: expectedToken || token.accessToken }); return; }
    if (!renew && service) service.renewable = false;
    cancelChecks(); clearToken("expired"); render();
  }
  function accept({ accessToken = "", apiKey = "" } = {}) {
    if (accessToken && token?.accessToken === accessToken && states.oauth !== "ready") { states.oauth = "ready"; if (!token.renewable) write(session, OAUTH_SESSION_STORAGE, JSON.stringify(token)); render({ collapse: true }); }
    else if (!accessToken && apiKey && apiKey === keyValue() && states.key !== "ready") { states.key = "ready"; render({ collapse: true }); }
  }
  async function restore() {
    const generation = epoch;
    if (renewable) {
      try {
        const backend = await serverRequest("status", { method: "GET" });
        if (generation !== epoch || disposed) return false;
        if (typeof backend.configured === "boolean") service = backend;
        if (service?.renewable) { hasServerGrant = true; const resumed = await ensureAccessToken(); if (keyValue()) await verify({ onlyKey: true }); return Boolean(resumed); }
        if (service?.state === "reconnect_required") states.oauth = "expired";
        else if (service?.state === "storage_error") states.oauth = "error";
      } catch {
        // Older local servers and temporary network failures preserve the GIS fallback.
        onMessage("État du renouvellement Google indisponible. L’accès temporaire existant reste utilisable.");
      }
    }
    let saved; try { saved = JSON.parse(read(session, OAUTH_SESSION_STORAGE) || "null"); } catch {}
    if (usableSession(saved, clientId(), now())) installToken(saved);
    else if (saved) clearToken(saved.clientId === clientId() ? "expired" : "idle");
    else if (read(local, CONSENT_CLIENT) === clientId()) states.oauth = "expired";
    render(); return verify();
  }
  $("connection-recheck").onclick = () => verify();
  $("connection-reconnect").onclick = () => $("connect").click();
  $("refresh-owned-playlists").onclick = () => onOwnedPlaylists();
  $("verify-api-key").onclick = async () => { saveKey(); await verify({ onlyKey: true }); };
  $("client-id").addEventListener("input", () => { cancelChecks(); if (token?.clientId !== clientId()) clearToken(); render({ open: true }); });
  $("api-key").addEventListener("input", () => { cancelChecks(); states.key = "idle"; render({ open: true }); });
  render();
  return { connect, connectTemporary: () => connect({ temporary: true }), forget, saveKey, verify, restore, accept, invalidateOAuth, ensureAccessToken,
    dispose: () => { disposed = true; epoch++; unschedule(timer); } };
}
