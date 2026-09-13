# Première confrontation à des matériaux extérieurs — 13 septembre 2026

**Résultat : le comparateur CCT-MIN-01 doit isoler l’apport de gouvernance à moyens égaux. Un moteur externe a été exécuté et des décisions humaines extérieures ont été examinées. Aucune supériorité CCT ni contre-évaluation indépendante de la CCT n’est établie.**

Cette passe utilise des travaux publics antérieurs à notre recherche. Leur provenance extérieure est documentée ; leur sélection, les replays et cette analyse sont réalisés dans la session Corpus. Ce n’est donc pas une évaluation menée par une équipe indépendante. Le pilote conserve `awaiting_external_inputs` et `independence_unknown`.

## 1. Rivaux effectivement trouvés

**Maintenance professionnelle.** Smith, Atwii Ongom et Davis ont étudié pendant un an une offre de maintenance en Ouganda, avec paiements effectifs. L’offre a généralement assuré des réparations rapides, mais seuls 4 % des comités ont payé un prix quelconque pendant toute la période. Les auteurs concluent à un besoin important de financement extérieur. Il s’agit d’une expérience de demande et de paiement, pas d’un essai CCT. [Article, World Development 161, 106094](https://doi.org/10.1016/j.worlddev.2022.106094).

**Surveillance communautaire soutenue de l’extérieur.** Au Costa Rica, un essai porte sur 161 organisations, dont 80 assignées au programme. Les estimations d’effets sont modestes et leurs intervalles bilatéraux à 95 % incluent zéro pour les trois résultats principaux favorables. Les comptes rendus sont envoyés pendant 76 % des semaines en moyenne, mais lus par les comités pendant 21 %. Cette différence conteste l’assimilation « canal d’alerte présent = information utilisée ». [Article et résultats détaillés](https://pmc.ncbi.nlm.nih.gov/articles/PMC8307738/).

L’archive OSF liée à ce deuxième article a été téléchargée : **893 097 octets**, SHA-256 conforme à celui annoncé par OSF. Elle contient deux scripts Stata et cinq fichiers de données. Reçu : `osf-receipt.json`. Les estimations statistiques de l’article n’ont pas été recalculées. [Dépôt des auteurs](https://osf.io/bmndv/).

**Décision pour CCT.** Le plan initial compare le standard à un paquet ajoutant pièces, personnel, alerte et secours. Un éventuel gain ne départage donc pas l’explication « ressources supplémentaires » de l’explication « gouvernance CCT ». J’ai ajouté au [plan de mesure](../../active/cct/pol-1.1-executable/minimum-use-case-water-continuity/measurement-plan.md) l’exigence d’un rival professionnel doté de moyens comparables. C’est une correction du futur plan, pas une victoire empirique. Aucun pilote gelé n’a été modifié.

## 2. Générateur extérieur réellement exécuté

[EPANET 2.2, EPA/OWA](https://github.com/USEPA/EPANET2.2) fournit un modèle de réseau hydraulique extérieur à Corpus. Le [tag v2.2](https://github.com/OpenWaterAnalytics/EPANET/releases/tag/v2.2) a été résolu au commit `4d8d82ddc260fce216af9321fc3d9a4646ac6827`, téléchargé puis compilé localement dans `/tmp`, sans installation système. Version retournée : `20200`.

Six simulations : réseaux amont Net1, Net2, Net3, chacun en DDA et PDA. Les réseaux, commandes de pompes et durées sont ceux des exemples externes. Les paramètres PDA sont un choix local déclaré : pression minimale 0 psi, pression requise 20 psi, exposant 0,5. Ce ne sont pas des seuils sanitaires ou réglementaires. [Documentation primaire des modèles](https://usepa.github.io/WNTR/hydraulics.html).

Les six exécutions se terminent sans code d’avertissement hydraulique et sans déficit de demande enregistré. Les petites différences de volumes DDA/PDA ne démontrent aucun avantage de politique. Net3 possède une pression minimale négative à certains nœuds : ce constat global, sans condition sur leur demande, ne prouve pas une privation d’usagers. Journaux et résultats détaillés joints. Le compilateur a émis des avertissements conservés dans `epanet-build.log` ; la suite complète de tests amont n’a pas été exécutée.

**Conséquence pour la comparaison.** Le moteur du pilote CCT transforme des allocations zonales par des taux de perte fixes. Il ne résout pas les pressions et débits d’un réseau. Une allocation comptablement admissible n’est donc pas une vérification hydraulique. EPANET permet cette vérification, mais aucune correspondance calibrée entre les trois zones CCT et ces réseaux n’existe ici. Les replays établissent la disponibilité effective d’un générateur externe, pas un résultat CCT contre rival sur un même réseau.

## 3. Décisions humaines reçues, attribution limitée

Source : Herne, Kaisa ; Lappalainen, Olli ; Kuyper, Jonathan. *Decision-Making in a Common Pool Resource Game Experiment 2020*, version 1.0 du 4 septembre 2023, Finnish Social Science Data Archive. [DOI du jeu FSD3668](https://doi.org/10.60686/t-fsd3668). Licence annoncée : CC BY 4.0. Le codebook distingue absence de communication, conversation libre et délibération structurée. Ces mécanismes ont été définis hors du projet.

Le fichier reçu contient 1 710 lignes, 171 participants identifiés par session/place, 57 groupes et 570 tours de groupe. Le téléchargement contient une anomalie : `fsd_no` vaut `3661`, tandis que le paquet, le codebook et les noms de fichiers désignent FSD3668. FSD3661 est [un autre jeu](https://services.fsd.tuni.fi/catalogue/FSD3661?lang=en&study_language=en). L’attribution au bon jeu reste à confirmer ; rien n’a été renommé silencieusement.

Les décisions individuelles et les trois retraits concordent pour les 570 tours. Pour 20 tours, le solde final déclaré diffère entre les trois membres. Le premier calcul strict conserve 550 tours ; le calcul complémentaire, explicitement post hoc, décrit les 570 traces de retrait cohérentes et signale les soldes litigieux séparément.

| Condition du codebook | Groupes | Tours | Retrait moyen : premier / deuxième / troisième | Écart moyen maximum–minimum dans le groupe |
| --- | ---: | ---: | --- | ---: |
| Sans communication | 18 | 180 | 17,41 / 11,76 / 8,05 | 10,73 |
| Conversation libre | 17 | 170 | 18,69 / 16,52 / 14,87 | 4,09 |
| Délibération structurée | 22 | 220 | 19,00 / 18,25 / 16,25 | 3,51 |

Calculs descriptifs du fichier reçu, en points. Les tours répétés ne sont pas des échantillons indépendants ; l’assignation aux traitements n’a pas été reconstruite. Aucune significativité ni causalité n’est revendiquée. La CCT n’est aucun des trois bras. Ces données ne peuvent pas être converties en soumissions au scénario eau de 72 heures, ni utilisées pour annoncer que la CCT aurait fait mieux. Elles fournissent des traces extérieures de coopération et d’asymétrie, sous réserve de clarification de provenance.

## 4. Ce qui est indépendant, ce qui ne l’est pas

| Élément | Acquis | Non acquis |
| --- | --- | --- |
| Rival | Maintenance professionnelle et dispositifs de communication documentés avant Corpus | Équipe rivale engagée et implémentation appariée à CCT |
| Générateur | Code et réseaux EPANET extérieurs, exécutés | Calibration sur le scénario CCT, arbitre externe |
| Décisions | Jeu public reçu et décrit ; archive Costa Rica reçue et empreintée | Paquets CCT/rival produits hors Corpus ; anomalie FSD résolue |
| Contre-évaluation | Critiques préparées à partir des sources | Revue de notre CCT produite par un tiers |

La méta-étude [Metaketa sur six pays](https://pmc.ncbi.nlm.nih.gov/articles/PMC8307849/) réutilise notamment le volet Costa Rica : ne pas la compter comme réplication indépendante de ce volet. WNTR et EPANET partagent des équations : deux enveloppes logicielles ne font pas deux physiques indépendantes. La sélection et les traitements de cette passe restent une même lignée locale.

## 5. Prochaine confrontation précise

Le contraste à préenregistrer est **service professionnel + mêmes ressources** contre **CCT-MIN-01 + mêmes ressources**, avec service standard conservé pour tous. Les auteurs CCT doivent d’abord préciser quelles décisions leur dispositif change, avec quelles informations et à quel coût. Les interlocuteurs extérieurs doivent pouvoir contester le rival, les effets attribués aux décisions et les seuils, avant gel d’un nouveau lot.

Résultats capables de faire perdre l’hypothèse : absence d’amélioration de continuité à moyens égaux, coûts ou charge plus élevés sans gain, ou dommage non compensable. Un gain du paquet contre un service moins doté ne suffit pas à distinguer la gouvernance. Une égalité ou des résultats croisés restent recevables. Rien ici n’autorise une intervention territoriale.

Deux demandes nominatives et limitées sont rédigées dans `CONTACTS_ET_DEMANDES.md`. Les personnes proposées n’ont pas été contactées ; disponibilité, coût, liens de collaboration et séparation matérielle restent inconnus. Leur compétence ne constitue pas un engagement ni un audit d’indépendance.

Voir `REPRODUCTION.md` pour les commandes et `analysis-plan.json` pour l’exposition préalable aux données. Les documents de méthode ont été consultés via les skills Corpus ; aucune partie de cette analyse locale n’est présentée comme contre-évaluation extérieure.
