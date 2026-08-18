# Récupération contre désinscription

## Formulation

**Hypothèse.** Récupérer l'information utile d'un système et rendre indiscernables le monde où un événement a eu lieu et son contrefactuel exigent en général des ressources différentes. On distingue explicitement plusieurs budgets de désinscription selon le régime d'intervention, notamment `C_erase_inf` à convergence et `C_erase_1` sous une passe asynchrone bornée.

## Statut

active — **séparation opérationnelle renforcée jusqu'à une event loop réelle puis cinq processus OS séparés, mais profils toujours absorbés par des invariants standards**. Aucun statut fondamental, matériel ou thermodynamique n'est établi.

## Observations favorables

- **Attribution à la source :** la trace distingue accès, profondeur de circuit, extension spatiale, précision et travail ; elle avertit que ce profil n'est pas monotone.
- **Jouet copies :** `C_info=1` tandis que l'effacement terminal local peut demander `N` resets.
- **Topologie :** à Hamming fixé, des arbres appariés ont des profondeurs d'effacement `2/3`; à excentricité fixée, des charges résiduelles `9/5` et `10/5` persistent après perte d'une arête.
- **Réplication prospective asynchrone multi-port `n=6` :** `32768` architectures brutes, `9765` atteignables, `685` strates de contrôle et **176 strates** où `C_info=C_erase_inf=1` mais `C_erase_1` diffère. Classification : `replicated_profile_separation`.
- **Transport runtime `asyncio` :** sur deux architectures appariées, A s'efface `360/360` fois tandis que B échoue `180/360` fois ; zéro divergence sur `720` runs avec le simulateur discret conditionné par l'ordre réellement horodaté. Classification : `runtime_transport`.
- **Transport multi-processus :** avec cinq workers OS persistants sur le même hôte, A s'efface `240/240` fois et B échoue `120/240` fois ; zéro divergence sur `480` runs. Classification : `multiprocess_transport`.
- Le scheduling noyau a modifié l'ordre cible dans 16 runs multi-processus, mais la prédiction conditionnée par l'ordre réellement observé reste exacte.

## Observations défavorables

- **Aucune mesure matérielle indépendante** n'est fournie ; les deux bancs restent logiciels et le multi-processus reste sur un seul hôte.
- La séparation dépend de la famille d'entrées, des accès permis, de la deadline et du critère d'indiscernabilité ; ces choix sont opérationnels, non universels.
- Les résidus historiques restent réductibles successivement à Hamming, excentricité et profils de coupes.
- Dans la réplication asynchrone, zéro violation est observée de `C_erase_1 = 1 + tau(G_int)`, où `tau` est la couverture minimale de sommets. Le nouvel axe est donc entièrement expliqué par un invariant standard dans cette famille.
- `C_erase_inf=1` dans toute la famille DAG ; cet axe est volontairement trivial ici.
- Les transports runtime ne montrent aucun mécanisme nouveau : leur cohérence parfaite avec le modèle discret confirme que l'effet est celui attendu de la structure de graphe et de l'ordre d'activation.

## Hypothèses concurrentes

- Les différents `C_erase` ne sont qu'un catalogue de problèmes standards d'optimisation de graphe sélectionnés par la classe d'interventions.
- La différence observée vient seulement de restrictions de contrôle et de deadline arbitraires.
- Une dynamique globale réversible rend la distinction sans portée fondamentale, quoique potentiellement utile opérationnellement.

## Prédictions discriminantes restantes

- Une variation contrôlée du budget temporel ou du nombre de ports peut déplacer `C_erase` sans déplacer `C_info` — reproduit algébriquement, dans une event loop et avec processus OS séparés.
- Pour établir un contenu propre au-delà d'une compilation d'invariants standards, un futur test doit produire un résidu non absorbé par un invariant classique déclaré avant résultat.
- Le prochain transport significatif doit utiliser un système réellement distinct : plusieurs machines, réseau externe, microcontrôleurs ou autre dispositif où communications et resets ne sont pas seulement des opérations locales sur le même hôte.
- Le même contrat `(C_info,C_erase_inf,C_erase_deadline,residual_count,cost)` doit être conservé sans réajustement des critères.

## Condition de renversement

Requalifier la branche comme **profil opérationnel de quantités standards**, plutôt que mécanisme nouveau, si chaque nouvelle coordonnée testée continue d'être exactement déterminée par un invariant classique et si aucun résidu prospectif ne survit sur un système distribué ou matériel.

L'énoncé faible — récupération et désinscription sous contraintes différentes peuvent demander des ressources distinctes — est désormais bien reproduit et ne doit pas être confondu avec une prétention de nouvelle physique.

## Méthodes nécessaires

Conserver désormais une condition d'arrêt sur les bancs logiciels locaux. La prochaine montée d'échelle exige un dispositif réellement distinct ; avant acquisition, fixer ports, deadline, règle de convergence, pertes, détectabilité, coût messages/opérations/temps et condition de renversement.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 4–6 et 18–19.
- `research/experiments/recovery-async-multiport-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-multiport-results-2026-08-18.md`.
- `research/experiments/recovery-async-runtime-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-runtime-results-2026-08-18.md`.
- `research/experiments/recovery-multiprocess-preregistration-2026-08-18.md`.
- `research/experiments/recovery-multiprocess-results-2026-08-18.md`.
- Corpus 11 Tools : architecture d'audit et de discrimination, non source de physique.

## Dernière mise à jour

2026-08-18 — `multiprocess_transport` sur 480 runs ; robustesse logicielle renforcée, condition d'arrêt locale atteinte, aucune donnée matérielle
