
function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

export async function fetchJson(url, {
  headers = {},
  timeoutMs = 12000
} = {}) {
  const controller = new AbortController();
  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(url, {
        headers,
        signal: controller.signal
      });

    const text =
      await response.text();

    let data = null;

    try {
      data = JSON.parse(text);
    } catch {}

    return {
      ok: response.ok,
      status: response.status,
      data,
      text
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYouTubeOEmbed(
  videoId
) {
  const id = clean(videoId);

  if (!id) {
    return {
      source: "youtube_oembed",
      ok: false,
      observations: [],
      diagnostics: {
        reason: "missing_video_id"
      }
    };
  }

  const url =
    new URL(
      "https://www.youtube.com/oembed"
    );

  url.searchParams.set(
    "url",
    `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
  );

  url.searchParams.set(
    "format",
    "json"
  );

  try {
    const result =
      await fetchJson(
        url,
        {
          headers: {
            "user-agent":
              "youtube-scout/0.14 read-only-multisource-audit"
          }
        }
      );

    if (!result.ok || !result.data) {
      return {
        source: "youtube_oembed",
        ok: false,
        observations: [],
        diagnostics: {
          status: result.status
        }
      };
    }

    const observations = [];

    if (clean(result.data.author_name)) {
      observations.push({
        kind: "artist",
        value:
          clean(result.data.author_name)
            .replace(/\s*-\s*Topic$/iu, ""),
        role: "remote_channel_author",
        strength:
          /-\s*Topic$/iu.test(
            clean(result.data.author_name)
          )
            ? 0.78
            : 0.62
      });
    }

    return {
      source: "youtube_oembed",
      ok: true,
      observations,
      diagnostics: {
        title:
          clean(result.data.title),
        authorName:
          clean(result.data.author_name)
      }
    };
  } catch (error) {
    return {
      source: "youtube_oembed",
      ok: false,
      observations: [],
      diagnostics: {
        error:
          String(
            error?.message ||
            error
          )
      }
    };
  }
}

function metaContent(html, property) {
  const escaped =
    property.replace(
      /[.*+?^${}()|[\]\\]/gu,
      "\\$&"
    );

  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      "iu"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`,
      "iu"
    ),
    new RegExp(
      `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      "iu"
    )
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]);
  }

  return "";
}

export async function fetchYouTubeWatchMetadata(
  videoId
) {
  const id = clean(videoId);

  if (!id) {
    return {
      source: "youtube_watch",
      ok: false,
      observations: [],
      diagnostics: {
        reason: "missing_video_id"
      }
    };
  }

  const url =
    `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

  try {
    const response =
      await fetchJson(
        url,
        {
          headers: {
            "user-agent":
              "Mozilla/5.0 youtube-scout-read-only-audit"
          },
          timeoutMs: 15000
        }
      );

    if (!response.ok) {
      return {
        source: "youtube_watch",
        ok: false,
        observations: [],
        diagnostics: {
          status:
            response.status
        }
      };
    }

    const html =
      response.text || "";

    const title =
      clean(
        metaContent(
          html,
          "og:title"
        )
      );

    const description =
      clean(
        metaContent(
          html,
          "og:description"
        )
      );

    const canonicalChannel =
      clean(
        metaContent(
          html,
          "author"
        )
      );

    const observations = [];

    if (canonicalChannel) {
      observations.push({
        kind: "artist",
        value:
          canonicalChannel.replace(
            /\s*-\s*Topic$/iu,
            ""
          ),
        role:
          "remote_watch_author",
        strength:
          /-\s*Topic$/iu.test(
            canonicalChannel
          )
            ? 0.82
            : 0.65
      });
    }

    return {
      source: "youtube_watch",
      ok: true,
      observations,
      diagnostics: {
        title,
        description:
          description.slice(
            0,
            500
          ),
        canonicalChannel
      }
    };
  } catch (error) {
    return {
      source: "youtube_watch",
      ok: false,
      observations: [],
      diagnostics: {
        error:
          String(
            error?.message ||
            error
          )
      }
    };
  }
}
