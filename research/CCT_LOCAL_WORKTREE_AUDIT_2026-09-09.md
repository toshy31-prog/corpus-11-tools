# Audit du worktree local et de la lignée CCT — 2026-09-09

## Objet

Cet audit inventorie l'état local sans ajouter, supprimer, déplacer, nettoyer
ou réécrire les travaux préexistants. Il ne valide pas scientifiquement les
candidates CCT et ne les inscrit pas dans Git.

## Photographie Git

Les nombres ci-dessous ont été relevés avant la matérialisation de ce rapport
et avant la correction du README racine. Ces deux fichiers constituent la liste
fermée de la présente tâche et ne sont donc pas comptés dans la photographie.

- Branche publiée : `main` à `7be55390c1efd48a74815b92f7de140e2af8bcb5`.
- Résumé `git status --porcelain=v1` : 180 entrées, dont 23 suivies modifiées
  et 157 entrées non suivies.
- Expansion `git status --porcelain=v1 -uall` : 950 fichiers, dont 23 suivis
  modifiés et 927 non suivis.
- Sous `research/active/cct/` : 146 entrées résumées, représentant 877 fichiers
  lorsqu'elles sont développées.
- Hors de CCT : 34 entrées résumées, représentant 73 fichiers développés.

Ces deux granularités ne sont pas interchangeables : les 180 entrées sont le
résumé Git des chemins, tandis que les 950 fichiers sont l'inventaire développé.

## Répartition des 950 fichiers locaux

| Groupe | Fichiers | Qualification |
| --- | ---: | --- |
| Lignée `sequenced-restoration` CCT | 834 | 121 candidates locales, v1.5 à v10.35 |
| Pilote `external-simple-rival-pilot-v0.1` | 19 | paquet de collecte prêt, résultats externes absents |
| CCT-POL 1.1 exécutable | 14 | modifications locales mêlant contrats, tests et documentation |
| Publications et sorties CCT | 7 | sources et binaires modifiés, validation éditoriale non réauditée ici |
| Autres fichiers CCT | 3 | README, état et consolidation de lignée |
| Autres recherches | 34 | hors du classement CCT de cet audit |
| Autres fichiers du dépôt | 39 | atlas, exports, projets et configuration locale |

## Lignée exécutable CCT

- `sequenced-restoration-v1.4` est le gel autoritatif déjà suivi par Git.
- Les versions v1.5 à v10.35 forment une chaîne locale continue de 121
  candidates et 834 fichiers.
- Les 121 candidates possèdent toutes au minimum `README.md`, `runtime.mjs`,
  `spec.json` et `test.mjs`.
- Chaque `parentCandidate` correspond exactement à l'identifiant de l'étape
  précédente : aucune rupture structurelle de chaîne n'a été observée.
- Aucun fichier de cette lignée locale n'est octet-identique à un fichier d'une
  autre étape ; aucune redondance exacte par SHA-256 n'a été détectée.
- Les 121 étapes restent néanmoins une seule famille de preuve fortement
  dépendante : elles partagent leur lignée, leur environnement local et des
  hypothèses successivement héritées. Elles ne valent pas 121 validations
  indépendantes.

## Classement opérationnel

### Autoritatif

- **v1.4** : seul gel vérifié déclaré comme autoritatif.

### Structurellement complètes, mais non prêtes à promouvoir

- **v1.5 à v10.34** : 120 candidates dotées de leur structure minimale et
  reliées sans rupture. Elles doivent être conservées comme histoire de
  développement. Cet audit n'a ni relancé leurs 120 tests, ni vérifié une
  promotion cumulative, ni établi leur indépendance.

### Consolidation à auditer séparément

- **v10.35** : 118 fichiers à elle seule, dont deux tests et de nombreux outils
  accumulés. Elle est trop large pour être considérée comme un changement fermé
  sur la seule base de sa présence. Sa propre documentation borne encore le
  résultat à des séparations déclarées ou locales, sans indépendance d'hôte ni
  déploiement.

### Prêt comme dispositif, bloqué comme preuve

- **`external-simple-rival-pilot-v0.1`** : 19 fichiers, scénario, contrats,
  templates, gels et tests présents. Son état reste
  `awaiting_external_inputs`. Les deux soumissions externes et leur audit de
  lignée manquent ; aucun résultat indépendant ne peut être produit localement.

### Incomplets au sens de la publication

- **CCT-POL 1.1, publications et sorties** : des modifications suivies et non
  suivies coexistent. Elles ne disposent pas encore, dans cet audit, d'une
  liste fermée validée et contre-revue permettant un commit sûr.

### Redondance scientifique, pas suppression de fichiers

- La succession v1.5–v10.35 constitue un cumul de mécanismes et de contrôles,
  pas un cumul de preuves indépendantes. Le bon traitement est une
  consolidation de lignée et de décisions, jamais une suppression automatique
  des étapes historiques.

### Exploratoire ou hors admission actuelle

- Les exemples du pilote externe, les déclarations d'acteurs, les séparations
  locales de processus et les attestations synthétiques restent des instruments
  ou fixtures. Ils ne deviennent pas des observations externes par leur nom,
  leur signature ou leur nombre.

## Conclusion et règle de décision

La prochaine décision CCT n'est pas de prolonger automatiquement la série
v10.36. Il faut d'abord auditer v10.35 comme consolidation candidate, puis
déterminer quelles décisions nouvelles elle permet réellement par rapport au
gel v1.4 et quelles limites restent inchangées.

La promotion reste interdite sans dossier distinct établissant le changement de
décision, les régressions possibles, la compatibilité avec v1.4 et les preuves
indépendantes disponibles. En leur absence, v1.4 demeure autoritatif et
`independence_unknown` reste obligatoire.

## Dette d'auto-description du produit

Le README racine est corrigé par la présente tâche pour refléter les faits
réobservés : v1.6.2 publiée, installée et accessible. Deux auto-descriptions
embarquées dans `corpus-11-tools/` conservent toutefois l'état de préparation
de la release : `corpus-11-tools/README.md` et
`skills/corpus-11-routing/references/organism-state.json`.

Elles ne sont pas modifiées ici. Changer les octets du paquet après le tag tout
en conservant le numéro 1.6.2 produirait un paquet différent de la release
publiée et de la version installée. Leur correction complète doit donc passer
par une candidate de patch distincte, ses contrôles produit, une nouvelle
release, son installation et sa réobservation. Tant que cette chaîne n'est pas
réalisée, le README racine porte l'état effectif du dépôt et l'état embarqué de
v1.6.2 reste une dette documentaire connue.

## Limites de cet audit

- Aucun test CCT n'a été lancé.
- Aucun résultat de candidate n'a été reproduit.
- Aucun fichier local préexistant n'a été modifié par l'inventaire.
- La présence d'un test ou d'un README ne prouve ni son exécution, ni son succès.
- L'absence de doublon octet-identique ne prouve pas l'absence de redondance
  fonctionnelle.
- Aucune autorisation, installation, indépendance externe ou observation
  territoriale n'est établie.
