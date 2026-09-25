import { adaptDiscogsReleaseTracks } from "./discogs-track-candidates.mjs";

// Bounded hydration through the existing throttled/cached provider. Search
// responses and malformed releases never become track-level evidence.
export async function hydrateRecordingReleases(candidates, loadRelease, { limit = 3 } = {}) {
  const ids = [...new Set((candidates || []).map(item => String(item.id || "")))]
    .filter(id => /^[1-9]\d*$/.test(id));
  const selected = ids.slice(0, Math.max(0, Math.min(3, Math.floor(limit))));
  const results = await Promise.allSettled(selected.map(async id => {
    const release = await loadRelease(id);
    if (String(release?.id) !== id || !Array.isArray(release.tracklist)) {
      throw new Error("Tracklist Discogs indisponible");
    }
    return { ...release, tracklist: release.tracklist.slice(0, 500) };
  }));
  const releases = results.filter(result => result.status === "fulfilled").map(result => result.value);
  return {
    tracks: releases.flatMap(adaptDiscogsReleaseTracks),
    coverage: {
      attempted: selected.length, loaded: releases.length,
      failed: results.length - releases.length,
      complete: selected.length === ids.length && releases.length === selected.length
    }
  };
}
