// Display/search credit boundaries, never a catalogue identity assertion.
export function splitArtistNames(value = "") {
  const names = String(value).normalize("NFC")
    .replace(/\((?:electronics?|soprano sax|tenor sax|composer|vocals?|producer|guitar|drums|bass)\)/gi, "")
    .split(/\s*(?:;|,|\s&\s|\s\+\s|\bfeat(?:uring)?\.?\s|\bft\.?\s)\s*/i)
    .map(name => name.trim().replace(/\s+/g, ' ')).filter(Boolean);
  const seen = new Set();
  return names.filter(name => {
    const key = name.toLocaleLowerCase('fr');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function recordingArtistHints(value = "") {
  const names = splitArtistNames(value);
  return [...new Set([String(value).trim(), ...names])].filter(Boolean);
}

export async function searchCreditChoices(value, search, { isCurrent = () => true } = {}) {
  if (String(value).length > 300) throw new Error("La liste d’artistes est limitée à 300 caractères.");
  // Also retain the full query: separators can belong to a band's name.
  const names = [...new Set([String(value).trim(), ...splitArtistNames(value)])].filter(Boolean);
  const replies = [];
  // Bounded concurrency, not silently truncated credits. Preserve each query's
  // status and candidates: a failed lookup must not look like a missing artist.
  for (let i = 0; i < names.length; i += 3) {
    if (!isCurrent()) return { candidates: [], groups: [], sourceStates: {}, cancelled: true };
    replies.push(...await Promise.allSettled(names.slice(i, i + 3).map(name => search(name))));
  }
  const candidates = new Map(), sourceStates = {}, groups = [];
  for (const [index, reply] of replies.entries()) {
    const partial = Object.values(reply.value?.sourceStates || {}).some(state => state !== "ok");
    groups.push({ query: names[index], candidates: reply.value?.candidates || [], sourceStates: reply.value?.sourceStates || {}, state: reply.status === "rejected" || partial ? "unavailable" : "complete" });
    if (reply.status !== "fulfilled") continue;
    for (const candidate of reply.value?.candidates || []) candidates.set(candidate.id, candidate);
    for (const [source, state] of Object.entries(reply.value?.sourceStates || {})) {
      if (!sourceStates[source] || state !== "ok") sourceStates[source] = state;
    }
  }
  if (replies.some(reply => reply.status === "rejected")) sourceStates.search = "unavailable";
  return { candidates: [...candidates.values()], groups, sourceStates };
}
