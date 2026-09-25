function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalized(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const text = clean(value);
    const key = normalized(text);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    out.push(text);
  }

  return out;
}

function topicHeaderArtists(description = "") {
  const lines =
    String(description || "")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);

  const firstMusicLine =
    lines.find((line) => line.includes(" · "));

  if (!firstMusicLine) return [];

  const parts =
    firstMusicLine
      .split(" · ")
      .map(clean)
      .filter(Boolean);

  // Sur les descriptions Topic :
  // "Titre · Artiste · crédit supplémentaire..."
  return parts.slice(1);
}

function explicitFieldArtists(description = "") {
  const artists = [];

  for (
    const line of
    String(description || "").split(/\r?\n/u)
  ) {
    const m =
      line.match(
        /^\s*(?:main\s+artist|primary\s+artist|artist|featured\s+artist|featuring\s+artist|performer)\s*:\s*(.+?)\s*$/iu
      );

    if (m) artists.push(m[1]);
  }

  return uniqueStrings(artists);
}

export function collectYouTubeLocalEvidence(item = {}) {
  const title = clean(item.title);
  const channelTitle = clean(item.channelTitle);
  const description = String(item.description || "");

  const topicChannel =
    /-\s*Topic$/iu.test(channelTitle)
      ? clean(
          channelTitle.replace(
            /\s*-\s*Topic$/iu,
            ""
          )
        )
      : "";

  const explicitArtists =
    explicitFieldArtists(description);

  const headerArtists =
    topicHeaderArtists(description);

  const artists =
    uniqueStrings([
      ...explicitArtists,
      ...headerArtists
    ]);

  const observations = [];

  for (const artist of explicitArtists) {
    observations.push({
      kind: "artist",
      value: artist,
      role: "primary_or_credited",
      source: "youtube_description_explicit_field",
      strength: 0.98
    });
  }

  for (const artist of headerArtists) {
    observations.push({
      kind: "artist",
      value: artist,
      role: "topic_header_credit",
      source: "youtube_topic_header",
      strength: 0.94
    });
  }

  if (topicChannel) {
    observations.push({
      kind: "artist",
      value: topicChannel,
      role: "channel_hint",
      source: "youtube_topic_channel",
      strength: 0.68
    });
  }

  return {
    source: "youtube_local",
    title,
    channelTitle,
    topicChannel,
    artists,
    observations,
    diagnostics: {
      hasDescription:
        Boolean(clean(description)),
      hasTopicChannel:
        Boolean(topicChannel),
      explicitArtistCount:
        explicitArtists.length,
      topicHeaderArtistCount:
        headerArtists.length
    }
  };
}
