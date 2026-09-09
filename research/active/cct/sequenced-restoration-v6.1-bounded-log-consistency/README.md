# CCT-EXEC 6.1 — cohérence bornée du journal (candidate)

L'accord 6.0 sur une tête ne garantissait pas qu'une tête ultérieure conserve cet historique. Cette couche vérifie une extension bornée de l'arbre de taille 2 vers la taille 3 : la racine attestée en 6.0 doit être reprise exactement, une feuille est ajoutée, la nouvelle racine est recalculée, puis la nouvelle tête est signée par la même clé de journal avant l'accès aux résultats.

La confrontation tenue à l'écart produit une nouvelle tête cryptographiquement signée, mais construite depuis une autre racine passée. Elle passe encore l'accord 6.0 sur l'ancienne tête et échoue en 6.1. Le mécanisme distingue ainsi rotation légitime et réécriture rétroactive dans cette fenêtre précise.

La fixture, les clés, les entrées et les ticks sont **synthétiques**. La règle d'extension est un accumulateur Merkle borné à 2→3 ; elle n'établit pas une preuve de cohérence générale, un journal externe, une horloge fiable, la résistance aux partitions, l'autorisation, le déploiement ou la robustesse externe.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
