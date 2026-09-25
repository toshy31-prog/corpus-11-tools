# YouTube Scout

Application locale de digging et d’exploration musicale fondée sur un graphe de preuves traçables.

Version : **0.19.0**, activée sur le service local le 22 septembre 2026 après autorisation. Collecte répartie entre partenaires, variantes multisources regroupées à l’affichage sans fusion des fiches, crédits multiples et explications améliorés. [Changements, mesures et limites](docs/QUALITY_0.19.0_2026-09-22.md).

Le correctif d’ouverture de 0.18 est conservé : le sélecteur reste accessible depuis la bibliothèque locale même si l’API échoue ; une ouverture refusée revient à un accueil utilisable et peut être réessayée.

Les fouilles sont désormais **éphémères et isolées par départ** : résultats, graphe automatique, cache des catalogues, pagination et historique de consultation ne sont plus repris au prochain départ ni au rechargement. Bibliothèque, carnet, corrections explicites et réglages restent conservés. Les anciennes archives restent sur disque, hors du circuit de recommandation ; importer une ancienne sauvegarde ne réactive pas sa fouille. Le renouvellement des suggestions de 0.16 ne conserve plus les consultations entre sessions. [Périmètre, preuves et coûts de 0.18.0](docs/EVOLUTION_0.18.0_2026-09-22.md).

Correctif de performance préparé, sans redémarrage du service personnel : réutilisation des calculs sur graphe immuable, suppression des copies inutiles du cache, budget réservé aux lectures non cachées et recherche d'alias sans détour par la discographie du départ. [Comparaison avec l'existant pré-0.16 disponible, mesures et limites](docs/PERFORMANCE_AVANT_0.16_2026-09-22.md).

Validation explicite du titre et de l’artiste avant toute identification d’un départ vidéo. Correction accessible dans « Fiche du départ et historique », suivie d’une relance : les réponses anciennes et les liens d’une interprétation précédente ne peuvent pas rétablir cette identité. Une concordance entre catalogues ne suffit plus à identifier l’interprète d’une vidéo ; crédits d’enregistrement exacts ou choix explicite requis. Diversité des co-artistes appliquée aussi aux tris chronologiques, motifs de recherche partielle rendus visibles. [État vérifié, continuité et limites de 0.17.0](docs/EVOLUTION_0.17.0_2026-09-22.md).

Départs typés (morceau, artiste, label, playlist), hasard stable et remélange, renouvellement des suggestions tenant compte des explorations récentes, collecte guidée par les pistes admissibles et explications orientées des crédits. Le filtre « Autres artistes » reste réversible, sans suppression du vivier. Une connexion Google renouvelable est disponible **sur configuration et consentement explicites**, pas activée automatiquement. [Transformation, épreuves et limites](docs/EVOLUTION_0.16.0_2026-09-20.md) · [Configurer la continuité Google](docs/GOOGLE_CONNECTION_CONTINUITY.md).

Identification mieux contextualisée (crédits de description, Topic, corrections personnelles), recherche stricte des noms courts, fiche catalogue exacte facultative, choix de chaque suggestion comme départ, continuité des réglages et filtre de direction réconcilié. Tris locaux dans le sélecteur, les résultats et le carnet ; option **Autres artistes uniquement** dans les résultats. La pertinence désigne la force du lien documenté, pas une ressemblance sonore. [Périmètre et limites de la mise à jour](docs/MISE_A_JOUR_0.15.0_2026-09-20.md).

Choisir un départ : recherche locale dans tous les types, filtre facultatif, contexte des résultats, puis sélection explicite et **Explorer ce départ**. Les suggestions passent par la même validation. Aucun lancement au simple clic sur une ligne. Les directions et la profondeur se règlent uniquement dans l’exploration ; les nouveaux départs ne sont plus limités implicitement aux labels. [Périmètre et vérifications](docs/CHOIX_DEPART_0.14.6_2026-09-19.md).

Exploration unifiée : une seule liste de résultats, filtrable par direction. **Page suivante** parcourt les pistes déjà chargées sans requête externe, y compris les vidéos d’une seule chaîne. Le filtre ne change pas les directions de recherche. **Directions et réglages** regroupe activation, dosage et état des sources dans un panneau repliable. Pour élargir un parcours limité à Labels, y choisir **Activer toutes les directions**, puis lancer la recherche. [Corrections, vérification et limites](docs/PAGINATION_UX_0.14.5_2026-09-19.md).

Correction du nom d’artiste : **Enregistrer le nom** conserve votre saisie pour le morceau, même sans réponse des catalogues. **Utiliser [artiste] et explorer** est un choix distinct qui associe une fiche et ouvre ses liens. Les fiches Discogs / MusicBrainz déjà reliées par identifiants documentés sont regroupées ; les homonymes sans preuve restent séparés. [Vérification et limites](docs/CORRECTION_ARTISTE_0.14.3_2026-09-19.md).

Correction du parcours du **19 septembre 2026** : [audit des interactions, correctifs et limites](docs/AUDIT_WORKFLOW_0.14.2_2026-09-19.md). Le choix direct et les suggestions sont séparés. L’identification manquante est une étape visible et modifiable ; les réglages de découverte n’apparaissent qu’après l’étape d’identification. Une confirmation manuelle conserve aussi la fiche du morceau dans le graphe, sans prétendre avoir identifié l’enregistrement exact.

Durcissement local du **19 septembre 2026** : [audit adversarial, corrections et limites](docs/AUDIT_RELEASE_0.14.1_2026-09-19.md). Les caches sont cloisonnés par requête exacte, les anciens parcours sont revalidés, et les API locales refusent les appels intersites. Les anciennes confirmations indexées par un nom simplifié restent conservées mais demandent une nouvelle vérification avant réutilisation.

