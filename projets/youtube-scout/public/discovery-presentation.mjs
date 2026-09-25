import { musicKey } from "./discovery-model.mjs";
import { splitArtistNames } from "./artist-names.mjs";

const list = value => Array.isArray(value) ? value : [];
const namesKey = item => splitArtistNames(item.artist).map(musicKey).sort().join("|");
const unknown = /^(unknown|artiste non renseigne|various artists)$/;
function weakKey(item) {
  const artists = namesKey(item), title = musicKey(item.title || "");
  if (!artists || unknown.test(artists) || !title || ["artist", "label", "release", "master", "release_group"].includes(item.type)) return "";
  // Keep version / remix / live suffixes. Do not strip distinguishing text.
  return `${artists}\u0000${title}`;
}
function strongKeys(item) {
  return [item.isrc && `isrc:${String(item.isrc).toUpperCase()}`, item.recordingId && `recording:${item.recordingId}`,
    item.listen?.videoId && `video:${item.listen.videoId}`].filter(Boolean);
}
function conflict(a, b) {
  return (a.isrc && b.isrc && a.isrc.toUpperCase() !== b.isrc.toUpperCase()) ||
    (a.recordingId && b.recordingId && a.recordingId !== b.recordingId);
}

/** Presentation groups ONLY: retain every source item and all its actions.
 * A probable title/credit match never writes same_identity to the graph. */
export function presentationGroups(items = []) {
  const groups = [], byId = new Map(), byStrong = new Map(), byWeak = new Map();
  for (const item of items) {
    if (!item?.id || byId.has(item.id)) continue;
    const weak = weakKey(item), strong = strongKeys(item);
    const exact = strong.map(key => byStrong.get(key)).find(group => group && group.variants.every(value => !conflict(value, item)));
    const probable = weak && list(byWeak.get(weak)).find(group => group.variants.every(value => !conflict(value, item)));
    const group = exact || probable || { id: item.id, variants: [], basis: "single" };
    if (!group.variants.length) groups.push(group);
    else group.basis = exact && group.basis !== "probable" ? "same_reference" : "probable";
    group.variants.push(item); byId.set(item.id, group);
    for (const key of strong) if (!byStrong.has(key)) byStrong.set(key, group);
    if (weak) { const values = byWeak.get(weak) || []; if (!values.includes(group)) values.push(group); byWeak.set(weak, values); }
  }
  return { groups, byId };
}

export function routeExplanation(item = {}, direction = "", seed = "") {
  const steps = list(item.path).flatMap(step => [step.from?.label || step.fromLabel, step.to?.label || step.toLabel]).filter(Boolean);
  const uniqueSteps = steps.filter((value, i) => value !== steps[i - 1]);
  const anchor = item.anchor?.label;
  const route = uniqueSteps.length ? uniqueSteps.join(" → ") : [seed, anchor, item.title].filter(Boolean).join(" → ");
  const sources = [...new Set(list(item.evidence).map(e => typeof e === "string" ? e : e?.source).filter(Boolean))];
  const viaParticipant = list(item.path).some(step => step.relation === "probable_artist");
  const scope = viaParticipant ? " · Via la fiche d’un participant : ce lien ne confirme pas un crédit sur le morceau de départ." : "";
  return `${route || item.explanation || "Voir le lien documenté de cette piste."}${scope}${sources.length ? ` · Sources : ${sources.join(", ")}` : ""}${direction === "era" ? " · La période précise un lien existant ; ce n’est pas une preuve indépendante." : ""}`;
}
