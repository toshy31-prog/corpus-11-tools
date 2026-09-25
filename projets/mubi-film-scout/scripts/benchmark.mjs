import { pathToFileURL } from "node:url";
import { normalizeFilters, analyzeWish, rankByQualitativePreferences, selectWithLenses, buildExpandedProgramme, broadenCandidates, LENSES } from "../lib/search.mjs";
import { eligible, recompose, intentEvidence, prioritizeIntent, tooSimilar } from "../public/discovery.mjs";

export const referenceCatalogue = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1, title: `Référence ${i + 1}`, verified: true,
  genreIds: [[53, 80], [18, 99], [35, 10749], [27, 18], [14, 878], [16, 12]][i % 6],
  keywords: [["suspense", "investigation"], ["slow cinema", "nature"], ["friendship", "romance"], ["dark", "murder"], ["dream", "space"], ["poetry", "memory"]][i % 6],
  runtime: 60 + (i * 7) % 160,
  rating: 6.8 + (i % 17) / 10, votes: 40 + (i * 97) % 10000,
  releaseDate: `${1930 + (i * 11) % 96}-01-01`, originalLanguage: ["fr", "en", "fa", "ja", "pt", "de", "ar"][i % 7],
  popularity: 1 + (i * 13) % 100, director: `Cinéaste ${i % 20}`
}));
export function runBenchmark() {
  const effects = ["open", "captivate", "contemplate", "comfort", "shake", "wonder"];
  const detours = ["faithful", "sidestep", "adventurous"];
  const budgets = ["short", "standard", "ample", "unlimited"];
  const lenses = [[], ...LENSES.map((l) => [l.id]), ...LENSES.flatMap((a, i) => LENSES.slice(i + 1).map((b) => [a.id, b.id]))];
  const rows = [];
  for (const effect of effects) for (const detour of detours) for (const timeBudget of budgets) for (const angles of lenses) {
    const filters = normalizeFilters({ effect, detour, timeBudget, maxRuntime: timeBudget === "unlimited" ? 600 : 180, lenses: angles });
    const { qualitative } = analyzeWish("", filters);
    const ranking = selectWithLenses(rankByQualitativePreferences(referenceCatalogue.filter((m) => eligible(m, filters)), qualitative), filters, 120);
    const candidates = broadenCandidates(prioritizeIntent(ranking, effect), filters, { faithful: 24, sidestep: 28, adventurous: 32 }[detour]);
    const pool = selectWithLenses(rankByQualitativePreferences(candidates, qualitative), filters, candidates.length);
    const first = buildExpandedProgramme(pool, filters);
    if (first.slice(0, 3).some((m) => !intentEvidence(m, effect).length)) throw new Error("L’ambiance n’est pas respectée dans les trois premières propositions.");
    if (first.some((a, i) => first.slice(i + 1).some((b) => tooSimilar(a, b)))) throw new Error("Une même famille est répétée dans le programme.");
    const renewed = recompose(pool, { filters, previous: first.map((m) => m.id), detour });
    const renewedCount = renewed.filter((m) => !first.some((f) => f.id === m.id)).length;
    const row = { effect, detour, timeBudget, angles, ids: first.map((m) => m.id), renewed: renewedCount, languages: new Set(first.map((m) => m.originalLanguage)).size, decades: new Set(first.map((m) => Math.floor(Number(m.releaseDate.slice(0, 4)) / 10))).size };
    if (first.length !== 4 || new Set(row.ids).size !== 4 || first.some((m) => !eligible(m, filters))) throw new Error(`Régression de contraintes : ${JSON.stringify(row)}`);
    rows.push(row);
  }
  const baseline = rows.find((r) => r.effect === "open" && r.detour === "faithful" && r.timeBudget === "ample" && !r.angles.length);
  const effectHeads = Object.fromEntries(effects.map((effect) => [effect, rows.find((r) => r.effect === effect && r.detour === "faithful" && r.timeBudget === "ample" && !r.angles.length).ids[0]]));
  const lensChanges = Object.fromEntries(LENSES.map((lens) => {
    const row = rows.find((r) => r.effect === "open" && r.detour === "faithful" && r.timeBudget === "ample" && r.angles.join() === lens.id);
    return [lens.id, row.ids.filter((id) => !baseline.ids.includes(id)).length];
  }));
  return { catalogue: "Fixture synthétique déterministe, pas une mesure du catalogue réel ni du goût", combinations: rows.length, uniqueProgrammes: new Set(rows.map((r) => r.ids.join())).size, minRenewed: Math.min(...rows.map((r) => r.renewed)), maxRenewed: Math.max(...rows.map((r) => r.renewed)), effectHeads, lensChanges, diversity: detours.map((detour) => { const set = rows.filter((r) => r.detour === detour); return { detour, meanLanguages: +(set.reduce((n, r) => n + r.languages, 0) / set.length).toFixed(2), meanDecades: +(set.reduce((n, r) => n + r.decades, 0) / set.length).toFixed(2) }; }) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(runBenchmark(), null, 2));
