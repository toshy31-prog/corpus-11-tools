import { videoArtistEvidence } from './video-credits.mjs';
import { musicalReleaseDate } from './music-sorting.mjs';
const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,100}$/;
const stripVideoPrefix = (value) => String(value || "").replace(/^video:youtube:/, "");
const watchUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
const channelUrl = (id) => `https://www.youtube.com/channel/${encodeURIComponent(id)}`;

function readCursor(value, seedId, channelId) {
  if (!value) return { pageToken: "" };
  let data;
  try { data = JSON.parse(value); } catch { throw new Error("Curseur de chaîne invalide. Rouvrez cette direction depuis votre départ."); }
  if (data?.version !== 1 || data.seedId !== seedId || !CHANNEL_ID.test(data.channelId || "") || (channelId && data.channelId !== channelId) || typeof data.pageToken !== "string" || data.pageToken.length > 2000) throw new Error("Ce curseur ne correspond pas au départ ou à la chaîne sélectionnée.");
  return data;
}

function encodeCursor(seedId, channelId, pageToken) {
  return JSON.stringify({ version: 1, seedId, channelId, pageToken });
}

function seconds(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(duration || ""));
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}

// The injected YouTube client owns authentication. This module stores no token,
// makes no text search and reads only the exact channel's uploads playlist.
export async function exploreCurator({ youtube, seedVideo = {}, cursor = "" } = {}) {
  if (typeof youtube !== "function") throw new Error("Le client YouTube est requis pour lire une chaîne.");
  const videoId = stripVideoPrefix(seedVideo.id);
  let channelId = String(seedVideo.channelId || "");
  if (channelId && !CHANNEL_ID.test(channelId)) throw new Error("L’identifiant de chaîne YouTube n’est pas valide.");
  if (!VIDEO_ID.test(videoId)) throw new Error("La vidéo de départ doit avoir un identifiant YouTube valide.");
  const sourceNodeId = `video:youtube:${videoId}`;
  const cursorData = readCursor(cursor, sourceNodeId, channelId);
  const pageToken = cursorData.pageToken;
  const graphDelta = { entities: [], edges: [], claims: [] };
  let fetchedRequests = 0;
  let sourceSnippet = null;
  const call = async (resource, parameters) => { fetchedRequests++; return youtube(resource, parameters); };
  const result = (state, message, candidates = [], nextPageToken = null, extra = {}) => ({
    status: state,
    direction: "curator",
    candidates,
    graphDelta,
    coverage: {
      state, message, fetchedRequests, complete: state === "complete",
      hasMore: nextPageToken !== null,
      nextCursor: nextPageToken !== null && CHANNEL_ID.test(channelId) ? encodeCursor(sourceNodeId, channelId, nextPageToken) : "",
      sourceStates: { youtube: state === "source_unavailable" ? "unavailable" : state === "needs_enrichment" ? "not_found" : "observed" },
      ...extra
    }
  });
  try {
    if (!channelId) {
      const source = await call("videos", { part: "snippet", id: videoId, maxResults: 1 });
      sourceSnippet = (source.items || []).find((item) => item.id === videoId)?.snippet;
      channelId = String(sourceSnippet?.channelId || "");
      if (!CHANNEL_ID.test(channelId)) return result("needs_enrichment", "La chaîne de la vidéo de départ n’a pas pu être identifiée par YouTube.");
      if (cursorData.channelId && cursorData.channelId !== channelId) throw new Error("La chaîne de cette vidéo ne correspond plus au curseur conservé.");
    }
    const channelData = await call("channels", { part: "contentDetails", id: channelId, maxResults: 1 });
    const channel = (channelData.items || []).find((item) => item.id === channelId);
    const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!PLAYLIST_ID.test(uploadsId || "")) return result("source_unavailable", "La liste des publications de cette chaîne n’est pas accessible.", [], pageToken);
    const channelName = String(seedVideo.channelTitle || sourceSnippet?.channelTitle || channelId);
    const channelNode = { id: `channel:youtube:${channelId}`, type: "channel", label: channelName };
    const sourceNode = { id: sourceNodeId, type: "video", label: String(seedVideo.title || sourceSnippet?.title || videoId) };
    const sourceEvidence = { source: "youtube", url: watchUrl(videoId), label: "Chaîne identifiée par son identifiant YouTube", channelId };
    graphDelta.entities.push(
      { id: sourceNode.id, type: "video", title: sourceNode.label, source: "youtube", url: watchUrl(videoId), channelId },
      { id: channelNode.id, type: "channel", name: channelName, source: "youtube", externalIds: { youtube: channelId }, url: channelUrl(channelId) }
    );
    graphDelta.edges.push({ from: sourceNode.id, to: channelNode.id, kind: "published_by", status: "observed", source: "youtube", sourceUrl: watchUrl(videoId), evidence: [sourceEvidence] });
    const page = await call("playlistItems", { part: "snippet,contentDetails", playlistId: uploadsId, maxResults: 50, ...(pageToken ? { pageToken } : {}) });
    const entries = Array.isArray(page.items) ? page.items.slice(0, 50) : [];
    const videoIds = [...new Set(entries.map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId).filter((id) => VIDEO_ID.test(id || "") && id !== videoId))];
    const details = videoIds.length ? await call("videos", { part: "snippet,contentDetails,status", id: videoIds.join(","), maxResults: 50 }) : { items: [] };
    const detailIndex = new Map((details.items || []).filter((item) => videoIds.includes(item.id)).map((item) => [item.id, item]));
    const candidates = [];
    for (const id of videoIds) {
      const video = detailIndex.get(id);
      // The playlist owner/title is insufficient: verify each video uploader.
      if (!video?.snippet?.title || video.snippet.channelId !== channelId || ["deleted", "failed", "rejected"].includes(video.status?.uploadStatus)) continue;
      const url = watchUrl(id);
      const target = { id: `video:youtube:${id}`, type: "video", label: video.snippet.title };
      const evidence = { source: "youtube", url, label: `Publication de la même chaîne : ${channelName}`, channelId, uploadsPlaylistId: uploadsId };
      const description = String(video.snippet.description || '').slice(0,10000);
      const artistEvidence = videoArtistEvidence({ ...video.snippet, description });
      const releaseDate = musicalReleaseDate({ ...video.snippet, description });
      candidates.push({
        id: target.id, type: "video", title: video.snippet.title, artist: artistEvidence?.name || "", artistIds: [], artistInference: artistEvidence, description, releaseDate,
        channelId, channelTitle: video.snippet.channelTitle || channelName,
        publishedAt: video.snippet.publishedAt || "", durationSeconds: seconds(video.contentDetails?.duration),
        thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || "",
        source: "youtube", sourceUrl: url, direction: "curator", relation: "curator", anchor: channelNode,
        listen: { kind: "video", url, videoId: id, basis: "exact_upload_channel_id" },
        explanation: `Sur la même chaîne : ${channelName}`,
        evidence: [sourceEvidence, evidence],
        path: [
          { from: sourceNode, to: channelNode, relation: "published_by", status: "observed", source: "youtube", sourceUrl: watchUrl(videoId), evidence: [sourceEvidence] },
          { from: channelNode, to: target, relation: "published_by", traversal: "reverse", label: "a publié", status: "observed", source: "youtube", sourceUrl: url, evidence: [evidence] }
        ]
      });
      graphDelta.entities.push({ id: target.id, type: "video", title: target.label, channelId, channelTitle: video.snippet.channelTitle || channelName, description, artist: artistEvidence?.name || "", artistInference: artistEvidence, releaseDate, source: "youtube", url, publishedAt: video.snippet.publishedAt || "", thumbnail: video.snippet.thumbnails?.medium?.url || "" });
      graphDelta.edges.push({ from: target.id, to: channelNode.id, kind: "published_by", status: "observed", source: "youtube", sourceUrl: url, evidence: [evidence] });
    }
    const nextPageToken = typeof page.nextPageToken === "string" && page.nextPageToken && page.nextPageToken !== pageToken ? page.nextPageToken : null;
    if (page.nextPageToken && page.nextPageToken === pageToken) return result("source_unavailable", "YouTube a renvoyé la même page ; la progression est suspendue pour éviter une boucle.", candidates, pageToken);
    const state = nextPageToken === null ? "complete" : "partial";
    const count = candidates.length;
    return result(state, `${count} publication${count > 1 ? "s" : ""} de cette chaîne vérifiée${count > 1 ? "s" : ""}${nextPageToken ? " sur cette page ; d’autres pages restent à explorer." : " sur cette page. Fin des publications accessibles."}`, candidates, nextPageToken, { entriesRead: entries.length, omitted: videoIds.length - candidates.length, channelId, uploadsPlaylistId: uploadsId });
  } catch (error) {
    return result("source_unavailable", `La chaîne ne peut pas être parcourue pour le moment : ${error.message || "YouTube indisponible"}.`, [], pageToken, { retryable: true });
  }
}
