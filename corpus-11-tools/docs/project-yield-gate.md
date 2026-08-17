# Porte de rendement d’un projet

Cette porte empêche Corpus de confondre conception, artefact, tests, déploiement et effet extérieur. Elle ne produit aucun score agrégé.

## Quand l’utiliser

- Après une exploration ou un prototype bon marché, avant publication, intégration ou maintenance.
- À chaque demande d’extension territoriale ou de réplication.
- À la clôture, pour séparer le produit abandonné de ses composants réutilisables.

## Règles

1. Comparer le meilleur dispositif existant avant d’externaliser le prototype.
2. Nommer un delta distinct et une observation capable de le réfuter.
3. Un résultat qui ne peut modifier aucune décision est arrêté.
4. Un déploiement sans réobservation ne compte ni comme effet ni comme robustesse.
5. Sans responsable de maintenance, l’externalisation reste bloquée.
6. Si le meilleur existant absorbe le delta, abandonner le produit et auditer séparément les fonctions réutilisables.
7. Conserver un outil seulement s’il reste utile sans le projet qui l’a produit.

## Outil déterministe

```bash
python tools/project_yield_gate.py chemin/vers/record.json
```

Le JSON doit renseigner les champs booléens visibles dans `tools/project_yield_gate.py`, plus `project` et `retained_assets`. Les verdicts ne sont pas des preuves automatiques : ils appliquent seulement les règles déclarées à un enregistrement contrôlable.

## Portée validée

Le code est écrit et testé localement. Le cas « Manger aujourd’hui » réobserve correctement `abandon_and_harvest`. La portabilité à d’autres projets et l’amélioration réelle des décisions de Corpus restent à réobserver.
