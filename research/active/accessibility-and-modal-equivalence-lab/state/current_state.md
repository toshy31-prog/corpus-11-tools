# État courant

L’équivalence d’identifiants est classée `proxy_substitution` pour l’équivalence
fonctionnelle. Avec opérations et seuils, seul le texte réussit en base ; la
voix perd la preuve et le canal contraint dépasse son budget. Deux réparations
fictives restaurent les deux sorties. Une faiblesse détectée où action, preuve
et recours n'étaient pas consommés par le simulateur est corrigée : 4/4
mutations de ces exigences échouent maintenant. Portée `pipeline_verified`.

## Contraste v0.3 — sortie identique et marge synthétique

Sur la variante vocale assistée exacte `evidence_loss=False, load=4`, seul
`load_threshold` varie :

- `3` : échec exact `load_threshold_exceeded`, marge synthétique `-1` ;
- `4` : succès, marge synthétique `0` ;
- `5` : succès, marge synthétique `1`.

Les sorties terminales complètes aux seuils `4` et `5` sont strictement
identiques, mais leurs marges synthétiques valent `0` et `1`. Après la même
perturbation `-1`, `4 → 3` échoue avec `load_threshold_exceeded`, tandis que
`5 → 4` réussit. `final_output_only_equivalence` perd uniquement dans cette
paire fermée : l'égalité de sortie initiale ne suffit pas à prédire la
divergence sous cette perturbation.

Ces nombres sont sans unité réelle et n'ont de sens que dans l'exécuteur. Ils
ne mesurent ni capacité humaine, ni charge cognitive, ni ergonomie. Le code et
le résultat étaient déterministes et visibles ; aucun pré-enregistrement
prospectif n'est démontré.

Statuts conservés : `pipeline_verified`, `internal_synthetic_only`, validité
externe `not_claimed`, robustesse générale non revendiquée et indépendance
`independence_unknown`.

## Prochaine action interne utile

Le contraste v0.3 est matérialisé dans sa portée fermée. Toute extension à un
autre exécuteur, canal ou domaine exigerait un protocole distinct.
