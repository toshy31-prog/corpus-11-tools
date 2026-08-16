# Expérience exécutée : récupération contre désinscription

## Statut

Exécutée le 2026-08-16 par énumération exhaustive des sous-ensembles d'interventions pour `N=1..8`. Résultat interne au jouet de copies terminales.

## Commande reproductible

```bash
PYTHONDONTWRITEBYTECODE=1 python3 research/experiments/enumerate_recovery_erasure.py --verify --max-copies 8
```

## Conventions fixées

- Le contrefactuel est `0^N` et l'état enregistré `1^N`.
- Lire ou remettre à zéro une copie terminale coûte une unité.
- Une lecture réussit si elle distingue les deux états possibles.
- Une désinscription parfaite exige que l'état final soit exactement `0^N`.

## Résultat exact sous interventions locales

Pour chaque `N=1..8`, l'énumération retrouve :

```text
C_info  = 1
C_erase = N
écart   = N - 1
```

Il existe `N` témoins minimaux de lecture, un par copie, et un seul témoin minimal d'effacement : intervenir sur les `N` copies.

## Contrôle d'intervention globale

Si la classe d'interventions contient une opération globale remettant toutes les copies à zéro pour un coût unitaire, alors `C_erase=1` et l'écart disparaît.

## Décision

- **Démonstration dans le jouet :** la séparation `1` contre `N` est reproduite sous interventions locales terminales.
- **Limite démontrée :** la séparation n'est pas intrinsèque au seul état copié; elle dépend de la classe d'interventions et de sa métrique de coût.
- **Inconnue :** aucun couple d'architectures à récupération égale et désinscription différente sous une même classe non triviale n'a encore été construit.

L'hypothèse opérationnelle reste active. Aucune loi fondamentale ni mesure empirique n'est établie.
