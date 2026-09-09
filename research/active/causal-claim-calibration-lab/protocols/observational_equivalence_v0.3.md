# Protocole v0.3 — équivalence observationnelle et intervention divergente

## Question et portée

Deux modèles causaux binaires peuvent-ils produire exactement les mêmes
observations tout en prédisant des effets d'intervention différents ? La
conclusion est `model_internal` : elle porte uniquement sur les unités, modèles,
prédictions et résultats synthétiques gelés de cette campagne. Elle n'établit
aucun mécanisme réel, aucune validité externe et aucune indépendance externe.

## Modèles rivaux gelés

Les deux modèles partagent `U ~ Bernoulli(1/2)` et `X := U` hors intervention.

- `direct_effect_one` : `Y := X`, avec l'arête `X -> Y`. Il prédit
  `E[Y|do(X=0)] = 0`, `E[Y|do(X=1)] = 1` et `ATE = 1`.
- `latent_common_cause_zero` : `Y := U`, avec les arêtes `U -> X` et
  `U -> Y`, sans arête `X -> Y`. Il prédit `1/2` sous chaque intervention et
  `ATE = 0`.

Hors intervention, les deux modèles prédisent exactement une masse `1/2` sur
`(X=0,Y=0)` et `1/2` sur `(X=1,Y=1)`, nulle ailleurs. Cette égalité ne permet
donc pas de choisir entre eux.

## Bornes partielles avant intervention

Sous les seules hypothèses gelées — `X` et `Y` binaires, cohérence entre issue
observée et résultat potentiel correspondant, aucune ignorabilité et aucune
direction causale imposée — les observations donnent :

- `E[Y(1)]` entre `1/2` et `1` ;
- `E[Y(0)]` entre `0` et `1/2` ;
- `ATE = E[Y(1)-Y(0)]` entre `0` et `1`.

Les deux modèles occupent les deux extrémités de cette dernière borne. Le
verdict avant intervention est donc `partially_identified`, jamais
`identified_under_assumptions` à partir des seules observations.

## Résultat discriminant gelé

Le résultat tenu à l'écart contient deux bras synthétiques de même taille. Dans
chaque bras `do(X=0)` et `do(X=1)`, une issue vaut `0` et une issue vaut `1`.
L'effet observé est donc `0`. Ce résultat doit faire perdre la conclusion
`C-direct-ATE-1`; `C-common-ATE-0` reste compatible dans l'ensemble fermé des
deux candidats. Cette survie relative ne prouve pas que le second modèle est
vrai ni que l'ensemble des modèles possibles est complet.

## Critères d'échec pré-enregistrés

La campagne échoue si les distributions observationnelles diffèrent, si les
effets `do` ne divergent pas, si les bornes calculées diffèrent de `[0,1]`, si
une borne exclut l'un des deux modèles, si le résultat d'intervention ne fait
perdre aucune conclusion, si tous les modèles perdent, ou si une conclusion
externe ou produit est tirée du résultat.

## Gel et exécution

Le manifeste pré-exécution énumère les trois fichiers scellés, leurs SHA-256,
la commande unique et la liste fermée des sept fichiers du changement. Le sceau
porte le SHA-256 du manifeste. Après scellement, seuls le rapport synthétique et
la mise à jour de l'état courant peuvent être écrits. Toute modification d'un
fichier scellé invalide l'exécution.
