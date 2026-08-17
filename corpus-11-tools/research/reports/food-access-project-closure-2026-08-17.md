# Clôture du projet d’orientation alimentaire

## Conclusion

Le produit est abandonné. Sa valeur distincte face à Soliguide n’est pas établie et aucun repas obtenu grâce au prototype n’a été observé. La version privée déployée reste une trace, pas un service actif à étendre.

## Échec observé

Le projet a construit puis amélioré un annuaire parisien avant de qualifier complètement le meilleur dispositif existant. Le classement en trois choix réduisait localement la navigation, mais ne constituait pas un delta suffisant face à une infrastructure nationale maintenue, multicanale et déjà évaluée. Les tests établissaient la cohérence du logiciel, pas son utilité extérieure.

## Fonctions découplées

### Abandonné

- annuaire alimentaire autonome ;
- extension à toutes les villes ;
- intégration Soliguide ;
- collecte de retours bénéficiaires sans canal et gouvernance réels.

### Conservé

- distinction écrit / testé / autorisé / déployé / réobservé ;
- péremption par fiche et exclusion des données échues ;
- tests-limites déterministes ;
- comparaison au meilleur existant avant externalisation ;
- condition d’abandon explicite ;
- extraction séparée des composants utiles après clôture.

## Changement apporté à Corpus

Une porte de rendement sans score a été ajoutée dans `docs/project-yield-gate.md`, avec le vérificateur `tools/project_yield_gate.py`, cinq tests unitaires et un cas de non-régression de routage. Elle formalise un échec réel sans créer une nouvelle capability : elle compose des capacités déjà présentes de validation du changement, valeur de l’information, transformation réelle et découplage fonctionnel.

## Statut

- échec déclencheur : observé ;
- règle documentée : oui ;
- outil écrit : oui ;
- tests locaux : 5/5 réussis ;
- validation statique : 57 skills, 49 capabilities et 70 évaluations validés ;
- graphe : 49 capabilities, 4 familles et 88 relations, sans orphelin ;
- amélioration des décisions de Corpus : non encore réobservée ;
- robustesse générale : non établie.
