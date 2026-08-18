# Frustration temporelle

## Formulation

**Hypothèse.** Le temps scalaire global peut être une compression d'une structure locale plus riche. La frustration `F_T` est la fraction minimale de relations locales violées par toute affectation scalaire : `F_T = 0` permet un ordre global exact ; `F_T > 0` mesure son défaut d'ajustement.

## Statut

**weakened — requalifié comme score descriptif/optimiseur standard dans le programme actuel.** `F_T` reste un minimum exact d'arêtes de retour, mais sa prétention de pouvoir prédictif autonome a échoué face à Borda dans une population exhaustive sans ordre latent commun. Aucune émergence temporelle n'est établie.

## Observations favorables

- **Attribution à la source :** la trace fournit la définition variationnelle et l'interprétation des trois régimes.
- **Démonstration élémentaire :** un cycle orienté fini ne peut être plongé dans un ordre strict sans violer au moins une contrainte.
- **Test exhaustif historique :** deux tournois sur six sommets, appariés sur séquence de scores et triangles cycliques, ont `F_T=1/15` et `2/15`.
- **Test prospectif historique avec ordre latent commun :** sur 192 paires train/test, les ordres minimisant `F_T` réduisent les violations tenues à l'écart de `1941` à `1028` face à un ordre aléatoire, avantage `913`.
- **Propriété mathématique conservée :** `F_T` mesure exactement la distance minimale, dans le modèle de tournoi, à un ordre scalaire total.

## Observations défavorables

- `F_T` est un problème standard de minimum d'arêtes de retour ; le choix des relations peut déjà coder l'ordre recherché.
- L'ablation prospective de l'ordre latent commun réduit l'avantage face à l'aléatoire de `983` à `39`, soit seulement `3,97 %` conservé ; `96,03 %` disparaît.
- **Test concurrent direct du 2026-08-18 :** population complète des `32768` tournois étiquetés à six sommets, train/test distincts conditionnés sur le même vecteur étiqueté exact de degrés, sans ordre latent généré. `1 343 184` couples ordonnés sont évalués exactement.
- Dans ce test, avec moyenne sur tous les minimiseurs F_T et tous les tie-breaks Borda : `Delta_total = L_Borda-L_FT = -472112`, soit `-0,351487` violation par test en moyenne.
- F_T bat Borda sur `301248` couples, égale Borda sur `370240`, et perd sur `671696`.
- **Les `2212 / 2212` strates de degrés non triviales ont un avantage moyen F_T négatif.** Classification préenregistrée : `borda_better`.
- La condition de requalification de la fiche est donc satisfaite : aucun pouvoir prédictif propre de F_T au-delà des degrés n'est établi dans cette famille sans ordre générateur.

## Hypothèses concurrentes

- Les violations reflètent bruit/incohérence et `F_T` optimise simplement un critère combinatoire standard.
- Le succès historique venait de l'ordre latent partagé, que Borda ou d'autres estimateurs standards peuvent déjà exploiter.
- Un ordre partiel ou une causalité standard décrit les mêmes observations sans frustration fondamentale.

## Prédictions discriminantes restantes

Aucune nouvelle expérience ne doit être conçue pour sauver adaptativement la lecture temporelle de `F_T` après l'ablation et le résultat `borda_better`.

Une réouverture exige une prédiction indépendante, formulée sans utiliser les sorties des protocoles précédents, sur une famille où `F_T` doit battre prospectivement des concurrents standards fixés avant résultat.

## Condition de renversement

**Atteinte pour le programme actuel.** La fiche demandait de requalifier `F_T` comme simple score descriptif s'il ne battait pas des prédicteurs standards préenregistrés sur une famille sans ordre générateur. Le test exhaustif `temporal-borda-conditioned-2026-08-18` donne `borda_better` dans chacune des 2212 strates non triviales.

Cela ne nie pas la définition mathématique de `F_T`; cela retire son usage actuel comme indice d'une émergence temporelle ou comme prédicteur autonome établi.

## Méthodes nécessaires

Conserver les résultats comme bornes négatives ; ne pas ajuster les familles ou seuils après coup. Toute réouverture doit préenregistrer relations, concurrent, population, métrique et condition de décision. Conserver l'ordre du journal moteur comme provenance seulement.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 9, 11 et 19.
- `research/experiments/temporal-borda-conditioned-preregistration-2026-08-18.md`.
- `research/experiments/temporal-borda-conditioned-results-2026-08-18.md`.
- Corpus 11 Tools : jeu d'audit, pas théorie causale.

## Dernière mise à jour

2026-08-18 — condition de requalification atteinte : `borda_better` sur la population exhaustive conditionnée par degrés
