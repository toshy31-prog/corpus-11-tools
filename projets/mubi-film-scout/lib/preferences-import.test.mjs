import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { sanitizePreferences, normalizeCollection } from "../public/discovery.mjs";
import { buildQuickPreset } from "../public/presets.mjs";

const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const key = "mubi-film-scout.preferences.v1";
const payload = (preferences) => JSON.stringify({ format: "mubi-film-scout-local-v1", preferences });
const original = JSON.parse(JSON.stringify(sanitizePreferences({ seen: [91], shortlist: [], dismissed: [], compare: [], evaluations: [] })));

function launch({ blocked = false, sessionBlocked = false } = {}) {
  const nodes = new Map();
  const alerts = [];
  const downloads = [];
  const anchors = [];
  const storage = new Map([[key, JSON.stringify(original)]]);
  function element() {
    return { value: "", checked: false, hidden: false, innerHTML: "", _text: "",
      get textContent() { return this._text; },
      set textContent(value) { this._text = String(value); this.innerHTML = this._text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); },
      files: [], handlers: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {} }, style: {},
      querySelector: () => element(), querySelectorAll: () => [],
      addEventListener(event, handler) { this.handlers[event] = handler; },
      setAttribute() {}, replaceChildren(...items) { this.children = items; }, append(...items) { this.children.push(...items); }, remove() {}, click() { this.clicked = true; },
    };
  }
  function node(selector) { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); }
  const context = vm.createContext({
    sanitizePreferences, normalizeCollection, buildQuickPreset,
    // Core import/export DOM harness. The actual workshop is covered by the
    // separate full-browser audit; only its integration boundary is stubbed here.
    installStudio: () => ({ refreshPersonalData() {}, restoreImportedForm() {}, reset() {}, decorateCard() {}, libraryAccepts: () => true, catalogueAccepts: () => true, onCatalogueRendered() {}, filterOverrides: () => ({}) }),
    document: { querySelector: node, querySelectorAll: () => [], createElement(tag) {
      const created = element(); if (tag === "a") anchors.push(created); return created;
    } },
    window: { alert: (message) => alerts.push(message), confirm: () => true },
    localStorage: { getItem: (name) => storage.get(name) ?? null,
      setItem(name, value) { if (blocked) throw new Error("quota exceeded"); storage.set(name, value); } },
    sessionStorage: { getItem: () => null, removeItem() { if (sessionBlocked) throw new Error("session denied"); } },
    fetch: () => new Promise(() => {}), // Status startup is suspended; no network.
    CSS: { escape: (value) => value }, Blob,
    URL: Object.assign(class extends URL {}, {
      createObjectURL(blob) { downloads.push(blob); return "blob:local-test"; },
      revokeObjectURL() {},
    }), AbortController,
    setTimeout: () => 1, clearTimeout() {},
  });
  vm.runInContext(source.replace(/^import .* from .*;\n/gm, ""), context);
  return { node, alerts, storage, downloads, anchors,
    allowWrites() { blocked = false; },
    refreshMemory() { vm.runInContext("updateMemoryCount()", context); },
    state: () => JSON.parse(vm.runInContext("JSON.stringify(preferences)", context)),
    importFile(file) { node("#import-file").files = [file]; return node("#import-file").handlers.change(); },
    importText(text) { return this.importFile({ size: text.length, text: async () => text }); },
    forget: () => node("#forget").handlers.click(),
    edit() { context.changedId = 92; vm.runInContext("preferences.seen.push(changedId); savePreferences()", context); },
  };
}

test("imports an export with films, feedback and form values using the real client renderers", async () => {
  const app = launch();
  app.node("#max-year").value = "2025";
  const incoming = { seen: [1, "1", 2], dismissed: [3],
    shortlist: [{ id: "4", title: "Film", releaseDate: "2020-01-01", runtime: 90, rating: 7, verified: true }],
    compare: [4, "4", 99], evaluations: [{ value: "fit", programmeIds: [4], wish: "calme", filters: {} }],
    form: { wish: "calme", minYear: "1990", maxYear: "", effect: "contemplate", timeBudget: "ample", detour: "sidestep", hideSeen: true, genres: [18], lenses: [] } };
  await app.importText(payload(incoming));
  const state = app.state();
  assert.deepEqual(state.seen, [1, 2]);
  assert.deepEqual(state.compare, [4]);
  assert.equal(state.shortlist[0].id, 4);
  assert.equal(app.node("#wish").value, "calme");
  assert.equal(app.node("#max-year").value, "");
  assert.deepEqual(JSON.parse(app.storage.get(key)), state);
  assert.equal(app.alerts.at(-1), "Choix locaux importés.");
});

