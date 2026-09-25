function normalizedKey(value = "") {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stableNoise(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

const PATH_STRENGTH = Object.freeze({ credit: 1, network: 1, label: 0.82, similar: 0.72, artist: 0.66 });

function candidateArtist(candidate = {}) {
  return normalizedKey(candidate.artist || String(candidate.title || "").split(/\s+(?:-|–|—)\s+/)[0] || candidate.channelTitle);
}

function baseScore(candidate, context) {
  const paths = candidate.paths || [];
  const evidence = Math.max(0.45, ...paths.map(({ kind }) => PATH_STRENGTH[kind] || 0.5));
  const exposure = Number(context.exposureCounts?.[candidate.id] || 0);
  const novelty = context.recentIds?.has(candidate.id) ? -1.2 : Math.max(-1, 0.65 - exposure * 0.38);
  const rarity = 1 - Math.min(1, Math.log10(1 + Number(candidate.viewCount || 0)) / 8);
  const reroll = stableNoise(`${candidate.id}:${context.rerollKey || "initial"}`) - 0.5;
  return evidence * 1.25 + novelty + rarity * 0.35 + reroll * 0.7;
}

export function rankDerivedCandidates(candidates = [], context = {}) {
  const remaining = candidates.filter(({ id }) => id && !context.excludeIds?.has(id)).map((candidate) => ({
    candidate,
    base: baseScore(candidate, context),
    artist: candidateArtist(candidate),
    channel: normalizedKey(candidate.channelTitle),
    kinds: new Set((candidate.paths || []).map(({ kind }) => kind))
  }));
  const selected = [];
  const artistCounts = new Map();
  const channelCounts = new Map();
  const kindCounts = new Map();
  const limit = Math.max(1, Number(context.limit || candidates.length));
  while (remaining.length && selected.length < limit) {
    remaining.sort((left, right) => {
      const adjusted = (entry) => {
        const kindReuse = entry.kinds.size
          ? Math.min(...[...entry.kinds].map((kind) => Number(kindCounts.get(kind) || 0)))
          : 0;
        return entry.base
          - Number(artistCounts.get(entry.artist) || 0) * 0.65
          - Number(channelCounts.get(entry.channel) || 0) * 0.55
          - kindReuse * 0.12;
      };
      return adjusted(right) - adjusted(left) || left.candidate.id.localeCompare(right.candidate.id);
    });
    const [next] = remaining.splice(0, 1);
    selected.push(next.candidate);
    artistCounts.set(next.artist, Number(artistCounts.get(next.artist) || 0) + 1);
    channelCounts.set(next.channel, Number(channelCounts.get(next.channel) || 0) + 1);
    for (const kind of next.kinds) kindCounts.set(kind, Number(kindCounts.get(kind) || 0) + 1);
  }
  return selected;
}

function platformObservation(platform, result = {}) {
  if (result.status === "not_configured") return { platform, status: "not_configured", basis: "credential_missing" };
  if (result.status === "unavailable") return { platform, status: "unavailable", basis: result.message || "request_failed" };
  const items = platform === "applemusic" ? result.songs || [] : result.tracks || [];
  const first = items[0];
  if (!first) return { platform, status: "not_found", basis: "isrc_lookup" };
  return {
    platform,
    status: "observed",
    basis: "isrc_lookup",
    url: platform === "applemusic" ? first.attributes?.url || "" : first.external_urls?.spotify || "",
    title: platform === "applemusic" ? first.attributes?.name || "" : first.name || "",
    artist: platform === "applemusic" ? first.attributes?.artistName || "" : (first.artists || []).map(({ name }) => name).join(" + "),
    releaseDate: platform === "applemusic" ? first.attributes?.releaseDate || "" : first.album?.release_date || "",
    markets: platform === "spotify" ? first.available_markets || [] : []
  };
}

export function compileAvailability({ isrc, territory = "FR", youtubeVideoId = "", applemusic = {}, spotify = {} } = {}) {
  const observations = [];
  if (youtubeVideoId) observations.push({
    platform: "youtube",
    status: "observed",
    basis: "source_video",
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`
  });
  observations.push(platformObservation("applemusic", applemusic));
  observations.push(platformObservation("spotify", spotify));
  const checked = observations.filter(({ status }) => status === "observed" || status === "not_found");
  const observed = checked.filter(({ status }) => status === "observed");
  const absent = checked.filter(({ status }) => status === "not_found");
  const missing = observations.filter(({ status }) => status === "not_configured" || status === "unavailable");
  const differential = observed.length && absent.length ? {
    status: "candidate",
    presentOn: observed.map(({ platform }) => platform),
    notFoundOn: absent.map(({ platform }) => platform),
    statement: `Présence observée sur ${observed.map(({ platform }) => platform).join(", ")} et aucune correspondance ISRC trouvée sur ${absent.map(({ platform }) => platform).join(", ")} pour ${territory}.`
  } : { status: "not_observed", presentOn: observed.map(({ platform }) => platform), notFoundOn: absent.map(({ platform }) => platform), statement: "Aucun différentiel de catalogue n’est observable avec les sources interrogées." };
  return {
    isrc,
    territory,
    observations,
    coverage: { checked: checked.length, observed: observed.length, absent: absent.length, missing: missing.map(({ platform, status }) => ({ platform, status })) },
    differential,
    exclusivity: {
      status: "not_established",
      statement: "Une exclusivité globale n’est pas établie : les catalogues non interrogés, les autres territoires et les variantes sans cet ISRC restent inconnus."
    }
  };
}
