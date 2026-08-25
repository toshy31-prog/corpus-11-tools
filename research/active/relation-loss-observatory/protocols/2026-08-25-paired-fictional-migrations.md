# Protocole fixé avant exécution — migrations fictives appariées

## Portée et générateur

`model_internal`. `tests/test_fictional_paired_migrations.py` construit deux
graphes à objet et hash identiques : l’un perd l’arête d’index, l’autre l’arête
de contexte.

## Paramètres, invariants et contrôles

Besoin, permission, coût, compétence, objet et voie de refus sont constants.
Le contrôle conserve toutes les arêtes ; la migration en retire exactement une
et la réactivation la restaure. Les sorties sont accès, réutilisabilité,
présence d’objet et voie de refus.

## Rivaux, effet du protocole et retrait

Les rivaux fixés sont l’absence de besoin, le droit, le coût et la compétence.
Le graphe produit lui-même la perte ; il n’établit donc qu’une implication dans
le modèle. Retirer la conclusion si un rival change, si l’objet diffère ou si
la restauration de l’arête ne reconstruit pas la sortie contrôle.
