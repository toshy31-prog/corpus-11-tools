# Scout 0.21.0 — livraison locale, état de l'art et chantier Git

27 septembre 2026. Ce document consolide W1–W5 sans transformer les rapports historiques en preuves d'activation.

## État livré

- Code, serveur et interface : **0.21.0**.
- **797/797 tests réussis**, zéro échec/skip/cancel ; contrôle syntaxique réussi sur copie isolée. [Commandes, empreintes et limites](SOTA_VALIDATION_W5.md).
- Interruption explicitement autorisée après sauvegarde. Ancien serveur 0.20.1, PID 378894, répertoire projet vérifié ; nouveau serveur PID 564582, écoute limitée à `127.0.0.1:4181`. `GET /api/health` renvoie `ok`, version `0.21.0`.
- Page existante rechargée, diagnostic visuel : **« Scout 0.21.0 — interface et serveur alignés »**. Retour à Explorer utilisable. Ce contrôle d'activation ne remplace pas un parcours complet auprès de catalogues réels ni un test d'accessibilité.
- Sauvegarde privée locale : `/tmp/scout-release-0.21.0-IgXWR2/data`, dossier parent 0700. Les **52 fichiers** étaient identiques octet pour octet avant/après redémarrage et au contrôle suivant. Aucun contenu ni secret versé dans Git. Le stockage navigateur n'a pas été modifié par un script.
- L'accès Google était affiché expiré avant et juste après rechargement. L'utilisateur a ensuite indiqué s'être connecté lui-même : cette connexion n'est pas une action du déploiement et doit être conservée. L'égalité des fichiers décrit le contrôle précédent, pas une interdiction des changements légitimes ultérieurs.
- Aucun modèle installé, aucun nouvel audio téléchargé, aucun historique personnel employé pour les comparaisons. RecordLinkage reste dans son environnement temporaire autorisé, hors application.

## Changements utilisables dans cette version

1. Identité : crédits multiples incomplets et versions explicitement contradictoires ne deviennent plus automatiquement une identité acceptée grâce aux autres composantes du score. Ils restent proposés.
2. Découverte : preuves rejouées dédupliquées, chemins distincts préservés malgré les séparateurs présents dans les identifiants ; parcours remix/collaboration respectant leur relation obligatoire ; explication plus courte retenue lorsqu'elle conserve la même catégorie et le même statut de participant.
3. Sources : pauses longues fournisseur communes à la source ; arrêt propagé au transport, à la file et aux attentes lorsque la fouille se ferme ou que la configuration change. Une reconnexion ne réanime pas les requêtes de l'ancienne configuration.
4. Données : synchronisation du fichier puis du répertoire, permissions du temporaire réduites, distinction entre échec avant publication et durabilité incertaine après publication. Ce n'est pas la garantie transactionnelle complète de SQLite, ni du chiffrement.
5. Interface : sélection distincte de disponibilité ; une direction bloquée reste désélectionnable ; accès direct au choix de fiche sans confirmation implicite ; libellé remixeurs/producteurs conforme aux rôles conservés.

L'index hybride expérimental et les bancs d'évaluation ne sont **pas branchés au moteur de production**. Leurs performances ne sont pas présentées comme celles de la recherche en ligne de Scout.

## Où en sommes-nous, en pourcentage ?

Même grille que le bilan initial : **43/80 = 53,75 %, arrondi à 54 % de maturité démontrée du cœur documentaire**. Ce n'est pas un pourcentage de fonctionnalités terminées ni du niveau d'un industriel. Pas de backlog final fermé permettant un pourcentage honnête du projet entier. Les améliorations renforcent principalement des critères déjà au niveau « testé localement » ; on ne gagne pas de point au nombre de tests.

| Voie | Niveau conventionnel | Comparaison et réemploi | Limite décisive |
|---|---:|---|---|
| Identité et crédits | 9/16 | [Chercheurs, AWS/Megagon, RecordLinkage ; diagnostic W5](SOTA_IDENTITY_W5.md) | Corpus synthétiquement corrompu déjà consulté, pas test métier neuf représentatif |
| Découverte et huit directions | 9/16 | [Recherche, Google/Spotify/Amazon/Tencent et OSS, matrice des huit voies](SOTA_DISCOVERY_2026-09-27.md), [correctif W5](SOTA_DISCOVERY_W5.md) | Pas de jugements humains indépendants par direction ni benchmark industriel commun |
| Fiabilité des sources | 8/16 | [Microsoft Research, AWS, p-retry et épreuves locales](SOTA_VALIDATION_W5.md) | Annulation renforcée ; critère conjoint file bornée/budget session/SLO non entièrement établi |
| Données et sécurité | 10/16 | [Ink & Switch, Apple, SQLite et périmètre vérifié](SOTA_VALIDATION_W5.md) | Pas de campagne coupure électrique/multi-processus ; secrets non chiffrés |
| Interface et automatisation | 7/16 | [Microsoft HAI, Google PAIR, W3C et axe-core](SOTA_UX_W5.md) | Activation observée, pas étude sans assistance ni lecteur d'écran complet |
| Audio / similarité, extension distincte | 0/16 hors total | [MERT/CMI-Bench/AudioRAG, Apple/Google/ACRCloud, Chromaprint/CLAP/Picard](SOTA_AUDIO_2026-09-27.md) | Non implémenté ; licences des poids et droits audio séparés de ceux du code |

