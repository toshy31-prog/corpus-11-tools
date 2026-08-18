# Récupération contre désinscription

## Formulation

**Hypothèse.** Récupérer l'information utile d'un système et rendre indiscernables le monde où un événement a eu lieu et son contrefactuel exigent en général des ressources différentes. On distingue explicitement plusieurs budgets de désinscription selon le régime d'intervention, notamment `C_erase_inf` à convergence et `C_erase_1` sous une passe asynchrone bornée.

## Statut

active — **séparation opérationnelle renforcée jusqu'à une émulation runtime horodatée, mais profils toujours absorbés par des invariants standards**. Aucun statut fondamental, matériel ou thermodynamique n'est établi.

## Observations favorables

- **Attribution à la source :** la trace distingue accès, profondeur de circuit, extension spatiale, précision et travail ; elle avertit que ce profil n'est pas monotone.
- **Jouet copies :** `C_info=1` tandis que l'effacement terminal local peut demander `N` resets.
- **Topologie :** à Hamming fixé, des arbres appariés ont des profondeurs d'effacement `2/3`; à excentricité fixée, des charges résiduelles `9/5` et `10/5` persistent après perte d'une arête.
- **Réplication prospective asynchrone multi-port `n=6` :** `32768` architectures brutes, `9765` atteignables, `685` strates de contrôle et **176 strates** où `C_info=C_erase_inf=1` mais `C_erase_1` diffère. Classification : `replicated_profile_separation`.
- **Transport runtime prospectif :** sur deux architectures appariées gelées, budget de deux resets et 120 ordres de latence visés trois fois chacun, l'architecture A s'efface `360/360` fois tandis que B échoue `180/360` fois. Classification : **`runtime_transport`**.
- **Cohérence mécaniste runtime :** zéro divergence sur `720` runs entre l'état produit par l'event loop `asyncio` et le simulateur discret conditionné par l'ordre réellement horodaté.
- Les `120` ordres d'activation ont tous été effectivement réalisés dans chaque architecture au cours de cette exécution.

## Observations défavorables

- **Aucune mesure matérielle indépendante** n'est encore fournie ; le banc runtime reste une émulation logicielle dans un seul processus/event loop.
- La séparation dépend de la famille d'entrées, des accès permis, de la deadline et du critère d'indiscernabilité ; ces choix sont opérationnels, non universels.
- Les résidus historiques restent réductibles successivement à Hamming, excentricité et profils de coupes.
- Dans la réplication asynchrone, zéro violation est observée de `C_erase_1 = 1 + tau(G_int)`, où `tau` est la couverture minimale de sommets. Le nouvel axe est donc entièrement expliqué par un invariant standard dans cette famille.
- `C_erase_inf=1` dans toute la famille DAG ; cet axe est volontairement trivial ici.
- Le succès runtime n'ajoute aucun mécanisme nouveau : la cohérence parfaite avec le simulateur discret montre que l'effet observé est celui attendu de la structure du graphe et de l'ordre d'activation.

## Hypothèses concurrentes

- Les différents `C_erase` ne sont qu'un catalogue de problèmes standards d'optimisation de graphe sélectionnés par la classe d'interventions.
- La différence observée vient seulement de restrictions de contrôle et de deadline arbitraires.
- Une dynamique globale réversible rend la distinction sans portée fondamentale, quoique potentiellement utile opérationnellement.

## Prédictions discriminantes restantes

- Une variation contrôlée du budget temporel ou du nombre de ports peut déplacer `C_erase` sans déplacer `C_info` — désormais reproduit algébriquement et dans une event loop réelle.
- Pour établir un contenu propre au-delà d'une compilation d'invariants standards, un futur test doit produire un résidu non absorbé par un invariant classique déclaré avant résultat.
- Le prochain transport significatif doit utiliser des composants ou processus réellement séparés, avec latences/pertes/ordres produits par la pile d'exécution et non seulement par une temporisation `asyncio` locale.
- Le même contrat `(C_info,C_erase_inf,C_erase_deadline,residual_count,cost)` doit être conservé sans réajustement des critères.

## Condition de renversement

Requalifier la branche comme **profil opérationnel de quantités standards**, plutôt que mécanisme nouveau, si chaque nouvelle coordonnée testée continue d'être exactement déterminée par un invariant classique et si aucun résidu prospectif ne survit sur un système distribué ou matériel.

L'énoncé faible — récupération et désinscription sous contraintes différentes peuvent demander des ressources distinctes — est désormais bien reproduit et ne doit pas être confondu avec une prétention de nouvelle physique.

## Méthodes nécessaires

Passer désormais à un banc distribué ou matériel ; définir avant acquisition ports, deadline, règle de convergence, pertes, détectabilité, coût messages/opérations/temps et condition de renversement. Ne plus multiplier les émulations du même mécanisme dans une seule event loop.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 4–6 et 18–19.
- `research/experiments/recovery-async-multiport-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-multiport-results-2026-08-18.md`.
- `research/experiments/recovery-async-runtime-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-runtime-results-2026-08-18.md`.
- Corpus 11 Tools : architecture d'audit et de discrimination, non source de physique.

## Dernière mise à jour

2026-08-18 — `runtime_transport` sur 720 runs ; séparation opérationnelle confirmée en émulation runtime, sans résidu non standard ni donnée matérielle
