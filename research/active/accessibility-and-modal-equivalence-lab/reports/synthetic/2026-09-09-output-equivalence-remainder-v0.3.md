# Résultat v0.3 — sortie identique et marge synthétique

## Portée

- Statut du pipeline : `pipeline_verified`.
- Régime de preuve : `internal_synthetic_only`.
- Validité externe : `not_claimed`.
- Robustesse générale : non revendiquée.
- Indépendance : `independence_unknown`.
- Pré-enregistrement prospectif démontré : non.

Le code, les paramètres attendus et le résultat étaient déterministes et
visibles. Les valeurs de `load`, de `load_threshold` et de leur différence
sont des nombres synthétiques sans unité réelle, définis uniquement dans
l'exécuteur. Ils ne mesurent ni capacité humaine, ni charge cognitive, ni
ergonomie.

## Résultats observés

La variante vocale assistée est restée exactement
`evidence_loss=False, load=4`. Seul `load_threshold` a varié :

- seuil `3` : échec exact `load_threshold_exceeded`, marge synthétique `-1` ;
- seuil `4` : succès à la frontière, marge synthétique `0` ;
- seuil `5` : succès, marge synthétique `1`.

Les sorties terminales complètes sont strictement identiques aux seuils `4`
et `5`. Cette égalité de sortie ne supprime pas la différence calculée dans
l'exécuteur : la marge synthétique vaut respectivement `0` et `1`.

Après la même perturbation `-1` appliquée à `load_threshold` :

- la configuration `4 → 3` échoue exactement avec
  `load_threshold_exceeded` ;
- la configuration `5 → 4` réussit.

La perturbation commune sépare donc deux configurations qui réussissaient
initialement avec la même sortie terminale.

## Discrimination bornée

Dans cette paire fermée, `final_output_only_equivalence` perd : la seule sortie
finale initiale ne prédit pas la divergence produite par la perturbation
commune. Cette défaite vaut uniquement pour ce cas synthétique fermé. Elle ne
sélectionne pas une théorie générale de l'équivalence et n'établit aucune
robustesse hors des branches déterministes exercées ici.

La classification observée est
`common_perturbation_separates_equal_outputs`. Toute autre combinaison prévue
par le protocole aurait produit `candidate_set_incomplete`.

## Limites

Le contraste réutilise le même code visible pour produire et vérifier les
résultats. Il ne constitue ni une confrontation indépendante, ni une mesure
sur des personnes, ni un test de canaux réels. Aucun pré-enregistrement
prospectif n'est démontré et l'indépendance reste `independence_unknown`.
