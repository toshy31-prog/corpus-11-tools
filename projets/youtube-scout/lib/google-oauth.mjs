import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const COOKIE = "scout_google_oauth";
const CALLBACK = "/oauth/google/callback";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const insideProject = path => { const subpath = relative(PROJECT_ROOT, resolve(path)); return subpath === "" || (!subpath.startsWith("..") && !isAbsolute(subpath)); };
const random = () => randomBytes(32).toString("base64url");
const failure = (message, httpStatus = 503, code = "unavailable") => Object.assign(new Error(message), { httpStatus, code });
const safeSecret = value => typeof value === "string" && value.length > 0 && value.length <= 8192 && !/[\r\n\0]/.test(value);
const equal = (a, b) => typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Configuration is opt-in. No credential file is touched when disabled. */
export function googleOAuthConfiguration(env = process.env, port = 4181) {
  const clientId = String(env.SCOUT_GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(env.SCOUT_GOOGLE_CLIENT_SECRET || "").trim();
  const origin = String(env.SCOUT_GOOGLE_ORIGIN || `http://localhost:${port}`);
  const tokenFile = env.SCOUT_GOOGLE_TOKEN_FILE || join(homedir(), ".local", "share", "youtube-scout", "google-oauth.json");
  const configured = Boolean(clientId && clientSecret);
  if (configured && (!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId) || !safeSecret(clientSecret) ||
    ![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(origin) || !isAbsolute(tokenFile) || insideProject(tokenFile))) {
    throw failure("Configuration Google locale invalide.", 500, "configuration");
  }
  return { configured, clientId, clientSecret, origin, tokenFile };
}

/** Deliberately separate from PersistentStore and its export/snapshot methods. */
export class GoogleGrantFile {
  constructor(path) { this.path = path; }
  async inspect(path, directory = false) {
    const info = await lstat(path);
    if (info.isSymbolicLink() || (directory ? !info.isDirectory() : !info.isFile()) ||
      (typeof process.getuid === "function" && info.uid !== process.getuid()) || (info.mode & 0o077) || insideProject(await realpath(path))) {
      throw failure("Le coffre Google doit être privé et appartenir à cet utilisateur.", 503, "storage");
    }
    return info;
  }
  async load() {
    try {
      await this.inspect(dirname(this.path), true);
      const info = await this.inspect(this.path);
      if (info.size > 16_384) throw failure("Coffre Google invalide.", 503, "storage");
      const value = JSON.parse(await readFile(this.path, "utf8"));
      if (value.version !== 1 || !safeSecret(value.refreshToken) || typeof value.clientId !== "string") throw new Error();
      return value;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw failure("Coffre Google illisible ou insuffisamment protégé. Aucun secret exposé.", 503, "storage");
    }
  }
  async save(value) {
    const directory = dirname(this.path);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await this.inspect(directory, true);
    // Never replace an unrelated, malformed or unsafe pre-existing file merely
    // because its path was configured as the credential destination.
    await this.load();
    const temporary = `${this.path}.${random()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(value), { flag: "wx", mode: 0o600 });
      await rename(temporary, this.path);
      await chmod(this.path, 0o600);
    } finally { await rm(temporary, { force: true }).catch(() => {}); }
  }
  async remove() {
    try { await this.inspect(dirname(this.path), true); await this.inspect(this.path); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    await rm(this.path, { force: true });
  }
}

/** One local account; token exchanges never use the catalogue cache or logger. */
export class GoogleOAuthSession {
  constructor({ config, grantFile = new GoogleGrantFile(config.tokenFile), fetchImpl = fetch, now = Date.now } = {}) {
    this.config = config; this.file = grantFile; this.fetch = fetchImpl; this.now = now;
    this.grant = null; this.access = null; this.pending = new Map(); this.epoch = 0;
    this.refreshing = null; this.authorizing = null; this.fileQueue = Promise.resolve(); this.state = "idle";
  }
  write(action) {
    const work = this.fileQueue.then(action);
    this.fileQueue = work.catch(() => {});
    return work;
  }
  async load() {
    if (!this.config.configured) return this;
    try {
      const saved = await this.file.load();
      if (saved?.clientId === this.config.clientId) { this.grant = saved; this.state = "renewable"; }
      else if (saved) this.state = "reconnect_required";
    } catch { this.state = "storage_error"; }
    return this;
  }
  status() {
    return { configured: this.config.configured, mode: this.config.configured ? "renewable" : "browser",
      state: this.state, renewable: Boolean(this.grant), connected: Boolean(this.access && this.access.expiresAt > this.now() + 15_000),
      expiresAt: this.access?.expiresAt || 0, clientId: this.config.configured ? this.config.clientId : "", origin: this.config.origin };
  }
  assertRequest(request, { callback = false } = {}) {
    const expected = new URL(this.config.origin);
    if (request.headers.host !== expected.host) throw failure("Utilisez l’origine locale configurée pour Google.", 403, "origin");
    if (callback) return;
    const origin = request.headers.origin;
    const site = request.headers["sec-fetch-site"];
    if (request.headers["x-scout-local"] !== "1" || (site && site !== "same-origin") ||
      (origin && origin !== expected.origin) || (request.method !== "GET" && origin !== expected.origin)) {
      throw failure("La connexion Google est réservée à cette page locale.", 403, "origin");
    }
    if (request.method !== "GET" && String(request.headers["content-type"] || "").split(";")[0] !== "application/json") {
      throw failure("Une requête JSON locale est requise.", 415, "origin");
    }
  }
  start() {
    if (!this.config.configured) throw failure("La connexion renouvelable n’est pas configurée.", 409, "not_configured");
    for (const [key, value] of this.pending) if (value.until <= this.now()) this.pending.delete(key);
    if (this.pending.size >= 20) throw failure("Trop de connexions en attente. Réessayez dans quelques minutes.", 429);
    const state = random(), binding = random(), verifier = random();
    this.pending.set(state, { binding, verifier, until: this.now() + 600_000, epoch: this.epoch });
    const url = new URL(AUTH_ENDPOINT);
    for (const [key, value] of Object.entries({ client_id: this.config.clientId, redirect_uri: `${this.config.origin}${CALLBACK}`,
      response_type: "code", scope: YOUTUBE_READONLY_SCOPE, access_type: "offline", prompt: "consent", state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" })) url.searchParams.set(key, value);
    return { authorizationUrl: url.href, cookie: `${COOKIE}=${binding}; HttpOnly; SameSite=Lax; Path=${CALLBACK}; Max-Age=600` };
  }
  async exchange(parameters) {
    let response, data;
    try {
      response = await this.fetch(TOKEN_ENDPOINT, { method: "POST", redirect: "error", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: this.config.clientId, client_secret: this.config.clientSecret, ...parameters }),
        signal: AbortSignal.timeout(15_000) });
      data = await response.json();
    } catch { throw failure("Google est temporairement injoignable. L’autorisation locale est conservée."); }
    if (!response.ok || data.error) {
      if (data.error === "invalid_grant") throw failure("Google demande une nouvelle autorisation.", 401, "reconnect_required");
      throw failure("Le renouvellement Google a échoué. Réessayez ou vérifiez la configuration.");
    }
    if (!safeSecret(data.access_token) || String(data.token_type).toLowerCase() !== "bearer" ||
      !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 30 || Number(data.expires_in) > 86_400 ||
      (data.scope && !String(data.scope).split(" ").includes(YOUTUBE_READONLY_SCOPE))) {
      throw failure("Réponse Google invalide ou autorisation YouTube manquante.");
    }
    return data;
  }
  async complete(url, cookieHeader = "") {
    const state = url.searchParams.get("state"), pending = this.pending.get(state);
    const binding = cookieHeader.split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!pending || pending.until <= this.now() || pending.epoch !== this.epoch || !equal(binding, pending.binding)) {
      throw failure("Cette réponse Google n’appartient pas à une connexion en cours. Réessayez depuis Scout.", 403, "state");
    }
    this.pending.delete(state);
    if (url.searchParams.has("error")) throw failure("Autorisation Google non accordée. Votre bibliothèque reste disponible.", 400, "denied");
    const code = url.searchParams.get("code");
    if (!safeSecret(code)) throw failure("Code Google absent ou invalide.", 400, "code");
    const generation = ++this.epoch;
    this.pending.clear();
    this.refreshing = null;
    this.authorizing = generation;
    try {
      const data = await this.exchange({ code, code_verifier: pending.verifier, grant_type: "authorization_code", redirect_uri: `${this.config.origin}${CALLBACK}` });
      // Never carry a previous account's refresh token into a newly chosen account.
      if (!safeSecret(data.refresh_token)) throw failure("Google n’a pas fourni d’accès renouvelable. Relancez le consentement.", 409, "missing_refresh");
      await this.write(async () => {
        if (generation !== this.epoch) throw failure("Connexion annulée.", 409, "cancelled");
        const grant = { version: 1, clientId: this.config.clientId, refreshToken: data.refresh_token };
        await this.file.save(grant);
        if (generation !== this.epoch) return;
        this.grant = grant; this.access = this.accessValue(data); this.state = "ready";
      });
      if (generation !== this.epoch) throw failure("Connexion annulée.", 409, "cancelled");
      return this.status();
    } finally { if (this.authorizing === generation) this.authorizing = null; }
  }
  accessValue(data) { return { accessToken: data.access_token, expiresAt: this.now() + Number(data.expires_in) * 1000, clientId: this.config.clientId, renewable: true }; }
  async token({ force = false } = {}) {
    // An old-account refresh must not capture the new authorization epoch while
    // its code exchange is pending and later overwrite the newly chosen account.
    if (this.authorizing !== null) throw failure("Connexion Google en cours. Réessayez après sa confirmation.", 503, "authorization_in_progress");
    if (!this.config.configured || !this.grant) throw failure("Reconnectez YouTube pour poursuivre les lectures privées.", 401, "reconnect_required");
    if (!force && this.access?.expiresAt > this.now() + 60_000) return { ...this.access };
    if (this.refreshing) return this.refreshing;
    const generation = this.epoch, grant = this.grant;
    const work = (async () => {
      try {
        const data = await this.exchange({ grant_type: "refresh_token", refresh_token: grant.refreshToken });
        if (generation !== this.epoch) throw failure("Connexion annulée.", 409, "cancelled");
        if (data.refresh_token && data.refresh_token !== grant.refreshToken) {
          if (!safeSecret(data.refresh_token)) throw failure("Réponse Google invalide.");
          await this.write(async () => {
            if (generation !== this.epoch) return;
            const rotated = { ...grant, refreshToken: data.refresh_token };
            await this.file.save(rotated);
            if (generation === this.epoch) this.grant = rotated;
          });
        }
        if (generation !== this.epoch) throw failure("Connexion annulée.", 409, "cancelled");
        this.access = this.accessValue(data); this.state = "ready";
        return { ...this.access };
      } catch (error) {
        if (generation !== this.epoch) throw failure("Connexion annulée.", 409, "cancelled");
        if (generation === this.epoch) {
          if (error.code === "reconnect_required") {
            this.access = null; this.grant = null; this.state = "reconnect_required";
            await this.write(() => this.file.remove());
          } else this.state = "unavailable";
        }
        // Provider/storage messages can contain secrets or paths: emit only our vocabulary.
        if (["reconnect_required", "cancelled"].includes(error.code)) throw error;
        throw failure("Renouvellement Google indisponible. Vos données et l’autorisation locale sont conservées.");
      }
    })();
    this.refreshing = work;
    try { return await work; } finally { if (this.refreshing === work) this.refreshing = null; }
  }
  async disconnect() {
    this.epoch++; this.pending.clear(); this.grant = null; this.access = null; this.refreshing = null; this.authorizing = null; this.state = "idle";
    await this.write(() => this.file.remove());
    return this.status();
  }
}

export const GOOGLE_OAUTH_CALLBACK = CALLBACK;
export const GOOGLE_OAUTH_CLEAR_COOKIE = `${COOKIE}=; HttpOnly; SameSite=Lax; Path=${CALLBACK}; Max-Age=0`;
