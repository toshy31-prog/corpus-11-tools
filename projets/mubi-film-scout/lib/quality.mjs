import { analyzeWish } from "./search.mjs";

export const QUALITY_WISH_CASES = Object.freeze([
  ["un thriller après 2014", { minYear: 2015, genres: [53] }],
  ["une science-fiction avant 2000", { maxYear: 1999, genres: [878] }],
  ["un documentaire depuis 2020", { minYear: 2020, genres: [99] }],
  ["une comédie entre 1980 et 1990", { minYear: 1980, maxYear: 1990, genres: [35] }],
  ["un film bien noté", { minRating: 7 }],
  ["un excellent film", { minRating: 7.5 }],
  ["moins de 100 minutes", { maxRuntime: 100 }],
  ["moins de 1h30", { maxRuntime: 90 }],
  ["un film très court", { maxRuntime: 90 }],
  ["un classique", { maxYear: 1999 }],
  ["un film récent", { minYear: 2021 }],
  ["surprends-moi", { sort: "surprise" }],
  ["une romance", { genres: [10749] }],
  ["un film de guerre", { genres: [10752] }],
  ["un western", { genres: [37] }],
  ["un film musical", { genres: [10402] }],
  ["un polar", { genres: [] }],
  ["quelque chose de poétique", { qualitative: ["poetic"] }],
  ["un film contemplatif", { qualitative: ["contemplative"] }],
  ["un film léger et réconfortant", { qualitative: ["light"] }]
]);

export function verifyWishCase([text, expected], nowYear = 2026) {
  const analysis = analyzeWish(text, {}, nowYear);
  const failures = [];
  for (const [key, value] of Object.entries(expected)) {
    const actual = key === "qualitative" ? analysis.qualitative.map(({ id }) => id) : analysis.filters[key];
    if (JSON.stringify(actual) !== JSON.stringify(value)) failures.push({ key, expected: value, actual });
  }
  return { text, passed: failures.length === 0, failures };
}

export function evaluateProgramme(programme, filters) {
  const ids = programme.map(({ id }) => Number(id));
  const seen = new Set((filters.seen || []).map(Number));
  return [
    { id: "count", label: "quatre propositions lorsque le catalogue le permet", passed: programme.length === 4 },
    { id: "unique", label: "aucun doublon", passed: new Set(ids).size === ids.length },
    { id: "runtime", label: "durées connues conformes", passed: programme.every((movie) => !movie.runtime || movie.runtime <= filters.maxRuntime) },
    { id: "seen", label: "aucun film vu lorsque le masquage est actif", passed: !filters.hideSeen || ids.every((id) => !seen.has(id)) },
    { id: "availability", label: "disponibilités individuellement vérifiées", passed: programme.every((movie) => Boolean(movie.offerLink)) }
  ];
}
