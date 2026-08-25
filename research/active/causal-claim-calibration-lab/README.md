# Laboratoire de calibration causale

Teste si Corpus distingue correctement association, mécanisme et effet causal
dans des mondes ou interventions dont la structure est explicitement connue.

Premier test : comparer les conclusions causales à des contrôles confondus et à
des interventions traçables. Toute conclusion reste bornée à la famille de
scénarios testée.

## Cycle synthétique initial

Deux mondes à résultats potentiels entièrement connus sont vérifiés avec
`python3 tests/test_initial_protocol.py`. Voir
[`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md).
Les effets calculés sont internes à ces mondes synthétiques.

## Campagne discriminante v0.2

`python3 tests/test_scm_campaign.py` énumère tous les états exogènes de sept
SCM binaires, leurs interventions exactes et les quatorze sous-ensembles
d'ajustement observables. Elle sépare graphe, positivité et étiquette de dessin;
voir [`protocols/scm_campaign_v0.2.md`](protocols/scm_campaign_v0.2.md).
