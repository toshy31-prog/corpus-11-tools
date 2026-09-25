function clean(value = "") {
  if (value == null) return "";

  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function unique(values = []) {
  const seen = new Set();
  const result = [];

  for (const raw of values) {
    const value = clean(raw);

    if (!value) continue;

    const key =
      value.toLocaleLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function artistNames(artists = []) {
  return unique(
    artists.map((artist) =>
      typeof artist === "string"
        ? artist
        : artist?.anv ||
          artist?.name
    )
  );
}

function artistIds(artists = []) {
  return unique(
    artists.map((artist) =>
      artist?.id == null
        ? ""
        : String(artist.id)
    )
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
  return clean(title)
    .replace(
      /\s*\(([^()]*(?:mix|remix|edit|version|dub|rework)[^()]*)\)\s*$/iu,
      ""
    )
    .trim();
}

function durationMs(value) {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value > 10000
      ? value
      : value * 1000;
  }

  const text = clean(value);

  if (!text) return null;

  const parts =
    text.split(":")
      .map(Number);

  if (
    parts.some(
      (part) =>
        !Number.isFinite(part)
    )
  ) {
    return null;
  }

  if (parts.length === 2) {
    return (
      parts[0] * 60000 +
      parts[1] * 1000
    );
  }

  if (parts.length === 3) {
    return (
      parts[0] * 3600000 +
      parts[1] * 60000 +
      parts[2] * 1000
    );
  }

  return null;
}

function catalogueCode(release = {}) {
  for (
    const label of
    release.labels || []
  ) {
    const value =
      clean(
        label?.catno ||
        label?.catalog_number
      );

    if (
      value &&
      value.toLocaleLowerCase() !==
        "none"
    ) {
      return value;
    }
  }

  return "";
}

function usableTrack(track = {}) {
  const type =
    clean(track.type_).toLocaleLowerCase();

  if (
    type === "heading" ||
    type === "index"
  ) {
    return false;
  }

  return Boolean(clean(track.title));
}

export function adaptDiscogsReleaseTrack(
  release = {},
  track = {},
  index = 0
) {
  const rawTitle =
    clean(track.title);

  const version =
    inferVersion(rawTitle);

  const trackArtists =
    artistNames(track.artists || []);

  const releaseArtists =
    artistNames(release.artists || []);

  const artists =
    trackArtists.length
      ? trackArtists
      : releaseArtists;

  const sourceId =
    [
      release.id,
      clean(track.position) ||
        String(index + 1)
    ]
      .filter(Boolean)
      .join(":");

  return {
    source: "discogs",
    sourceId,

    artists,

    title:
      version
        ? stripVersion(rawTitle)
        : rawTitle,

    version,

    catalogueCode:
      catalogueCode(release),

    durationMs:
      durationMs(track.duration),

    evidence: {
      releaseId:
        release.id == null
          ? null
          : String(release.id),

      masterId:
        release.master_id == null
          ? null
          : String(release.master_id),

      releaseTitle:
        clean(release.title) || null,

      trackPosition:
        clean(track.position) || null,

      trackIndex: index,

      trackTitle:
        rawTitle,

      trackArtistIds:
        artistIds(track.artists || []),

      releaseArtistIds:
        artistIds(release.artists || []),

      labelIds:
        unique(
          (release.labels || [])
            .map(({ id }) =>
              id == null
                ? ""
                : String(id)
            )
        ),

      resourceUrl:
        clean(release.resource_url) ||
        null,

      provenance:
        "discogs_release_tracklist"
    },

    raw: {
      release,
      track
    }
  };
}

export function adaptDiscogsReleaseTracks(
  release = {}
) {
  return (release.tracklist || [])
    .map(
      (track, index) =>
        usableTrack(track) ? adaptDiscogsReleaseTrack(
          release,
          track,
          index
        ) : null
    )
    .filter(Boolean)
    .filter(
      ({ sourceId, title, artists }) =>
        sourceId &&
        title &&
        artists.length
    );
}
