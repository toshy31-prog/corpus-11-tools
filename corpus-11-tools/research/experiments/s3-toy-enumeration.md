# Expérience exécutée : énumération du jouet S3

## Statut

Exécutée le 2026-08-16 en arithmétique entière par énumération exhaustive des `6² = 36` paires. Résultat interne à un modèle-jouet, sans inférence physique.

## Commande reproductible

```bash
PYTHONDONTWRITEBYTECODE=1 python3 research/experiments/enumerate_s3_toy.py --verify
```

## Conventions fixées

- Chaque boucle porte un élément de `S3`.
- L'identité a le poids formel `q`; chacun des cinq autres éléments a le poids `1`.
- Le dénominateur de deux boucles indépendantes est `(q+5)²`.
- Le secteur temporel demande deux permutations paires.
- Le secteur invariant demande une intersection non nulle des espaces fixes dans la représentation plane standard.
- La dimension fixe commune est calculée comme le nombre d'orbites du sous-groupe engendré moins un.

## Résultats exacts

L'énumération retrouve :

```text
P_T = (q² + 4q + 4) / (q+5)² = ((q+2)/(q+5))²
P_I = (q² + 6q + 3) / (q+5)²
```

À `q=1`, les 36 paires se répartissent par dimension fixe commune : `26` de dimension `0`, `9` de dimension `1`, `1` de dimension `2`.

## Contrôle abélien C6

Le contrôle utilise le groupe cyclique `C6`, de même cardinalité, dans sa représentation fidèle par rotations planes. Le secteur pair donne le même numérateur `q²+4q+4`, tandis qu'un invariant non nul exige les deux identités et donne seulement `q²`.

## Décision

- **Démonstration dans le jouet :** les deux formules attribuées à `S3` sont reproduites exactement.
- **Résultat défavorable à une spécificité forte :** le comptage temporel est reproduit par le contrôle abélien choisi.
- **Différence conservée :** le comptage invariant dépend du groupe et de la représentation.
- **Inconnue :** ce contrôle seul ne sépare pas proprement non-commutativité, représentation et choix du secteur pair.

Le jouet reste une illustration algébrique active. Aucun résultat exclusif ni lien physique n'est établi.
