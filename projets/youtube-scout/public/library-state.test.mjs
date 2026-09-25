import test from "node:test";
import assert from "node:assert/strict";
import { createBackup, createImportCheckpoint, finalizeLibraryImport, normalizeNotebookItem, reusableImportCheckpoint, scanImportPages, validateBackup } from "./library-state.mjs";

const video = (id, playlistIds = ["list-a"]) => ({ id, title: `Titre ${id}`, availability: "public", playlistIds, playlistNames: playlistIds });
const pageItem = (id) => ({ contentDetails: { videoId: id }, snippet: { title: `Titre ${id}` } });
const mergeItem = (target, item, playlist) => {
  const id = item.contentDetails.videoId;
  const current = target.get(id);
  target.set(id, { ...video(id), playlistIds: [...new Set([...(current?.playlistIds || []), playlist.id])] });
};

test("importe 5 000 vidéos uniques sur 100 pages et garde le plafond honnête", async () => {
  const checkpoint = createImportCheckpoint([{ id: "a", title: "A" }]);
  let calls = 0;
  const result = await scanImportPages(checkpoint, {
    fetchPage: async state => { calls++; const page = Number(state.pageToken || 0); return { items: Array.from({ length: 50 }, (_, i) => pageItem(`track${page * 50 + i}`)), nextPageToken: page < 99 ? String(page + 1) : "" }; },
    mergeItem, saveCheckpoint: async () => {}
  });
  assert.equal(result.size, 5000); assert.equal(calls, 100); assert.equal(checkpoint.truncated, false);
});

test("une pagination cyclique s’arrête sans perdre les pages déjà sauvées", async () => {
  const checkpoint = createImportCheckpoint([{ id: "a" }]); let calls = 0, saved;
  await assert.rejects(scanImportPages(checkpoint, {
    fetchPage: async () => ({ items: [pageItem(`track${++calls}`)], nextPageToken: "repeated" }), mergeItem,
    saveCheckpoint: async value => { saved = structuredClone(value); }
  }), /répété/);
  assert.equal(calls, 2); assert.equal(saved.videos.length, 1); assert.equal(saved.states[0].done, false);
});

test("reprend seulement les pages manquantes après l’échec d’une playlist, y compris les succès concurrents", async () => {
  const selected = [{ id: "list-a", title: "A" }, { id: "list-b", title: "B" }];
  const checkpoint = createImportCheckpoint(selected);
  let saved;
  await assert.rejects(scanImportPages(checkpoint, {
    fetchPage: async ({ playlist }) => {
      if (playlist.id === "list-b") throw new Error("quota temporaire");
      return { items: [pageItem("video01")], nextPageToken: "page-two" };
    }, mergeItem, saveCheckpoint: async (value) => { saved = structuredClone(value); }
  }), /quota temporaire/);
  assert.equal(saved.pagesRead, 1);
  assert.equal(saved.videos.length, 1);
  assert.equal(saved.states[0].pageToken, "page-two");
  assert.equal(saved.states[1].pageToken, "");
  assert.equal(reusableImportCheckpoint(saved, selected), true);
  assert.equal(reusableImportCheckpoint(saved, selected.slice(0, 1)), false);
  const calls = [];
  const result = await scanImportPages(saved, {
    fetchPage: async ({ playlist, pageToken }) => {
      calls.push([playlist.id, pageToken]);
      return { items: playlist.id === "list-a" ? [pageItem("video02")] : [pageItem("video01"), pageItem("video03")] };
    }, mergeItem, saveCheckpoint: async () => {}
  });
  assert.deepEqual(calls, [["list-a", "page-two"], ["list-b", ""]]);
  assert.equal(result.size, 3);
  assert.equal(saved.duplicates, 1);
  assert.equal(saved.entriesRead, 4);
  assert.equal(saved.truncated, false);
  assert.equal(saved.phase, "details");
});

test("le plafond conserve les éléments non consommés de la page et interdit toute suppression d’anciennes vidéos", async () => {
  const checkpoint = createImportCheckpoint([{ id: "list-a", title: "A" }]);
  const incoming = await scanImportPages(checkpoint, {
    limit: 2, fetchPage: async () => ({ items: [pageItem("video01"), pageItem("video02"), pageItem("video03")] }),
    mergeItem, saveCheckpoint: async () => {}
  });
  assert.equal(incoming.size, 2);
  assert.equal(checkpoint.truncated, true);
  assert.equal(checkpoint.states[0].done, false);
  assert.equal(checkpoint.states[0].pendingItems[0].contentDetails.videoId, "video03");
  const old = [video("old0001"), video("old0002")];
  const result = finalizeLibraryImport(old, [...incoming.values()], { complete: false, selectedIds: ["list-a"], limit: 3 });
  assert.deepEqual(result.videos.map(({ id }) => id), ["old0001", "old0002", "video01"]);
  assert.equal(result.removed, 0);
  assert.equal(result.omittedByLimit, 1);
});

