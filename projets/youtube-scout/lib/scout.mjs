import { videoArtistEvidence } from "./video-credits.mjs";
import { splitArtistNames } from "./artist-names.mjs";

export const LENSES = Object.freeze([
  {
    id: "forgotten",
    label: "Fond de playlist",
    description: "Fait remonter les vidéos ajoutées il y a longtemps et jamais choisies ici."
  },
  {
    id: "deep-cut",
    label: "Deep cut",
    description: "Privilégie les vidéos discrètes, loin des évidences les plus vues."
  },
  {
    id: "crossroads",
    label: "Carrefour",
    description: "Favorise les vidéos présentes dans plusieurs de vos playlists."
  },
  {
    id: "off-center",
    label: "Hors-centre",
    description: "Évite que quelques chaînes dominantes monopolisent le programme."
  },
  {
    id: "wildcard",
    label: "Accident heureux",
    description: "Introduit un écart stable pour rompre les automatismes."
  },
  {
    id: "fresh",
    label: "Récentes dans mes playlists",
    description: "Favorise les publications récentes déjà présentes dans les playlists importées."
  },
  {
    id: "network",
    label: "Connexions créditées",
    description: "Favorise les featurings, remixes et croisements observables entre playlists."
  }
]);

export const PROGRAM_ROLES = Object.freeze([
  {
    id: "entry",
    label: "Le point d’entrée",
    description: "La vidéo qui répond le plus nettement au mode de fouille choisi."
  },
  {
    id: "sidestep",
    label: "Le pas de côté",
    description: "Le même fil, déplacé vers une autre chaîne, durée ou playlist."
  },
  {
    id: "deep-cut",
    label: "Le deep cut",
    description: "Une pièce moins évidente de votre propre travail de curation."
  },
  {
    id: "fork",
    label: "La bifurcation",
    description: "La proposition qui ouvre le plus nettement une autre direction."
  }
]);

const LENS_IDS = new Set(LENSES.map(({ id }) => id));
function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function parseIsoDuration(value = "") {
  const match = String(value).match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0);
}

