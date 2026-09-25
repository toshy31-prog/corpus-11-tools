import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Static integration contract only: no browser state, credentials, API or user data.
// Visual layout and actual navigation still need a browser check.
const publicRoot = new URL("../public/", import.meta.url);
const html = readFileSync(new URL("index.html", publicRoot), "utf8");
const app = readFileSync(new URL("app.js", publicRoot), "utf8");
const css = readFileSync(new URL("styles.css", publicRoot), "utf8");
const tags = [...html.matchAll(/<([a-z][\w:-]*)\b([^<>]*)>/gi)].map((match) => ({ tag: match[1].toLowerCase(), attributes: match[2] }));
const attribute = (tag, name) => tag?.attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
const elements = tags.filter((tag) => attribute(tag, "id"));
const byId = new Map(elements.map((tag) => [attribute(tag, "id"), tag]));
function requireElement(id, tagName) {
  const element = byId.get(id);
  assert.ok(element, `Le contrôle #${id} manque dans le HTML.`);
  if (tagName) assert.equal(element.tag, tagName, `#${id} doit rester un élément ${tagName}.`);
  return element;
}

test("UI contract: every HTML id is unique and labels/navigation retain their targets", () => {
  assert.equal(byId.size, elements.length, "Plusieurs éléments portent le même ID : les événements peuvent viser le mauvais contrôle.");
  for (const tag of tags.filter(({ tag }) => tag === "label")) {
    const target = attribute(tag, "for");
    if (target) requireElement(target);
  }
  for (const tag of tags.filter(({ tag }) => tag === "a")) {
    const href = attribute(tag, "href");
    if (href?.startsWith("#")) requireElement(href.slice(1));
  }
});

test("UI contract: imports and backups use JSON file controls with observable status", () => {
  for (const id of ["bandcamp-import", "restore-backup"]) {
    const control = requireElement(id, "input");
    assert.equal(attribute(control, "type"), "file");
    assert.match(attribute(control, "accept") || "", /(?:application\/json|\.json)/);
  }
  for (const id of ["export-backup", "import-resume"]) assert.equal(attribute(requireElement(id, "button"), "type"), "button");
  for (const id of ["bandcamp-import-status", "backup-status", "platform-compare-results", "catalogue-status"]) {
    assert.equal(attribute(requireElement(id), "aria-live"), "polite", `#${id} doit annoncer la fin ou l’échec de l’action.`);
  }
  requireElement("backup-settings", "details");
  requireElement("platform-compare-form", "form");
  requireElement("platform-isrc", "input");
  requireElement("platform-territory", "input");
});

test("UI contract: one departure picker and explicit breadth/depth choices remain available", () => {
  requireElement("departure-picker", "details");
  requireElement("seed-search", "input");
  requireElement("seed-select", "select");
  requireElement("suggestion-picker", "details");
  const focus = requireElement("discovery-focus", "select");
  const selectMarkup = html.slice(html.indexOf(`<select${focus.attributes}>`)).split("</select>")[0];
  assert.match(selectMarkup, /value="breadth"/);
  assert.match(selectMarkup, /value="depth"/);
  assert.equal(attribute(requireElement("derived-videos"), "class"), "discovery-groups", "Le conteneur principal ne doit pas appliquer la grille des cartes aux groupes de directions.");
});

test("UI contract: public modules referenced by the application and HTML exist", () => {
  const scripts = tags.filter(({ tag }) => tag === "script").map((tag) => attribute(tag, "src")).filter((src) => src && !/^https?:/.test(src));
  const modules = [...app.matchAll(/\bfrom\s+["']([^"']+\.mjs)["']/g)].map((match) => match[1]);
  for (const source of new Set([...scripts, ...modules])) {
    const file = source === "/catalogue-graph.mjs" ? new URL("./catalogue-graph.mjs", import.meta.url) : new URL(source.replace(/^\//, ""), publicRoot);
    assert.ok(existsSync(file), `Module public introuvable : ${fileURLToPath(file)}`);
  }
  for (const required of ["library-state.mjs", "discovery-model.mjs", "bandcamp-tools.mjs"]) {
    assert.ok(modules.some((source) => source.endsWith(`/${required}`) || source === required), `Le module ${required} n’est pas raccordé dans app.js.`);
  }
  assert.match(app, /\bbindCatalogueTools\s*\(/, "L’import du module Bandcamp seul ne raccorde pas ses formulaires.");
});

test("UI contract: backup, resume and direction controls retain their action wiring", () => {
  for (const [id, event] of [["export-backup", "click"], ["restore-backup", "change"], ["import-resume", "click"], ["discovery-focus", "change"]]) {
    assert.match(app, new RegExp(`querySelector\\(["']#${id}["']\\)\\??\\.addEventListener\\(["']${event}["']`), `#${id} n’est pas raccordé à son événement ${event}.`);
  }
  assert.match(app, /\/api\/music\/branch\?/, "Les directions doivent pouvoir demander un catalogue structuré au serveur.");
  assert.match(app, /new URLSearchParams\(\{\s*seedId:[^}]*\bdirection\b/, "La requête de catalogue doit conserver la direction choisie.");
  assert.match(app, /\bscanImportPages\s*\(/, "L’import doit utiliser le parcours reprenable des pages.");
  assert.match(app, /\bfinalizeLibraryImport\s*\(/, "La finalisation doit préserver la distinction entre scan complet et interrompu.");
});

test("UI contract: compact details and phone layouts have explicit stylesheet support", () => {
  assert.match(css, /\.source-details\s*\{[^}]*\bmargin:\s*0\s*;/);
  assert.match(css, /\.path-details\s*\{[^}]*\bmargin:\s*0\s*;/);
  const phoneRules = css.slice(css.indexOf("@media (max-width: 500px)"));
  assert.match(phoneRules, /\.derived-grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(phoneRules, /\.branch-footer button[^}]*min-height:\s*44px/);
  assert.match(css, /\.notebook-fields\s*\{[^}]*\bdisplay:\s*grid/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