test("ordinary edits remain usable in memory and show persistent storage failure", () => {
  const app = launch({ blocked: true });
  assert.doesNotThrow(() => app.edit());
  assert.deepEqual(app.state().seen, [91, 92]);
  assert.deepEqual(JSON.parse(app.storage.get(key)), original);
  app.refreshMemory();
  assert.match(app.node("#memory-count").textContent, /non sauvegardés/);
  app.allowWrites();
  app.edit();
  assert.deepEqual(JSON.parse(app.storage.get(key)), app.state());
  assert.doesNotMatch(app.node("#memory-count").textContent, /non sauvegardés/);
});

test("recovered workshop data and more than eight favourites survive an import", async () => {
  const app = launch();
  const data = {
    shortlist: Array.from({length: 80}, (_, i) => ({id: i+1, title: `Film ${i+1}`, runtime: 90, verified: true})),
    profile: {preferredGenres: [18], excludedGenres: [27]},
    collections: [{name: "Parcours", films: [{id: 1, order: 1, note: "Une étape", angles: ["city"], source: "https://example.org/film"}]}],
    history: [{id: 1, title: "Film 1", genreIds: [18], liked: true}], lists: {1: "Ce soir"},
    form: {timeBudget: "unlimited", maxRuntime: 600, minRating: 0, minVotes: 0}
  };
  await app.importText(payload(data));
  const state = app.state();
  assert.equal(state.shortlist.length, 80);
  assert.deepEqual(state.profile, data.profile);
  assert.equal(state.collections[0].films[0].note, "Une étape");
  assert.equal(state.history[0].liked, true);
  assert.equal(state.lists[1], "Ce soir");
  assert.equal(state.form.maxRuntime, 600);
  assert.equal(state.form.minRating, 0);
  assert.deepEqual(JSON.parse(app.storage.get(key)), state);
  assert.equal(app.alerts.at(-1), "Choix locaux importés.");
});

test("nested imported metadata is sanitized without discarding legitimate workshop data", async () => {
  const app = launch();
  await app.importText(payload({shortlist: [{id: 1, title: "Film", runtime: 90, cast: [null], keywords: {}, perspectives: [{ratings: {bad: true}}], arbitrary: "discard"}]}));
  assert.equal(app.state().shortlist[0].arbitrary, undefined);
  assert.deepEqual(app.state().shortlist[0].keywords, []);
  assert.deepEqual(app.state().shortlist[0].perspectives[0].ratings, []);
  assert.equal(app.alerts.at(-1), "Choix locaux importés.");
});

test("forget reports partial failure instead of claiming stored data was erased", () => {
  for (const options of [{ blocked: true }, { sessionBlocked: true }, { blocked: true, sessionBlocked: true }]) {
    const app = launch(options);
    assert.doesNotThrow(() => app.forget());
    assert.match(app.node("#status").innerHTML, /Effacement incomplet/);
    if (options.blocked) assert.deepEqual(JSON.parse(app.storage.get(key)), original);
    else assert.deepEqual(JSON.parse(app.storage.get(key)).seen, []);
  }
});

test("invalid imports leave memory and storage unchanged", async () => {
  const app = launch();
  const invalid = ["null", "[]", "{broken", payload(null),
    ...[{ seen: [false] }, { seen: [0] }, { seen: [-2] }, { shortlist: [null] },
      { shortlist: [{ id: 1, releaseDate: 2020 }] }, { evaluations: [null] },
      { evaluations: [{ programmeIds: "bad" }] }, { form: { lenses: {} } },
      { form: { minYear: [] } },
    ].map(payload)];
  for (const text of invalid) {
    await app.importText(text);
    assert.deepEqual(app.state(), original, text);
    assert.deepEqual(JSON.parse(app.storage.get(key)), original, text);
    assert.notEqual(app.alerts.at(-1), "Choix locaux importés.");
  }
});

