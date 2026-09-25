// Local presentation policy, NOT an identity join or an acoustic similarity.
// Existing presented records are retained; exploration is a separate gesture.
const nameKey = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s*-\s*topic$/i, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function suggestionArtistKey(video, artist = "") {
  return nameKey(artist || video.artist || (/\s-\sTopic$/i.test(video.channelTitle || "") ? video.channelTitle : ""));
}
export function rememberExplored(history = {}, video, { artist = "", now = Date.now() } = {}) {
  if (!video?.id) return history;
  return { ...history, [video.id]: { ...history[video.id], lastExplored: now, artistKey: suggestionArtistKey(video, artist) } };
}
export function rankFreshDepartures(ranked, { history = {}, artistFor = video => video.artist || "", avoidIds = [], recentLimit = 80, artistLimit = 24 } = {}) {
  const recent = new Set(Object.entries(history).filter(([, value]) => value?.lastShown > 0)
    .sort((a, b) => b[1].lastShown - a[1].lastShown).slice(0, recentLimit).map(([id]) => id));
  const explored = Object.entries(history).filter(([, value]) => value?.lastExplored > 0)
    .sort((a, b) => b[1].lastExplored - a[1].lastExplored).slice(0, artistLimit);
  const exploredIds = new Set(explored.map(([id]) => id)), avoided = new Set(avoidIds);
  const artists = new Set(explored.map(([, value]) => value.artistKey).filter(Boolean));
  const buckets = [[], [], [], []];
  for (const video of ranked) {
    const artistKey = suggestionArtistKey(video, artistFor(video));
    const tier = avoided.has(video.id) || exploredIds.has(video.id) ? 3 : artists.has(artistKey) ? 2 : recent.has(video.id) ? 1 : 0;
    buckets[tier].push({ ...video, suggestionMemory: { tier, artistKey } });
  }
  // Interleave artist groups inside each freshness tier. A missing credit uses
  // the publishing channel as a diversity fallback, never as artist evidence.
  return buckets.flatMap(bucket => {
    const groups = new Map();
    for (const video of bucket) {
      const key = video.suggestionMemory.artistKey || `channel:${video.channelId || video.channelTitle || video.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(video);
    }
    const result = [];
    while (groups.size) for (const [key, videos] of groups) {
      result.push(videos.shift());
      if (!videos.length) groups.delete(key);
    }
    return result;
  });
}
export function suggestionRenewalMessage(programme = []) {
  const repeated = programme.filter(video => video.suggestionMemory?.tier > 0).length;
  return repeated ? `${repeated} départ${repeated > 1 ? "s" : ""} déjà proposé${repeated > 1 ? "s" : ""} ou proche${repeated > 1 ? "s" : ""} d’un artiste exploré : les autres choix admissibles ont été privilégiés.`
    : "Nouveaux départs : vidéos récemment proposées et artistes récemment explorés mis en retrait. Pas d’analyse sonore.";
}
