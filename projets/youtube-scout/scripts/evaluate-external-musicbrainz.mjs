// External candidate-decision probe, NOT an end-to-end retrieval benchmark.
// Dataset: Leipzig MusicBrainz20K, CC BY 4.0; see SOTA_EXTERNAL_IDENTITY.md.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [file, modulePath = "lib/track-candidate-score.mjs", ordering = "gold-first"] = process.argv.slice(2);
if (!["gold-first", "hash"].includes(ordering)) throw Error("Invalid ordering");
if (!file) throw Error("Usage: node scripts/evaluate-external-musicbrainz.mjs CSV [scorer-module]");
const { decideTrackCandidate } = await import(pathToFileURL(resolve(modulePath)));
const bytes = readFileSync(file);
const rows = []; let row = [], cell = "", quoted = false;
const input = bytes.toString("utf8");
for (let i = 0; i < input.length; i++) {
  const c = input[i];
  if (c === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
  else if (!quoted && (c === ',' || c === '\n')) { row.push(cell.replace(/\r$/, "")); cell = ""; if (c === '\n') { rows.push(row); row = []; } }
  else cell += c;
}
if (cell || row.length) { row.push(cell); rows.push(row); }
if (quoted) throw Error("Unclosed CSV quote");
const headers = rows.shift();
if (headers.join(",") !== "TID,CID,CTID,SourceID,id,number,title,length,artist,album,year,language") throw Error("Unexpected dataset schema");
const records = rows.filter(r => r.length > 1).map(r => {
  if (r.length !== headers.length) throw Error("CSV column mismatch");
  return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
});
if (new Set(records.map(r => r.TID)).size !== records.length || records.some(r => !r.TID || !r.CID)) throw Error("Invalid record identities");
const groups = new Map();
for (const r of records) { if (!groups.has(r.CID)) groups.set(r.CID, []); groups.get(r.CID).push(r); }
const refs = [...groups.values()].map(g => g[0]);
const normalize = s => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const usable = s => s && !["null", "[unknown]"].includes(s);
const adapt = r => ({ id: r.TID, cluster: r.CID, title: usable(r.title) ? r.title : "", artists: usable(r.artist) ? [r.artist] : [], source: "unknown" });
// Freeze deterministic ordering before outcome inspection; at most 1000 duplicate queries.
const queries = [...groups.values()].flatMap(g => g.slice(1)).sort((a,b) => createHash("sha256").update(a.TID).digest("hex").localeCompare(createHash("sha256").update(b.TID).digest("hex"))).slice(0, 1000);
const stats = { queries: queries.length, auto: 0, autoCorrect: 0, suggested: 0, ambiguous: 0, rejected: 0, topCorrect: 0, tiedTop: 0 };
const exactBaseline = { auto: 0, autoCorrect: 0, abstained: 0 };
for (const q of queries) {
  const gold = groups.get(q.CID)[0];
  const title = normalize(q.title), artist = normalize(q.artist);
  // Hard negatives by exact normalized artist/title overlap, then deterministic record order.
  const negatives = refs.filter(r => r.CID !== q.CID).map(r => ({ r, priority: Number(normalize(r.title) === title) * 2 + Number(normalize(r.artist) === artist) })).sort((a,b) => b.priority-a.priority || Number(a.r.TID)-Number(b.r.TID)).slice(0, 9).map(x => x.r);
  const candidates = [gold, ...negatives];
  if (ordering === "hash") candidates.sort((a,b) => createHash("sha256").update(q.TID + ":" + a.TID).digest("hex").localeCompare(createHash("sha256").update(q.TID + ":" + b.TID).digest("hex")));
  const exact = candidates.filter(r => usable(q.artist) && usable(r.artist) && usable(q.title) && usable(r.title) && normalize(r.artist) === artist && normalize(r.title) === title);
  if (exact.length === 1) { exactBaseline.auto++; exactBaseline.autoCorrect += Number(exact[0].CID === q.CID); }
  else exactBaseline.abstained++;
  const result = decideTrackCandidate(adapt(q), candidates.map(adapt));
  const correct = result.best?.candidate.cluster === q.CID;
  stats.tiedTop += Number(result.best?.score === result.second?.score);
  stats.topCorrect += Number(correct);
  if (result.decision === "auto_accept") { stats.auto++; stats.autoCorrect += Number(correct); }
  else stats[result.decision]++;
}
console.log(JSON.stringify({ datasetSha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, records: records.length, clusters: groups.size, protocol: "1000 hash-ordered duplicates; gold candidate injected + 9 overlap-prioritized negatives; artist/title only; source unknown; no tuning", ordering, scorer: modulePath, ...stats, automaticCoverage: stats.auto/stats.queries, selectiveErrorRate: stats.auto ? (stats.auto-stats.autoCorrect)/stats.auto : null, exactBaseline }, null, 2));
