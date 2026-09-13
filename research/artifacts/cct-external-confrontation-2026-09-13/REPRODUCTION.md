# Reproduction et limites

Prérequis utilisés : Python 3.12 (bibliothèque standard), GCC 13.3.0, Node.js. Aucune installation système, dépendance Python ou npm n’a été ajoutée. Les téléchargements sont publics et en lecture seule. Les scripts de récupération vérifient les SHA-256 ; ils s’arrêtent si les entrées amont ont changé.

Depuis la racine du dépôt, commandes exécutées avec succès :

```bash
python3 research/artifacts/cct-external-confrontation-2026-09-13/fetch_inputs.py /tmp/cct-external-20260913/reproduction-inputs
python3 research/artifacts/cct-external-confrontation-2026-09-13/replay.py --csv /tmp/cct-external-20260913/reproduction-inputs/daF3668_eng.csv --epanet-source /tmp/cct-external-20260913/reproduction-inputs/EPANET-4d8d82ddc260fce216af9321fc3d9a4646ac6827 --output /tmp/cct-external-20260913/reproduction
python3 research/artifacts/cct-external-confrontation-2026-09-13/decision_arms.py /tmp/cct-external-20260913/reproduction-inputs/daF3668_eng.csv
node research/artifacts/cct-external-confrontation-2026-09-13/probe_local_scope.mjs
node research/active/cct/external-simple-rival-pilot-v0.1/verify-freeze.mjs
node research/active/cct/pol-1.1-executable/verify-contracts.mjs
git diff --check
```

La première exécution utilisait les entrées dans `/tmp/cct-external-20260913`. Le second téléchargement public donne les mêmes empreintes, puis les mêmes six résultats hydrauliques et les mêmes agrégats du fichier humain. Les comparaisons JSON exactes ont été vérifiées, ainsi que les liens locaux du rapport et du plan de mesure. Résumé : `verification.json`.

`analysis-plan.json` a été écrit avant les agrégats, après consultation des articles, des notices et des premières lignes du CSV. Ce n’est pas un préenregistrement aveugle. `decision_arms.py` est une exploration complémentaire post hoc après constat des 20 divergences sur CPR3. Il conserve les retraits cohérents, vérifie les deux premiers bilans et calcule séparément le reliquat ; il ne répare pas le fichier original.

Les sorties EPANET proviennent des trois fichiers d’exemple inchangés. Les paramètres PDA sont locaux et déclarés. `epanet-source-manifest.json` engage chaque fichier de l’archive extraite ; la compilation refuse une source différente. La licence EPANET est conservée. `epanet-build.log` garde les avertissements de compilation. Les suites amont complètes n’ont pas été exécutées. Aucun résultat d’EPANET n’a été injecté dans le pilote CCT.

Le test `probe_local_scope.mjs` utilise des fixtures locales explicitement marquées, jamais des paquets prétendument extérieurs : à décisions égales, l’étiquette du candidat ne change pas les résultats ; des métadonnées de pression inconnues du modèle sont ignorées. Cela caractérise la portée du moteur. Il ne teste ni la production des décisions par une institution ni la livraison hydraulique.

Les données brutes FSD, les fichiers Stata OSF et le binaire compilé restent dans `/tmp`. Le dépôt contient les empreintes, programmes de reproduction, résultats agrégés, journaux et analyse. L’archive Costa Rica est reçue et empreintée mais ses statistiques ne sont pas rejouées. Ni la résolution de l’anomalie FSD, ni la calibration CCT–EPANET, ni une contre-évaluation tierce n’ont été réalisées.

Une future publication des résultats devra respecter les attributions et conditions du fournisseur FSD, dont la notification bibliographique demandée par l’archive. Aucun message ni résultat n’a été publié ou envoyé dans cette passe.

Les six rapports bruts EPANET sont conservés octet pour octet dans `epanet-raw-reports.zip`. Leurs espaces de fin de ligne sont produits par EPANET ; l’archive évite de les réécrire pour satisfaire le contrôle de style Git.