export function extractPlaylistId(value = "") {
  const source = String(value).trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(source)) return source;
  try {
    const url = new URL(source);
    const id = url.searchParams.get("list");
    return id && /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function cleanArtistName(value = "") {
  return String(value)
    .replace(/\s+-\s+Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s+(?:official|music)$/i, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s{2,}/g, " ");
}

export function guessArtist(video = {}) {
  const credited = videoArtistEvidence(video);
  if (credited) return credited;
  const title = String(video.title || "").trim();
  const channel = String(video.channelTitle || "").trim();
  const tags = (video.tags || []).join(" ").toLocaleLowerCase("fr-FR");
  const topicChannel = /\s+-\s+Topic$/i.test(channel);
  const vevoChannel = /VEVO$/i.test(channel);
  const musicSignal = String(video.categoryId || "") === "10" || topicChannel || vevoChannel || /\bmusic\b|\bmusique\b/.test(tags);
  if (!musicSignal) return null;

  if (topicChannel || vevoChannel) {
    const name = cleanArtistName(channel);
    return name ? { name, confidence: 0.96, basis: topicChannel ? "chaîne Topic" : "chaîne VEVO" } : null;
  }

  const separator = title.match(/^(.{1,90}?)\s+(?:-|–|—)\s+(.+)/);
  if (separator) {
    const name = cleanArtistName(separator[1].replace(/\s+(?:feat\.?|ft\.?)\s+.*$/i, ""));
    if (name && !/various artists|artistes divers/i.test(name)) {
      return {
        name,
        confidence: 0.72,
        basis: "syntaxe de titre non corroborée"
      };
    }
  }

  const name = cleanArtistName(channel);
  return name ? { name, confidence: 0.55, basis: "chaîne classée Musique" } : null;
}

export function extractCreditArtists(video = {}) {
  return extractCreditRelations(video).map(({ artist }) => artist);
}

export function extractCreditRelations(video = {}) {
  const title = String(video.title || "");
  const candidates = [];
  const featured = title.match(/\b(?:feat(?:uring)?|ft|with)\.?\s+([^()[\]–—-]+)/i);
  if (featured?.[1]) candidates.push(...featured[1].split(/\s*(?:,|&|\+|\bx\b)\s*/i).map((artist) => ({ artist, kind: "featuring" })));
  for (const match of title.matchAll(/[([]\s*([^()[\]]+?)\s+(?:remix|rework|edit|mix)\s*[)\]]/gi)) {
    candidates.push({ artist: match[1], kind: "remix" });
  }
  const primary = normalizedArtistKey(guessArtist(video)?.name || "");
  const genericCredits = new Set([
    "original", "official", "extended", "radio", "club", "dub", "vocal", "instrumental",
    "album", "single", "live", "full", "audio", "video", "version"
  ]);
  const relations = new Map();
  for (const candidate of candidates) {
    const artist = cleanArtistName(candidate.artist).replace(/^(?:by|par)\s+/i, "").trim();
    const normalized = normalizedArtistKey(artist);
    if (artist.length < 2 || artist.length > 80 || normalized === primary || genericCredits.has(normalized)) continue;
    relations.set(`${normalized}:${candidate.kind}`, { artist, kind: candidate.kind });
  }
  return [...relations.values()];
}

function normalizedArtistKey(value = "") {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function collaborationEdgeKey(left, right) {
  return [normalizedArtistKey(left), normalizedArtistKey(right)].sort().join("\u0000");
}

export function buildCollaborationIndex(videos = [], corrections = {}) {
  const edges = new Map();
  for (const video of videos) {
    const corrected = String(corrections?.[video?.id] || "").trim();
    const guessed = guessArtist(video);
    /*
     * Une simple chaîne YouTube classée Musique n'est pas une identité
     * suffisante pour devenir le pôle artiste d'un graphe de collaborations.
     * Les corrections utilisateur restent explicites ; les inférences
     * automatiques doivent franchir la même frontière que l'exploration.
     */
    /*
     * Frontière spécifique au graphe de collaborations :
     *
     * - une correction utilisateur est explicite ;
     * - Topic / VEVO restent forts ;
     * - une syntaxe de titre Artist - Title / Artist feat. Guest - Title
     *   peut servir à extraire un co-crédit local traçable ;
     * - une simple chaîne YouTube classée Musique (0.55) ne suffit pas.
     *
     * Cette règle est volontairement plus permissive que celle du picker.
     * Elle ne rend PAS l'artiste éligible comme seed : buildSeedCatalog()
     * conserve sa propre frontière de preuve.
     */
    const primary =
      corrected ||
      (Number(guessed?.confidence || 0) >= 0.7 ? guessed.name : "");
    const primaryNames = splitArtistNames(primary);
    if (!primaryNames.length) continue;
    const relations = [...extractCreditRelations(video), ...primaryNames.map(artist => ({ artist, kind: "featuring" }))];
    for (const primary of primaryNames) {
    const primaryKey = normalizedArtistKey(primary);
    for (const relation of relations) {
      const collaboratorKey = normalizedArtistKey(relation.artist);
      if (!collaboratorKey || collaboratorKey === primaryKey) continue;
      const key = collaborationEdgeKey(primary, relation.artist);
      const edge = edges.get(key) || {
        key,
        artists: [primary, relation.artist],
        artistKeys: [primaryKey, collaboratorKey],
        videoIds: [],
        workKeys: [],
        examples: [],
        kinds: { featuring: 0, remix: 0 }
      };
      if (!edge.videoIds.includes(video.id)) {
        edge.videoIds.push(video.id);
        edge.examples.push({ id: video.id, title: video.title || "Vidéo sans titre" });
        const workKey = video.isrc || video.recordingId || normalizedArtistKey(String(video.title || video.id).replace(/\s*[([](?:official (?:music )?(?:video|audio)|hd|hq)[)\]]/gi, ""));
        if (!edge.workKeys.includes(`${relation.kind}:${workKey}`)) {
          edge.workKeys.push(`${relation.kind}:${workKey}`);
          edge.kinds[relation.kind] = Number(edge.kinds[relation.kind] || 0) + 1;
        }
      }
      edges.set(key, edge);
    }
    }
  }
  return [...edges.values()]
    .map((edge) => ({ ...edge, count: edge.workKeys.length }))
    .sort((left, right) => right.count - left.count || left.artists.join(" ").localeCompare(right.artists.join(" "), "fr"));
}

export function artistCollaborationProfile(index = [], artistName = "") {
  const artistKey = normalizedArtistKey(artistName);
  const connections = index.filter(({ artistKeys }) => artistKeys.includes(artistKey)).map((edge) => {
    const partnerIndex = edge.artistKeys[0] === artistKey ? 1 : 0;
    return { ...edge, partner: edge.artists[partnerIndex], partnerKey: edge.artistKeys[partnerIndex] };
  }).sort((left, right) => right.count - left.count || left.partner.localeCompare(right.partner, "fr"));
  const videoIds = new Set(connections.flatMap(({ videoIds: ids }) => ids));
  const known = new Set([artistKey, ...connections.map(({ partnerKey }) => partnerKey)]);
  const secondDegree = [];
  for (const connection of connections) for (const edge of index) {
    if (!edge.artistKeys.includes(connection.partnerKey)) continue;
    const next = edge.artistKeys[0] === connection.partnerKey ? 1 : 0;
    if (known.has(edge.artistKeys[next])) continue;
    if (!secondDegree.some(item => item.partnerKey === edge.artistKeys[next] && item.via === connection.partner)) secondDegree.push({ partner: edge.artists[next], partnerKey: edge.artistKeys[next], via: connection.partner, count: edge.count, examples: edge.examples });
  }
  return {
    artist: artistName,
    partnerCount: connections.length,
    occurrenceCount: connections.reduce((sum, { count }) => sum + count, 0),
    videoCount: videoIds.size,
    secondDegree,
    connections
  };
}

export function normalizeFilters(input = {}) {
  return {
    maxDuration: Math.round(boundedNumber(input.maxDuration, 240, 1, 1440)),
    temperature: Math.round(boundedNumber(input.temperature, 55, 0, 100)),
    hideSeen: input.hideSeen !== false,
    seen: [...new Set((Array.isArray(input.seen) ? input.seen : []).filter((id) => typeof id === "string" && id))],
    playlistIds: [...new Set((Array.isArray(input.playlistIds) ? input.playlistIds : []).filter((id) => typeof id === "string" && id))],
    lenses: [...new Set((Array.isArray(input.lenses) ? input.lenses : []).filter((id) => LENS_IDS.has(id)))]
  };
}

function normalized(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || min === max) return values.map(() => 0.5);
  return values.map((value) => (value - min) / (max - min));
}

function stableNoise(id) {
  let hash = 2166136261;
  for (const character of String(id)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function timestamp(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : Date.now();
}

export function rankVideos(videos, inputFilters = {}, context = {}) {
  const filters = normalizeFilters(inputFilters);
  const active = new Set(filters.lenses);
  const exposureCounts = context.exposureCounts || {};
  const rerollKey = String(context.rerollKey || "");
  const eligible = videos.filter((video) => {
    if (!video?.id || video.availability === "private" || video.availability === "deleted") return false;
    if (filters.hideSeen && filters.seen.includes(video.id)) return false;
    if (filters.playlistIds.length && !(video.playlistIds || []).some((id) => filters.playlistIds.includes(id))) return false;
    return !video.durationSeconds || video.durationSeconds <= filters.maxDuration * 60;
  });
  if (!eligible.length) return [];

  const views = normalized(eligible.map((video) => Math.log10(1 + Number(video.viewCount || 0))));
  const additions = normalized(eligible.map((video) => Math.max(0, Date.now() - timestamp(video.addedAt))));
  const publicationAges = normalized(eligible.map((video) => Math.max(0, Date.now() - timestamp(video.publishedAt))));
  const positions = normalized(eligible.map((video) => Number(video.position || 0)));
  const channelFrequency = new Map();
  for (const video of eligible) channelFrequency.set(video.channelId || video.channelTitle, (channelFrequency.get(video.channelId || video.channelTitle) || 0) + 1);

  return eligible.map((video, index) => {
    const reasons = [];
    const scores = [];
    if (active.has("forgotten")) scores.push(["Fond de playlist", additions[index] * 0.7 + positions[index] * 0.3]);
    if (active.has("deep-cut")) scores.push(["Deep cut", (1 - views[index]) * 0.75 + additions[index] * 0.25]);
    if (active.has("crossroads")) scores.push(["Carrefour", Math.min(1, Math.max(0, (video.playlistIds || []).length - 1) / 2)]);
    if (active.has("off-center")) {
      const frequency = channelFrequency.get(video.channelId || video.channelTitle) || 1;
      scores.push(["Hors-centre", 1 - (frequency - 1) / Math.max(1, eligible.length - 1)]);
    }
    if (active.has("wildcard")) scores.push(["Accident heureux", stableNoise(video.id)]);
    if (active.has("fresh")) scores.push(["Récentes dans mes playlists", 1 - publicationAges[index]]);
    if (active.has("network")) {
      const credits = Math.min(1, extractCreditRelations(video).length);
      const crossings = Math.min(1, Math.max(0, (video.playlistIds || []).length - 1) / 2);
      scores.push(["Connexions créditées", credits * 0.8 + crossings * 0.2]);
    }
    const lensScore = scores.reduce((sum, [, score]) => sum + score, 0);
    const variation = rerollKey && filters.temperature > 0 ? (stableNoise(`${video.id}:${rerollKey}`) - 0.5) * (filters.temperature / 35) : 0;
    const exposurePenalty = Math.min(2.5, Number(exposureCounts[video.id] || 0) * 0.5);
    reasons.push(...scores.filter(([, score]) => score >= 0.55).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([label]) => label));
    return {
      video: { ...video, why: [...new Set(reasons)].slice(0, 3) },
      score: lensScore + (1 - index / Math.max(1, eligible.length - 1)) * 0.1 + variation - exposurePenalty
    };
  }).sort((left, right) => right.score - left.score).map(({ video }) => video);
}

function videoDistance(left, right) {
  const leftPlaylists = new Set(left.playlistIds || []);
  const rightPlaylists = new Set(right.playlistIds || []);
  const union = new Set([...leftPlaylists, ...rightPlaylists]);
  const shared = [...leftPlaylists].filter((id) => rightPlaylists.has(id)).length;
  const playlistDistance = union.size ? 1 - shared / union.size : 0.5;
  const channelDistance = (left.channelId || left.channelTitle) === (right.channelId || right.channelTitle) ? 0 : 1;
  const durationDistance = Math.min(1, Math.abs(Number(left.durationSeconds || 0) - Number(right.durationSeconds || 0)) / 3600);
  const yearDistance = Math.min(1, Math.abs(new Date(left.publishedAt || 0).getFullYear() - new Date(right.publishedAt || 0).getFullYear()) / 12) || 0;
  return channelDistance * 0.4 + playlistDistance * 0.25 + durationDistance * 0.2 + yearDistance * 0.15;
}

function bestIndex(items, score) {
  return items.reduce((best, item, index) => score(item, index) > score(items[best], best) ? index : best, 0);
}

export function composeProgramme(rankedVideos, limit = PROGRAM_ROLES.length) {
  const remaining = rankedVideos.map((video, sourceIndex) => ({ ...video, sourceIndex }));
  const programme = [];
  const take = (index, role) => {
    const [video] = remaining.splice(index, 1);
    programme.push({ ...video, role: { ...role } });
  };
  if (!remaining.length || limit <= 0) return [];
  take(0, PROGRAM_ROLES[0]);

  if (remaining.length && programme.length < limit) {
    const anchor = programme[0];
    take(bestIndex(remaining, (video) => videoDistance(anchor, video) * 0.65 + (1 - video.sourceIndex / Math.max(1, rankedVideos.length - 1)) * 0.35), PROGRAM_ROLES[1]);
  }
  if (remaining.length && programme.length < limit) {
    take(bestIndex(remaining, (video) => {
      const deepSignal = (video.why || []).some((reason) => /Deep cut|Fond de playlist|Accident/.test(reason)) ? 1 : 0;
      return deepSignal * 0.5 + (1 - video.sourceIndex / Math.max(1, rankedVideos.length - 1)) * 0.2 + stableNoise(video.id) * 0.3;
    }), PROGRAM_ROLES[2]);
  }
  if (remaining.length && programme.length < limit) {
    take(bestIndex(remaining, (video) => programme.reduce((sum, chosen) => sum + videoDistance(chosen, video), 0) / programme.length), PROGRAM_ROLES[3]);
  }
  return programme.slice(0, Math.min(limit, PROGRAM_ROLES.length)).map(({ sourceIndex, ...video }) => video);
}