Les huit voies documentaires sont couvertes séparément dans la matrice : **labels, remixeurs/producteurs, collaborations, compilations, alias/projets, chaînes YouTube, scènes, période**. Un papier général de recommandation n'est pas une preuve de parité sur chacun de ces motifs. Panorama international de sources publiques primaires, non revue exhaustive de toute la recherche mondiale.

### Comparaison réellement exécutée

[W4](SOTA_RECORDLINKAGE_W4.md), contrôlée par [reproduction croisée](SOTA_RECORDLINKAGE_REVIEW_W4.md) : parmi 809 références présentes, rappel@10 de 789/809 (97,53 %) pour Scout hybride contre 437/809 (54,02 %) pour RecordLinkage sorted-neighbourhood fenêtre 3. Même maximum de dix candidats transmis, **pas coût de calcul égal** ; configuration classique fixée, pas optimum RecordLinkage. Les quatre méthodes aboutissent aux mêmes 62 acceptations correctes sur 1 004 requêtes (6,18 %), aucune erreur automatique observée dans ce lot seulement.

W5 distingue 195 références absentes, 20 manquées par la récupération, 103 mauvaises premières après scoring, 624 bonnes premières sous le seuil automatique et 62 acceptations. Aucun seuil abaissé pour améliorer artificiellement ce résultat. [Protocole d'admission suivant](SOTA_IDENTITY_ADMISSION_W5.md).

**Palier état de l'art global non atteint/démontré.** La livraison effective ne ferme pas cet objectif : il manque un jeu neuf indépendant, des budgets comparables, une validation humaine des huit directions et des observations d'usage. L'audio exige en plus un choix de fonction, de droits et d'installation ; l'autorisation de métadonnées ≤100 Mo ne couvre pas implicitement modèles et audio.

## Git, retour arrière et périmètre

Normalisation limitée à `projets/youtube-scout` : correctifs runtime/persistance, identité/découverte/interface, instrumentation/recherche, puis version/documentation de livraison dans des commits locaux séparés. Aucun push ni publication distante. Les modifications du projet voisin `corpus-local-llm-migration` restent intactes, hors index Scout ; le dépôt global ne doit donc pas être qualifié de « propre ».

Référence initiale Scout : `62a4c16c` (0.20.1). Copie de ce code extraite depuis Git dans `/tmp/scout-release-0.21.0-IgXWR2/previous-code`, syntaxe serveur vérifiée, `.data` relié au dossier actif. L'extraction initiale depuis le sous-répertoire avait produit une archive vide ; elle a été corrigée depuis la racine Git et la présence du serveur a été vérifiée. Le retour arrière automatique n'a pas été exercé : ne pas le qualifier de validé. Ne jamais restaurer les données sauvegardées par-dessus une connexion ou des corrections ultérieures sans nouvelle décision explicite.

Sauvegarde et logs sont temporaires, pas une politique d'archivage durable. Le nouveau serveur est un processus détaché avec la configuration de démarrage précédente conservée en mémoire, sans installer de service système ou de démarrage automatique. Son log local est `/tmp/scout-release-0.21.0-IgXWR2/service.log` ; ne pas publier ce log sans contrôle de confidentialité.

## Coordination et suite

Trois sous-agents simultanés, remobilisés : identité → audio/licences → revue livraison → protocole d'admission ; découverte → UX/accessibilité ; plateforme → revue de l'instrument d'évaluation → consolidation globale. Le coordinateur assure versions, sauvegarde, activation, observation et Git. Les revues croisées sont des contrôles techniques, pas une indépendance scientifique entre institutions.

La prochaine vague doit porter sur les preuves manquantes, pas empiler des modifications sans critère : corpus tenu à l'écart et matching moderne à budget comparable ; jugement humain aveugle des huit directions ; budget global de requêtes ; restauration après panne ; parcours clavier/assistif. Aucun de ces travaux futurs n'est déclaré effectué par ce document.
