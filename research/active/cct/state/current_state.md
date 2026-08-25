# État courant — CCT

Dernière mise à jour : 2026-08-25 — audit exact D10

## Statut

La recherche CCT dispose d’un modèle écrit et de simulations synthétiques
validées localement. Aucun effet de terrain, aucune autorisation de terrain et
aucune réobservation indépendante ne sont établis.

## Décision prise

Le mécanisme CCT sélectionné est **D10 — Budget global de charge
constitutionnelle**, avec un routage fictif plus simple comme comparateur
apparié. Son protocole de campagne est dans
[`field-calibration/protocols/d10-budget-charge-constitutionnelle-v0.1.md`](../field-calibration/protocols/d10-budget-charge-constitutionnelle-v0.1.md).

`CCT-EXEC-0.1` a repassé ses onze contrôles locaux. L’artefact numérique
`CCT-SC-D10-001` exerce ensuite D10 et un comparateur apparié dans 32 mondes
factoriels et cinq variations. L’audit retire toutefois la conclusion
antérieure de trace inutilisable : le `24/32` est un événement de seuil sur un
proxy configuré, réduit à trois cellules canal–perturbation répétées huit fois.
Le pipeline ne génère aucune trace O3 ni usage du recours et n’est pas conforme
au contrat d’observation fixé avant exécution.

## Prochaine condition

La carte analytique de l'ancien proxy reste exacte et la représentation
continue n’apporte aucune évidence indépendante : le bit binaire est son
simple seuillage.

La campagne `CCT-SC-D10-002` reste conservée, mais ses revendications
d'autorité O3, de contenu O4 et de budget actif ont échoué à la revue croisée.
`CCT-SC-D10-003`, fixé séparément, corrige ces points : acteur et autorité
exacts, journal O4 reconstruit, ledger d'actions et variation à budget apparié
réduit. Elle conclut `compatible_survivors` sur 128 paires : 70 avantages D10
et 2 du rival sur le vecteur de protection, sans dominance de Pareto. Portées
`model_internal` et `pipeline_verified`; effet institutionnel et transport
externe sont explicitement non soutenus. La fixation est une déclaration de
configuration sans verrou temporel indépendant. Le checker refuse aussi tout
budget ou capacité au-delà du contrat et tout refus d'action sans tentative
ordonnée correspondante.

Ne pas ajuster les paramètres locaux pour fabriquer un vainqueur. Une reprise
exige un monde fictif construit indépendamment de ces résultats et un rival
capable de faire perdre D10. Les détails de l’état de validation restent dans
[`governance-lab/STATUS.md`](../governance-lab/STATUS.md).