test("un scan complet distingue sorties de sélection, indisponibilité et absence constatée", () => {
  const before = [video("known01"), video("private1"), video("absent01"), video("outside1", ["other"])];
  const incoming = [video("known01"), { ...video("private1"), availability: "unavailable" }, video("new0001")];
  const result = finalizeLibraryImport(before, incoming, { complete: true, selectedIds: ["list-a"] });
  assert.deepEqual(result.videos.map(({ id }) => id), ["known01", "new0001"]);
  assert.equal(result.added, 1);
  assert.equal(result.removed, 3);
  assert.equal(result.outOfSelection, 1);
  assert.equal(result.unavailableRemoved, 1);
  assert.equal(result.absentFromSelection, 1);
  const partial = finalizeLibraryImport(before, incoming, { complete: false, selectedIds: ["list-a"] });
  assert.equal(partial.removed, 0);
  assert.equal(partial.videos.length, 5);
});

test("sauvegarde/restauration conserve bibliothèque, parcours, catalogue, corrections et notes sans secrets", () => {
  const payload = createBackup({
    library: [video("video01")],
    notebook: [{ id: "release:discogs:12", title: "Sortie", status: "explore", note: "Suivre le remixeur", sourceUrl: "https://www.discogs.com/release/12", provenance: { departure: { id: "video01", label: "Départ" }, paths: [{ label: "même label" }] } }],
    local: { artistCorrections: { video01: "Artiste confirmé" }, sourceCharacter: { schemaVersion: 1, preset: "", lenses: ["off-center", "wildcard"], temperature: 60 }, activeDig: { schemaVersion: 2, seed: { id: "video01" }, front: { seed: { id: "video01" }, branches: [] }, catalogueGroups: { label: { selectedIds: ["release:12"], items: [{ id: "release:12" }] } }, accessToken: "must-not-export" }, config: { apiKey: "must-not-export" } },
    indexed: { entities: [["artist:test", { name: "Artiste", access_token: "must-not-export" }]], events: [{ id: "evt1", kind: "keep" }], sync: [["youtube-import-progress", { pageToken: "resume-cursor", apiKey: "must-not-export" }]] },
    graph: { entities: { "artist:1": { id: "artist:1", type: "artist", sourceUrl: "https://example.org/artist?api_key=must-not-export&public=1" } }, edges: {}, claims: {}, cache: { token: "must-not-export" } }
  });
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("must-not-export"), false);
  const restored = validateBackup(JSON.parse(serialized));
  assert.equal(restored.notebook[0].status, "explore");
  assert.equal(restored.notebook[0].note, "Suivre le remixeur");
  assert.equal(restored.notebook[0].provenance.departure.label, "Départ");
  assert.equal(restored.local.artistCorrections.video01, "Artiste confirmé");
  assert.deepEqual(restored.local.activeDig.catalogueGroups.label.selectedIds, ["release:12"]);
  assert.deepEqual(restored.local.sourceCharacter, { schemaVersion: 1, preset: "", lenses: ["off-center", "wildcard"], temperature: 60 });
  assert.equal(restored.indexed.sync[0][1].pageToken, "resume-cursor");
  assert.equal(restored.graph.entities[0].sourceUrl, "https://example.org/artist?public=1");
});

test("rejette les sauvegardes malformées avant écriture et neutralise les URL exécutables", () => {
  const valid = createBackup({ library: [video("video01")] });
  assert.throws(() => validateBackup({ ...valid, version: 999 }), /compatible/);
  assert.throws(() => validateBackup({ ...valid, library: [video("video01"), video("video01")] }), /double/);
  assert.throws(() => validateBackup({ ...valid, local: { randomStorageKey: "bad" } }), /non restaurable/);
  assert.throws(() => validateBackup({ ...valid, indexed: { entities: [["x"]], events: [], sync: [] } }), /invalide/);
  assert.throws(() => validateBackup(JSON.parse(JSON.stringify(valid).replace('"local":{}', '"local":{"__proto__":{}}'))), /interdite/);
  const item = normalizeNotebookItem({ id: "release:discogs:12", title: "Sortie", url: "javascript:alert(1)", note: "Note", status: "listen" });
  assert.equal(item.url, "");
  assert.equal(item.status, "listen");
  assert.equal(item.note, "Note");
  assert.equal(normalizeNotebookItem({ id: "release:discogs:12", title: "Album", sourceUrl: "https://www.discogs.com/release/12" }).url, "https://www.discogs.com/release/12");
});
test("a backup cannot combine the departure from one session with another front", () => {
  const payload = createBackup({});
  payload.local.activeDig = { seed: { id: "A" }, front: { seed: { id: "B" }, branches: [] } };
  assert.throws(() => validateBackup(payload), /départ|session|incohér/i);
});
