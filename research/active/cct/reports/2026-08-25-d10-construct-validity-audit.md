# D10 — audit exact de validité du construit et de conformité

Date : 2026-08-25

## Décision

La revendication « trace inutilisable dans `24/32` mondes » est retirée. Les
sorties établissent seulement un événement déterministe de seuil sur un proxy
de contestabilité. Elles ne constituent pas une exécution conforme du contrat
d’observation `CCT-SC-D10-001`.

## Reconstruction exacte

Sous la variation `d10_constrained_recourse`, la marge implémentée est

`m = c - (9/25) canal - (6/25) perturbation - 1/2`,

avec `c=3/5`. Les quatre cellules fonctionnelles sont :

| Canal | Perturbation | Seuil | Marge | Proxy au-dessus du seuil | Répétitions |
|---:|---:|---:|---:|---|---:|
| `1/10` | `1/10` | `14/25` | `1/25` | oui | 8 |
| `1/10` | `1/2` | `82/125` | `-7/125` | non | 8 |
| `9/20` | `1/10` | `343/500` | `-43/500` | non | 8 |
| `9/20` | `1/2` | `391/500` | `-91/500` | non | 8 |

Les axes charge, rythme et environnement n’entrent pas dans cette équation. Le
compte `24/32` est donc exactement trois cellules sous le seuil, chacune
répliquée huit fois. Sa multiplicité ne constitue pas de l’évidence
indépendante.

## Paire de représentations

La représentation continue conserve `m`; la représentation binaire calcule
seulement `1[m >= 0]`. Elles ne discriminent pas deux modèles : la forme
continue révèle la distance au seuil, tandis que le bit la perd. Le gain
d’évidence indépendante est nul. D10 garde par ailleurs une marge relative de `3/25` sur le témoin dans
les 32 lignes de la variation. Ce contraste reste interne aux mêmes équations.

## Validité du construit

Le construit visé est une décision attribuable, compréhensible, contestable,
corrigible et réconciliable sous charge. L’implémentation fournit seulement un
score configuré, une marge et un bit de seuil. Elle ne génère ni décision
horodatée, motif, ressource saturée, porte protégée, voie de recours, correction,
restitution, contre-récit, ni audit d’une décision hors registre.

Le verdict est `proxy_substitution`. Le proxy `minimal_trace` restant vrai ne
répare pas l’absence de trace O3.

## Conformité au protocole

Le protocole requiert également des récits par porte, des heures par rôle, des
délais, des abandons avant et après recours, des journaux de reprise, des pertes
nommées, des voies de réparation et un test d’usage simulé. Ces objets ne sont
pas produits. Le verdict est `nonconformant_observation_contract`; le rôle de
l’artefact devient `implementation_audit_only`, avec portée de calcul
`model_internal` et audit de pipeline `pipeline_verified`.

## Contrat synthétique

- Générateur : factoriel exhaustif `2^5`, graine non utilisée.
- Paramètres : deux niveaux déclarés de charge, canal, rythme, perturbation et
  environnement; cinq variations déclarées.
- Invariants : mondes appariés, cinq proxies de porte séparés, trois charges séparées,
  aucun score global compensatoire.
- Contrôles : reconstruction exacte par fractions, seuil inclusif,
  multiplicités égales ou inégales, dénominateurs dynamiques, paire de
  représentations, séparation événement de proxy/renversement protocolaire,
  conformité réversible, déterminisme et égalité exacte des artefacts.
- Effet possible du protocole : le générateur, les coefficients et le seuil
  créent entièrement le résultat numérique.
- Condition de retrait : retirer la carte si un axe actuellement inactif affecte
  une ligne, si le seuil inclusif change ou si la reconstruction cesse d’être
  identique au classificateur enregistré.

Portées autorisées : carte `formal_exact`, reconstruction
`pipeline_verified`, sorties des équations `model_internal`. Trace, recours,
institution et transport au réel : `unknown`, jamais `external_equivalent`.

## Prochaine action interne

Construire un générateur fictif couvrant explicitement O1–O4 et fixer avant
calcul un oracle de recours indépendant du score D10. Le résultat devra varier
les récits, abandons, décisions hors registre, corrections et reprises, avec
modèle rival et condition de renversement déclarés. Aucune donnée, personne,
institution ni épreuve extérieure n’est nécessaire.

Artefacts :
[`../field-calibration/results/cct-sc-d10-001/`](../field-calibration/results/cct-sc-d10-001/).
