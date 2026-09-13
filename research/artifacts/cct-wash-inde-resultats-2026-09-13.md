# CCT — WASH en Inde : résultat de la confrontation documentaire

13 septembre 2026. **Verdict fixé : `inconclusive` sur H-M ; aucune supériorité propre de la CCT établie.** La préférence provisoire fondée sur H-M est suspendue selon l’engagement, pas convertie en victoire.

## Engagement conservé

[Texte avant ouverture des résultats](cct-wash-inde-engagement-2026-09-13.md).
SHA-256 : `30af00ecfaa403b1aaf7cbb87b86f374d227e5cba62c3d885e4ca4714f3fa2a4`.

Il fixait la fonctionnalité des installations sanitaires à la dernière mesure et exigeait un contraste direct entretien seul contre enseignement seul, avec son incertitude. Le fichier a été écrit et son empreinte affichée avant l’ouverture des résultats dans la session ; il n’a pas fait l’objet d’un enregistrement public ni d’un horodatage indépendant. La sélection du cas et son évaluation restent effectuées par le même assistant.

## Matériau effectivement consulté

**Source A :** Hornsby et collègues, prépublication déposée le 28 octobre 2025, [medRxiv, version 1](https://www.medrxiv.org/content/10.1101/2025.10.23.25338677v1.full). L’accès direct au HTML a renvoyé 403 ; le PDF a échoué. Le moteur a restitué le résumé et la conclusion, pas les tableaux nécessaires. Les auteurs y rapportent des améliorations des installations avec l’entretien, sans changement significatif des comportements observés, y compris dans le bras combiné. La notice consultée indique que les données ne sont pas encore publiques et nécessitent une demande. Aucune demande n’a été envoyée. Aucun coefficient de fonctionnalité n’est reconstruit à partir de ce résumé.

**Source B :** Hornsby, Pham, Davis et Darmstadt, [Frontiers in Public Health, 31 août 2026](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1833899/full), sections 2.1 et 3.1, tableau 2. Article accessible, portant sur **le même essai**, et non une réplication. Il compare notamment usage déclaré et observé. L’entretien seul présente une hausse déclarée de 19 points relativement à la tendance témoin (p < 0,001), contre 1,3 point pour l’usage observé (p = 0,055). Ces mesures ne sont pas interchangeables : fenêtre, événement et dénominateur diffèrent. L’observation concerne des visites pendant deux heures ; la déclaration concerne la dernière défécation. La maintenance était encore active à la dernière mesure : cela ne démontre pas la pérennité après son retrait.

Les p-values ne transforment pas l’estimation non significative en effet nul. Les deux articles ne comptent pas comme deux preuves indépendantes.

## Pourquoi H-M n’est pas déclarée gagnante

| Exigence fixée | Ce qui a été obtenu | Conséquence |
|---|---|---|
| Fonctionnalité sanitaire | Conclusion qualitative des auteurs, sans tableau complet vérifié | Pas d’estimation exploitable de la cible |
| Entretien seul moins enseignement seul | Pas de contraste direct et d’intervalle retrouvés dans les contenus consultés | Ni supériorité ni équivalence établies |
| Dernière mesure | Résumé matériel non détaillé par fenêtre accessible | Pas de substitution par moyenne temporelle |
| Comparaison de coûts et charges | Non établie par les pièces lues | Aucune recommandation de déploiement à budget égal |
| Valeur ajoutée propre CCT | L’ingénierie de maintenance peut soutenir la même hypothèse | Un résultat favorable ne l’isolerait pas |

« Non retrouvé dans ces contenus » ne signifie pas « absent de toute la recherche ». Pour rouvrir H-M, il faut le tableau ou une analyse publique donnant le contraste exact à la fenêtre fixée, avec sa définition et son incertitude. Des résultats sur la propreté, la connaissance ou les comportements ne remplacent pas cette cible.

## Conséquence concrète pour le dispositif CCT

La leçon exploratoire concerne la mesure : un équipement fonctionnel, un équipement accessible, un service utilisé et une amélioration déclarée sont quatre observations distinctes. Leur divergence doit rester visible, sans sélectionner celle qui rend l’intervention favorable. Cette leçon n’est pas la validation de H-M ; elle est issue d’une lecture après résultats et n’a rien de spécifiquement nouveau pour la science de l’évaluation.

Le [plan de mesure CCT-MIN-01](../active/cct/pol-1.1-executable/minimum-use-case-water-continuity/measurement-plan.md) précise désormais cette séparation, l’appariement des fenêtres et dénominateurs, ainsi que le suivi après retrait du soutien. Il n’impose ni surveillance individuelle, ni objectif d’augmentation de consommation, ni transfert automatique des résultats scolaires vers un réseau d’eau.

La disponibilité d’une eau sûre reste un résultat matériel pertinent en soi. L’absence de hausse d’usage ne prouve pas son inutilité : besoins déjà satisfaits ailleurs, préférences, contraintes et mesure peuvent intervenir. Inversement, une disponibilité améliorée ne suffit pas à affirmer un bénéfice vécu non mesuré.

## Portée finale

Une confrontation a été réalisée avec un engagement préalable local et une issue non concluante conservée. Une amélioration concrète du plan de mesure en est tirée. Aucun essai CCT réel, aucune décision territoriale ouverte, aucune comparaison indépendante CCT/rival n’a été obtenu. Le bilan précédent conserve sa conclusion ; aucune publication distante ni modification du protocole hydrique gelé n’est effectuée.

## Vérification locale

- `node research/active/cct/pol-1.1-executable/minimum-use-case-water-continuity/validate.mjs` : valide, statut `candidate_design_not_authorized` conservé.
- `node --test research/active/cct/pol-1.1-executable/minimum-use-case-water-continuity/test.mjs` : un test déclaré par le lanceur, réussi.
- Empreinte de l'engagement recalculée et identique ; liens locaux des trois fichiers vérifiés ; `git diff --check` sans erreur.

Ces contrôles vérifient la cohérence locale du livrable, pas la validité empirique de la CCT.
