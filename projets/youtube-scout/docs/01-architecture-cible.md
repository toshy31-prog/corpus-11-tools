# Architecture cible de l'état Explorer

## 1. Knowledge state — persistant
Doit survivre :
- graphe,
- entités,
- liens,
- résolutions,
- preuves,
- catalogues,
- cache fournisseur,
- bibliothèque,
- carnet,
- notes/corrections.

## 2. Recovery state — persistant mais inactif
Peut survivre :
- dernière fouille sérialisée,
- front,
- navigationStack,
- branches,
- profondeur,
- direction,
- seed.

Cette couche répond à :
> "Qu'est-ce que je pourrais reprendre ?"

Elle ne répond pas à :
> "Qu'est-ce que je suis en train de faire maintenant ?"

## 3. Active session state — volatil
- seed courant,
- front courant,
- branche affichée,
- sélection courante,
- chargement actif,
- erreurs courantes.

## 4. User memory — volontaire
- Carnet,
- sauvegardes nommées,
- historique explicitement exposé,
- reprise volontaire.

## Invariant principal

`persisted != active`

Au chargement :
1. charger bibliothèque/graphe/carnet ;
2. détecter une éventuelle session reprenable ;
3. stocker cette session dans `resumableDig` ;
4. initialiser `activeDig` vide ;
5. afficher Explorer neutre.