test("imported radio choices match the HTML and partial forms use its defaults", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const groups = [["effect", "effect"], ["timeBudget", "time-budget"], ["detour", "detour"]];
  const defaults = {};
  for (const [key, name] of groups) {
    const inputs = [...html.matchAll(new RegExp(`<input[^>]*name="${name}"[^>]*>`, "g"))].map(([tag]) => ({
      value: tag.match(/value="([^"]+)"/)[1], checked: /\bchecked\b/.test(tag),
    }));
    assert.ok(inputs.length > 1);
    defaults[key] = inputs.find((input) => input.checked).value;
    for (const { value } of inputs) {
      const app = launch();
      await app.importText(payload({ form: { [key]: value } }));
      assert.equal(app.state().form[key], value);
      assert.equal(app.node(`input[name="${name}"][value="${value}"]`).checked, true);
    }
    for (const value of ["unknown-choice", ""]) {
      const app = launch();
      await app.importText(payload({ form: { [key]: value } }));
      assert.deepEqual(app.state(), original);
      assert.deepEqual(JSON.parse(app.storage.get("mubi-film-scout.preferences.v1")), original);
      assert.match(app.alerts.at(-1), /inconnu/);
    }
  }
  const app = launch();
  await app.importText(payload({ form: {} }));
  for (const [key, name] of groups) {
    assert.equal(app.state().form[key], defaults[key]);
    assert.equal(app.node(`input[name="${name}"][value="${defaults[key]}"]`).checked, true);
  }
});

test("storage write failure does not replace active choices", async () => {
  const app = launch({ blocked: true });
  await app.importText(payload({ seen: [1] }));
  assert.deepEqual(app.state(), original);
  assert.deepEqual(JSON.parse(app.storage.get(key)), original);
  assert.match(app.alerts.at(-1), /Vos choix actuels sont conservés/);
});

test("edits during file reading are preserved", async () => {
  const app = launch(); let finish;
  const reading = app.importFile({ size: 1, text: () => new Promise((resolve) => { finish = resolve; }) });
  app.edit(); finish(payload({ seen: [1] })); await reading;
  assert.deepEqual(app.state().seen, [91, 92]);
  assert.match(app.alerts.at(-1), /choix ont changé/);
});

test("the newest import wins and stale failures do not replace its success message", async () => {
  const app = launch(); let fail;
  const first = app.importFile({ size: 1, text: () => new Promise((_, reject) => { fail = reject; }) });
  await app.importText(payload({ seen: [2] }));
  fail(new Error("old failure")); await first;
  assert.deepEqual(app.state().seen, [2]);
  assert.equal(app.alerts.at(-1), "Choix locaux importés.");
});

test("forgetting choices cancels an outstanding import", async () => {
  const app = launch(); let finish;
  const reading = app.importFile({ size: 1, text: () => new Promise((resolve) => { finish = resolve; }) });
  app.forget(); finish(payload({ seen: [1] })); await reading;
  assert.deepEqual(app.state().seen, []);
  assert.deepEqual(JSON.parse(app.storage.get(key)).seen, []);
});

test("oversize file is refused before reading", async () => {
  const app = launch();
  await app.importFile({ size: 3 * 1024 * 1024, text: () => { throw new Error("must not read"); } });
  assert.match(app.alerts.at(-1), /volumineux/);
  assert.deepEqual(app.state(), original);
});

test("shortlist text download is readable, scoped, and follows the actual button", async () => {
  const app = launch();
  await app.importText(payload(original));
  assert.equal(app.node("#export-shortlist-text").disabled, true);
  app.node("#export-shortlist-text").handlers.click();
  assert.equal(app.downloads.length, 0);
  await app.importText(payload({ seen: [98765], dismissed: [87654],
    shortlist: [{ id: 42, title: "Été\n ailleurs", releaseDate: "2020-01-01", runtime: 95 },
      { id: 43, title: "Deuxième film" }],
    evaluations: [{ value: "fit", wish: "PRIVATE_WISH", programmeIds: [42] }] }));
  const before = app.state();
  assert.equal(app.node("#export-shortlist-text").disabled, false);
  app.node("#export-shortlist-text").handlers.click();
  const text = await app.downloads[0].text();
  assert.equal(app.downloads[0].type, "text/plain;charset=utf-8");
  assert.equal(app.anchors[0].clicked, true);
  assert.match(app.anchors[0].download, /^mubi-films-a-garder-\d{4}-\d{2}-\d{2}\.txt$/);
  assert.match(text, /1\. Été ailleurs \(2020\) — 95 min/);
  assert.match(text, /2\. Deuxième film \(année inconnue\) — durée inconnue/);
  assert.doesNotMatch(text, /PRIVATE_WISH|98765|87654|evaluations/);
  assert.deepEqual(app.state(), before);
  app.node("#export-data").handlers.click();
  assert.deepEqual(JSON.parse(await app.downloads[1].text()).preferences, before);
  app.forget();
  assert.equal(app.node("#export-shortlist-text").disabled, true);
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /<button[^>]*id="export-shortlist-text"[^>]*type="button"[^>]*disabled/);
});
