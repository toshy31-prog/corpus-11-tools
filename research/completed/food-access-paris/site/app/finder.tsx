"use client";

import { useMemo, useState } from "react";
import { accessLabels, places, type Access } from "./places";
import {
  accessRank,
  arrondissementRank,
  matchesQuery,
  phoneHref,
  recommendPlaces,
  statusFor,
  type AccessMode,
  type FoodNeed,
  type PlaceStatus,
} from "./finder-core";

const statusLabels: Record<PlaceStatus, string> = {
  today: "Prévu aujourd’hui",
  verify: "Prévu aujourd’hui - vérifier avant",
  "other-day": "Un autre jour",
  closed: "Fermeture temporaire",
  expired: "Donnée à renouveler",
};

const statusRank: Record<PlaceStatus, number> = {
  today: 0,
  verify: 1,
  "other-day": 2,
  closed: 3,
  expired: 4,
};

export function Finder() {
  const [arrondissement, setArrondissement] = useState("tous");
  const [access, setAccess] = useState<"tous" | Access>("tous");
  const [query, setQuery] = useState("");
  const [need, setNeed] = useState<FoodNeed>("meal");
  const [accessMode, setAccessMode] = useState<AccessMode>("free");
  const [today] = useState(() => new Date());

  const arrondissements = useMemo(
    () =>
      Array.from(new Set(places.map((place) => place.arrondissement))).sort(
        (a, b) => arrondissementRank(a) - arrondissementRank(b),
      ),
    [],
  );

  const results = useMemo(() => {
    return places
      .filter(
        (place) =>
          (arrondissement === "tous" || place.arrondissement === arrondissement) &&
          (access === "tous" || place.access === access) &&
          matchesQuery(place, query),
      )
      .map((place) => ({ place, status: statusFor(place, today) }))
      .sort(
        (a, b) =>
          statusRank[a.status] - statusRank[b.status] ||
          accessRank(a.place) - accessRank(b.place) ||
          arrondissementRank(a.place.arrondissement) -
            arrondissementRank(b.place.arrondissement),
      );
  }, [access, arrondissement, query, today]);

  const expiredCount = results.filter((result) => result.status === "expired").length;
  const recommendations = useMemo(
    () => recommendPlaces(places, { arrondissement, need, accessMode, now: today }),
    [accessMode, arrondissement, need, today],
  );

  return (
    <section className="finder" id="trouver" aria-labelledby="finder-title">
      <div className="finder-heading">
        <div>
          <p className="eyebrow">{places.length} solutions intégrées</p>
          <h2 id="finder-title">Trouver sans quitter la page.</h2>
        </div>
        <p>
          Sélection issue des guides officiels 2026 de la Ville de Paris.
          Les lieux prévus aujourd’hui et les accès les plus simples remontent
          en premier. Ce n’est pas une liste exhaustive.
        </p>
      </div>

      {expiredCount > 0 ? (
        <div className="expiry-alert" role="alert">
          {expiredCount === results.length
            ? "Toutes les fiches affichées ont dépassé leur date de révision. Elles restent visibles comme archive, mais doivent être revérifiées avant usage."
            : `${expiredCount} ${expiredCount > 1 ? "fiches ont" : "fiche a"} dépassé leur date de révision et ${expiredCount > 1 ? "doivent" : "doit"} être revérifiée${expiredCount > 1 ? "s" : ""} avant usage.`}
        </div>
      ) : null}

      <div className="triage" aria-labelledby="triage-title">
        <div className="triage-intro">
          <p className="eyebrow">Décider, pas parcourir</p>
          <h3 id="triage-title">Trois choix pour aujourd’hui.</h3>
          <p>
            La sélection privilégie le bon type d’aide, l’accès libre et votre
            arrondissement. Elle n’utilise ni compte, ni géolocalisation.
          </p>
        </div>

        <div className="triage-controls">
          <label>
            Proximité
            <select value={arrondissement} onChange={(event) => setArrondissement(event.target.value)}>
              <option value="tous">Peu importe</option>
              {arrondissements.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Besoin
            <select value={need} onChange={(event) => setNeed(event.target.value as FoodNeed)}>
              <option value="meal">Manger un repas</option>
              <option value="groceries">Obtenir des provisions</option>
            </select>
          </label>
          <label>
            Ce que j’ai déjà
            <select value={accessMode} onChange={(event) => setAccessMode(event.target.value as AccessMode)}>
              <option value="free">Aucune carte ni orientation</option>
              <option value="prepared">Carte, inscription ou orientation possible</option>
            </select>
          </label>
        </div>

        <div className="recommendations" aria-live="polite">
          {recommendations.map(({ place, status }, index) => (
            <article className="recommendation" key={place.id}>
              <div className="recommendation-rank">{index + 1}</div>
              <div>
                <span className={`status status-${status}`}>{statusLabels[status]}</span>
                <h4>{place.name}</h4>
                <p><strong>{place.service}</strong> · {accessLabels[place.access]}</p>
                <p>{place.schedule}<br />{place.address} · {place.arrondissement}</p>
                <div className="place-contact">
                  {place.phone ? <a className="action-link" href={phoneHref(place.phone)}>Appeler {place.phone}</a> : null}
                  <a href={`#lieu-${place.id}`}>Voir les conditions ↓</a>
                </div>
              </div>
            </article>
          ))}
          {recommendations.length === 0 ? (
            <p className="no-results">Aucune option suffisamment fiable aujourd’hui avec ces critères. Élargissez l’arrondissement ou les conditions d’accès.</p>
          ) : null}
        </div>
        <p className="triage-note">« Prévu aujourd’hui » ne garantit pas une place disponible : appelez quand un numéro est fourni.</p>
      </div>

      <div className="filters" aria-label="Filtres des lieux">
        <label>
          Arrondissement
          <select value={arrondissement} onChange={(event) => setArrondissement(event.target.value)}>
            <option value="tous">Tous</option>
            {arrondissements.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Condition d’accès
          <select value={access} onChange={(event) => setAccess(event.target.value as "tous" | Access)}>
            <option value="tous">Toutes</option>
            <option value="libre">Accès libre</option>
            <option value="orientation">Sur orientation</option>
            <option value="inscription">Sur inscription</option>
            <option value="carte">Carte d’accès</option>
          </select>
        </label>

        <label className="search-label">
          Mot-clé
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="étudiant, petit déjeuner…"
          />
        </label>
      </div>

      <p className="result-count" aria-live="polite">
        {results.length} {results.length > 1 ? "solutions" : "solution"}
      </p>

      <div className="place-list">
        {results.map(({ place, status }) => (
          <article className="place" id={`lieu-${place.id}`} key={place.id}>
            <div className="place-topline">
              <span className={`status status-${status}`}>{statusLabels[status]}</span>
              <span>{place.arrondissement}</span>
            </div>
            <h3>{place.name}</h3>
            <p className="place-service">{place.service}</p>
            <dl>
              <div><dt>Pour qui</dt><dd>{place.audience}</dd></div>
              <div><dt>Accès</dt><dd>{accessLabels[place.access]}</dd></div>
              <div><dt>Quand</dt><dd>{place.schedule}</dd></div>
              <div><dt>Où</dt><dd>{place.address}{place.metro ? ` · ${place.metro}` : ""}</dd></div>
            </dl>
            {place.note ? <p className="place-note">{place.note}</p> : null}
            <div className="place-contact">
              {place.phone ? <a href={phoneHref(place.phone)}>{place.phone}</a> : null}
              {place.email ? <a href={`mailto:${place.email}`}>{place.email}</a> : null}
              <a
                href={place.sourceUrl ?? `https://cdn.paris.fr/paris/2026/06/01/1877_guide-solidarite-ete-2026-v4-gVHA.pdf#page=${place.sourcePage}`}
                target="_blank"
                rel="noreferrer"
              >
                {place.sourceLabel ?? `Source p. ${place.sourcePage}`} ↗
              </a>
            </div>
          </article>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="no-results">Aucun lieu dans cette sélection. Modifiez les filtres ou consultez Soliguide.</p>
      ) : null}
    </section>
  );
}
