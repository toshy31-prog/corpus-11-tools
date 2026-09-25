export const directionNames = { label: "Chez ces labels", remix: "Par les remixeurs", featuring: "Avec les partenaires", compilation: "Sur les compilations", alias: "Alias et projets communs", curator: "Chez les chaînes-curatrices", scene: "Scènes et territoires", era: "Dans cette période" };

import { musicalReleaseDate } from './music-sorting.mjs';

export function musicKey(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function recordingKey(item = {}) {
  if (item.isrc) return `isrc:${String(item.isrc).toUpperCase()}`;
  if (item.recordingId) return `recording:${item.recordingId}`;
  // Versions/remixes stay in the key; names alone never establish identity.
  if (item.artist && item.title) return `candidate:${musicKey(item.artist)}:${musicKey(item.title.replace(/\b(official (video|audio|visualizer)|hq|hd)\b/gi, ""))}`;
  return `id:${item.id}`;
}

export function deduplicatePaths(paths = []) {
  const merged = new Map();
  for (const path of paths) {
    const key = [path.direction || path.kind, path.entityId || musicKey(path.entity), path.sourceVideoId].join(":");
    if (!merged.has(key)) merged.set(key, { ...path, sources: [path.source].filter(Boolean) });
    else {
      const existing = merged.get(key);
      existing.sources = [...new Set([...existing.sources, path.source].filter(Boolean))];
    }
  }
  return [...merged.values()];
}

export function selectDiscoveries(items, { exclude = [], limit = 6, focus = "breadth", spread, turn = 0, seedArtist = "" } = {}) {
  const excluded = new Set(exclude);
  const excludedRecordings = new Set((items || []).filter(item => excluded.has(item?.id)).map(recordingKey));
  const unique = new Map();
  for (const item of items || []) { if (!item?.id || excluded.has(item.id)) continue; const key=recordingKey(item); if (excludedRecordings.has(key)) continue; if (!unique.has(key)) unique.set(key,item); }
  const candidates=[...unique.values()]; const offset=candidates.length ? turn % candidates.length : 0; const rotated=[...candidates.slice(offset),...candidates.slice(0,offset)]; const selected=[], counts=new Map(); const primary=musicKey(seedArtist);
  const dispersion=Number.isFinite(Number(spread)) ? Math.max(0,Math.min(1,Number(spread))) : focus === "depth" ? 0 : 1;
  while(rotated.length && selected.length<limit){ rotated.sort((a,b)=>{ const cost=item => (counts.get(musicKey(item.artist))||0)*4*dispersion + (primary && musicKey(item.artist)===primary ? 2*dispersion : 0); return cost(a)-cost(b); }); const item=rotated.shift(); selected.push(item); counts.set(musicKey(item.artist),(counts.get(musicKey(item.artist))||0)+1); }
  return selected;
}

export function matchesRecording(video, item) {
  if (!item.artist || !item.title || item.type === "artist" || item.type === "label") return false;
  const title = musicKey(video.title), artist = musicKey(item.artist), track = musicKey(item.title);
  const channel = musicKey(video.channelTitle).replace(/ topic$/, "");
  const containsPhrase = (text, phrase) => phrase && ` ${text} `.includes(` ${phrase} `);
  if (!artist || !track || !(containsPhrase(title, artist) || channel === artist)) return false;
  if (!containsPhrase(title, track)) return false;
  const expected = /\b(remix|live|cover|edit|instrumental|acapella)\b/.exec(track)?.[0];
  const actual = /\b(remix|live|cover|edit|instrumental|acapella)\b/.exec(title)?.[0];
  return expected === actual;
}

export function dateDescription(item, now = new Date()) {
  const dates = item.dates || {};
  const release = musicalReleaseDate(item);
  if (release && Date.parse(release) > now.getTime()) return `Annoncé pour le ${release}`;
  if (release) return `Sortie : ${release}${dates.reissue || dates.isReissue ? ` · Réédition : ${dates.reissue || dates.releaseDate || dates.release || "date inconnue"}` : ""}`;
  if (dates.reissue || dates.isReissue) return `Réédition : ${dates.reissue || dates.releaseDate || dates.release || "date inconnue"} · Première sortie non renseignée`;
  return item.publishedAt ? `Publication YouTube : ${item.publishedAt.slice(0, 10)} · Sortie musicale non renseignée` : "Date de sortie non renseignée";
}
