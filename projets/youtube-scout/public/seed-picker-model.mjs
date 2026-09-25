import { musicalReleaseDate } from './music-sorting.mjs';
import { videoArtistEvidence } from './video-credits.mjs';
// Presentation/search projection only: never promote a title guess to an identity.
export const SEED_TYPES = { track: "Morceau / vidéo", artist: "Artiste", label: "Label", playlist: "Playlist" };
const normalized = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();

export function seedPickerChoices(catalog = {}, { graph = {}, library = [], playlists = [], query = "", type = "all" } = {}) {
  const videos = new Map(library.map(video => [`video:youtube:${video.id}`, video]));
  const playlistNames = new Map(playlists.map(playlist => [playlist.id, playlist.title || playlist.snippet?.title || ""]));
  const credits = new Map();
  const addCredit = (id, name) => { if (name) credits.set(id, [...new Set([...(credits.get(id) || []), name])]); };
  const edges = Object.values(graph.edges || {});
  for (const edge of edges) {
    if (["candidate", "unresolved", "local_hypothesis", "inferred", "rejected_user"].includes(edge.status)) continue;
    if (edge.kind === "probable_artist" && ["confirmed_user", "confirmed_cross_id", "corroborated"].includes(edge.status)) addCredit(edge.from, graph.entities?.[edge.to]?.name);
    if (["credited_on", "primary_artist"].includes(edge.kind) && ["observed", "confirmed_user", "confirmed_cross_id", "corroborated", "user_supplied"].includes(edge.status)) {
      if (graph.entities?.[edge.from]?.type === "artist") addCredit(edge.to, graph.entities[edge.from].name);
      if (graph.entities?.[edge.to]?.type === "artist") addCredit(edge.from, graph.entities[edge.to].name);
    }
  }
  for (const edge of edges) if (edge.kind === "embodies" && ["observed", "confirmed_user", "confirmed_cross_id", "corroborated"].includes(edge.status)) {
    for (const name of credits.get(edge.to) || []) addCredit(edge.from, name);
  }
  const needle = normalized(query);
  const choices = Object.values(catalog).flat().filter(seed => type === "all" || seed.type === type).map(seed => {
    const entity = graph.entities?.[seed.id] || {};
    const video = videos.get(seed.id);
    // A user-supplied name remains a declaration, not a verified catalogue identity.
    const artist = (entity.departureArtist?.source === "user" ? entity.departureArtist.name : "") || (!video?.artistInference ? video?.artist : "") || "";
    const metadataArtist = videoArtistEvidence(video || entity)?.name || "";
    const credit = (credits.get(seed.id) || []).join(", ");
    const channel = video?.channelTitle || entity.channelTitle || "";
    const playlist = (video?.playlistIds || []).map(id => playlistNames.get(id)).filter(Boolean).join(", ");
    const providers = [...new Set((seed.memberIds || [seed.id]).flatMap(id => {
      const ids = graph.entities?.[id]?.externalIds || {};
      return [ids.discogs ? "Discogs" : "", ids.musicbrainz ? "MusicBrainz" : ""].filter(Boolean);
    }))].join(" · ");
    const context = [artist ? `Artiste renseigné : ${artist}` : credit ? `Crédit : ${credit}` : metadataArtist ? `Artiste indiqué sur YouTube : ${metadataArtist}` : "", channel ? `Chaîne : ${channel}` : "", playlist ? `Playlist : ${playlist}` : ""].filter(Boolean).join(" · ");
    const subtitle = context || providers || (seed.type === "track" ? "Artiste à vérifier à l’étape suivante" : "Référence locale");
    return { ...seed, artist: artist || credit || metadataArtist, dates: video?.dates || entity.dates, releaseDate: musicalReleaseDate(video || {}) || entity.firstReleaseDate || entity.releaseDate, subtitle, typeLabel: SEED_TYPES[seed.type] || seed.type, searchText: normalized([seed.label, artist, credit, metadataArtist, channel, playlist].join(" ")) };
  }).filter(seed => !needle || needle.split(/\s+/).every(word => seed.searchText.includes(word)));
  const rank = seed => !needle ? 3 : normalized(seed.label) === needle ? 0 : normalized(seed.label).startsWith(needle) ? 1 : 2;
  return choices.map(seed => ({ ...seed, searchRank: rank(seed) })).sort((a, b) => a.searchRank - b.searchRank || a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id));
}
