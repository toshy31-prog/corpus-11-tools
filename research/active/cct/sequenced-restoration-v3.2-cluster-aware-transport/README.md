# CCT-EXEC 3.2 — transport conscient des grappes (candidat)

## Lacune traitée

La version 3.1 calcule l'incertitude à partir du nombre brut d'observations. Cinq millions de lignes produites par un seul site, épisode ou dispositif peuvent alors sembler plus précises que 40 unités réellement distinctes.

## Gain concret

Le candidat 3.2 engage les identifiants et tailles des grappes avant les résultats. Chaque contexte doit contenir au moins 30 grappes de même taille. Leurs comptes doivent se réconcilier exactement avec les comptes agrégés de 3.0. Les marges sont calculées comme des différences candidat-rival au niveau de chaque grappe ; les risques comme des fréquences par grappe.

La décision utilise la moyenne des grappes et son erreur standard, avec une valeur critique conservatrice de 4,0 pour les 90 intervalles de contexte. L'intervalle complet doit rester dans les tolérances de 3.0. Un très grand effectif issu d'une seule grappe est donc refusé, même lorsque l'intervalle naïf de 3.1 est étroit.

Le statut `bounded_cluster_aware_transport_candidate` ne prouve ni l'indépendance réelle des grappes, ni leur représentativité, ni la validité externe du construit.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.2-cluster-aware-transport/test.mjs
node research/active/cct/sequenced-restoration-v3.2-cluster-aware-transport/held-out/run-confrontation.mjs
```
