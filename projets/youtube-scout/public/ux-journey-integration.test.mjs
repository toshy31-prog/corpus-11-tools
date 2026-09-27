import test from "node:test";
import assert from "node:assert/strict";
import { mountScoutMixerPanel } from "./scout-mixer-panel.mjs";
import { SCOUT_DIRECTIONS } from "./scout-parameters.mjs";

// Minimal structural DOM, deliberately not a browser/layout/accessibility engine.
// Production rendering and event handlers are imported intact, not extracted.
class Node {
  constructor(doc, tag) {
    this.ownerDocument = doc; this.tagName = tag.toUpperCase(); this.children = [];
    this.dataset = {}; this.attributes = {}; this.className = ""; this._text = "";
    this.classList = { add: (...names) => { this.className += ` ${names.join(" ")}`; } };
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(n => n.textContent).join(""); }
  get options() { return this.children.filter(n => n.tagName === "OPTION"); }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
  prepend(...nodes) { for (const node of [...nodes].reverse()) { node.remove(); node.parentElement = this; this.children.unshift(node); } }
  insertBefore(node, reference) { node.remove(); node.parentElement = this; const i = this.children.indexOf(reference); this.children.splice(i < 0 ? this.children.length : i, 0, node); }
  after(...nodes) { const parent = this.parentElement; const reference = parent.children[parent.children.indexOf(this) + 1]; for (const node of nodes) parent.insertBefore(node, reference); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === "class") this.className = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener() {}
  removeEventListener() {}
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() { this.ownerDocument.scrolled = this; }
  matches(selector) {
    if (selector.includes(":not(:disabled)")) return !this.disabled && this.matches(selector.replace(":not(:disabled)", ""));
    if (selector === "[hidden]") return Boolean(this.hidden);
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith(".")) return this.className.split(/\s+/).includes(selector.slice(1));
    const typed = selector.match(/^input\[type="(.*)"\]$/); if (typed) return this.tagName === "INPUT" && this.type === typed[1];
    if (selector.startsWith("link[")) return false;
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) { return this.children.flatMap(n => [...(n.matches(selector) ? [n] : []), ...n.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
}

function setup() {
  const doc = { createElement: tag => new Node(doc, tag), createElementNS: (_ns, tag) => new Node(doc, tag), createTextNode: text => Object.assign(new Node(doc, "text"), { textContent: text }), defaultView: { requestAnimationFrame: () => 1, cancelAnimationFrame() {} } };
  doc.head = doc.createElement("head"); doc.body = doc.createElement("body");
  doc.querySelectorAll = selector => doc.body.querySelectorAll(selector);
  doc.querySelector = selector => doc.body.querySelector(selector);
  const parent = doc.createElement("main"); doc.body.append(parent);
  const details = doc.createElement("details"), identity = doc.createElement("section"), select = doc.createElement("select");
  identity.className = "departure-identity-controls"; identity.dataset.seedId = "first";
  select.append(doc.createElement("option"), doc.createElement("option")); identity.append(select); details.append(identity); parent.append(details);
  const view = { seedId: "first", seedLabel: "Synthetic departure", workflow: "search", busy: false, items: [], candidates: 0,
    patch: { sort: "relation", otherArtistsOnly: true, shape: { spread: 1, depth: 6 } },
    routes: SCOUT_DIRECTIONS.map(({ id }) => ({ id, weight: 1, state: "confirmation", enabled: false, loaded: 0, eligible: 0, artistHidden: 0, distantHidden: 0 })),
    canFilterArtists: true, artistFilterApplied: true, hiddenCandidates: 2, hiddenUnknownCandidates: 2 };
  const calls = [];
  const panel = mountScoutMixerPanel({ parent, read: () => view,
    onParameter: (key, value) => { calls.push([key, value]); if (key === "scope.unknownArtists") { view.patch.includeUnknownArtists = value; view.hiddenCandidates = 0; view.hiddenUnknownCandidates = 0; } },
    onDig: () => { calls.push(["dig"]); view.busy = true; }, onStop: () => { calls.push(["stop"]); view.busy = false; },
    renderCard: () => doc.createElement("article") });
  const action = name => doc.querySelectorAll("button").find(n => n.dataset.action === name);
  return { doc, view, panel, select, identity, details, calls, action };
}

test("mounted recovery navigates without auto-confirming; externally confirmed state enables directions", async () => {
  const f = setup();
  assert.equal(f.action("resolve-identity").hidden, false);
  assert.equal(f.action("dig").disabled, true);
  await f.action("resolve-identity").onclick();
  assert.equal(f.doc.activeElement, f.select);
  assert.equal(f.details.open, true);
  assert.deepEqual(f.calls, []);
  assert.ok(f.view.routes.every(r => r.state === "confirmation"));
  // Simulates the model result after explicit profile confirmation, not its API.
  Object.assign(f.view.routes[0], { state: "pending", enabled: true, canLoad: true, loadKind: "open" });
  f.panel.update();
  assert.equal(f.action("dig").disabled, false);
  await f.action("dig").onclick();
  assert.deepEqual(f.calls, [["dig"]]);
  assert.equal(f.action("stop").hidden, false);
});

test("zero filtered results offer a local recovery without catalogue request", () => {
  const f = setup();
  assert.match(f.doc.querySelector(".mix-result-count").textContent, /2 pistes masquées/);
  const recover = f.doc.querySelectorAll("button").find(n => n.textContent === "Afficher les artistes inconnus — à vérifier");
  assert.ok(recover);
  recover.onclick();
  assert.deepEqual(f.calls, [["scope.unknownArtists", true]]);
  assert.equal(f.view.hiddenCandidates, 0);
  assert.equal(f.doc.querySelector(".mix-result-count").getAttribute("role"), "status");
});

test("stop handler and new departure reset visible context without selecting stale profile", async () => {
  const f = setup(); f.view.busy = true; f.panel.update();
  await f.action("stop").onclick();
  assert.deepEqual(f.calls, [["stop"]]);
  assert.equal(f.action("stop").hidden, true);
  f.view.seedId = "second"; f.view.seedLabel = "New departure"; f.panel.update();
  await f.action("resolve-identity").onclick();
  assert.notEqual(f.doc.activeElement, f.select);
  assert.match(f.doc.querySelector(".mix-status").textContent, /ne sont pas disponibles/);
  assert.equal(f.doc.querySelector(".mix-source-name").textContent, "New departure");
  assert.deepEqual(f.calls, [["stop"]]);
});
