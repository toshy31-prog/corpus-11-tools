# Consolidation 0.16.1 — 13 septembre 2026

## Corrections

- L’envie passe avant les angles de découverte lors de la constitution des
  candidats et de la composition. Les trois premières places non verrouillées
  exigent un indice de genre parmi les trois premiers genres TMDB ou un mot-clé
  explicite. Un quatrième film sans indice n’est possible qu’en mode détour,
  avec le libellé « Hors de votre envie ». Le mode fidèle ne l’autorise pas.
- La composition initiale et le renouvellement utilisent le même moteur.
  Les séries connues via leur collection TMDB sont écartées entre elles ; un
  repli prudent sur les titres couvre notamment les Godzilla sans collection.
- Si la réserve ne permet pas une sélection cohérente, elle reste partielle.
  Le renouvellement ne force plus quatre changements à tout prix.
- Atelier en quatre panneaux : Une séance, À deux, Mes goûts, Collections.
  Les six listes à sélection multiple deviennent des cases cochables en
  boutons ; les fonctions sans films ou collection nécessaires sont désactivées
  et accompagnées d’une indication.
- Critères traduits et moins répétés, cartes alignées, titre équilibré,
  accès direct à l’atelier et suppression des anciennes alertes à la recherche.

## Vérifications

- `npm run check` : réussi.
- `npm test` : 73 tests réussis, aucun échec.
- `npm run benchmark` : 792 combinaisons synthétiques, 474 programmes distincts.
  Assertions sur la cohérence des trois premières places et l’absence de
  films trop proches. Renouvellement de 0 à 4 films selon la réserve admissible.
  Ces mesures ne démontrent pas une qualité cinéphile ou un ressenti garanti.
- API locale et navigateur réel : recherche 1990–2026, deux heures,
  tension/suspense, pas de côté et pépite cachée. Résultat : Night Call,
  Dream Work, Sang et or, puis Portraits Fantômes explicitement hors envie.
  Princes et Princesses ne remonte plus comme suspense sur un genre secondaire.
- Dans le navigateur, Night Call verrouillé reste présent après renouvellement ;
  les trois autres deviennent 13 Tzameti, Les Chambres rouges et Flee
  (ce dernier explicitement hors envie).
- Atelier inspecté visuellement : aucun `select[multiple]`, six groupes de
  cases cochables et un seul panneau affiché à la fois. Aucun goût fictif enregistré.

## Limites

L’ambiance reste une heuristique sur les métadonnées, pas une analyse du film.
L’ordre des genres TMDB et les mots-clés peuvent être imparfaits ; les trois
premiers genres sont une convention locale de sélection, pas une qualification
officielle de leur importance. Les explications exposent les indices utilisés.
Le repli anti-série peut manquer une parenté ou rapprocher à tort des titres ;
il ne constitue pas une connaissance exhaustive des franchises.

Les disponibilités restent celles du relevé TMDB/JustWatch, éventuellement en
cache. Pas de garantie de lecture réelle, de VO/VF ni de sous-titres.
Pas de nouvelle clé, de modèle installé, de publication ni de modification des
préférences personnelles pendant cette consolidation.
