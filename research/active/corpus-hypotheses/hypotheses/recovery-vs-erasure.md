# Récupération contre désinscription

## Formulation

**Hypothèse.** Récupérer l'information utile d'un système et rendre indiscernables le monde où un événement a eu lieu et son contrefactuel exigent en général des ressources différentes. On distingue explicitement plusieurs budgets de désinscription selon le régime d'intervention, notamment `C_erase_inf` à convergence, `C_erase_1` sous une passe asynchrone bornée et `C_erase_deadline` dans le substitut distribué fictif.

## Statut

weakened — **l'énoncé opérationnel faible est reproduit, mais la lecture comme mécanisme non standard est retirée dans le programme interne courant**. Après l'identité à la couverture de sommets, le substitut distribué fictif à quatre réplicas est absorbé exactement par une frontière causale standard. Aucun statut fondamental, externe, matériel ou thermodynamique n'est établi.

## Observations favorables

- **Attribution à la source :** la trace distingue accès, profondeur de circuit, extension spatiale, précision et travail ; elle avertit que ce profil n'est pas monotone.
- **Jouet copies :** `C_info=1` tandis que l'effacement terminal local peut demander `N` resets.
- **Topologie :** à Hamming fixé, des arbres appariés ont des profondeurs d'effacement `2/3`; à excentricité fixée, des charges résiduelles `9/5` et `10/5` persistent après perte d'une arête.
- **Réplication prospective asynchrone multi-port `n=6` :** `32768` architectures brutes, `9765` atteignables, `685` strates de contrôle et **176 strates** où `C_info=C_erase_inf=1` mais `C_erase_1` diffère. Classification : `replicated_profile_separation`.
- **Transport runtime `asyncio` :** sur deux architectures appariées, A s'efface `360/360` fois tandis que B échoue `180/360` fois ; zéro divergence sur `720` runs avec le simulateur discret conditionné par l'ordre réellement horodaté. Classification : `runtime_transport`.
- **Transport multi-processus :** avec cinq workers OS persistants sur le même hôte, A s'efface `240/240` fois et B échoue `120/240` fois ; zéro divergence sur `480` runs. Classification : `multiprocess_transport`.
- Le scheduling noyau a modifié l'ordre cible dans 16 runs multi-processus, mais la prédiction conditionnée par l'ordre réellement observé reste exacte.
- **Substitut distribué fictif exact à quatre réplicas :** `7680` cellules, quatre profils d'horloges, quatre partitions, deux cibles de crash, deux modes de récupération et les `120` permutations de messages/crash. `C_erase_deadline` vaut `1/2/3` dans `3420/4020/240` cellules. Les versions changent le coût dans `1380` strates, l'ordre dans `15` scénarios et le mode durable/volatile dans `900` paires. Le quotient compte `2160` signatures et reconstruit les `7680` cellules par multiplicité.

## Observations défavorables

- **Aucune mesure matérielle indépendante** n'est fournie ; les deux bancs restent logiciels et le multi-processus reste sur un seul hôte.
- La séparation dépend de la famille d'entrées, des accès permis, de la deadline et du critère d'indiscernabilité ; ces choix sont opérationnels, non universels.
- Les résidus historiques restent réductibles successivement à Hamming, excentricité et profils de coupes.
- Dans la réplication asynchrone, zéro violation est observée de `C_erase_1 = 1 + tau(G_int)`, où `tau` est la couverture minimale de sommets. Le nouvel axe est donc entièrement expliqué par un invariant standard dans cette famille.
- `C_erase_inf=1` dans toute la famille DAG ; cet axe est volontairement trivial ici.
- Les transports runtime ne montrent aucun mécanisme nouveau : leur cohérence parfaite avec le modèle discret confirme que l'effet est celui attendu de la structure de graphe et de l'ordre d'activation.
- Dans le substitut distribué fictif, `causal_frontier` reproduit exactement `7680/7680` coûts et tous les ensembles robustes communs aux horaires. Cette égalité est endogène au générateur. `graph_only` n'est exact que dans `2040/7680` cellules et `schedule_artifact` dans `4820/7680`; leurs erreurs sont uniquement des surestimations dues à l'effacement des horloges. Ces trois modèles sont des ablations à budgets d'information imbriqués, non des concurrents à budgets appariés.
- Les quatre strates topologiques et `1380/1920` strates ordre+crash sans horloge fusionnent des outcomes différents. Il n'existe donc aucun résidu interne après compilation explicite de l'ascendance causale persistante.

