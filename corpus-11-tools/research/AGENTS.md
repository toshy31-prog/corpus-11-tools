# Corpus 11 Research Runtime

Travaille uniquement sur le workspace `research/`.

## Architecture

Utiliser Corpus 11.x comme architecture opérationnelle.
Les matériaux 10.x servent à la provenance, l'audit, la résolution d'ambiguïté et la non-régression, jamais comme moteur par défaut.

## État persistant

Toujours commencer par lire :

- `state/current_state.md`
- `hypotheses/`
- `experiments/`
- `notes/`
- `reports/`
- les nouveaux éléments de `sources/`

`state/current_state.md` est l'état synthétique opérationnel courant.

## Discipline

Toujours distinguer :

- observation ;
- attribution ;
- inférence ;
- hypothèse ;
- démonstration.

Préserver :

- observation != attribution ;
- corrélation != causalité ;
- absence de trace sans détectabilité établie => inconnu ;
- protocole écrit != expérience exécutée ;
- calcul jouet != nouvelle physique ;
- test passé != robustesse ;
- hypothèse absorbant tous les résultats = non discriminante.

Ne jamais rejeter une hypothèse uniquement faute de résultat observé si la détectabilité n'est pas établie.

## Cycle par défaut

Quand la demande est `run`, `continue`, `r`, ou équivalent :

1. exécuter `scripts/research_snapshot.sh`;
2. exécuter `scripts/validate_research_workspace.py`;
3. lire `state/current_state.md`;
4. examiner les changements depuis le dernier état ;
5. identifier seulement les hypothèses réellement affectées ;
6. déterminer si une information nouvelle change :
   - conclusion ;
   - attribution ;
   - confiance ;
   - test discriminant ;
   - priorité ;
   - condition de renversement ;
7. exécuter les plus petits tests reproductibles déjà spécifiés lorsque possible ;
8. ne pas inventer de données manquantes ;
9. mettre à jour uniquement les fichiers réellement devenus obsolètes ;
10. créer ou mettre à jour le rapport quotidien ;
11. exécuter les validations finales ;
12. afficher un résumé du diff ;
13. si aucun changement substantiel : ne rien modifier ;
14. si changement substantiel : laisser les fichiers modifiés prêts à être commités.

## Exploration

N'activer une exploration multi-candidats que si :

- plusieurs mécanismes plausibles existent ;
- une variable importante est sous-spécifiée ;
- une sélection prématurée pourrait effacer une différence réelle ;
- une voie extérieure ou alternative est explicitement demandée.

Dans ce cas, produire les candidats avant audit.
L'audit ne doit pas générer le candidat gagnant.

## Recherche actuelle

Lire les priorités directement dans `state/current_state.md`.

Ne pas ressusciter automatiquement une hypothèse affaiblie simplement parce qu'elle existe dans une source ancienne.

## Fichiers protégés

Ne jamais modifier :

- `sources/`
- les 31 capability skills ;
- le graphe 11.x ;
- les fichiers de provenance 10.x ;

sauf demande explicite portant sur ces objets eux-mêmes.

## Sortie

Réponse courte :

- changement détecté ;
- test exécuté ;
- hypothèses affectées ;
- décision ;
- fichiers modifiés ;
- prochaine action.

Éviter les longues reconstructions sans gain discriminant.
