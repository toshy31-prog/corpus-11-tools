# Recherche préenregistrée : graphes enracinés appariés

## Statut

Espace de recherche et règle de sélection figés le 2026-08-16 avant énumération, puis exécutés sans modification du test primaire.

## Question discriminante

Existe-t-il deux graphes simples connexes enracinés ayant même taille, nombre d'arêtes, nombre de traces, profondeur depuis la racine et condition de terminaison, mais des coûts minimaux d'effacement différents sous les mêmes opérations locales ?

## Espace de recherche

- Tous les graphes simples non orientés étiquetés de `N=3..6` nœuds.
- Seuls les graphes connexes sont admis.
- La racine est toujours le nœud `0`.
- Tous les nœuds portent une trace `1`; le contrefactuel est tout-zéro.
- Lecture de la racine au coût `1`.
- `MOVE` sur une arête et `RESET` du nœud courant coûtent chacun `1`.
- L'agent commence à la racine et peut terminer n'importe où.

## Signature d'appariement obligatoire

```text
(N, nombre_arêtes, nombre_traces=N, excentricité_racine, terminaison_libre)
```

La recherche tentera d'abord une signature plus stricte ajoutant la séquence de degrés triée. Cette préférence est fixée avant résultat.

## Mesure primaire

`erase_work = N + cover_moves`, où `cover_moves` est calculé par recherche exhaustive dans `(position, masque_des_nœuds_visités)`. Les `N` resets sont communs; seule la partie accès doit différer.

## Règle de sélection

1. Chercher la plus petite taille `N` contenant une paire de coûts différents sous la signature stricte avec séquence de degrés.
2. Si aucune n'existe jusqu'à `N=6`, utiliser la signature obligatoire sans degrés.
3. Dans la première classe admissible, choisir les deux encodages d'arêtes lexicographiquement minimaux portant le coût minimum et le coût maximum.
4. Conserver le nombre total de graphes examinés et de classes appariées comme certificat de couverture.

## Conditions d'échec

- Aucun couple différent jusqu'à `N=6` sous la signature obligatoire.
- Différence provenant d'une trace, opération, racine ou condition finale non appariée.
- Coûts non retrouvés par une seconde vérification directe des témoins sélectionnés.

## Portée

Un succès montrerait que les invariants appariés ne suffisent pas à déterminer le coût de parcours couvrant. Le résultat resterait un fait de théorie des graphes finie, non une nouvelle physique ni une nouvelle mesure fondamentale.

## Commande reproductible

```bash
PYTHONDONTWRITEBYTECODE=1 python3 research/experiments/search_matched_rooted_graphs.py --verify --max-nodes 6
```

## Couverture exécutée

```text
N=3 : 8 graphes étiquetés, 4 connexes, aucune classe divergente
N=4 : 64 graphes étiquetés, 38 connexes, aucune classe divergente
N=5 : 1024 graphes étiquetés, 728 connexes, 5 classes strictes divergentes
```

La première divergence apparaît donc à `N=5` dans l'espace exhaustivement examiné.

## Paire primaire sélectionnée

Les deux graphes ont `N=5`, `5` arêtes, `5` traces, une excentricité racine `2` et la même séquence de degrés `[1,2,2,2,3]`.

Le graphe de coût faible possède les arêtes :

```text
(0,1) (0,3) (1,2) (1,4) (2,3)
```

Son témoin `0→3→2→1→4` visite chaque nœud une fois : `cover_moves=4`, donc `erase_work=5+4=9`.

Le graphe de coût élevé sélectionné par la règle primaire possède :

```text
(0,2) (0,3) (0,4) (1,2) (1,3)
```

Son témoin minimal `0→2→1→3→0→4` exige une revisite : `cover_moves=5`, donc `erase_work=10`.

## Contrôle exploratoire plus strict

Après le résultat primaire, une recherche supplémentaire apparie aussi le degré de la racine `2` et le profil complet des distances `[0,1,1,2,2]`. Elle conserve le premier graphe et trouve comme second :

```text
(0,1) (0,4) (1,2) (1,3) (2,3)
```

Le témoin minimal `0→4→0→1→2→3` exige encore `5` déplacements. La divergence `erase_work=9` contre `10` persiste donc sous ces contrôles supplémentaires, mais ce résultat est exploratoire car ces deux appariements ont été ajoutés après le test primaire.

## Audit de portée

- **Démonstration dans le jouet :** taille, arêtes, traces, lecture, profondeur racine, terminaison et opérations identiques ne déterminent pas le travail minimal.
- **Contrôle renforcé :** même la séquence de degrés, le degré racine et le profil de distances ne suffisent pas dans la paire exploratoire.
- **Mécanisme :** l'existence ou non d'un chemin hamiltonien commençant à la racine change le coût couvrant.
- **Limite :** le résultat reste entièrement exprimable comme coût de plus court parcours couvrant enraciné, un objet standard de théorie des graphes.

Le profil de désinscription dépasse les invariants grossiers appariés, mais aucune nouvelle grandeur indépendante de la théorie des graphes n'est établie.
