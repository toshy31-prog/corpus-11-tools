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

La carte analytique est désormais exacte et la représentation continue
n’apporte aucune évidence indépendante : le bit binaire est son simple
seuillage. La
prochaine étape interne est un générateur fictif complet O1–O4 avec un oracle
de recours défini indépendamment, avant toute nouvelle classification de
contestabilité. Elle peut conclure sur le modèle ou le pipeline déclaré,
jamais sur une institution réelle. Les détails de l’état de validation restent dans
[`governance-lab/STATUS.md`](../governance-lab/STATUS.md).
