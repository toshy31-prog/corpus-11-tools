import test from "node:test";
import assert from "node:assert/strict";
import { exploreCurator } from "./curator-catalogue.mjs";

const channelId = "UC1234567890123456789012";
const otherChannel = "UCabcdefghijklmnopqrstuv";
const seedVideo = { id: "seedvideo01", title: "Original starting point", channelId, channelTitle: "A music curator" };
const uploadsId = "UU1234567890123456789012";
const video = (id, overrides = {}) => ({ id, snippet: { title: `Publication ${id}`, channelId, channelTitle: "A music curator", publishedAt: "2026-09-13T08:00:00Z", ...overrides }, contentDetails: { duration: "PT6M30S" }, status: { uploadStatus: "processed" } });
const entry = (id) => ({ contentDetails: { videoId: id } });
function client({ page = { items: [entry(seedVideo.id), entry("discovery01")], nextPageToken: "page-2" }, details = [video("discovery01")], source = video(seedVideo.id), fail = "" } = {}) {
  const calls = [];
  const youtube = async (resource, parameters) => {
    calls.push({ resource, parameters });
    if (resource === fail) throw new Error("quotaExceeded");
    if (resource === "channels") return { items: [{ id: channelId, contentDetails: { relatedPlaylists: { uploads: uploadsId } } }] };
    if (resource === "playlistItems") return page;
    if (resource === "videos") return { items: parameters.id === seedVideo.id ? [source] : details };
    throw new Error(`Unexpected text search or API: ${resource}`);
  };
  return { youtube, calls };
}

test("curator reads exact uploads, excludes source and verifies each publication's channel", async () => {
  const { youtube, calls } = client({ page: { items: [entry(seedVideo.id), entry("discovery01"), entry("homonym0001"), entry("private0001"), entry("discovery01")] }, details: [video("discovery01"), video("homonym0001", { channelId: otherChannel }), video("injected001")] });
  const result = await exploreCurator({ youtube, seedVideo });
  assert.deepEqual(calls.map(({ resource }) => resource), ["channels", "playlistItems", "videos"]);
  assert.equal(calls[0].parameters.id, channelId);
  assert.equal(calls[1].parameters.playlistId, uploadsId);
  assert.equal(calls[1].parameters.maxResults, 50);
  assert.equal(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.equal(candidate.id, "video:youtube:discovery01");
  assert.equal(candidate.artist, "");
  assert.equal(candidate.durationSeconds, 390);
  assert.equal(candidate.listen.kind, "video");
  assert.equal(candidate.path[0].from.id, `video:youtube:${seedVideo.id}`);
  assert.equal(candidate.path[0].to.id, `channel:youtube:${channelId}`);
  assert.equal(candidate.path[1].to.id, candidate.id);
  assert.equal(result.graphDelta.edges.filter(({ kind }) => kind === "published_by").length, 2);
  assert.equal(result.coverage.complete, true);
  assert.equal(result.coverage.hasMore, false);
  assert.equal(result.coverage.omitted, 2);
});

test("curator resumes a page cursor scoped to the source and exact channel", async () => {
  const first = client();
  const result = await exploreCurator({ youtube: first.youtube, seedVideo });
  assert.equal(result.coverage.hasMore, true);
  assert.equal(result.coverage.complete, false);
  const second = client({ page: { items: [] } });
  const resumed = await exploreCurator({ youtube: second.youtube, seedVideo, cursor: result.coverage.nextCursor });
  assert.equal(second.calls[1].parameters.pageToken, "page-2");
  assert.equal(second.calls.length, 2);
  assert.equal(resumed.coverage.hasMore, false);
  await assert.rejects(exploreCurator({ youtube: first.youtube, seedVideo: { ...seedVideo, id: "different01" }, cursor: result.coverage.nextCursor }), /curseur/);
  await assert.rejects(exploreCurator({ youtube: first.youtube, seedVideo: { ...seedVideo, channelId: otherChannel }, cursor: result.coverage.nextCursor }), /curseur/);
});

test("curator preserves description credits and musical dates for continuation without inventing identities", async () => {
  const description = 'Provided to YouTube by DistroKid\nGREEN DAY · YH 261 · Nilma\nReleased on: 2023-02-28';
  const { youtube } = client({ details: [video('discovery01', { title: 'GREEN DAY', description })] });
  const result = await exploreCurator({ youtube, seedVideo });
  const candidate = result.candidates[0], entity = result.graphDelta.entities.find(item => item.id === candidate.id);
  assert.equal(candidate.artist, 'YH 261 & Nilma');
  assert.equal(candidate.artistInference.source, 'youtube_description');
  assert.equal(candidate.releaseDate, '2023-02-28');
  assert.equal(entity.description, description);
  assert.equal(entity.channelTitle, 'A music curator');
  assert.ok(result.graphDelta.edges.every(edge => edge.kind === 'published_by'));
});

test("missing channel ID is recovered only from exact source video metadata with four calls maximum", async () => {
  const { youtube, calls } = client();
  const result = await exploreCurator({ youtube, seedVideo: { id: `video:youtube:${seedVideo.id}`, title: seedVideo.title } });
  assert.deepEqual(calls.map(({ resource }) => resource), ["videos", "channels", "playlistItems", "videos"]);
  assert.equal(calls[0].parameters.id, seedVideo.id);
  assert.equal(result.candidates[0].channelId, channelId);
  assert.equal(result.coverage.fetchedRequests, 4);
});

test("provider failure preserves the current page for retry and never declares exhaustion", async () => {
  const { youtube, calls } = client({ fail: "videos" });
  const result = await exploreCurator({ youtube, seedVideo });
  assert.equal(result.status, "source_unavailable");
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.retryable, true);
  assert.equal(JSON.parse(result.coverage.nextCursor).pageToken, "");
  assert.equal(calls.length, 3);
  assert.deepEqual(result.candidates, []);
});

test("inaccessible source cannot invent an uploader or launch a channel-name search", async () => {
  const calls = [];
  const result = await exploreCurator({ youtube: async (resource) => { calls.push(resource); return { items: [] }; }, seedVideo: { id: seedVideo.id, title: "A popular channel name" } });
  assert.equal(result.status, "needs_enrichment");
  assert.equal(result.coverage.complete, false);
  assert.deepEqual(calls, ["videos"]);
  assert.deepEqual(result.candidates, []);
});

test("repeated pagination token is retryable rather than an endless successful loop", async () => {
  const first = await exploreCurator({ youtube: client().youtube, seedVideo });
  const repeated = await exploreCurator({ youtube: client().youtube, seedVideo, cursor: first.coverage.nextCursor });
  assert.equal(repeated.status, "source_unavailable");
  assert.equal(repeated.coverage.complete, false);
  assert.match(repeated.coverage.message, /même page/);
});
