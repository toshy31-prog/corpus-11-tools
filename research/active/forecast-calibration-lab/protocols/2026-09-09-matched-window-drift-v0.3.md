# Protocole v0.3 — dérive sur fenêtres datées appariées

## Portée et réutilisation

Ce protocole réutilise sans modification `generated_registry`, `decomposition`
et les probabilités `RIVALS` de
`tests/test_fictional_forecast_registry.py`. La fixture v0.3 ne contient aucune
probabilité : elle déclare seulement deux changements d'issue appliqués au
registre v0.2.

La portée est `formal_exact`. La stabilité externe est `not_claimed`,
l'adaptation comportementale reste `strategic_effect_unknown`, le
pré-enregistrement prospectif n'est pas démontré, la robustesse générale n'est
pas revendiquée et l'indépendance reste `independence_unknown`.

Liste fermée v0.3 :

1. `protocols/2026-09-09-matched-window-drift-v0.3.md` ;
2. `fixtures/matched_window_drift_v0.3.json` ;
3. `tests/test_matched_window_drift.py` ;
4. `reports/synthetic/2026-09-09-matched-window-drift-v0.3.md` ;
5. `state/current_state.md`.

Seuls les trois premiers fichiers sont autorisés avant le passage des tests et
la contre-revue distincte.

## Contraste fixé

Le registre est trié par `issued`, puis divisé en deux moitiés chronologiques
de dix cas. Aucun champ `window` n'est introduit. Chaque moitié doit contenir
cinq cas `low`, cinq cas `high` et uniquement des horizons de trente jours.

La fenêtre A conserve le registre v0.2. Dans la fenêtre B, seules les issues
suivantes changent :

- `fictional-f10` : `0` vers `1` ;
- `fictional-f11` : `1` vers `0`.

Les fréquences attendues sont `(low=1/5, high=4/5)` en A et
`(low=2/5, high=3/5)` en B. Les deux règles comparées sont reprises telles
quelles depuis v0.2 : `stratified` et `base_rate`.

## Prédictions rivales

Pour la fenêtre A :

- `stratified` : Brier `4/25`, fiabilité `0`, résolution `9/100`,
  incertitude `1/4` ;
- `base_rate` : Brier `1/4`, fiabilité `0`, résolution `0`,
  incertitude `1/4` ;
- perdant : `base_rate`.

Pour la fenêtre B :

- `stratified` : Brier `7/25`, fiabilité `1/25`, résolution `1/100`,
  incertitude `1/4` ;
- `base_rate` : Brier `1/4`, fiabilité `0`, résolution `0`,
  incertitude `1/4` ;
- perdant : `stratified`.

L'issue admissible est `matched_window_rank_reversal`. Toute autre table de
résultats reçoit `candidate_set_incomplete`.

## Observables et contrôles

Le test doit vérifier computationnellement :

- dix cas et cinq cas de chaque strate par fenêtre ;
- des horizons identiques et égaux à trente jours ;
- l'absence de champ `window` ;
- les probabilités inchangées des deux règles importées ;
- exactement les deux changements d'issue déclarés, sans autre champ modifié ;
- les fréquences, scores et décompositions exacts annoncés ;
- l'inversion des perdants ;
- aucune lecture de `outcome` pendant l'exécution des prévisions.

Le scoring lit ensuite les issues pour calculer le Brier. Cette séparation
d'exécution n'établit pas que les probabilités ont été conçues indépendamment
des issues : le registre et les rivaux restent co-conçus.

Un contrôle négatif doit refuser un troisième changement d'issue. Un second
contrôle doit refuser toute modification de la table de probabilités importée.

## Conditions d'arrêt

Arrêter sans réparation si v0.2 échoue, si une fonction ou probabilité v0.2
doit être modifiée, si les fenêtres ne sont pas construites depuis `issued`, si
leur composition ou horizon diverge, si un autre champ change, si l'exécution
des prévisions lit une issue, ou si la décomposition ne reconstruit plus le
Brier.

Le contraste peut établir une inversion formelle sous cette dérive synthétique
fermée. Il ne prouve ni stabilité prospective, ni adaptation d'un acteur, ni
indépendance du générateur.
