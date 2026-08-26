# Protocole d'évaluation et de sélection

## Comparaison gelée

Chaque itération compare, à mêmes prompts et mêmes labels :

1. une baseline de recouvrement lexical entre requête et descriptions de skills ;
2. CorpusNet-Router v0 ;
3. CorpusNet-Router v0 avec abstention lorsque le vocabulaire de la requête est
   trop peu couvert ou qu'aucune sortie ne franchit le seuil.

Les résultats sont rapportés séparément sur le partition `test`, absent de
l'entraînement. Le runner ne sélectionne pas automatiquement de vainqueur :
une amélioration locale ne rend pas le modèle supérieur hors de ce protocole.

## Mesures

- `recall@3` : part des labels attendus qui figurent parmi les trois proposés ;
- `precision@3` : part des propositions qui sont attendues ;
- `abstention_rate` : fraction de cas où le modèle ne route pas.

Ces chiffres ne sont ni des probabilités de vérité, ni une mesure d'intelligence
générale. La calibration, l'équité linguistique et le transport hors Corpus
restent `unknown` dans v0.

## Critère de conservation

Le réseau ne peut être conservé comme routeur préféré que si un test **futur,
préenregistré et indépendant du vocabulaire/étiquettes de création** montre un
gain sur une métrique définie à l'avance, sans baisse matérielle de provenance,
de couverture des négatifs ou d'abstention justifiée. Sinon la baseline reste
la référence et le réseau demeure un artefact expérimental.

## Tests indispensables avant extension

- paraphrases humaines indépendantes et formulations sans jargon Corpus ;
- français, anglais et autres langues réellement visées ;
- cas négatifs où aucune capability n'est appropriée ;
- compositions de capabilities et permutations d'ordre ;
- rapports de sources qui partagent une origine ;
- test de régression après toute nouvelle source, étiquette ou architecture.
