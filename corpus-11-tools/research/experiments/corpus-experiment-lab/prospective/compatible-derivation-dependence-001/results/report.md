# Rapport — dépendance à la règle de dérivation

## Classification automatique

**L'ordre dépend du mécanisme de dérivation.**

La condition préenregistrée `exact_persistence_fails` est déclenchée avec `22 350` graphes dont la relation stricte exacte change. Les conditions de disparition globale, d'absorption par contrôle et d'invalidité ne sont pas déclenchées.

## Comparaison verrouillée

- Règle originale : inclusion des supports sur tous les contextes compatibles maximaux par inclusion.
- Variante : inclusion des supports sur les seuls contextes compatibles de cardinalité maximale ; les distinctions absentes de tous ces contextes sont exclues des implications strictes.
- Univers inchangé : `32 768` graphes simples étiquetés sur six distinctions.

## Observables préenregistrés

- Ordre non trivial, règle originale : `30 668` graphes.
- Ordre non trivial, variante : `20 858` graphes.
- Relation exacte identique : `10 418` graphes.
- Relation exacte différente : `22 350` graphes.
- Ordre original devenu trivial : `10 380` graphes.
- Ordre trivial devenu non trivial : `570` graphes.
- Classes appariées encore discriminantes sous la variante : `2`.

## Contrôles conservés

- Univers exhaustif : `32 768 / 32 768`, réussi.
- Appariement : degrés, triangles et tailles des contextes maximaux inchangés.
- Invariance par renommage : `0` écart.
- Graphes vide et complet : `0` écart.
- Budget d'accès : `6 / 6` opérations déclarées.
- Reconstruction : `2/2` artefacts identiques octet par octet.

## Conclusion bornée

L'existence d'un ordre dérivé persiste dans une partie substantielle de l'univers sous la variante, et deux classes localement appariées restent discriminantes. En revanche, l'ordre exact n'est pas une propriété univoque des seules compatibilités : il dépend fortement de la convention qui sélectionne les contextes utilisés pour l'implication.

Le résultat n'est ni une disparition globale ni une absorption complète par les contrôles. Il établit une dépendance de méthode dans ce modèle fini. Aucune interprétation physique n'est autorisée.

## Empreintes

- `protocol_hash` : `sha256:d44762f195b68d4d6bc252f2cc75894b4531ab8fe6bb8c79dfaf6765a79a52f6`
- `experiment_fingerprint` : `sha256:a29ef7d6cb2c60ada71d854645725142c8b7f887450760893074c713da3b2319`
- `raw_hash` : `sha256:19d8bb0705b72168b84dcacf89f8dd917f0e117b413b38cb3ccb74d17dfbce12`
- `classification_hash` : `sha256:32d0f989f46a5eb6e2fd366978217fddf8c54e3ccdc8aadee0afdc77f5ef0c1e`
