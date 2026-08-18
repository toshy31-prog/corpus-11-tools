# Résultats — F_T contre Borda sans ordre latent commun

Date : 2026-08-18

Préenregistrement : `temporal-borda-conditioned-preregistration-2026-08-18.md`

Script : `run_temporal_borda_conditioned.py`

## Contrôles

PASS :

- `32768` tournois étiquetés sur six sommets ;
- `720` ordres scalaires ;
- `2932` strates de vecteur de degrés étiqueté, dont `2212` non triviales ;
- tous les couples train/test sont distincts et ont exactement le même vecteur de degrés étiqueté ;
- aucune variable d'ordre latent n'est générée ;
- moyenne exacte sur tous les minimiseurs F_T du train ;
- moyenne exacte sur tous les tie-breaks Borda compatibles ;
- arithmétique rationnelle exacte dans le script versionné.

## Population testée

Nombre total de couples ordonnés train/test admissibles :

`1 343 184`.

La seule information commune imposée entre train et test est leur vecteur étiqueté exact de degrés sortants.

## Résultat confirmatoire

Avec

`delta = L_Borda - L_FT`,

on obtient :

- `Delta_total = -472112` ;
- `Delta_mean = -472112 / 1343184 ≈ -0.351487` violation par test ;
- F_T meilleur que Borda : `301248` couples ;
- égalité : `370240` ;
- F_T pire que Borda : `671696` ;
- strates à avantage moyen F_T positif : `0` ;
- strates nulles : `0` ;
- strates à avantage moyen F_T négatif : `2212 / 2212`.

## Décision

**`borda_better`**.

Le résultat ne se contente pas de manquer le seuil confirmatoire : dans chaque strate non triviale de degré, Borda a une perte moyenne strictement plus faible que l'ordre F_T appris sur un tournoi distinct de la même strate.

## Lecture

Ce résultat satisfait la condition de requalification inscrite dans la fiche `temporal-frustration.md`.

Dans cette famille exhaustive sans ordre latent commun, une fois le vecteur de degrés étiqueté fixé, la structure globale supplémentaire utilisée par l'optimisation F_T n'apporte pas de pouvoir prédictif hors ajustement ; elle dégrade en moyenne la prédiction par rapport à Borda.

Le succès prospectif historique de F_T sur des train/test partageant un ordre latent ne doit donc plus être utilisé comme argument d'un contenu temporel émergent. L'ablation précédente montrait déjà que `96,03 %` de cet avantage disparaissait sans ordre commun ; le présent test montre en plus qu'un estimateur local standard domine F_T sous conditionnement exact des degrés dans une population sans ordre générateur.

## Portée

Cela ne rend pas `F_T` mathématiquement inutile : il reste le minimum exact d'arêtes de retour et décrit la distance d'un tournoi à un ordre scalaire.

Cela affaiblit en revanche fortement son statut comme variable prédictive autonome ou indice d'émergence temporelle dans le programme actuel.

Aucune extrapolation physique n'est permise.
