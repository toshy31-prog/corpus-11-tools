# Se repérer dans Corpus

Inventaire local du 19 septembre 2026. Les chemins ont été inspectés ; les applications n’ont pas été lancées. Un fichier présent ou un résultat de test documenté ne garantit pas le fonctionnement actuel.

## Choisir son point d’entrée

| Je veux… | Composant | Point d’entrée | État observé |
|---|---|---|---|
| Utiliser les méthodes Corpus dans Codex | Corpus 11 Tools | [Documentation du plugin](corpus-11-tools/README.md) | Produit distinct des recherches et des jeux ; disponibilité des skills visible dans cette session, sans nouvel audit fonctionnel |
| Explorer de la musique | YouTube Scout | [Guide](projets/youtube-scout/README.md) ; `npm start` dans son dossier | Application locale, validations récentes documentées ; API non testées ici |
| Choisir un film | MUBI Film Scout | [Guide](projets/mubi-film-scout/README.md) ; `launch.sh` dans son dossier | Application locale ; accès TMDB nécessaire, non testé ici |
| Jouer en 3D | Corpus — Monde vivant | `projets/corpus-monde-vivant/dist/CORPUS-3D-linux/JOUER.sh` | Paquet Linux présent avec noyau et runtime ; lancement non vérifié |
| Consulter les recherches | Portefeuille de recherche | [Index des recherches](research/README.md) | Projets expérimentaux ; résultats et limites propres à chacun |
| Retrouver l’ancienne interface web | Corpus Workspace | [Clôture du projet](research/completed/corpus-ui-workspace/README.md) | Abandonné et gelé ; éventuel site distant non vérifié |

Les commandes ci-dessus sont des points d’entrée documentés, pas des commandes exécutées pendant cet inventaire.

### Ajout du 22 septembre 2026

- [Migration de l’écosystème vers des LLM entièrement locaux](projets/corpus-local-llm-migration/README.md) : premier profil textuel local activé (Qwen3.6 35B à experts, llama.cpp, OpenCode), mémoire de continuité copiée ; Hermes installé et restauré hors réseau. Conversation et lecture réelle éprouvées, fidélité et migration globale encore incomplètes. Voir [le suivi concret](projets/corpus-local-llm-migration/MIGRATION.md).

## Les liens entre les projets

- **Corpus** est le dossier d’ensemble ; **Corpus 11 Tools** est le plugin analytique.
- **Ce qui reste possible**, son **Builder** et **Évolution navigateur** ont été retirés du dossier de travail le 19 septembre 2026 avec accord utilisateur, après archivage et vérification de restauration. Voir l’archive ci-dessous.
- **Corpus 3D** possède une interface Godot et un noyau Rust. Aucun branchement du Builder vers ce jeu n’a été trouvé dans les fichiers examinés. Une filiation de conception éventuelle ne vaut pas intégration technique.
- Les **Scouts** sont des applications locales distinctes.
- **Corpus Workspace** est une ancienne interface abandonnée. Son identification au « website Corpus » évoqué par l’utilisateur reste à confirmer : aucun site distant n’a été consulté.
- **Corpus Open Model** et la **surface conversationnelle native** restent des chantiers de recherche/développement distincts du plugin principal. La présence d’un skill de développement dans cette session ne prouve pas son intégration à la release principale.

## Points concrets à clarifier ou réparer

### 1. Dossier de développement 3D incomplet

Le dossier courant `projets/corpus-monde-vivant/` conserve notamment le paquet distribué et des caches, mais il manque à sa racine le manifeste Rust et des lanceurs cités par sa documentation.

Des sources Rust, projets Godot et, dans une copie, le lanceur `JOUER-3D.sh` ont été retrouvés dans :

- `.dev-local/restores/restore-tgqz1z57/projets/corpus-monde-vivant/` ;
- `.dev-local/restores/restore-jb1mlf6l/projets/corpus-monde-vivant/`.

**Conclusion : sources retrouvées dans des copies de restauration ; dossier courant incomplet.** Ni l’exhaustivité ni la version à retenir de ces copies ne sont établies. Avant restauration, comparer les copies au paquet distribué et conserver les différences. Aucune restauration effectuée.

### 2. Prototypes navigateur retirés — archive récupérable

La campagne Sereine, Corpus Builder et Corpus Évolution navigateur ont été retirés ensemble, avec accord explicite. Corpus 3D est conservé.

- [Archive des 32 fichiers](backups/corpus-ce-qui-reste-possible-2026-09-19-verifiee.tar.gz) ;
- [Manifeste de vérification](backups/corpus-ce-qui-reste-possible-2026-09-19-verifiee.tar.manifest.json).

L’archive a été extraite dans un dossier temporaire et comparée aux originaux : chemins, types, permissions, tailles et empreintes SHA-256 identiques. Le contenu source a été revérifié juste avant le retrait.

Pour restaurer, extraire d’abord l’archive dans un dossier vide. Elle contient `corpus-ce-qui-reste-possible/`, à replacer sous `projets/` uniquement si ce chemin est libre. Ne pas écraser un nouveau dossier de travail.

### 3. Ancienne interface web

Corpus Workspace est explicitement abandonné depuis le 18 août 2026. Le conserver comme archive documentée. Ne pas présenter un éventuel déploiement résiduel comme service maintenu. L’adresse exacte du site évoqué reste inconnue.

### 4. Statut de la surface conversationnelle

Le document d’état du comparateur indique un candidat non installé, tandis qu’un plugin de développement est disponible dans cette session. Distinguer copie du dépôt, plugin de développement et release Corpus principale avant de mettre à jour ce statut.

### 5. Recherches et produits

Une hypothèse rejetée, un contre-exemple ou une expérience limitée ne suffit pas à qualifier un projet de « cassé ». Les problèmes documentés de Material Trace Lab, Research Interruptibility and Recovery et Causal Claim Calibration doivent être lus dans leurs états courants, pas convertis en verdict global sur les logiciels.

Le portefeuille possède déjà son [index](research/active/README.md) et ses statuts : ils restent la référence détaillée. Ne pas créer une seconde liste concurrente de tous les laboratoires.

## Ordre recommandé pour la suite

1. Utiliser ce document comme entrée commune pour identifier les composants.
2. Comparer les sources 3D retrouvées avant de proposer une restauration précise.
3. Identifier le site web exact, puis décider de sa place : service, démonstration ou archive.
4. Réconcilier les statuts d’installation et la documentation avec les versions effectivement présentes.
5. Vérifier séparément le lancement des applications choisies ; ne pas confondre nettoyage documentaire et réparation fonctionnelle.

## Périmètre et préservation

Le projet habitat reste local et confidentiel ; ses détails ne sont pas repris dans cette carte publique de navigation. Il n’est pas requalifié ni déplacé.

Seul le dossier `projets/corpus-ce-qui-reste-possible/` a été retiré, après archive vérifiée et accord explicite. Les autres projets et modifications locales sont préservés. Aucun lancement d’application, appel fournisseur, déploiement ou commit. L’essai de restauration a été effectué dans un dossier temporaire.
