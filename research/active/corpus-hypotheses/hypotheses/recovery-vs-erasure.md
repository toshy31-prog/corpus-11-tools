# Récupération contre désinscription

## Formulation

**Hypothèse.** Récupérer l'information utile d'un système et rendre indiscernables le monde où un événement a eu lieu et son contrefactuel exigent en général des ressources différentes. On note `C_info` le profil minimal de récupération et on distingue désormais explicitement plusieurs budgets de désinscription selon le régime d'intervention, notamment `C_erase_inf` à convergence et `C_erase_1` sous une seule passe asynchrone adversariale.

## Statut

active — **séparation opérationnelle renforcée par une réplication asynchrone multi-port, mais profils toujours absorbés par des invariants standards**. Aucun statut fondamental ni lien thermodynamique n'est établi.

## Observations favorables

- **Attribution à la source :** la trace distingue accès, profondeur de circuit, extension spatiale, précision et travail ; elle avertit que ce profil n'est pas monotone.
- **Démonstration dans un jouet :** pour un bit recopié dans `N` fragments et des interventions locales terminales, une copie suffit à la lecture tandis que chaque copie accessible qui conserve b doit être nettoyée : `C_info = 1`, `C_erase = N` et `H_N = N - 1`.
- **Test apparié exact :** pour la même largeur, les mêmes entrées et les mêmes lectures/resets terminaux, `(b,0,...,0)` donne `(C_info,C_erase)=(1,1)` tandis que `(b,b,...,b)` donne `(1,N)` pour `N=2..8`.
- **Test topologique exact :** deux arbres enracinés appariés sur largeur, états terminaux, distance de Hamming, nombre d'arêtes, séquence de degrés, degré du port et travail ont la même récupération, mais des profondeurs minimales d'effacement `2` et `3`.
- **Test de robustesse exact :** à profondeur et excentricité également fixées, deux arbres fortement appariés laissent en moyenne `9/5` et `10/5` traces réactivables après la perte uniforme d'une arête.
- **Test négatif préenregistré :** à profil complet des pertes d'une arête fixé, aucune paire séparée par les pertes de deux arêtes n'existe parmi les `7^5` puis `8^6` arbres enracinés étiquetés parcourus.
- **Réplication prospective asynchrone multi-port :** sur une famille `n=6` gelée après un cas exploratoire distinct, `32768` architectures brutes donnent `9765` architectures atteignables. Toutes ont `C_info=1` et `C_erase_inf=1`, mais `176` strates appariées sur les contrôles déclarés présentent plusieurs valeurs de `C_erase_1`. Classification : `replicated_profile_separation`.
- **Exemple apparié :** deux architectures de même degré source, même nombre d'arêtes internes, mêmes multiensembles de degrés, mêmes distances source, mêmes profils SCC/cycles et même coût à convergence ont `C_erase_1=2` et `3`.
- **Non-régression architecturale :** le premier module du moteur générique retrouve 45/45 attentes historiques sans que le cœur contienne de sémantique de récupération, d'effacement, de graphe ou de temps.

## Observations défavorables

- **Aucune mesure matérielle indépendante** n'est encore fournie.
- La séparation dépend de la famille d'entrées, des accès permis, de la deadline et du critère d'indiscernabilité ; ces choix sont opérationnels, non universels.
- Dans la paire historique, `C_erase` est exactement la distance de Hamming terminale.
- Dans la paire à Hamming fixé, la profondeur d'effacement est exactement l'excentricité du port.
- À excentricité fixée, la charge résiduelle est exactement le profil des tailles de coupes enracinées à une arête.
- **Dans la réplication asynchrone**, zéro violation est observée de l'identité exacte `C_erase_1 = 1 + tau(G_int)`, où `tau` est la couverture minimale de sommets du graphe interne non orienté. Le nouveau coût est donc lui aussi entièrement expliqué par un invariant standard dans cette famille.
- `C_erase_inf=1` dans toute la famille DAG : l'axe à convergence est ici volontairement trivial et ne montre aucune nouvelle structure.
- L'extension directe aux pertes de deux arêtes n'a produit aucun reste aux tailles sept et huit sous l'appariement préenregistré ; agrandir encore sans changer de perturbation n'est plus prioritaire.

## Hypothèses concurrentes

- Les différents `C_erase` ne sont qu'un catalogue de problèmes standards d'optimisation de graphe sélectionnés par la classe d'interventions.
- La différence observée vient seulement de restrictions de contrôle et de deadline arbitraires.
- Une dynamique globale réversible rend la distinction sans portée fondamentale, quoique potentiellement utile opérationnellement.

## Prédictions discriminantes

- À information récupérable égale, des architectures causales différentes peuvent produire des profils de désinscription différents sous une même classe d'interventions — **réobservé dans la famille asynchrone n=6**.
- Une variation contrôlée du budget temporel ou du nombre de ports peut déplacer `C_erase` sans déplacer `C_info`.
- Pour établir un contenu propre au-delà d'une compilation d'invariants standards, une expérience future doit produire un résidu qui ne soit pas exactement absorbé par Hamming, excentricité, coupes, couverture de sommets ou un autre invariant déclaré avant résultat.
- Sur matériel ou émulation réseau, le triplet `(C_info,C_erase_inf,C_erase_deadline)` doit rester distinguable sous latences et pertes mesurées avec critères gelés.

## Condition de renversement

Requalifier la branche comme **profil opérationnel de quantités standards**, plutôt que mécanisme nouveau, si chaque nouvelle coordonnée testée continue d'être exactement déterminée par un invariant classique et si aucun résidu prospectif ne survit sur une famille non triviale ou un système matériel.

Ne pas confondre cette requalification avec l'énoncé plus faible, désormais bien reproduit, selon lequel récupération et désinscription sous contraintes différentes peuvent demander des ressources distinctes.

## Méthodes nécessaires

Définir familles d'entrées, contrefactuel, tolérance, classe d'observateur, accès, deadline, ports et coût avant résultat ; conserver plusieurs régimes de désinscription séparés ; comparer systématiquement aux invariants standards ; passer désormais à un système avec latences/ordres de mise à jour effectivement mesurés plutôt que poursuivre une extension combinatoire brute.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 4–6 et 18–19.
- `research/experiments/recovery-async-multiport-preregistration-2026-08-18.md`.
- `research/experiments/recovery-async-multiport-results-2026-08-18.md`.
- Corpus 11 Tools : architecture d'audit et de discrimination, non source de physique.

## Dernière mise à jour

2026-08-18 — réplication prospective asynchrone multi-port : `replicated_profile_separation`, mais `C_erase_1` absorbé exactement par la couverture minimale de sommets
