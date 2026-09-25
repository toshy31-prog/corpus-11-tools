// Reversible presentation hints from explicit title markers, not musical
// similarity, catalogue identities or proof that a video is a full recording.
const key = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
export function videoContent(item = {}) {
  const isVideo = item.type === "video" || item.source === "youtube" || item.id?.startsWith("video:youtube:");
  if (!isVideo) return { kind: "music", label: "Morceau catalogue", family: "" };
  const title = String(item.title || item.label || ""), normalized = key(title);
  const editorial = /(?:^|[|:–—-]\s*)(?:documentaire|entretien|interview|making[ -]of)\b/u.test(normalized);
  const promotional = /\b(?:teaser|bande[ -]annonce)\b|\b(?:ce soir|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(?:a\s+)?\d{1,2}h\b|c['’]est dispo|#shorts?\b/u.test(normalized);
  const session = normalized.match(/\bgrunt\s*#?\s*(\d+)\b/u);
  const family = session && (item.channelId || item.channelTitle) ? `${item.channelId || key(item.channelTitle)}:grunt:${session[1]}` : "";
  const kind = editorial ? "editorial" : promotional ? "promotional" : "unknown";
  return { kind, label: ({ editorial: "Entretien / documentaire probable", promotional: "Annonce / extrait promotionnel probable", unknown: "Publication vidéo · contenu à vérifier" })[kind], family };
}

export function titleCreditSuggestion(video = {}) {
  const title = String(video.title || "").trim();
  const collective = title.match(/^(.+?)\s*\(([^()]+(?:,|\s&\s)[^()]+)\)\s*(?:\||$)/u);
  if (collective && !/\b(?:live|remaster(?:ed)?|version|edit|mix|mono|stereo|19\d{2}|20\d{2})\b/i.test(collective[2])) return { title: collective[1].trim(), name: collective[2].trim(), basis: "participants indiqués dans le titre, à vérifier" };
  const parts = title.split(/\s*\|\s*/u);
  const channel = key(video.channelTitle).replace(/\s+-\s+topic$/, "");
  if (parts.length >= 2 && channel && key(parts.at(-1)).replace(/\s*#\d+.*$/, "") === channel && !/[#!?:]/u.test(parts[0]) && !videoContent({ ...video, type: "video" }).kind.match(/editorial|promotional/)) {
    return { name: parts[0].trim(), basis: "nom indiqué avant la chaîne dans le titre, à vérifier" };
  }
  return null;
}
