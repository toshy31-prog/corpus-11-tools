// Search/display evidence only. Never creates a catalogue identity.
const clean = value => String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
const key = value => clean(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const generic = value => /^(?:various artists|release|releases|music|compilation|tunecore|distrokid|believe|because music)$/i.test(value);

export function videoArtistEvidence(video = {}) {
  const lines = String(video.description || "").slice(0, 10000).split(/\r?\n/u).map(clean).filter(Boolean);
  const explicit = lines.map(line => line.match(/^(?:main artist|primary artist)\s*:\s*(.+)$/iu)?.[1]).filter(Boolean);
  const header = lines.slice(0, 12).map(line => line.split(/\s*·\s*/u)).find(parts => parts.length >= 2 && key(parts[0]) === key(video.title));
  const names = [...new Set(explicit.map(clean))];
  const name = names.length === 1 ? names[0] : !names.length && header ? [...new Set(header.slice(1).map(clean))].join(" & ") : "";
  if (name && !generic(name)) return { name, confidence: 0.96, basis: names.length ? "crédit artiste explicite" : "crédit de la description", source: "youtube_description" };
  const topic = clean(video.channelTitle).match(/^(.+?)\s+-\s+Topic$/iu);
  if (topic && !generic(topic[1])) return { name: topic[1], confidence: 0.96, basis: "chaîne Topic", source: "youtube_channel" };
  return null;
}
