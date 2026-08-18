# Préenregistrement — banc runtime asynchrone récupération/désinscription

Date de gel : 2026-08-18

Statut : **transport prospectif vers une émulation runtime horodatée**. Ce test n'est pas du matériel réel.

## Question

La séparation exacte `C_erase_1=2` contre `3` trouvée dans la réplication `n=6` produit-elle une différence observable de traces résiduelles lorsque l'ordre asynchrone est réalisé par de vraies temporisations de l'event loop et enregistré par horodatage, sous un même budget de deux ports de reset ?

## Architectures gelées

Utiliser l'exemple apparié canonique du test `n=6`.

Architecture A :

`(0,1),(0,2),(0,4),(0,5),(1,2),(2,3)`

Architecture B :

`(0,1),(0,2),(0,3),(0,5),(1,4),(2,3)`

Elles partagent les contrôles déclarés du test fini et ont respectivement `C_erase_1=2` et `3`.

## Choix des ports de reset

Budget identique : exactement deux ports, dont la source `0`.

Le second port est choisi par la même règle déterministe pour chaque topologie : sélectionner le nœud interne qui couvre le plus d'arêtes internes ; en cas d'égalité, choisir le plus petit label.

Donc :

- A : reset `{0,2}` ;
- B : reset `{0,1}`.

Ce choix est gelé avant exécution runtime.

## Dynamique

État initial : six bits à `1`.

Les nœuds de reset sont mis à `0` avant lancement de la passe.

Chaque nœud interne non clampé est une tâche `asyncio` distincte. Il :

1. attend un délai cible ;
2. enregistre `perf_counter_ns()` ;
3. lit l'état courant de ses prédécesseurs ;
4. remplace son état par leur OR (`0` si aucun prédécesseur) ;
5. enregistre son état final.

Chaque nœud est activé exactement une fois.

## Plans de latence

Les cinq délais cibles sont `1,2,3,4,5` millisecondes.

Pour chacune des `5! = 120` permutations des nœuds internes, attribuer ces délais dans l'ordre de la permutation. Cela vise toutes les ordonnances idéales possibles sans supposer que l'event loop les respectera parfaitement.

Répéter chaque permutation exactement `3` fois pour chaque architecture, soit :

- `360` runs A ;
- `360` runs B ;
- `720` runs totaux.

Le résultat est analysé selon **l'ordre réellement horodaté**, pas seulement l'ordre cible.

## Observables

Pour chaque run :

- ordre cible ;
- ordre runtime réel ;
- état final des six nœuds ;
- `residual_count` = nombre de bits encore à `1` ;
- `erased` = `residual_count == 0` ;
- durée murale entre lancement et dernière mise à jour.

## H1 runtime

Sous le budget de deux resets :

- A doit réussir l'effacement dans **100 %** des runs ;
- B doit échouer dans au moins un run (`residual_count>0`).

Cette prédiction suit le modèle fini, mais son transport vers l'ordre effectivement réalisé par le runtime n'est pas compté comme acquis avant exécution.

## H2 cohérence mécaniste

Pour chaque run A/B, le résultat final doit être identique à celui du simulateur discret exact lorsqu'on lui fournit **l'ordre runtime réellement observé**.

Tolérance : zéro divergence.

## Issues

- `runtime_transport` : H1 et H2 satisfaites ;
- `runtime_no_separation` : H2 passe mais B n'échoue jamais ou A échoue ;
- `runtime_model_mismatch` : au moins une divergence avec la prédiction discrète pour l'ordre réellement observé.

## Bornes d'interprétation

Un `runtime_transport` montre seulement que la séparation opérationnelle survit à une event loop réelle dans cet environnement logiciel. Cela n'est ni un test de matériel, ni une mesure énergétique, ni une preuve d'une nouvelle physique.

Les délais réels, jitter et ordres observés seront conservés comme données de provenance ; aucune règle ne sera réajustée selon les sorties.
