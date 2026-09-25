export function ephemeralClient(nativeFetch, origin) {
  let epoch = 0, pending = null;
  const obsolete = () => new DOMException("Le départ a changé.", "AbortError");
  async function start(seedId = "") {
    const prior = pending, generation = ++epoch;
    const opening = (async () => {
      if (prior) {
        const old = await prior.catch(() => null);
        if (old) await nativeFetch("/api/exploration/context", { method: "DELETE", headers: { "x-scout-exploration": old } }).catch(() => {});
      }
      if (generation !== epoch) throw obsolete();
      const response = await nativeFetch("/api/exploration/context", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seedId }) });
      if (!response.ok) throw new Error(response.status === 404 || response.status === 405
        ? "Le serveur Scout n’a pas encore activé les fouilles éphémères. Son redémarrage est nécessaire ; votre bibliothèque reste accessible."
        : "Impossible d’ouvrir une fouille éphémère. Réessayez ; votre bibliothèque reste accessible.");
      const { token } = await response.json();
      if (typeof token !== "string" || !token) throw new Error("Réponse du serveur Scout incompatible. Aucun départ n’a été ouvert.");
      if (generation !== epoch) {
        await nativeFetch("/api/exploration/context", { method: "DELETE", headers: { "x-scout-exploration": token } }).catch(() => {});
        throw obsolete();
      }
      return token;
    })();
    pending = opening;
    try { return await opening; }
    catch (error) { if (pending === opening) pending = null; throw error; }
  }
  async function request(input, options = {}) {
    const url = new URL(typeof input === "string" ? input : input.url, origin);
    if (url.origin !== origin || !url.pathname.startsWith("/api/") || /^\/api\/(google-oauth|health|status|credentials)/.test(url.pathname)) return nativeFetch(input, options);
    if (!pending) await start();
    const generation = epoch;
    const token = await pending;
    if (generation !== epoch) throw obsolete();
    const headers = new Headers(options.headers || (typeof input !== "string" ? input.headers : undefined));
    headers.set("x-scout-exploration", token);
    const response = await nativeFetch(input, { ...options, headers });
    if (generation !== epoch) throw obsolete();
    const json = response.json.bind(response);
    response.json = async () => { const value = await json(); if (generation !== epoch) throw obsolete(); return value; };
    return response;
  }
  function close() {
    const prior = pending; ++epoch; pending = null;
    return prior?.then(token => nativeFetch("/api/exploration/context", { method: "DELETE", headers: { "x-scout-exploration": token }, keepalive: true })).catch(() => {});
  }
  return { start, fetch: request, close };
}
