# Smoke test Explorer après patch

## Test A — boot neutre
1. Recharger la page.
2. Cliquer Explorer.
3. Vérifier :
   - pas de `Kosh` automatiquement actif ;
   - pas d'autre seed actif ;
   - aucune carte de résultat présentée comme continuation courante ;
   - choix de départ disponible.

## Test B — connaissance préservée
Choisir un seed déjà connu du graphe.

Vérifier :
- les preuves locales existent toujours ;
- le graphe n'est pas vide ;
- les labels/relations déjà connus peuvent réapparaître.

## Test C — nouvelle exploration
1. Choisir une vidéo différente de Kosh.
2. Lancer.
3. Naviguer d'une branche.
4. Recharger le navigateur.

Attendu v1 :
- au reload, Explorer revient neutre ;
- l'ancienne fouille peut rester persistée techniquement mais n'est pas active.

## Test D — backup
1. Restaurer le backup 3881.
2. Aller immédiatement dans Explorer.

Attendu :
- Explorer neutre ;
- bibliothèque/graphe/carnet restaurés ;
- aucun ancien activeDig imposé.