## Hypothèses concurrentes

- `graph_only` : les différents `C_erase` ne sont qu'un catalogue de problèmes standards d'optimisation du graphe sélectionnés par la classe d'interventions.
- `schedule_artifact` : les différences viennent de l'ordre et du crash sans contenu causal propre aux versions.
- `causal_frontier` : le coût est le cardinal minimal des réplicas portant ou pouvant restaurer un descendant de l'événement cible sous la sémantique déclarée.
- La différence observée vient seulement de restrictions de contrôle et de deadline arbitraires.
- Une dynamique globale réversible rend la distinction sans portée fondamentale, quoique potentiellement utile opérationnellement.

## Prédictions discriminantes restantes

- Une variation contrôlée du budget temporel ou du nombre de ports peut déplacer `C_erase` sans déplacer `C_info` — reproduit algébriquement, dans une event loop, avec processus OS séparés et dans le modèle fictif distribué.
- Pour réouvrir la lecture forte, un futur test interne réellement distinct doit nommer une faille précise de `causal_frontier`, fixer avant calcul ses observables réellement mesurés et produire un mismatch entre énumération et signature après contrôles.
- Le buffer indépendant du reset et le clamp maintenu sont des règles de méthode. Les changer constitue un nouveau modèle, pas une réplication du résultat présent.
- L'absence de réseau, de matériel ou de terrain n'est ni une dépendance ni un blocage : aucun passage IRL n'est requis ou autorisé par cette conclusion.

## Condition de renversement

La condition de requalification est atteinte pour le programme interne : après couverture de sommets exacte dans le DAG, la nouvelle coordonnée distribuée est déterminée sans exception par la frontière causale. La branche est donc un **profil opérationnel de quantités standards**, pas un mécanisme nouveau.

L'énoncé faible — récupération et désinscription sous contraintes différentes peuvent demander des ressources distinctes — est désormais bien reproduit et ne doit pas être confondu avec une prétention de nouvelle physique.

Condition de retrait de cette identité endogène : au moins un mismatch entre l'énumération de transition et `causal_frontier`, dans un protocole interne valide fixé avant exécution. Le statut de fixation est auto-déclaré dans la configuration, sans verrou temporel indépendant. Un tel mismatch rouvrirait la qualification sans, à lui seul, établir une portée externe.

## Méthodes nécessaires

Arrêter l'agrandissement de la même famille locale. Une reprise n'est justifiée que par une sémantique interne réellement distincte susceptible de changer le verdict, avec versions, ports, deadline, convergence, pertes, détectabilité, coût messages/opérations/temps et condition de retrait fixés avant calcul. Aucun dispositif externe n'est une prochaine action par défaut.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 4–6 et 18–19.
- `research/experiments/recovery-async-multiport-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-multiport-results-2026-08-18.md`.
- `research/experiments/recovery-async-runtime-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-runtime-results-2026-08-18.md`.
- `research/experiments/recovery-multiprocess-preregistration-2026-08-18.md`.
- `research/experiments/recovery-multiprocess-results-2026-08-18.md`.
- `research/experiments/recovery-distributed-fictional-v0.1.json`.
- `research/experiments/recovery-distributed-fictional-v0.1.md`.
- `research/reports/recovery-distributed-fictional-v0.1/result.json`.
- `research/reports/recovery-distributed-fictional-v0.1/report.md`.
- `research/experiments/recovery-distributed-fictional-v0.2.json`.
- `research/experiments/recovery-distributed-fictional-v0.2.md`.
- `research/reports/recovery-distributed-fictional-v0.2/result.json`.
- `research/reports/recovery-distributed-fictional-v0.2/report.md`.
- Corpus 11 Tools : architecture d'audit et de discrimination, non source de physique.

## Dernière mise à jour

2026-08-25 — `endogenous_causal_signature_identity` sur `7680` cellules fictives exactes, quotientées en `2160` signatures ; lecture forte requalifiée `weakened`, voie interne close, aucune donnée externe
