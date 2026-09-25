import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { scheduleDiscoveryFrontiers } from "../public/discovery-frontier.mjs";
import { runtimeRecordingPlan } from "./recording-resolution-runtime.mjs";
import { decideRuntimeRecording, applyRuntimeRecordingAuthority } from "./recording-resolution-decision.mjs";
import { hydrateRecordingReleases } from "./recording-discogs.mjs";
import { adaptDiscogsReleaseTracks } from "./discogs-track-candidates.mjs";
import { graphFromResolution } from "./graph.mjs";

test("historical live smoke is inert without explicit network opt-in", () => {
  const script = new URL("../scripts/test-live-track-resolution-queue-one.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [script.pathname], { encoding: "utf8", cwd: "/tmp" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SKIP — audit réseau désactivé/);
  assert.doesNotMatch(result.stdout, /Discogs token:|PROJECTION TRANSMISE/);
  const underRunner = spawnSync(process.execPath, [script.pathname, "--allow-network"], { encoding: "utf8", cwd: "/tmp", env: { ...process.env, NODE_TEST_CONTEXT: "child-v8" } });
  assert.equal(underRunner.status, 0, underRunner.stderr);
  assert.match(underRunner.stdout, /SKIP — audit réseau désactivé/);
});

test("actual DIG loop covers all eight enabled routes before repagination", async () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const start = app.indexOf("async function loadScoutMixerDirections() {");
  const end = app.indexOf("// END_SCOUT_MIX_RACK_V1", start);
  const directions = ["label", "curator", "remix", "featuring", "compilation", "alias", "scene", "era"];
  const calls = [];
  const context = vm.createContext({
    compositionGeneration: 1, scoutMixOperation: null,
    activeDig: { seed: { id: "artist:fixture:1" } },
    explorationSession: { frontier: { byDirection: Object.fromEntries(directions.map(id => [id, { canExpand: true, firstBranches: id === "label" ? 12 : 1, state: "available" }])) } },
    getScoutMixerView: () => ({ seedId: "artist:fixture:1", busy: false, routes: directions.map(id => ({ id, canLoad: true, weight: 1 })), patch: { shape: { spread: 1 } } }),
    renderScoutMixerPanel() {}, scheduleDiscoveryFrontiers,
    async runScoutMixLoad({ directions, load }) { for (const direction of directions) await load(direction); },
    async exploreWorkspaceDirection(direction) { calls.push(direction); }
  });
  await vm.runInContext(`${app.slice(start, end)}; loadScoutMixerDirections()`, context);
  assert.equal(calls.length, 8);
  assert.equal(new Set(calls).size, 8);
  assert.equal(calls[0], "label");
});

test("a refreshed frontier retains per-DIG caps and never mutates call counts", () => {
  const previousAllocations = { label: 3, curator: 1 };
  const plan = scheduleDiscoveryFrontiers({ byDirection: { label: { canExpand: true, targets: 100 }, curator: { canExpand: true } } }, { previousAllocations, budget: 8 });
  assert.deepEqual(plan.map(item => item.direction), ["curator", "curator"]);
  assert.deepEqual(previousAllocations, { label: 3, curator: 1 });
});

test("a label-only frontier cannot starve enabled directions absent from that frontier", async () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const start = app.indexOf("async function loadScoutMixerDirections() {");
  const end = app.indexOf("// END_SCOUT_MIX_RACK_V1", start);
  const directions = ["label", "remix", "featuring", "compilation", "alias", "curator", "scene", "era"];
  for (const spread of [0, 1]) {
    const calls = [];
    const scope = vm.createContext({
      compositionGeneration: 1, scoutMixOperation: null,
      activeDig: { seed: { id: "fixture" } },
      explorationSession: { frontier: { byDirection: { label: { canExpand: true, targets: 900, state: "available" } } } },
      getScoutMixerView: () => ({ seedId: "fixture", busy: false,
        routes: directions.map(id => ({ id, canLoad: true, weight: id === "label" ? 1 : .01 })),
        patch: { shape: { spread } } }),
      renderScoutMixerPanel() {}, scheduleDiscoveryFrontiers,
      async runScoutMixLoad({ directions, load }) { for (const direction of directions) await load(direction); },
      async exploreWorkspaceDirection(direction) { calls.push(direction); }
    });
    await vm.runInContext(app.slice(start, end) + "; loadScoutMixerDirections()", scope);
    assert.equal(calls.length, 8);
    assert.equal(new Set(calls).size, 8);
  }
});

const release = {
  id: 77, title: "A compilation", artists: [{ id: 1, name: "Various" }],
  labels: [{ id: 22, name: "Fixture Records", catno: "FIX77" }],
  tracklist: [{ type_: "heading", title: "Side A" }, { position: "A1", title: "Substance (Felix da Housecat Remix)", duration: "6:00", artists: [{ id: 30, name: "Dot Allison" }], extraartists: [{ id: 31, name: "Felix da Housecat", role: "Remix" }] }]
};
const makePlan = durationSeconds => runtimeRecordingPlan({ title: "Dot Allison - Substance (Felix da Housecat Remix)", artist: "Dot Allison", durationSeconds });
const decide = (duration = 360, tracks = adaptDiscogsReleaseTracks(release)) => decideRuntimeRecording({ plan: makePlan(duration), discogsTrackCandidates: tracks });

test("duration survives the actual plan to decision boundary", () => {
  assert.equal(decide().expected.durationMs, 360000);
  for (const value of [0, -1, NaN, Infinity]) assert.equal(makePlan(value).durationMs, null);
});

