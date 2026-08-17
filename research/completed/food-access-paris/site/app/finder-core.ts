import { accessLabels, type FoodPlace } from "./places.ts";

export type PlaceStatus = "today" | "verify" | "other-day" | "closed" | "expired";
export type FoodNeed = "meal" | "groceries";
export type AccessMode = "free" | "prepared";

export const DATA_EXPIRES = "2026-08-31";

const weekdayNumber: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parisDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    key: `${value("year")}-${value("month")}-${value("day")}`,
    day: weekdayNumber[value("weekday")],
  };
}

export function statusFor(place: FoodPlace, now: Date): PlaceStatus {
  const { key: date, day } = parisDate(now);
  if (date > (place.reviewAfter ?? DATA_EXPIRES)) return "expired";
  if (place.activeFrom && date < place.activeFrom) return "closed";
  if (place.activeUntil && date > place.activeUntil) return "closed";
  if (place.closures?.some(([start, end]) => date >= start && date <= end)) {
    return "closed";
  }
  if (!place.days.includes(day)) return "other-day";
  return place.verify ? "verify" : "today";
}

export function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'‐‑‒–—-]/g, " ")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesQuery(place: FoodPlace, query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  const haystack = normalizeSearch(
    [
      place.name,
      place.service,
      place.audience,
      accessLabels[place.access],
      place.schedule,
      place.address,
      place.metro,
      place.note,
    ]
      .filter(Boolean)
      .join(" "),
  );
  return needle.split(" ").every((token) => haystack.includes(token));
}

export function arrondissementRank(value: string) {
  if (value === "Centre") return 0;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : 99;
}

export function accessRank(place: FoodPlace) {
  return {
    libre: 0,
    inscription: 1,
    orientation: 2,
    carte: 3,
  }[place.access];
}

export function phoneHref(phone: string) {
  const withoutFrenchTrunkPrefix = phone.trim().replace(/^\+33\s*\(0\)/, "+33");
  return `tel:${withoutFrenchTrunkPrefix.replace(/(?!^)\D/g, "")}`;
}

const needTokens: Record<FoodNeed, string[]> = {
  meal: ["repas", "dejeuner", "diner", "petit dejeuner", "restaurant", "plats"],
  groceries: ["colis", "alimentaire", "epicerie", "panier", "produits", "libre service"],
};

export function matchesNeed(place: FoodPlace, need: FoodNeed) {
  const service = normalizeSearch(place.service);
  return needTokens[need].some((token) => service.includes(token));
}

export function recommendPlaces(
  allPlaces: FoodPlace[],
  options: {
    arrondissement: string;
    need: FoodNeed;
    accessMode: AccessMode;
    now: Date;
    limit?: number;
  },
) {
  const { arrondissement, need, accessMode, now, limit = 3 } = options;

  return allPlaces
    .map((place) => ({ place, status: statusFor(place, now) }))
    .filter(
      ({ place, status }) =>
        (status === "today" || status === "verify") &&
        matchesNeed(place, need) &&
        (accessMode === "prepared" || place.access === "libre"),
    )
    .sort(
      (a, b) =>
        Number(arrondissement !== "tous" && b.place.arrondissement === arrondissement) -
          Number(arrondissement !== "tous" && a.place.arrondissement === arrondissement) ||
        Number(a.status === "verify") - Number(b.status === "verify") ||
        accessRank(a.place) - accessRank(b.place) ||
        arrondissementRank(a.place.arrondissement) - arrondissementRank(b.place.arrondissement),
    )
    .slice(0, limit);
}
