// Test client: exercise the real ephemeral-context handshake, not a server bypass.
export function sessionFetch(nativeFetch = globalThis.fetch) {
  const tokens = new Map();
  return async (input, options = {}) => {
    const url = new URL(input);
    if (!url.pathname.startsWith("/api/") || url.pathname === "/api/exploration/context") return nativeFetch(input, options);
    if (!tokens.has(url.origin)) tokens.set(url.origin, nativeFetch(`${url.origin}/api/exploration/context`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}"
    }).then(response => response.json()).then(body => body.token));
    const token = await tokens.get(url.origin);
    return nativeFetch(input, { ...options, headers: { ...options.headers, "x-scout-exploration": token } });
  };
}