test("hydration is bounded, deduplicated and reports failures without losing working releases", async () => {
  const calls = [];
  const result = await hydrateRecordingReleases([{ id: 77 }, { id: 77 }, { id: 88 }, { id: 99 }, { id: 100 }, { id: "../bad" }], async id => {
    calls.push(id);
    if (id === "88") throw new Error("offline");
    if (id === "99") return { id: 99 }; // search-like payload, not a tracklist
    return release;
  });
  assert.deepEqual(calls, ["77", "88", "99"]);
  assert.equal(result.tracks.length, 1);
  assert.deepEqual(result.coverage, { attempted: 3, loaded: 1, failed: 2, complete: false });
});

test("a Discogs-only track is linked to its credits without inventing a MusicBrainz ID", () => {
  const result = applyRuntimeRecordingAuthority({ candidates: [], discogsCandidates: [] }, decide());
  assert.equal(result.status, "resolved_track");
  assert.equal(result.resolved, null);
  assert.equal(result.resolvedDiscogsTrack.trackEntityId, "track:discogs:77:1");
  const graph = graphFromResolution({ id: "fixturevideo", title: "Dot Allison - Substance" }, null, result);
  assert.ok(graph.edges.some(edge => edge.from === "video:youtube:fixturevideo" && edge.to === "track:discogs:77:1" && edge.kind === "embodies"));
  assert.ok(graph.edges.some(edge => edge.kind === "remixed_by" && edge.to === "artist:discogs:31"));
  assert.ok(graph.edges.some(edge => edge.kind === "issued_by" && edge.to === "label:discogs:22"));
  assert.equal(graph.entities.some(entity => entity.externalIds?.musicbrainz), false);
});

test("contradictory duration and missing remix version remain unconfirmed", () => {
  assert.notEqual(decide(120).decision.decision, "auto_accept");
  const original = adaptDiscogsReleaseTracks({ ...release, tracklist: [{ ...release.tracklist[1], title: "Substance" }] });
  assert.notEqual(decide(360, original).decision.decision, "auto_accept");
});

test("hydrated Discogs corroborates without making the same-titled MB recording ambiguous", () => {
  const runtime = decideRuntimeRecording({ plan: makePlan(360), discogsTrackCandidates: adaptDiscogsReleaseTracks(release), musicBrainzCandidates: [{ id: "mb-recording", title: release.tracklist[1].title, artistCredits: [{ id: "mb-artist", name: "Dot Allison" }], lengthMs: 360000 }] });
  assert.equal(runtime.decision.decision, "auto_accept");
  assert.equal(runtime.decision.best.candidate.source, "musicbrainz");
  assert.ok(runtime.support.some(item => item.sources?.includes("discogs") || item.sourceFamilies?.includes("discogs")));
});

test("a Discogs track cannot bypass competing MusicBrainz recordings", () => {
  const candidate = { title: release.tracklist[1].title, artistCredits: [{ id: "mb-artist", name: "Dot Allison" }], lengthMs: 360000 };
  const runtime = decideRuntimeRecording({ plan: makePlan(360), discogsTrackCandidates: adaptDiscogsReleaseTracks(release), musicBrainzCandidates: [{ ...candidate, id: "mb-one" }, { ...candidate, id: "mb-two" }] });
  assert.equal(runtime.decision.decision, "ambiguous");
  assert.equal(applyRuntimeRecordingAuthority({}, runtime).resolvedDiscogsTrack, null);
});

test("ambiguous Discogs editions and known artist conflicts remain unresolved", () => {
  const tracks = [...adaptDiscogsReleaseTracks(release), ...adaptDiscogsReleaseTracks({ ...release, id: 78 })];
  assert.equal(decide(360, tracks).decision.decision, "ambiguous");
  const plan = makePlan(360);
  plan.projection.interpreted.issues = [{ type: "identity_disagreement", candidates: ["Dot Allison", "Another Artist"] }];
  const runtime = decideRuntimeRecording({ plan, discogsTrackCandidates: adaptDiscogsReleaseTracks(release) });
  assert.notEqual(runtime.decision.decision, "auto_accept");
  assert.equal(applyRuntimeRecordingAuthority({}, runtime).resolvedDiscogsTrack, null);
});

test("the resolver UI distinguishes hydrated tracks from release search hints", async () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const start = app.indexOf("async function loadRecordingResolution(");
  const end = app.indexOf("\nasync function ", start + 1);
  const data = applyRuntimeRecordingAuthority({ parsed: { status: "parsed", artist: "Dot Allison", title: "Substance" }, discogsCandidates: [{ id: 77, title: "Compilation", corroborates: true, discogsUrl: "https://www.discogs.com/release/77" }] }, decide());
  data.discogsTrackCoverage = { loaded: 1, attempted: 1, complete: false };
  const container = { innerHTML: "", querySelectorAll: () => [], querySelector: () => null };
  const context = vm.createContext({ recordingDetails: async () => data, escapeHtml: value => String(value ?? ""), htmlUrl: value => String(value ?? ""), container });
  await vm.runInContext(`${app.slice(start, end)}; loadRecordingResolution(container, { id: 'fixturevideo' }, { name: 'Dot Allison' })`, context);
  assert.match(container.innerHTML, /Piste identifiée dans une tracklist Discogs/);
  assert.match(container.innerHTML, /Piste retenue/);
  assert.match(container.innerHTML, /Lecture partielle/);
  assert.match(container.innerHTML, /ne confirme pas à lui seul le morceau/);
  assert.doesNotMatch(container.innerHTML, /Discogs corrobore artiste/);
});
