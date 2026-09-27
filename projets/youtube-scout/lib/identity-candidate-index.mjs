// Local lexical candidate retrieval only; scores are not identity probabilities.
export const normalizeIdentityText = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function features(record, mode) {
  const out = new Set();
  for (const field of ["artist", "title"]) {
    const text = normalizeIdentityText(record[field]);
    if (!text || ["null", "unknown"].includes(text)) continue;
    if (mode === "exact") { out.add(`${field}:=${text}`); continue; }
    for (const token of text.split(" ")) out.add(`${field}:w:${token}`);
    if (mode === "hybrid") {
      const chars = [...` ${text} `];
      for (let i = 0; i < chars.length - 2; i++) out.add(`${field}:g:${chars.slice(i, i + 3).join("")}`);
    }
  }
  return out;
}
export function createIdentityCandidateIndex(records, { mode = "hybrid" } = {}) {
  if (!["exact", "tokens", "hybrid"].includes(mode)) throw Error("Invalid retrieval mode");
  if (!Array.isArray(records)) throw Error("Candidates must be an array");
  records = records.map(record => {
    if (!record || typeof record.id !== "string" || !record.id.trim()) throw Error("Candidate ids must be nonempty strings");
    for (const field of ["artist", "title"]) if (record[field] != null && typeof record[field] !== "string") throw Error("Candidate text fields must be strings");
    // Snapshot exactly the searchable projection; caller mutations must not
    // make returned candidates disagree with the already-built vectors.
    return Object.freeze({ id: record.id, artist: record.artist ?? "", title: record.title ?? "" });
  });
  const postings = new Map(), vectors = records.map(r => features(r, mode));
  const seen = new Set();
  for (let i = 0; i < records.length; i++) {
    if (!records[i].id || seen.has(records[i].id)) throw Error("Candidate ids must be unique and nonempty");
    seen.add(records[i].id);
    for (const f of vectors[i]) { if (!postings.has(f)) postings.set(f, []); postings.get(f).push(i); }
  }
  const idf = f => Math.log(1 + records.length / (1 + (postings.get(f)?.length || 0)));
  const norms = vectors.map(v => Math.sqrt([...v].reduce((s,f) => s + idf(f) ** 2, 0)));
  return { search(query, { k = 10 } = {}) {
    if (!Number.isInteger(k) || k < 1 || k > 100) throw Error("k must be between 1 and 100");
    const fs = features(query, mode), scores = new Map();
    const norm = Math.sqrt([...fs].reduce((s,f) => s + idf(f) ** 2, 0));
    for (const f of fs) for (const i of postings.get(f) || []) scores.set(i, (scores.get(i) || 0) + idf(f) ** 2);
    return [...scores].map(([i,sum]) => ({ candidate: records[i], score: sum / (norm * norms[i] || 1) })).sort((a,b) => b.score-a.score || a.candidate.id.localeCompare(b.candidate.id)).slice(0,k);
  } };
}
