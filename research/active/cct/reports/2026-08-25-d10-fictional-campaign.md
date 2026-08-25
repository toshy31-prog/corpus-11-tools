# CCT — artefact fictif apparié D10, corrigé après audit

Date : 2026-08-25

## Correction de la revendication

L’artefact `CCT-SC-D10-001` a traversé exhaustivement les 32 combinaisons de deux niveaux
de charge, canal, rythme, perturbation et environnement. D10 et le routage
simple ont reçu chaque monde identique. Les cinq proxies de porte ainsi que les charges
visible, cachée et perdue ont été conservées séparément.

La formulation antérieure affirmant qu’une trace devenait inutilisable dans
`24/32` mondes est retirée. L’implémentation ne génère aucune trace O3 : elle
calcule un proxy scalaire et lui applique un seuil. Sous la variation de recours
contraint, trois des quatre cellules canal–perturbation passent sous ce seuil;
charge, rythme et environnement répliquent chacune de ces cellules huit fois.

La carte exacte donne les seuils `14/25`, `82/125`, `343/500` et `391/500`
pour une contestabilité configurée à `3/5`. Les marges sont respectivement
`1/25`, `-7/125`, `-43/500` et `-91/500`. Le `24/32` n’est donc ni 24 preuves
indépendantes, ni une observation de trace inutilisable.

## Conclusion et portée

La carte du seuil est `formal_exact` et la reconstruction de l’artefact est
`pipeline_verified`. La validité d’une trace, d’un recours ou d’une restitution
reste `unknown`. Le contrat d’observation préenregistré exige des récits,
journaux, abandons, contre-récits et tests d’usage que l’artefact ne produit pas;
son verdict de conformité est `nonconformant_observation_contract`.

La représentation continue conserve la marge avant seuillage; le bit est sa
transformation déterministe, pas un modèle rival. La paire n’apporte aucune
preuve indépendante. La prochaine action
interne est un générateur fictif O1–O4 et un oracle de recours spécifié
indépendamment du score D10.

Résultats détaillés :
[`field-calibration/results/cct-sc-d10-001/`](../field-calibration/results/cct-sc-d10-001/).

Audit de correction :
[`2026-08-25-d10-construct-validity-audit.md`](2026-08-25-d10-construct-validity-audit.md).
