# État courant

Dernière mise à jour : 2026-08-25 — audit exact de construit et de conformité

## Statut

Le mécanisme étudié reste **D10 — Budget global de charge constitutionnelle**.
L’artefact déterministe associé à `CCT-SC-D10-001` parcourt 32 mondes
factoriels appariés et cinq variations. Il conserve séparément cinq bits de
porte et trois scalaires de charge, mais il ne produit pas les récits, journaux,
traces O3, contre-récits et tests d’usage exigés par le protocole.

La revendication antérieure « trace inutilisable dans `24/32` mondes » est
retirée. Le nombre `24/32` décrit exactement trois cellules fonctionnelles
canal–perturbation sous un seuil de proxy, répétées huit fois par charge,
rythme et environnement, trois axes absents de l’équation. Aucun renversement
de trace ou de recours n’est établi.

La carte du seuil est `formal_exact`; la reconstruction des artefacts est
`pipeline_verified`; la trace, le recours et la conformité institutionnelle
restent `unknown`. L’exécution est classée
`nonconformant_observation_contract` et ne vaut que comme audit de
l’implémentation. La marge continue et son bit seuillé forment une paire de
représentations non discriminante, sans gain d’évidence indépendant.

## Prochaine décision

Avant toute nouvelle revendication de contestabilité, construire un générateur
fictif couvrant tout le contrat O1–O4 et un oracle d’usage du recours spécifié
indépendamment du score D10. La conclusion devra rester `model_internal` ou
`pipeline_verified`; aucune donnée ni épreuve extérieure n’est requise.
