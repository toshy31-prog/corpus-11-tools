# Orientation temporelle compositionnelle

## Formulation

**Hypothèse.** Une orientation temporelle locale pourrait émerger d'une chiralité de composition : une asymétrie entre compositions opposées pourrait être non seulement lisible, mais devenir accessible à une dynamique interne neutre, être transduite en variable signée puis éventuellement amplifiée collectivement.

La chaîne de travail est explicitement séparée : `existence -> lisibilité -> couplage local -> transduction -> amplification`. Aucun étage n'implique automatiquement le suivant.

## Statut

weakened — **programme resserré**. Deux protocoles neutres finis montrent des réponses chirales exactes, mais le premier donne une réponse forte trop commune et sa partition fort/faible ne se transporte pas vers le second. Aucun invariant intrinsèque de couplabilité, aucune amplification collective et aucune orientation temporelle physique ne sont établis.

## Observations favorables

- **Attribution à la source :** la trace propose `Ω(A,B,C)` et un paramètre collectif `M`, en marquant explicitement ce saut comme fictionnel-théorique.
- **Résultat fini exact historique :** un magma d'ordre trois non isomorphe à son opposé fournit deux secteurs relatifs invariants par renommage.
- **Énumération complète :** les `19 683` tables étiquetées donnent `3 330` classes d'isomorphisme, dont `3 192` non auto-opposées.
- **Protocole 1 :** l'écart signé entre indices de collision de distributions de sortie pour arbres binaires miroirs est invariant sous renommage et s'inverse exactement sous `M -> M^op`.
- **Séparation interne au protocole 1 :** 42 strates ayant mêmes `d_chi`, `A_chi` et six covariables structurelles contiennent à la fois des classes fortement couplables et non couplables. Cela démontre seulement que ces résumés statiques n'épuisent pas le protocole 1.
- **Révélation retardée dans le protocole 1 :** `274` classes sont silencieuses à trois feuilles mais non nulles à quatre, et `50` restent silencieuses jusqu'à quatre feuilles puis deviennent non nulles à cinq.
- **Protocole 2 indépendant :** les chaînes de translations composées détectent une asymétrie gauche/droite non nulle chez `2 942 / 3 192` classes chirales et réalisent 292 profils distincts, avec invariance exacte au renommage et inversion sous opposition.

## Observations défavorables

- La non-auto-opposition est extrêmement commune à l'ordre 3 : `3 192 / 3 330` classes. Son existence seule est faiblement discriminante.
- **H1 renversée :** `1 690 / 3 192 = 52,94 %` des classes chirales dépassent le seuil fort du protocole 1, contre une fenêtre préenregistrée de `1–25 %` (`too_common`).
- **H2 non satisfaite :** sur les 42 strates gelées, le protocole 2 donne 14 contrastes positifs, 11 nuls et 17 négatifs, avec médiane exacte 0. Classification : `not_transported`.
- **Échec prédictif hors protocole :** le score gelé `C_3^(1)+C_4^(1)+C_5^(1)` produit 11 succès, 14 égalités et 17 échecs pour prédire `B^(2)`, loin du seuil de 28 succès. Classification : `no_predictive_transport`.
- L'échec de transport n'est pas expliqué par une seconde sonde inerte : `2 942` classes chirales ont une réponse protocole 2 non nulle.
- Les 42 strates ne démontrent donc pas un canal intrinsèque manquant ; la variable restante peut être un invariant statique non mesuré ou une interaction spécifique au protocole 1.
- Une non-associativité peut provenir du choix de structure algébrique sans lien temporel.
- La non-auto-opposition ne choisit aucun signe absolu. Les réponses opposées établissent une orientation relative au couple `M/M^op`, non une flèche physique.
- Aucun canal matériel, aucune variable macroscopique et aucun passage d'échelle ne sont fournis.

## Hypothèses concurrentes

- Les réponses des deux protocoles sont des propriétés standards différentes de la table, sans mécanisme commun de transduction.
- Les différences du protocole 1 sont déterminées par un invariant statique non inclus dans les six covariables.
- Toute structure chirale suffisamment riche produit une asymétrie sous des sondes expressives, sans isoler un mécanisme spécial.
- La flèche physique vient de conditions aux limites et de thermodynamique standard.
- Une structure causale binaire fondamentale suffit ; la ternarité est redondante.

## Prédictions discriminantes restantes

- Avant toute nouvelle famille dynamique, expliquer autant que possible `C^(1)` et `C^(2)` par des invariants statiques standards calculés sans adaptation de seuil.
- Une propriété plus intrinsèque ne pourra être proposée que si elle prédit prospectivement une réponse dans une famille dynamique nouvelle fixée indépendamment.
- Une amplification collective exige davantage qu'une révélation retardée : un signal local borné doit persister ou croître sous montée en taille ou bruit dans une dynamique fixée avant résultat.
- Une généralisation à l'ordre 4 doit être gelée avant ouverture de ses sorties et ne doit pas servir à rechercher adaptativement un succès après H1/H2.

## Condition de renversement

La branche « chiralité fréquente mais transductivité forte rare » est renversée pour le protocole 1 d'ordre 3 (`52,94 % > 25 %`).

La première tentative préenregistrée de stabilité hors protocole est également négative : la partition du protocole 1 ne transporte ni contraste global ni prédiction vers le protocole 2.

L'hypothèse générale est donc **affaiblie**, non rejetée comme classe entière. Suspendre toute promotion vers une lecture temporelle tant qu'aucune propriété signée ne montre à la fois stabilité hors protocole, prédiction prospective et passage d'échelle. Ne pas multiplier des protocoles jusqu'à obtenir un succès.

## Méthodes nécessaires

- auditer les dépendances statiques de `C^(1)` et `C^(2)` avant protocole 3 ;
- conserver séparés `O_static` et les couples `(T,Q)` dynamiques ;
- préenregistrer chaque nouvelle famille avant calcul ;
- utiliser arithmétique exacte et quotient par renommage lorsque possible ;
- comparer les profils entre familles sans baptiser prématurément un scalaire « invariant » ;
- distinguer couplage direct, révélation retardée, transduction et amplification ;
- tester une population indépendante seulement après définition d'une prédiction prospective qui ne dépend pas de ses sorties.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 7–8 et 19.
- `research/experiments/chiral-coupling-preregistration-2026-08-18.md`.
- `research/experiments/chiral-coupling-results-2026-08-18.md`.
- `research/experiments/chiral-transport-preregistration-2026-08-18.md`.
- `research/experiments/chiral-transport-results-2026-08-18.md`.
- Corpus 11 Tools : contrôle d'attribution, de robustesse et de non-régression, non source de mécanisme physique.

## Dernière mise à jour

2026-08-18 — H1 `too_common`; H2 `not_transported`; hypothèse générale affaiblie avant tout protocole supplémentaire
