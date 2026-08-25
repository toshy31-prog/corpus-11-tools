# Étalonnage synthétique CCT

## Rattachement et séparation

Cette extension appartient à la recherche CCT. Elle n’ajoute pas une nouvelle
constitution : elle met un mécanisme défini à l’épreuve dans des mondes
fictifs, face à une modalité de référence explicitement choisie.

## Question initiale

> Dans une famille de mondes fictifs déclarés, quelle différence le mécanisme
> CCT choisi produit-il sur l’accès, les délais, le recours, la charge et la
> restitution, comparé au mécanisme de référence apparié ?

## Mécanisme actuellement retenu

Le premier mécanisme est **D10 — Budget global de charge constitutionnelle**.
Sa préparation de campagne fictive appariée est dans
[`protocols/d10-budget-charge-constitutionnelle-v0.1.md`](protocols/d10-budget-charge-constitutionnelle-v0.1.md).
Les résultats ne peuvent conclure que sur le modèle et la famille de scénarios
déclarés ; aucun effet de terrain n'est revendiqué.

## Conditions de la campagne fictive

- générateur, paramètres et invariants explicitement déclarés ;
- comparateur apparié, fenêtre et règles de variation déclarés ;
- traces simulées distinguant la charge visible, cachée et perdue ;
- aucune conclusion externe présentée comme une validation institutionnelle.

## Décision et arrêt

La campagne s’arrête si une porte non compensable est perdue, si une variation
de protocole inverse sans explication la conclusion interne, ou si le modèle
déplace sa charge hors des observables. Un résultat synthétique ne vaut jamais
validation institutionnelle externe.

La première exécution et sa reconstruction sont dans
[`results/cct-sc-d10-001/`](results/cct-sc-d10-001/). Le modèle de base ne
renverse pas D10, mais la sensibilité de recours contraint déclenche un
renversement dans 24 mondes sur 32 ; la survie est donc dépendante du protocole.

Voir [`state/current_state.md`](state/current_state.md).
