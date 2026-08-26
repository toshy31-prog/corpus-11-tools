# CCT-EXEC 1.1 candidate — récupération constitutionnelle séquencée

Cette couche nouvelle répond à l’échec matériel conservé par CCT-EXEC 1.0 :
quand aucune action ne protège simultanément tous les axes confirmés, le refus
empêche une violation choisie mais ne crée aucune capacité de sortie.

## Règle exécutée

1. sélectionner immédiatement la protection complète si elle est faisable ;
2. sinon garantir le minimum vital et suspendre l’irréversible ;
3. inscrire chaque axe découvert comme violation et dette de réparation ;
4. acquérir une capacité dont le gain doit être attesté indépendamment ;
5. restaurer les axes avant une échéance publique ;
6. fermer la dette seulement sur reçu de réparation complet et ponctuel ;
7. classer toute échéance manquée comme échec terminal.

Une dette temporaire n’est jamais une compensation, un compromis, une moyenne
ni un succès. I13 reste actif pendant toute la séquence.

## Résultats locaux

- 23/23 tests du runtime et mutations passent ;
- 12/12 attaques internes produisent le comportement attendu après une révision ;
- la première passe a révélé une confusion entre interdiction constitutionnelle
  et effondrement du budget ; ces causes ont été séparées puis rejouées ;
- quatre attaques restent des échecs matériels assumés : absence de triage sûr,
  absence de gain de capacité, effondrement budgétaire commun et seule action
  disponible contraire à I13.

Le rapport vectoriel est dans [`development-report.json`](development-report.json)
et l’audit dans [`validation.json`](validation.json).

## Statut

`locally_tested` seulement. Les scénarios sont synthétiques et écrits par le
mainteneur. Aucun effet institutionnel, aucune autorisation, aucun déploiement,
aucune robustesse composée, aucune supériorité ni transport externe ne sont
établis.

Les gels CCT-NCE 0.14, CCT 1.0 et CCT-EXEC 1.0 restent inchangés.
