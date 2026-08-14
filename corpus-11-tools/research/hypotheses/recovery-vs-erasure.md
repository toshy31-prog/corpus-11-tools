# Récupération contre désinscription

## Formulation

**Hypothèse.** Récupérer l'information utile d'un système et rendre indiscernables le monde où un événement a eu lieu et son contrefactuel exigent en général des ressources différentes. On note `C_info` le profil minimal de récupération, `C_erase` celui de désinscription, et `ΔH = C_erase - C_info` uniquement lorsque les composantes comparées et la classe d'interventions sont explicites.

## Statut

active — distinction opérationnelle prometteuse, sans prétention de loi fondamentale.

## Observations favorables

- **Attribution à la source :** la trace distingue accès, profondeur de circuit, extension spatiale, précision et travail ; elle avertit que ce profil n'est pas monotone.
- **Démonstration dans un jouet :** pour un bit recopié dans `N` fragments et des interventions locales terminales, une copie suffit à la lecture tandis que chaque copie accessible qui conserve b doit être nettoyée : `C_info = 1`, `C_erase = N` et `H_N = N - 1`.
- **Inférence :** Corpus 11 Tools fournit un audit utile : présence d'une capacité, exécution d'un test et robustesse ne sont pas substituables, comme récupération locale et restauration globale ne le sont pas.

## Observations défavorables

- **Observation :** aucune mesure empirique indépendante n'est fournie.
- La séparation dépend de la famille d'entrées, des accès permis et du critère d'indiscernabilité ; le reset d'un état connu peut la rendre artificielle.
- Les notions voisines (récupération, scrambling, écho de Loschmidt, entropie) peuvent absorber tout le contenu distinctif.

## Hypothèses concurrentes

- `C_erase` est une reformulation d'une mesure standard de récupération ou de scrambling.
- La différence observée vient seulement de restrictions de contrôle arbitraires.
- Une dynamique globale réversible rend la distinction sans portée fondamentale, quoique opérationnellement utile.

## Prédictions discriminantes

- À information récupérable égale, deux architectures causales différentes doivent produire des profils de désinscription différents sous une même classe d'interventions.
- Une variation contrôlée de l'accès doit déplacer `C_erase` sans nécessairement déplacer `C_info` de la même façon.
- Si `ΔH` apporte un contenu propre, aucun unique scalaire standard ne doit ordonner tous les cas comme son profil vectoriel.

## Condition de renversement

Requalifier l'hypothèse en reformulation si, sur une famille non triviale de modèles et de contrôles, `C_erase` est toujours une fonction d'une quantité standard déjà connue et si aucune paire à récupération égale ne se distingue. Ne pas la rejeter avant ce résultat discriminant.

## Méthodes nécessaires

Définir familles d'entrées, contrefactuel, tolérance, accès et coût ; construire des circuits finis énumérables ; comparer aux mesures de récupération et de scrambling ; tester la robustesse aux changements de représentation avec Corpus 11 Tools comme grille d'audit.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 4–6 et 18–19.
- Corpus 11 Tools : architecture d'audit et de discrimination, non source de physique.

## Dernière mise à jour

2026-08-15
