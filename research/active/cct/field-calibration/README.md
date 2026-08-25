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

Le premier artefact numérique et sa reconstruction sont dans
[`results/cct-sc-d10-001/`](results/cct-sc-d10-001/). L’audit exact montre que
le `24/32` antérieurement décrit comme un renversement de trace est seulement
un seuil de proxy dans trois cellules fonctionnelles répétées huit fois. Les
sorties ne satisfont pas le contrat d’observation O1–O4; elles valent comme
audit d’implémentation, pas comme exécution conforme de la campagne.

La prochaine construction interne doit générer les traces fictives O1–O4 et
utiliser un oracle de recours indépendant du proxy contestabilité.

`CCT-SC-D10-002` reste conservé, mais une revue croisée a invalidé ses
revendications d'autorité O3, de contenu du journal O4 et de budget actif : une
différence d'acteur ne prouvait pas l'autorité, le journal de récupération
n'était pas reconstruit et le budget était seulement affiché.

Le protocole corrigé `CCT-SC-D10-003` porte une déclaration de configuration
« fixé avant exécution », sans verrou temporel indépendant. Il
exerce 32 mondes sous quatre variations, dont un budget réduit apparié. Chaque
transition consomme le ledger; O3 vérifie acteur et autorité; O4 reconstruit la
file depuis le journal. Le checker borne budget effectif et capacité par le
contrat d'autorisation, et chaque refus doit correspondre au rang d'une action
réellement tentée mais non exécutée. Les mutations d'acteur, journal, plafond,
capacité et faux refus sont rejetées.

Verdict : `compatible_survivors`. D10 obtient 70 avantages sur le vecteur de
protection et le rival 2, tandis que les 128 paires restent des compromis de
Pareto. Portées `model_internal` et `pipeline_verified`; effet institutionnel
et transport externe figurent seulement dans `unsupported_claims`. Artefacts :
[`results/cct-sc-d10-003/`](results/cct-sc-d10-003/), protocole :
[`protocols/d10-semantic-campaign-v0.3.md`](protocols/d10-semantic-campaign-v0.3.md).

Voir [`state/current_state.md`](state/current_state.md).
