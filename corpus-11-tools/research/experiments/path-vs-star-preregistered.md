# Expérience préenregistrée : chemin contre étoile à traces appariées

## Statut

Spécification figée le 2026-08-16 avant exécution de la recherche exacte, puis exécutée sans modification du test primaire.

## Question discriminante

Deux architectures ayant la même taille, le même nombre de traces terminales, la même interface de lecture et exactement les mêmes opérations locales peuvent-elles exiger des profils d'effacement différents uniquement à cause de leur topologie d'accès ?

## Candidats générés avant audit

1. Nœuds verrouillés contre nœuds libres : rejeté, car le verrou introduit directement le surcoût recherché.
2. Accès autorisé à des sous-ensembles différents : rejeté, car les classes d'interventions ne seraient plus identiques.
3. Chemin contre étoile avec navigation locale identique : retenu, car seules les arêtes de l'architecture changent.

## Architectures appariées

Pour chaque `N≥3`, les deux graphes ont `N` nœuds, `N-1` arêtes et la racine `0` :

- **PATH :** `0—1—...—(N-1)`, racine à une extrémité.
- **STAR :** la racine `0` est reliée directement à chacun des `N-1` autres nœuds.

Pour `b=1`, les `N` nœuds portent la trace `1`; pour `b=0`, ils valent tous `0`. Les deux états ont donc exactement la même distance de Hamming au contrefactuel.

## Interface et interventions identiques

- La récupération lit la racine au coût `1` dans les deux architectures.
- L'agent d'effacement commence à la racine.
- `RESET` remet à zéro le nœud courant au coût `1`.
- `MOVE` traverse une arête de l'architecture au coût `1`.
- L'agent peut terminer n'importe où.
- La désinscription réussit seulement lorsque les `N` traces valent `0`.

## Mesures fixées avant calcul

- `trace_count = N` dans les deux architectures.
- `C_info = 1` dans les deux architectures.
- `erase_work` : nombre minimal total de `MOVE + RESET`.
- `access_depth` : distance maximale depuis la racine.

## Prédiction fixée avant calcul

```text
erase_work(PATH) = N + (N-1)   = 2N-1
erase_work(STAR) = N + (2N-3) = 3N-3
difference       = N-2

access_depth(PATH) = N-1
access_depth(STAR) = 1
```

Le test prédit donc un croisement de profils : le chemin est plus profond mais demande moins de travail séquentiel; l'étoile est peu profonde mais impose des retours par la racine.

## Méthode

Rechercher exhaustivement le plus court chemin dans l'espace `(position_de_l_agent, masque_des_traces)`, sans utiliser les formules comme algorithme de décision. Vérifier `N=3..9`.

## Conditions d'échec

Le test échoue si les nombres de traces, interfaces de lecture ou opérations diffèrent; si une trace peut être effacée à distance; ou si la recherche exacte ne retrouve pas les expressions préenregistrées.

## Portée

Un succès montrerait seulement que le coût d'accès contient une composante topologique au-delà du nombre de traces. Les coûts resteraient ceux d'un problème standard de parcours de graphe, sans portée physique établie.

## Commande reproductible

```bash
PYTHONDONTWRITEBYTECODE=1 python3 research/experiments/compare_path_star_access.py --verify --max-nodes 9
```

## Résultat exécuté

La recherche exhaustive dans l'espace `(position, masque)` retrouve la prédiction pour chaque `N=3..9` :

```text
trace_count(PATH) = trace_count(STAR) = N
C_info(PATH)      = C_info(STAR)      = 1

erase_work(PATH) = 2N-1
erase_work(STAR) = 3N-3
difference       = N-2
```

Le nombre de resets est `N` dans les deux cas. Seul le nombre minimal de déplacements diffère : `N-1` contre `2N-3`.

## Contrôle de sensibilité après résultat

Si l'agent doit revenir à la racine après effacement, les deux coûts deviennent `3N-2` et la différence tombe à zéro. Ce contrôle n'altère pas le test primaire préenregistré; il borne sa portée.

## Audit de portée

- **Démonstration dans le jouet :** à distance de Hamming, lecture, nombre de nœuds, nombre d'arêtes et opérations appariés, la topologie change le travail minimal d'effacement.
- **Croisement de profils :** `PATH` a une profondeur d'accès supérieure mais un travail inférieur; un scalaire de profondeur seul n'ordonne donc pas ces deux coûts.
- **Limite :** le résultat est un problème classique de plus court parcours couvrant et dépend de la condition de terminaison.
- **Non établi :** contenu irréductible à des invariants de graphe connus, robustesse à d'autres distributions de traces, portée empirique ou physique.

La prédiction topologique est satisfaite dans cette famille finie. Elle établit un profil de coût plus riche que le seul nombre de traces, mais aucune nouvelle quantité fondamentale.
