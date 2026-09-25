#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const serverPath = path.resolve("server.mjs");

if (!fs.existsSync(serverPath)) {
  throw new Error("server.mjs introuvable");
}

const text = fs.readFileSync(serverPath, "utf8");

const routes = [];

const patterns = [
  /url\.pathname\s*===\s*["'`]([^"'`]+)["'`]/gu,
  /url\.pathname\.match\(\s*\/\^([^/]+)\//gu
];

for (const pattern of patterns) {
  for (const match of text.matchAll(pattern)) {
    routes.push(match[1]);
  }
}

const interesting =
  [...new Set(routes)]
    .filter((route) =>
      /youtube|music|identity|artist|recording|search/iu.test(route)
    )
    .sort();

console.log("=== REMOTE CAPABILITY PROBE ===");
console.log("server.mjs :", serverPath);
console.log("");
console.log("Routes potentiellement utiles :");

for (const route of interesting) {
  console.log(" -", route);
}

console.log("");
console.log("Signaux détectés :");
console.log({
  youtubeCapability:
    /youtube:\s*true|youtube.*configured|oauthScope.*youtube/iu.test(text),
  musicbrainz:
    /runtime\.register\(["']musicbrainz["']/u.test(text),
  discogs:
    /runtime\.register\(["']discogs["']/u.test(text),
  wikidata:
    /wikidata/iu.test(text),
  wikipedia:
    /wikipedia/iu.test(text),
  listenbrainz:
    /listenbrainz/iu.test(text)
});

console.log("");
console.log("READ ONLY — aucune modification.");