Consolidation locale du **19 septembre 2026** : [bilan, vérifications et limites](docs/CONSOLIDATION_2026-09-19.md). Les modifications ne sont pas publiées sur GitHub.

## Principes

Scout distingue observation, hypothèse, candidat, corroboration et identité confirmée.
Un nom proche, un score élevé, une playlist commune ou l’absence de rival ne constituent pas à eux seuls une preuve d’identité.

## Produit

- **Explorer** : fouille depuis morceau, artiste, label, playlist ou autre graine structurée.
- **Carnet** : mémoire volontaire des éléments conservés.
- **Bibliothèque & sources** : imports, connexions, sauvegardes et données locales.

## Résolution des morceaux

Le runtime 0.14 utilise désormais la chaîne suivante :

```text
entrée / vidéo
  -> interprétation structurée
  -> projection de recherches
  -> fournisseurs
  -> normalisation des candidats
  -> algèbre de preuve et décision
  -> contrat HTTP compatible
  -> graphe Scout
```

La projection algébrisée pilote les recherches. La décision moderne détient également l’autorité finale pour une résolution automatique.

Les résultats Discogs issus de `database/search` restent des **indices d’édition**, jamais une preuve de morceau à eux seuls. Le résolveur lit ensuite jusqu’à **trois tracklists** via le fournisseur existant et distingue lecture complète, limitée et échouée. Une piste hydratée peut être retenue si artiste, titre et détails disponibles concordent ; une version ou durée contradictoire reste à confirmer.

Le contrat MusicBrainz `resolved` est conservé. Une piste Discogs utilise `resolvedDiscogsTrack` et son propre identifiant : elle ne reçoit jamais un faux identifiant MusicBrainz. Les crédits et labels de sa release alimentent le graphe. Une ambiguïté MusicBrainz n’est pas contournée par Discogs.

La durée est transmise à la décision moderne et fait partie de la clé du cache. Le budget du bouton **DIG** tient compte des appels déjà effectués : il répartit les recherches entre directions avant de revenir sur la pagination d’une même voie.

## État Explorer

L’état de connaissance persistant est séparé de l’intention active :

- une ancienne fouille peut rester disponible comme reprise ;
- elle n’est jamais réactivée automatiquement au démarrage ;
- le bouton **Reprendre** restaure explicitement le dernier parcours sans relancer les recherches fournisseurs ;
- restaurer un backup ne transforme pas un ancien front en session active.

## Validation actuelle

- `npm run check`, `npm run check:workflow`, `npm run check:connections`, `npm run check:evolution`, `git diff --check` : succès ;
- `npm test` : **649 tests réussis sur 649**, aucun ignoré, sous Node 18.19.1 le 20 septembre 2026 ;
- parmi eux, **41 tests de continuité Google**, avec jetons factices, expirations, pannes et concurrence ; ce ne sont pas des tests supplémentaires ;
- `npm run audit:workflow` : **115 contrôles de parcours et 226 actions**, Firefox isolé, fournisseurs simulés ;
- `npm run audit:evolution` : **21 contrôles par moteur**, Firefox et Chromium isolés, aux largeurs 1440, 820 et 390 pixels ;
- `npm run audit:connections` : **12 scénarios** Chromium de connexion avec réponses simulées ;
- le rendu mobile est vérifié à 390 pixels et les dimensions des cibles sont contrôlées ; ce n’est pas un test sur téléphone physique ;
- aucune validation générée, aucun patch et aucun test n’est une dépendance runtime.

Les audits navigateur nécessitent Playwright et le navigateur ciblé. `SCOUT_AUDIT_BROWSER=firefox` ou `chromium` sélectionne le moteur des audits de parcours et de consolidation ; `SCOUT_AUDIT_LIBRARY_SIZE=4249` configure le volume de consolidation. Si Playwright est fourni par un environnement externe, `SCOUT_PLAYWRIGHT_MODULE` peut désigner son module `index.mjs`. Les scripts écrivent leurs rapports et captures dans un dossier temporaire et n’utilisent pas le profil navigateur personnel.

`npm test` sélectionne explicitement les tests locaux. L’ancien script `scripts/test-live-track-resolution-queue-one.mjs` exige désormais `--allow-network` et refuse de fonctionner sous le runner Node. Ne le lancer qu’après accord explicite pour des recherches réelles. L’ancien audit d’interface est conservé sous `npm run audit:browser:legacy` ; il n’est pas la validation de l’interface actuelle.

Ces résultats ne prouvent ni la disponibilité actuelle des API avec vos comptes, ni une couverture exhaustive des catalogues ou des combinaisons départ/direction. Les commandes exactes, rapports et limites d’activation figurent dans le [dossier 0.16.0](docs/EVOLUTION_0.16.0_2026-09-20.md). Les anciens audits de consolidation restent historiques, sans être présentés comme rejoués sur cette version.

## Démarrer

Dans ce dossier, lancez `npm start`, puis ouvrez [localhost:4181](http://localhost:4181/). Gardez le terminal ouvert. Si le port est déjà occupé, utilisez le serveur existant ou identifiez son processus avant de le redémarrer ; ne lancez pas un second serveur sur le même port.

## Arborescence

- `lib/` : moteurs et contrats métier ;
- `public/` : interface navigateur ;
- `server.mjs` : serveur local et frontières HTTP ;
- `tests/` et `*.test.mjs` : contrats et régressions ;
- `scripts/` : audits, migrations et outils de validation ;
- `patch/` : historique de migration, hors runtime ;
- `docs/`, `qa/`, `design/`, `research/`, `rollback/` : documentation et historique technique.

Les rapports portant d’anciens nombres de tests ou anciennes étapes de migration sont conservés comme **documents historiques**, pas comme description de l’état courant.
