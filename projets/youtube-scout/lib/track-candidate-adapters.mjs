function clean(value = "") {
  if (value == null) return "";
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function finitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0
    ? n
    : null;
}

function unique(values = []) {
  const seen = new Set();
  const result = [];

  for (const raw of values) {
    const value = clean(raw);
    if (!value) continue;

    const key = value.toLocaleLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function musicBrainzArtists(recording = {}) {
  return unique(
    (recording["artist-credit"] || [])
      .flatMap((credit) => {
        if (typeof credit === "string") {
          return [credit];
        }

        return [
          credit?.name,
          credit?.artist?.name
        ];
      })
  );
}

function musicBrainzArtistIds(recording = {}) {
  return unique(
    (recording["artist-credit"] || [])
      .map((credit) => credit?.artist?.id)
  );
}

function releaseCatalogueCodes(releases = []) {
  const codes = [];

  for (const release of releases || []) {
    for (const info of release["label-info"] || []) {
      if (info?.["catalog-number"]) {
        codes.push(info["catalog-number"]);
      }
    }
  }

  return unique(codes);
}

function firstUsefulCatalogueCode(releases = []) {
  return releaseCatalogueCodes(releases)[0] || "";
}

function musicBrainzReleaseIds(releases = []) {
  return unique(
    (releases || []).map(({ id }) => id)
  );
}

function inferVersion(title = "") {
  const value = clean(title);

  const match = value.match(
    /\(([^()]*(?:mix|remix|edit|version|dub|rework)[^()]*)\)\s*$/iu
  );

  return match
    ? clean(match[1])
    : "";
}

function stripVersion(title = "") {
  const value = clean(title);

  return value
    .replace(
      /\s*\(([^()]*(?:mix|remix|edit|version|dub|rework)[^()]*)\)\s*$/iu,
      ""
    )
    .trim();
}

export function adaptMusicBrainzRecording(
  recording = {}
) {
  const rawTitle = clean(recording.title);
  const version = inferVersion(rawTitle);

  return {
    source: "musicbrainz",
    sourceId: clean(recording.id),

    artists:
      musicBrainzArtists(recording),

    title:
      version
        ? stripVersion(rawTitle)
        : rawTitle,

    version,

    catalogueCode:
      firstUsefulCatalogueCode(
        recording.releases || []
      ),

    durationMs:
      finitePositive(recording.length),

    evidence: {
      recordingId:
        clean(recording.id) || null,

      artistIds:
        musicBrainzArtistIds(recording),

      releaseIds:
        musicBrainzReleaseIds(
          recording.releases || []
        ),

      catalogueCodes:
        releaseCatalogueCodes(
          recording.releases || []
        ),

      score:
        finitePositive(recording.score),

      provenance:
        "musicbrainz_recording"
    },

    raw: recording
  };
}

export function adaptMusicBrainzResponse(
  payload = {}
) {
  return (payload.recordings || [])
    .map(adaptMusicBrainzRecording)
    .filter(
      ({ sourceId, title, artists }) =>
        sourceId &&
        title &&
        artists.length
    );
}

function discogsArtists(item = {}) {
  const direct = [
    ...(item.artists || []),
    ...(item.extraartists || [])
      .filter(({ role = "" }) =>
        /^(?:main|primary)\s*artist$/iu.test(
          clean(role)
        )
      )
  ];

  const names = direct.map((artist) =>
    typeof artist === "string"
      ? artist
      : artist?.name
  );

  /*
   * Les résultats de recherche Discogs peuvent n'avoir
   * qu'un champ "title" sous la forme "Artist - Track".
   */
  if (!names.some(Boolean)) {
    const title = clean(item.title);
    const boundary = title.indexOf(" - ");

    if (boundary > 0) {
      names.push(
        title.slice(0, boundary)
      );
    }
  }

  return unique(names);
}

function discogsRawTitle(item = {}) {
  const value = clean(
    item.trackTitle ||
    item.track_title ||
    item.title
  );

  /*
   * Search API :
   * "Artist - Track"
   */
  if (
    !item.trackTitle &&
    !item.track_title
  ) {
    const boundary = value.indexOf(" - ");

    if (boundary > 0) {
      return clean(
        value.slice(boundary + 3)
      );
    }
  }

  return value;
}

function discogsCatalogueCode(item = {}) {
  if (item.catno) return clean(item.catno);

  const labels = item.labels || [];

  for (const label of labels) {
    const value =
      label?.catno ||
      label?.catalog_number ||
      label?.["catalog-number"];

    if (value) return clean(value);
  }

  return "";
}

function discogsDurationMs(item = {}) {
  const raw =
    item.duration ||
    item.trackDuration ||
    item.track_duration;

  if (typeof raw === "number") {
    /*
     * On considère les grands nombres comme ms
     * et les petits comme secondes.
     */
    return raw > 10000
      ? finitePositive(raw)
      : finitePositive(raw * 1000);
  }

  const text = clean(raw);

  if (!text) return null;

  const match = text.match(
    /^(?:(\d+):)?(\d{1,2}):(\d{2})$/
  );

  if (match) {
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);

    return (
      hours * 3600000 +
      minutes * 60000 +
      seconds * 1000
    );
  }

  const short = text.match(
    /^(\d+):(\d{2})$/
  );

  if (short) {
    return (
      Number(short[1]) * 60000 +
      Number(short[2]) * 1000
    );
  }

  return null;
}

function discogsArtistIds(item = {}) {
  return unique(
    (item.artists || [])
      .map(({ id }) =>
        id == null ? "" : String(id)
      )
  );
}

export function adaptDiscogsCandidate(
  item = {}
) {
  const rawTitle = discogsRawTitle(item);
  const version = inferVersion(rawTitle);

  return {
    source: "discogs",

    sourceId:
      clean(
        item.id ??
        item.master_id ??
        item.resource_url
      ),

    artists:
      discogsArtists(item),

    title:
      version
        ? stripVersion(rawTitle)
        : rawTitle,

    version,

    catalogueCode:
      discogsCatalogueCode(item),

    durationMs:
      discogsDurationMs(item),

    evidence: {
      releaseId:
        item.id == null
          ? null
          : String(item.id),

      masterId:
        item.master_id == null
          ? null
          : String(item.master_id),

      artistIds:
        discogsArtistIds(item),

      labelIds:
        unique(
          (item.labels || [])
            .map(({ id }) =>
              id == null ? "" : String(id)
            )
        ),

      resourceUrl:
        clean(item.resource_url) || null,

      provenance:
        "discogs_release_or_search"
    },

    raw: item
  };
}

export function adaptDiscogsResponse(
  payload = {}
) {
  const items =
    payload.results ||
    payload.releases ||
    [];

  return items
    .map(adaptDiscogsCandidate)
    .filter(
      ({ sourceId, title, artists }) =>
        sourceId &&
        title &&
        artists.length
    );
}

/*
 * Fusion volontairement NON identitaire :
 * elle concatène seulement les candidats de sources différentes.
 */
export function collectTrackCandidates({
  musicbrainz = null,
  discogs = null
} = {}) {
  return [
    ...(musicbrainz
      ? adaptMusicBrainzResponse(musicbrainz)
      : []),

    ...(discogs
      ? adaptDiscogsResponse(discogs)
      : [])
  ];
}
