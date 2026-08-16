# Expérience préenregistrée : copie persistante contre transfert destructif

## Statut

Spécification figée le 2026-08-16 avant exécution de l'énumération, puis exécutée sans modification des critères.

## Question discriminante

Deux architectures de même taille, avec exactement la même interface de lecture et la même classe d'interventions terminales, peuvent-elles avoir `C_info` identique mais `C_erase` différent ?

## Candidats générés avant audit

1. Répétition contre encodage clairsemé : rejeté comme test principal, car la différence se réduit directement au choix du mot de code final.
2. Copie persistante contre transfert destructif : retenu, car les deux états résultent de circuits causaux locaux explicites.
3. Répétition contre parité distribuée : rejeté comme appariement principal, car une lecture locale unique ne récupère pas le bit dans les deux architectures.

## Architectures appariées

Les deux circuits commencent dans `(b,0,...,0)` et comportent `N` cellules.

- **COPY :** pour chaque arête `i→i+1`, copier la valeur de `i` dans `i+1` sans modifier `i`. Pour `b=1`, l'état terminal attendu est `1^N`.
- **MOVE :** pour chaque arête `i→i+1`, transférer la valeur de `i` dans `i+1` puis remettre `i` à zéro. Pour `b=1`, l'état terminal attendu est `0^(N-1)1`.

## Interface et interventions identiques

- La récupération lit uniquement la cellule terminale `N-1`, au coût `1`.
- Après exécution du circuit, une intervention admissible remet à zéro une cellule quelconque, au coût `1`.
- La même opération et la même métrique sont disponibles pour les deux architectures.
- La désinscription parfaite exige l'état global `0^N`, identique au contrefactuel `b=0`.

## Prédiction fixée avant calcul

Pour `N≥2` :

```text
C_info(COPY)  = C_info(MOVE)  = 1
C_erase(COPY) = N
C_erase(MOVE) = 1
```

La statistique primaire est `C_erase(COPY)-C_erase(MOVE)=N-1`.

## Conditions d'échec

Le test échoue si l'une des deux sorties terminales ne permet pas de distinguer `b=0` de `b=1` en une lecture, si les interventions diffèrent entre architectures, ou si l'énumération ne retrouve pas les coûts préenregistrés.

## Portée

Un succès établirait seulement une divergence opérationnelle dans ce modèle fini. Il ne prouverait ni une loi physique, ni une irréversibilité fondamentale, ni une supériorité générale d'une architecture.

## Commande reproductible

```bash
PYTHONDONTWRITEBYTECODE=1 python3 research/experiments/compare_copy_transfer.py --verify --max-cells 8
```

## Résultat exécuté

Pour chaque `N=2..8`, l'énumération exhaustive retrouve la prédiction préenregistrée :

```text
C_info(COPY)  = C_info(MOVE)  = 1
C_erase(COPY) = N
C_erase(MOVE) = 1
différence    = N - 1
```

Chaque architecture possède un unique témoin minimal d'effacement. Aucun critère ni coût n'a été ajusté après observation.

## Audit de portée

- **Démonstration dans le jouet :** deux circuits de même taille, même interface de lecture et mêmes resets locaux ont des coûts minimaux d'effacement différents.
- **Mécanisme observé :** `COPY` conserve le bit dans chaque cellule traversée, tandis que `MOVE` remet chaque cellule antérieure à zéro.
- **Limite :** la divergence est entièrement expliquée ici par le nombre de traces terminales non nulles, une quantité standard simple.
- **Non établi :** robustesse à d'autres portes, bruit, coûts énergétiques, accès partiel ou critères d'indiscernabilité; portée physique; contenu irréductible à une mesure connue.

La prédiction opérationnelle principale est satisfaite dans cette famille finie. La prétention plus forte d'un contenu propre de `ΔH` reste ouverte.
