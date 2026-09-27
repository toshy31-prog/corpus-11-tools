// Pure offline evaluator. No filesystem, network, user-history or model access.
// Missing human judgments are unknown, never silently converted to negatives.
export function evaluateRanking({ rankedIds, eligibleIds, judgments, k = 10, artistsById = {} }) {
  const validIds = (value, name) => {
    if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id.trim()) || new Set(value).size !== value.length) {
      throw new TypeError(`${name} must contain distinct non-empty string IDs`);
    }
  };
  validIds(rankedIds, "rankedIds");
  validIds(eligibleIds, "eligibleIds");
  if (!Number.isSafeInteger(k) || k < 1) throw new RangeError("k must be a positive safe integer");
  if (!judgments || typeof judgments !== "object" || Array.isArray(judgments)) throw new TypeError("judgments must be an object");
  if (!artistsById || typeof artistsById !== "object" || Array.isArray(artistsById)) throw new TypeError("artistsById must be an object");
  const eligible = new Set(eligibleIds);
  if (rankedIds.some(id => !eligible.has(id))) throw new RangeError("ranked ID is outside the frozen eligible catalogue");
  for (const [id, grade] of Object.entries(judgments)) {
    if (!eligible.has(id) || !Number.isInteger(grade) || grade < 0 || grade > 3) {
      throw new RangeError("judgments require eligible IDs and integer grades from 0 to 3");
    }
  }
  const judged = id => Object.hasOwn(judgments, id);
  const top = rankedIds.slice(0, k);
  const fullyJudged = eligibleIds.length > 0 && eligibleIds.every(judged);
  const relevantCount = eligibleIds.filter(id => judged(id) && judgments[id] > 0).length;
  const hits = top.filter(id => judged(id) && judgments[id] > 0).length;
  const dcg = grades => grades.reduce((sum, grade, index) => sum + (2 ** grade - 1) / Math.log2(index + 2), 0);
  const ideal = fullyJudged ? dcg(eligibleIds.map(id => judgments[id]).sort((a, b) => b - a).slice(0, k)) : 0;
  const artists = new Set();
  let itemsWithArtists = 0;
  for (const id of top) {
    const values = Object.hasOwn(artistsById, id) ? artistsById[id] : undefined;
    if (!Array.isArray(values) || !values.length || values.some(value => typeof value !== "string" || !value.trim())) continue;
    itemsWithArtists++;
    values.forEach(value => artists.add(value));
  }
  return {
    schemaVersion: 1,
    scope: "offline_frozen_catalogue_only",
    k,
    eligibleCount: eligible.size,
    returnedCount: top.length,
    abstained: top.length === 0,
    fullyJudged,
    judgmentCoverage: eligible.size ? eligibleIds.filter(judged).length / eligible.size : null,
    topJudgmentCoverage: top.length ? top.filter(judged).length / top.length : null,
    // Full-catalogue judgments are required: a partial pool cannot establish recall.
    recallAtK: fullyJudged && relevantCount ? hits / relevantCount : null,
    ndcgAtK: fullyJudged && ideal ? dcg(top.map(id => judgments[id])) / ideal : null,
    catalogExposureAtK: eligible.size ? top.length / eligible.size : null,
    distinctArtistsAtK: artists.size,
    artistMetadataCoverageAtK: top.length ? itemsWithArtists / top.length : null
  };
}
