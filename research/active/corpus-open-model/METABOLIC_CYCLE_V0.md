# Cycle métabolique v0

## But

Relier un état observé de l'écosystème Corpus à un checkpoint de modèle, sans
présumer que cette relation constitue une autonomie, une identité ou une forme
de vie.

## Cycle

1. `freeze` : enregistrer empreinte du milieu, checkpoint et sondes déclarées ;
2. `probe` : calculer des représentations du checkpoint sur les mêmes sondes ;
3. intervention humaine éventuelle : entraînement borné, jamais automatique ;
4. `compare` : observer le nouvel état, le nouveau checkpoint et les écarts de
   représentations ;
5. décider humainement de conserver, retirer ou poursuivre.

## Invariants

- le modèle ne déclenche pas l'étape 3 ;
- les sondes ne sont ni une preuve de compréhension ni un test de capacité ;
- les changements de milieu et de protocole sont enregistrés séparément ;
- une différence de représentation est une trace, non une attribution ;
- le produit Corpus n'est jamais écrit par le cycle.
