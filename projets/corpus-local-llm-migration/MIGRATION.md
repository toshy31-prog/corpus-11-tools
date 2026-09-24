# Corpus local — migration engagée le 23 septembre 2026

Un premier chemin local est installé pour la conversation et la lecture des
projets. Il conserve Corpus comme racine. **La migration complète et l’équivalence
avec GPT/Codex ne sont pas acquises.**

## Lancer Corpus

Le bureau et le menu des applications contiennent **Corpus local**.
Le raccourci ouvre désormais l’accueil de continuité :
`http://localhost:18743/corpus/`. Le raccourci lance le modèle
sur ce PC puis ouvre le navigateur habituel. Le terminal de contrôle reste ouvert :
`Ctrl+C` y arrête le moteur. Fermer seulement l’onglet ne libère pas le modèle.

```sh
python3 projets/corpus-local-llm-migration/corpus_local.py web --open-browser --moe
```

L’interface répond sur `http://127.0.0.1:18743` tant que le service fonctionne.
Elle est en français et utilise le dossier Corpus existant. Les nouvelles sessions
identifient précisément le modèle ; les premiers essais utilisaient l’alias
expérimental `corpus`. Le mode `direct` est proposé par défaut ; `reflexion` reste
sélectionnable pour les demandes qui le justifient.

**Attente à prévoir :** le premier contexte avec outils a pris environ quatre
minutes dans notre essai. Trois réponses conversationnelles courtes ont pris
40,10 s, 10,64 s et 19,84 s après chargement, avec réutilisation du contexte pour
les deux dernières. Ce sont des observations ponctuelles, pas une garantie.
La vérification finale dans l’interface a produit une réponse française en une
phrase en 2 min 54 s, sur le profil sélectionné.
Le modèle occupe une grande partie de la mémoire du PC ; du swap a été observé.

## Retrouver les conversations et les projets

L’accueil réunit un instantané de **103 conversations principales** (environ
9 800 messages), **30 documents de projets**, **58 méthodes Corpus** et quatre
repères. Les conversations archivées sont masquées par défaut ; cocher
« Inclure les archives » les rend accessibles. Les noms connus sont conservés ;
un titre très long est affiché en extrait. La recherche porte sur les textes des
conversations, avec prise en charge des accents et des débuts de mots.

« Reprendre en local » crée une nouvelle conversation OpenCode contenant au plus
10 000 caractères récents et le chemin de l’archive complète. La copie est
identifiée comme une trace datée, et aucune réponse ni ancienne action n’est
lancée automatiquement. La barre latérale reste visible pendant la conversation. Le bouton « Accueil Corpus »
et le bouton aux quatre carrés ramènent à Corpus. Le contexte de reprise est
conservé dans une partie synthétique destinée au modèle ; seule une note courte
est affichée, sans supprimer les archives.
Le groupe « Récents · en local » retrouve les nouvelles sessions dans la même
barre latérale que les épinglés et les conversations de Corpus. Une reprise
existante portant le même titre est réutilisée si elle est unique.

L’import utilise uniquement les conversations principales liées au dossier
Corpus ou ses worktrees. Il exclut les sous-agents et journaux de contrôle,
les sorties d’outils, raisonnements internes, pièces jointes binaires et autres
dossiers Codex. Les discussions ChatGPT absentes de ce PC ne sont pas importées.
Les archives et l’index de recherche restent dans le dossier privé ignoré par
Git `.dev-local/corpus-local/continuity/library`. Les originaux ne sont pas modifiés.
Il s’agit d’un instantané, pas d’une synchronisation automatique avec Codex.

Les pages des projets et méthodes sont consultables et peuvent amorcer une
conversation. Cela ne prouve ni leur intégration complète ni leur bon usage par
le modèle. L’historique transféré n’équivaut pas à la compétence de GPT.

Pour actualiser volontairement l’instantané depuis ce PC :

```sh
python3 projets/corpus-local-llm-migration/import_continuity.py
```

## Composants installés et portée vérifiée

| Composant | État observé |
| --- | --- |
| Qwen3.6-35B-A3B UD-Q4_K_M | 22 134 528 992 octets, empreinte publiée vérifiée ; profil local retenu pour poursuivre la migration. |
| llama.cpp b10964 | Moteur CPU utilisé ; sources conservées, reconstruction hors réseau et réponse réelle avec le moteur reconstruit réussies. |
| OpenCode 1.18.32 | Interface locale, projet Corpus rattaché, modèle local seul autorisé, lecture réelle d’un fichier et réponse exacte vérifiées. |
| Hermes 0.21.4, sources v2026.9.21 | Installé séparément ; démarrage et configuration locale vérifiés ; réinstallation dans un environnement neuf sans réseau réussie. Son inférence et son autonomie restent à éprouver. |
| Qwen3.8-27B UD-Q5_K_M | Conservé pour comparaison : réponse courte correcte, mais lecture agentique en environ 23 minutes et consigne de brièveté non respectée. Non retenu par défaut. |

Les archives sources, poids et dépendances sont regroupés dans
`.dev-local/corpus-local`, ignoré par Git. Les empreintes et provenances figurent
notamment dans `installation.json`, `hermes-acquisition.json` et
`hermes-dependencies.json`. Les 63 dépendances Hermes possèdent des métadonnées
de licence ; ce relevé ne remplace pas un audit complet de leurs sources.
Les recettes de restauration reposent encore sur le système Linux et son
compilateur déjà installés. La reconstruction d’OpenCode reste à vérifier.

## Ce qui a déjà été transféré

- Le dossier de projets existant, utilisé directement par le nouvel environnement.
- Un [contexte Corpus portable](CONTEXTE_LOCAL.md), chargé par l’agent local.
- Deux fichiers de notes de continuité (54 226 octets), copiés avec provenance et
  SHA-256 dans `memory/import-codex-2026-09-23`, sans modifier les originaux.
- Les nouvelles sessions et réglages, conservés dans le dossier local `data`.
- L’inventaire de l’automatisation Corpus dans `continuity/automation-inventory.json`.
  Sa configuration reste ACTIVE dans Codex ; sa copie n’est pas une migration
  ni une validation de son exécution.

Les méthodes sont consultables dans leurs dossiers existants. Elles ne sont pas
toutes intégrées ni validées dans les nouveaux hôtes. Les conversations brutes
Codex ne sont pas toutes importées.

## Hors réseau : périmètre réel

Le moteur et l’agent partagent un espace réseau Bubblewrap limité à la boucle
locale. Le test de connexion extérieure échoue avec `Network is unreachable`.
Aucune clé ou configuration de fournisseur n’est héritée de l’environnement.
Les modèles principal et auxiliaire sont locaux ; partage, mises à jour et
chargements automatiques de modèles distants sont désactivés dans OpenCode.
Hermes n’adopte pas les connexions Codex et ne dispose d’aucun repli distant.

L’interface embarquée et ses fichiers JS/CSS sont servis localement. Le pont HTTP
écoute uniquement sur la boucle locale, refuse les origines et hôtes tiers et
ajoute une politique qui limite aussi les connexions annexes du navigateur au
site local. Il ne constitue pas une authentification entre utilisateurs du PC.
Ce confinement concerne ce profil ; le reste du PC et les anciennes applications
ne sont pas placés hors réseau par cette installation.

La RTX 4070 Laptop est disponible, mais le pilote NVIDIA 580.173.02 comporte une
couche propriétaire. Il n’est pas utilisé dans le profil CPU retenu. L’essai libre
Intel/Mesa a donné 34,93 s pour la réponse courte, contre 18,47 s sur CPU avec le
27B ; il n’est pas retenu par défaut. Aucun pilote n’a été modifié.

## Qualité : acquis limités et écarts observés

Le 35B a lu les dix premières lignes de `state.json` avec l’outil réel, puis
répondu uniquement `migration_in_progress`, comme demandé. Les essais de statut
et de révision d’une conclusion donnent des réponses adéquates sur ces cas simples.

Un écart de mémoire créative est observé : le fil rouge du corbeau a été placé
sur son dos au lieu de son bec. Le ton reste parfois mécanique ou formel. La
fidélité globale à Corpus n’est donc pas admise. Les résultats et leur portée sont
consignés dans [VALIDATION-2026-09-23.json](VALIDATION-2026-09-23.json).

Restent notamment les modifications de code suivies de tests, la mémoire durable
corrigeable en usage réel, les méthodes Corpus, les documents et médias, la
planification, l’arrêt/reprise et les sources métier des Scouts. Les 24 scénarios
sont une grille de travail ; ils ne sont pas tous exécutés.

## Maintenance et reprise

Depuis la racine Corpus :

```sh
python3 projets/corpus-local-llm-migration/corpus_local.py network
python3 projets/corpus-local-llm-migration/corpus_local.py config --moe
python3 projets/corpus-local-llm-migration/corpus_local.py hermes-check
python3 projets/corpus-local-llm-migration/corpus_local.py hermes --moe
python3 projets/corpus-local-llm-migration/restore_hermes.py --verify-copy
python3 projets/corpus-local-llm-migration/rebuild_runtime.py
python3 projets/corpus-local-llm-migration/corpus_local.py smoke --moe --rebuilt
```

`install_local.py` reprend les acquisitions interrompues et vérifie les empreintes.
Les outils et commandes restent soumis aux permissions de l’hôte local. Aucun
planificateur Hermes n’est activé ; les Scouts, Ollama et les données existantes
sont conservés. Aucun compte ni abonnement n’est supprimé, aucun achat n’est décidé.

## Navigation corrigée le 23 septembre

Présentation claire inspirée des repères de Codex : barre latérale, épinglés,
projets et conversation centrale. Les fonctions non migrées restent explicitement
indiquées. Après cette mise à jour, recharger les anciens onglets avec
Ctrl+Maj+R pour remplacer la page OpenCode conservée dans le navigateur.

L’ordre des six épinglés est repris des positions enregistrées dans Codex.
Les conversations historiques et locales sont réunies dans la navigation ;
leur provenance reste indiquée. Les fonctions Codex non migrées ne sont pas
présentées comme disponibles.

### Repères de la capture : navigation complétée

Les épinglés suivent directement Nouveau chat, Pull requests, Planifié, Plugins
et Explorer. Le dossier Corpus se déplie ; la recherche et les archives sont
accessibles par la loupe. Paramètres et le repère de profil local restent en bas.
Les rubriques Pull requests, Planifié et Mode vocal affichent leur état non migré,
sans prétendre fournir ces fonctions. Plugins ouvre les méthodes consultables ;
Explorer ouvre les documents de projets. Le réglage de taille du texte concerne
l’ouverture courante et ne remplace pas les paramètres avancés du moteur.

Une reprise reliée sans ambiguïté à une archive affiche désormais l’historique
textuel importé dans une zone repliable au-dessus de la conversation locale.
Cet affichage ne charge pas tout cet historique dans le contexte du modèle.

### Paramètres locaux — 23 septembre 2026

Navigation par catégories et recherche inspirées des captures Codex. Réglages effectifs : thème système/clair/sombre, accent, taille du texte des paramètres et archives, nom affiché, ouverture de l’historique. Stockage dans le navigateur par origine (`localhost` et `127.0.0.1` ont des préférences distinctes), avec repli en mémoire et message si le stockage est refusé. Ces réglages ne modifient pas ceux de l’éditeur OpenCode intégré ni le moteur.

Import et statistiques affichent les comptes réels de l’instantané ; archives et méthodes sont consultables depuis les paramètres. Les autres rubriques indiquent leur état non migré, sans commandes factices. Vérification : 9 tests Python, syntaxe JavaScript, fichiers servis identiques sur 18743 ; navigation et persistance du profil après rechargement vérifiées dans le navigateur via le pont temporaire 18748 (ancienne page OpenCode conservée sur l’origine habituelle du navigateur de test). Pont temporaire arrêté après vérification.

### Gestion des archives — 23 septembre 2026

Recherche insensible aux accents, dates, tri et compteur Corpus ; désarchivage local visible dans la barre latérale, archivage, corbeille récupérable et déplacement groupé avec confirmation. Les changements d’organisation sont enregistrés par origine dans le navigateur, sans modifier les originaux ni les copies importées. Si l’écriture du stockage échoue, aucune modification d’état n’est appliquée. Vérifiés : désarchivage puis présence après rechargement dans le navigateur (pont temporaire 18749), transitions archive/actif/corbeille/restauration et refus de stockage en simulation Node ; 9 tests Python réussis. Aucun effacement définitif ajouté.

### Entrées directes de conversation — 23 septembre 2026

Les entrées `/new-session` (brouillon conservé) et `/server/…/session/…` servent désormais le cadre Corpus pour une navigation principale. Seules les requêtes iframe servent l’éditeur OpenCode, avec le paramètre interne `corpus_embed=1` (le navigateur intégré utilise lui-même un cadre, donc `Sec-Fetch-Dest` seul est insuffisant). Cela conserve la barre latérale même lorsque l’on ouvre directement un ancien lien. Dix tests Python passent, dont la distinction entrée principale/éditeur intégré.

### Entrée explicite après récidive

L’utilisateur a signalé que les anciens onglets affichaient encore OpenCode seul. L’entrée canonique est désormais `/corpus/index.html`, distincte des routes de répertoire OpenCode ; lanceur et liens Corpus mis à jour. Parcours réellement vérifié sur 18743 dans un nouvel onglet : accueil, ouverture de la reprise existante, retour accueil, rechargement, avec barre latérale conservée. Onze tests Python passent. Les anciens onglets OpenCode doivent être remplacés par cette entrée ; leur récupération automatique n’est pas démontrée.

### Service utilisateur et attente de disponibilité

Après une capture montrant ERR_CONNECTION_REFUSED, le service répondait lors du diagnostic : la cause exacte de la capture n’est pas établie. Le lancement via terminal Codex a été remplacé par `corpus-local.service` (systemd utilisateur, Restart=on-failure, non activé au démarrage). Les deux raccourcis bureau/menu appellent `launch_desktop.py`, qui démarre le service puis attend une réponse contenant le cadre Corpus avant `xdg-open`. Service observé actif, HTTP prêt et bibliothèque de 103 conversations chargée dans un nouvel onglet ; lancement via le script testé avec code retour 0. Aucun historique ni préférence supprimé.

Confirmation visuelle utilisateur : accueil Corpus affiché dans Firefox via http://127.0.0.1:18743/corpus/index.html, contrairement à localhost dans les captures précédentes. Les lanceurs utilisent désormais cette adresse. La cause exacte de la différence entre les deux origines reste non établie.

### Filtres d’archives

Ajout des filtres d’origine (import Codex / création locale), de projet, et du tri par date de création. Les dates de création des 103 archives ont été enrichies depuis la base Codex en lecture seule ; l’importeur les conserve désormais. Les sessions locales chargées sont accessibles dans le filtre Actifs et peuvent être classées via les mêmes préférences locales. La distinction d’origine ne prétend pas déterminer où l’inférence historique a eu lieu. Onze tests Python et contrôle syntaxique JavaScript réussis.

### Présentation compacte des archives

Disposition alignée sur la référence : titre/action globale sur une ligne, recherche pleine largeur, deux menus visibles, projet et compteur sur une ligne, liste unique arrondie avec dates courtes et actions alignées. Origine, état et tri sont regroupés dans le premier menu. L’action globale reste un déplacement récupérable, intitulé « Tout retirer », avec confirmation. Les informations de conservation sont accessibles via le menu du groupe.

### Gestion effective des worktrees

API locale protégée par vérification Host/Origin et corps JSON borné : inventaire Git actuel, paramètres persistés atomiquement sur le PC, création sur branche codex/local-…, suppression sans force des seules copies gérées ici. Refus si fichiers modifiés, non suivis ou ignorés ; branches conservées. Nettoyage facultatif à la création avec limite 1–100, copies sales conservées. Racine configurable dans le périmètre privé Corpus. Les worktrees existants sont montés explicitement dans l’isolement réseau ; ouverture de session avec leur dossier. Les copies Codex ne sont pas supprimables via ce gestionnaire et le fetch distant reste désactivé hors ligne.

Validation : dépôt temporaire réel (création, refus copie sale, suppression propre, paramètres et rétention), 11 tests de continuité, syntaxe JS/Python, service relancé, API d’inventaire et /path OpenCode vérifiées sur le worktree aa8c ; page affichée et ouverture de conversation contrôlées dans le navigateur intégré.

### Environnements de projet — 23 septembre 2026

La page Environnements remplace l’ancien panneau d’information du modèle par une liste de projets et leurs profils de préparation. Ajouter un dossier existant dans Corpus, créer/modifier/retirer un profil (nom et script), puis le sélectionner dans Worktrees lors d’une création. Les profils sont enregistrés atomiquement dans le stockage privé sur le PC. Aucun script ne s’exécute à l’enregistrement. Retirer un profil ne supprime pas les copies existantes.

La préparation s’exécute avec Bubblewrap sans réseau, sans variables utilisateur héritées, avec écriture dans la nouvelle copie et /tmp, limite de deux minutes. Le projet source reste inchangé. Un échec conserve la copie et affiche le résultat ; il n’est pas présenté comme une préparation réussie. Les projets doivent appartenir au dépôt Corpus et être présents dans la version Git copiée. Les dépendances nécessitant Internet ne sont pas téléchargées.

Validation sur dépôt jetable : persistance des profils, enregistrement sans exécution, création d’un worktree et fichier de préparation, racine source intacte, rejet d’un projet externe, refus d’écriture dans /etc, signalement d’un script échoué, suppression de profil. Onze tests de continuité passent ; syntaxe JavaScript et compilation Python vérifiées.

Contrôle navigateur : page projets, ouverture/annulation du formulaire et sélecteur de préparation dans Worktrees observés dans le navigateur intégré sur un relais temporaire 18751 servant les mêmes fichiers/API. Le service principal 18743 répond à l’API Environnements après redémarrage. Ses anciens onglets intégrés montrent encore OpenCode ; ce contrôle ne prouve donc pas leur récupération ni le rendu actuel dans Firefox. Aucun profil de test ajouté au projet réel.

### Réglages Git

Page Git ajoutée d’après la référence utilisateur. Préfixe persisté sur le PC, validé par git check-ref-format et consommé par la création des worktrees. Les rubriques fusion/push/PR/revue/surveillance restent désactivées car non raccordées. Instructions de commit et PR affichées comme références en lecture seule, non injectées au modèle. Tests : persistance et rejet de préfixes invalides dans un dossier temporaire ; 11 tests continuité ; syntaxe JS et Python. Service relancé pour activation. Parité fonctionnelle Git non atteinte.

### Sélection de projets hors Corpus et lecture seule

Ajouter un projet propose désormais Parcourir (sélecteur natif Zenity de dossiers), saisie manuelle et case lecture seule. Annuler le sélecteur ne crée rien. Les dossiers externes sont enregistrables ; les profils utilisent leur dépôt Git source pour créer et inventorier les copies. Le mode lecture seule est enregistré sur le PC et bloque côté serveur l’édition des profils et la création via ces profils. Il ne modifie pas les permissions du système ni celles d’autres applications ou conversations déjà ouvertes. Aucun dossier externe n’est automatiquement ouvert dans l’agent.

Validation : dépôt temporaire externe, création/préparation vide/suppression de worktree et refus après passage en lecture seule ; persistance vérifiée. Onze tests continuité et syntaxe Python/JS réussis. Zenity installé et DISPLAY=:1 disponible dans systemd. Le dialogue natif dans Firefox n’a pas été observé automatiquement.

### Ajustement visuel Worktrees

Interrupteurs accessibles, réglages enregistrés à la modification, actualisation compacte près du nom de projet, actions dans l’en-tête de la carte et création repliée. Échec de sauvegarde affiché et bloquant la création suivante. Syntaxe JS vérifiée. Aucun réglage existant changé par cette mise à jour ; nettoyage non activé pour imiter la capture. Les limites fonctionnelles précédentes restent applicables (fetch hors ligne, copies Codex protégées, absence de restauration par instantané).

### Présentation Git alignée

Carte unique compacte sans doubles bordures, interrupteurs, choix segmentés fusion/revue, champ de surveillance indisponible, zones de texte arrondies avec police d’interface. Instructions PR de référence complétées. Préfixe enregistré au changement, champ bloqué pendant l’enregistrement. Les contrôles non raccordés restent désactivés. Syntaxe JS vérifiée ; aucune activation de fonction distante.

### Présentation Connexions

Deux vues Contrôler ce PC / SSH, navigation clavier des onglets, cartes et disposition de référence. Aucun appareil Codex présenté comme migré. Commandes de contrôle/veille désactivées, Ajouter explique le raccordement manquant. Aucun accès distant activé ni connexion SSH lancée. Syntaxe JS vérifiée ; cette modification est uniquement une migration de présentation.

### Présentation Hooks

Titre, description, aide locale dépliable et carte arrondie alignés sur la référence. État explicite : aucun hook raccordé ; inventaire des configurations/plugins et exécution non migrés. Aucun bouton d’actualisation factice ni hook exécuté. Syntaxe JavaScript vérifiée.

### Présentation Navigateur

Sections des deux captures ajoutées : commande du navigateur, Général, saisie automatique, téléchargements, autorisations navigateur/agent et CDP. Cartes compactes, interrupteurs et tableau responsive. Toutes les commandes sont désactivées avec explication de non-raccordement ; aucun réglage Firefox ni accès aux mots de passe, historique, caméra, microphone ou CDP n’a été effectué. Syntaxe JS vérifiée. Il s’agit d’une présentation, pas d’une implémentation du navigateur pilotable.

### Outils réels avec approbation — 23 septembre 2026

Autorisation utilisateur : modèle local, réseau autorisé au cas par cas. Le modèle reste dans son réseau isolé. Un MCP stdio via socket Unix dépose des demandes dans le service hôte ; le canal du modèle accepte uniquement demande/consultation, jamais approbation. Le portail présente les arguments exacts et permet autoriser/refuser une fois.

Navigateur Chromium dédié (copie du binaire local chromium-1234, Playwright 1.63.0 dans le venv privé) : ouvrir, lire, capturer, cliquer, saisir, précédent, recharger, fermer, effacer la session et télécharger. Le téléchargement de la nouvelle version Chromium avait échoué ; aucun profil Firefox n’est utilisé. Requêtes de page limitées à l’origine approuvée, websockets et service workers bloqués ; ce filtrage applicatif n’est pas une garantie d’isolement réseau OS du processus Chromium. Aucun port CDP exposé. Données de session en mémoire, fichiers téléchargés dans browser-downloads avec noms uniques.

Git : état/diff, push sans forçage, création de PR brouillon, fusion explicite via gh ; toutes les actions passent par approbation. SSH : commande exacte approuvée, BatchMode et StrictHostKeyChecking, aucune acceptation automatique de clé hôte. Hooks configurables après création d’un worktree : demande de script après événement, exécution isolée sans réseau dans la copie après approbation. Ne remplace pas encore les hooks de conversation ni une surveillance autonome.

Validation : 15 tests locaux (dont aucune exécution avant approbation, refus, anti-rejeu, désactivation et effacement), syntaxe JS/Python, outils MCP observés connectés dans OpenCode. Parcours UI demande/autorisation/ouverture/lecture d’une page locale réussi. Téléchargement d’une fixture locale réussi via le service actif, relais temporaire utilisé pour éviter les anciens onglets OpenCode. Chaîne socket modèle -> approbation HTTP -> git status réellement exécutée sans mutation. Aucun test de push/PR/SSH distant, aucune cible SSH fournie, aucune publication. Appel spontané par le LLM non évalué.

Restent non raccordés : association et contrôle d’appareils, prévention de veille, gestionnaire de mots de passe/contact, choix de dossier de téléchargement, permissions caméra/micro, outils de site/WebMCP, accès CDP complet et réglages annexes de navigation. Les contrôles correspondants demeurent désactivés ; ne pas annoncer une parité complète.

### Relecture visuelle des captures — 23 septembre 2026

Comparaison dans le navigateur intégré à 1280 × 720 : Git, Navigateur, Worktrees, Connexions (deux onglets), Environnements, Hooks et Chats archivés. Les panneaux d'exécution ajoutés repoussaient les réglages de référence : ils sont désormais repliables en bas de Git, Navigateur et Hooks. Leur ouverture et la présence des commandes Git ont été revérifiées sans lancer d'action. Les résumés indiquent le nombre de demandes en attente. Barre latérale avec icônes SVG, rythme compact, largeur et marges harmonisées ; champs et textes secondaires ajustés. Descriptions Git corrigées pour distinguer les opérations disponibles des préférences encore désactivées.

Validation : `node --check projets/corpus-local-llm-migration/portal/app.js` réussi ; captures réelles inspectées après rechargement. Pas de parité pixel par pixel revendiquée, ni de nouveau test distant. Les écrans personnels antérieurs et toutes les dimensions de fenêtre ne sont pas couverts par cette passe.

### Plugins et pré-intégrations — 23 septembre 2026

Gestionnaire distinct des documents de méthodes : 22 paquets détectés dans le cache local et les dossiers ajoutés (ce nombre ne prétend pas représenter les seuls plugins activés dans Codex), recherche, icônes de paquet lorsqu’elles existent, onglets Applications/MCP/Répertoires/À développer, fiches de ressources et ajout d’un dossier de manifeste sans exécution. Bascule persistante : exposition/retrait immédiat des ressources au MCP local via plugins_list, plugin_resources et plugin_read. Les ressources ne donnent aucune autorisation et aucun script du paquet n’est exécuté automatiquement. Applications tierces et MCP déclarés non transférés.

Après accord spécifique de l’utilisateur, Corpus 11 Tools est activé (58 méthodes). Les autres paquets restent désactivés. Cinq fiches préparatoires versionnées dans plugin-integrations.json : bureautique locale, GitHub, navigateur/recherche, Google, sites/visualisations. Il s’agit de contrats de préparation et dépendances, pas de connecteurs nouveaux déjà exécutables.

Vérifications : 20 tests via `python3 -m unittest discover -s projets/corpus-local-llm-migration -p 'test_*.py'`, `node --check projets/corpus-local-llm-migration/portal/app.js`, compilation Python ; API active 22 paquets/5 fiches/sans erreur ; test réel HTTP activation -> socket MCP lecture -> désactivation/refus -> restauration ; puis activation autorisée et test du processus stdio MCP avec catalogue/lecture réussis, 7 outils exposés. Connexion moteur /mcp observée connected. Usage spontané par le modèle non évalué.

Rendu et recherche vérifiés dans le navigateur sur aperçu strictement en lecture seule (port temporaire 18756, arrêté ensuite). L’accès au port habituel dans le navigateur intégré a encore renvoyé l’ancien OpenCode/HTML à la place du JSON ; non résolu, même si curl reçoit correctement l’API active. Un relais arbitraire avait été refusé par le contrôle automatique et n’a pas été lancé. Aucun test de clic mutation revendiqué dans le navigateur de production. Aucun service externe contacté, aucune installation ni publication.

### Utilisation de l’ordinateur : Chromium — 23 septembre 2026

Écran raccordé au navigateur Chromium dédié déjà présent : disponibilité du binaire/pilote/session graphique, interrupteur commun au navigateur, état de la fenêtre, demande d’ouverture visible, commandes de lecture/capture/navigation/clic/saisie et fermeture via la file d’approbation. Aucun profil personnel ni extension Codex utilisé. Les fenêtres secondaires sont fermées ; l’origine de navigation reste bornée par la demande approuvée. Le mode visible refuse de remplacer une session sans fenêtre existante. Une fenêtre fermée manuellement est détectée lors du rafraîchissement. Portée : navigateur dédié, pas contrôle général du bureau.

26 tests unitaires réussis, syntaxe JS/Python valide. État du service observé : Chromium et pilote présents, session graphique disponible, pilotage désactivé. Rendu vérifié dans un aperçu strictement en lecture seule ; API active vérifiée directement. Le test réel autorisé d’ouverture/fermeture a été refusé par le réglage désactivé avant toute ouverture. L’activation temporaire nécessaire a ensuite été bloquée par le contrôle automatique, qui exige une autorisation supplémentaire ; question précise soumise à l’utilisateur. Aucun succès d’ouverture visible revendiqué à ce stade. L’aperçu ne prouve pas le parcours complet dans le navigateur de production, toujours affecté par l’ancien affichage OpenCode.

### Statistiques locales — 23 septembre 2026

Remplacement des compteurs d’import par un tableau de bord alimenté en lecture seule par la base OpenCode locale : 7/30 jours (Europe/Paris), tokens déclarés entrée+sortie, tours dédupliqués par demande parente, appels d’outils terminés, lectures de méthodes SKILL.md, regroupement modèle/produit, valeurs tabulaires, actualisation et export CSV. Pas de double comptage des parts step-finish. Les tokens cache/raisonnement ne sont pas additionnés aux tokens entrée+sortie ; les étapes à valeur absente/nulle sont signalées. La consultation d’une méthode n’est pas une preuve de son application. Aucun chiffre d’abonnement Codex, coût électrique ou revue fictive. Revue de code indique l’absence de télémétrie dédiée.

Validation : 30 tests locaux réussis, syntaxe JS valide, API du service actif : 30 dates/9 sessions. À la vérification : 5 tours, 13 139 tokens déclarés, 2 outils terminés, 0 consultation de méthode enregistrée par le moteur, 2 étapes sans mesure de tokens exploitable. Les tests MCP directs précédents ne sont pas des tours du modèle et ne sont donc pas ajoutés à ces chiffres. Rendu, passage 7 -> 30 jours et regroupement par produit vérifiés dans le navigateur sur un aperçu en lecture seule de la même base ; API active testée directement. L’ancien affichage OpenCode du navigateur intégré reste une limite de validation du parcours sur le port de production. Export CSV implémenté ; téléchargement non vérifié dans le navigateur.

### Utilisation et ressources — 23 septembre 2026
Remplacement du panneau de compteurs importés par une adaptation locale de l’écran de facturation : activité réelle sur 7 jours, RAM disponible du système, espace libre du volume Corpus, limites de génération partagées avec la configuration du lanceur. Aucune simulation de crédits, facture ou remise à zéro. API GET /corpus/api/resources en lecture seule, erreurs par source sans substituer zéro aux mesures manquantes.
Validation : 33 tests unitaires réussis, syntaxe JavaScript et compilation Python vérifiées. Service redémarré, API active observée (13 139 tokens déclarés, 5 tours, 2 messages sans mesure exploitable au contrôle). Rendu, actualisation et navigation vers Statistiques vérifiés dans un aperçu local restreint en lecture seule ; cela ne résout pas le précédent problème de page OpenCode persistante dans le navigateur intégré.

### Raccourcis clavier — 23 septembre 2026
Liste recherchable, modification par capture clavier, suppression avec icône corbeille, rétablissement des valeurs par défaut, persistance par origine avec repli en mémoire. Sept actions du portail reliées ; aucune simulation des fonctions Codex absentes. Portée : document Corpus, pas l’iframe OpenCode ni les raccourcis système. Refus des doublons et de certaines combinaisons réservées ; composition et répétitions ignorées.
Validation : syntaxe JS, 33 tests Python et contrôle Node du routage/modification/persistance/stockage refusé. Liste et rendu vérifiés sur aperçu local restreint. Pas de validation dans Firefox personnel.

### Suite des raccourcis de conversation
Ajout de chat suivant/précédent, historique de consultation précédent/suivant (limité à cette ouverture), recherche « Changer de chat » et six accès directs Ctrl+Alt+1 à 6. Tri réel par mise à jour, conversations archivées exclues des accès récents. Les onglets du navigateur et le suivi des chats requérant une attention ne sont pas simulés. Contrôle Node : tri, exclusion des archives, navigation historique et remplacement de la branche suivante après nouvelle consultation réussis ; syntaxe JS vérifiée. Aucun test de ces nouvelles combinaisons dans Firefox personnel.

### Raccourcis des panneaux
Ajout des accès aux commandes Chromium, Git, environnements et worktrees, et d’un basculement réel de la barre latérale (Ctrl+Alt+B), avec bouton permanent pour la retrouver. Les fonctions Codex sans équivalent sont listées comme indisponibles et sans affectation trompeuse. Syntaxe JS et 33 tests Python réussis ; masquage/réaffichage de la barre et présence des entrées vérifiés dans l’aperçu local restreint. Pas de test de touches dans Firefox personnel.

### Dernières captures des raccourcis
Accès récents étendus à neuf, menu de commandes recherchable (Ctrl+K), copie du répertoire connu avec signalement de refus du presse-papiers. Raccourcis Git ouvrant les formulaires publication/PR brouillon/fusion sans soumission automatique ; accès catalogue plugins/MCP. Les fonctions restantes des captures sont explicitement indisponibles ou gérées par Firefox/OpenCode. Syntaxe JavaScript vérifiée ; 33 tests Python passaient après les modifications Git/MCP. Copie du presse-papiers et nouvelles interactions non vérifiées dans Firefox.

### Conversation native et compagnons — 23 septembre 2026

Le fil natif utilise les sessions OpenCode et `prompt_async`, avec pièces jointes image,
file locale éditable, arrêt/orientation par interruption et traces d’outils dépliables.
Le même Qwen accepte les images via `mmproj-Qwen3.6-F16.gguf` (899283680 octets,
SHA256 `8971ee4f331ff0a4c609374f32984b3d4e6dc086c0aa35f1d637fad1829e887f`).
Un test synthétique via la conversation locale a produit « Un rectangle rouge. ».

La page Compagnons propose neuf silhouettes SVG, sélection, nom/couleur,
création et suppression de variantes, affichage flottant déplaçable et accès au chat.
Les préférences sont conservées dans le navigateur, avec repli en mémoire si le stockage échoue.
Création, sélection, personnalisation, affichage et persistance après rechargement
ont été vérifiés dans le navigateur intégré. La fenêtre détachée est implémentée mais
son ouverture n’a pas été confirmée dans ce navigateur. Aucun maintien au premier
plan OS ni raccourci global n’est fourni. Les dessins SVG ne reproduisent pas les sprites
pixel art de la référence. Validation : 33 tests Python réussis et syntaxe app.js valide.

### Personnalisation — 23 septembre 2026

Instructions éditables, enregistrées dans le navigateur et jointes au champ `system`
des prochains `prompt_async` du fil natif. Mémoire explicite désactivée par défaut :
collecte des nouveaux messages commençant par « Retiens », « Souviens-toi » ou
« Mémorise », après réponse terminée ; aucune extraction des archives ni des résultats
d’outils. Option séparée pour les échanges ayant utilisé des outils. Consultation,
suppression individuelle et effacement global confirmé. Quarante entrées maximum.
Désactivation coupe collecte et transmission. Les messages déjà envoyés restent dans
leur historique. Le stockage est propre au navigateur et à l’origine ; OpenCode avancé
ne reçoit pas ces préférences. Ce n’est pas une génération automatique de résumés.
Validation : `node test_personalization.cjs` (collecte, filtrage, déduplication,
coupure temporelle et échecs du stockage), 33 tests Python, syntaxe JS ; enregistrement
et rechargement observés dans l’interface. Pas de nouvelle inférence Qwen réalisée
pour mesurer le respect de ces instructions.

### Configuration de l’agent — 23 septembre 2026

Panneau natif : politique sur demande/refus, accès projet/lecture, Web sur
approbation/désactivé, détail des réponses et variantes Qwen Direct/Réflexion.
Restrictions envoyées à la création des chats natifs, y compris depuis un worktree.
Lecture applique un refus global et autorise uniquement read/glob/grep/list.
Les nouvelles consignes de détail et variantes passent dans les prochains prompts.
Export JSON et diagnostic fournisseur/ressources en lecture seule.
Les réglages sont propres au navigateur/origine ; les chats existants ne changent
pas de permissions. Aucun mode Ultra, cache de recherche, résumé de raisonnement,
installation ou réinstallation de dépendances n’est fourni par ce panneau.
Validation : tests Node `test_agent_config.cjs`, `test_personalization.cjs`, 33 tests
Python, syntaxe JS ; diagnostic réel et création UI d’un chat de contrôle, dont
les permissions restrictives ont été relues depuis l’API OpenCode. Pas d’essai de
commande destructive ni de téléchargement. Le chat de contrôle reste vide.

### Mode vocal local — 23 septembre 2026

Après accord explicite, installation isolée de faster-whisper 1.2.1 et du modèle
Systran/faster-whisper-small dans `.dev-local/corpus-local/voice-env` et
`voice-model-small` (le modèle base initial reste téléchargé). Dépendances figées
à titre de relevé dans `voice-requirements.lock`. Inférence CPU int8, sans réseau via
Bubblewrap, un travail vocal simultané, audio limité à 5 Mo et 60 secondes décodées.
`GET/POST /corpus/api/voice` respecte les contrôles d’origine du bridge. Les fichiers
serveur sont temporaires, supprimés en sortie. Aucun audio personnel envoyé au réseau.

UI : microphone sélectionnable, permission au clic, enregistrement/arrêt/vumètre,
vingt enregistrements IndexedDB par navigateur et origine, écoute, téléchargement,
suppression, transcription éditable, insertion dans le brouillon sans envoi automatique.
Bouton micro du composeur et raccourci personnalisable d’ouverture du panneau.
Le micro s’arrête en quittant les paramètres ou au bout de 60 secondes.
Synthèse eSpeak NG système (fr/en), voix locales du navigateur et lecture explicite
de la dernière réponse (4000 caractères maximum pour eSpeak). Pas de dialogue
continu mains libres ni de raccourci global du bureau.

Validation : 40 tests Python et deux suites Node passent, syntaxe JS/Python valide.
Service redémarré et API réobservée : enregistrement synthétique anglais transcrit
correctement ; modèle small français retrouve la première phrase mais altère la
seconde (« Le chat rouge dort »). La qualité française reste donc à vérifier avec
une voix naturelle ; relecture demandée dans l’interface. Synthèse française :
WAV de 100162 octets obtenu par l’API. Interface observée avec modèle small et
voix eSpeak disponibles. Aucun microphone personnel activé ; capture réelle et
écoute humaine non testées.

### Thèmes — 23 septembre 2026

Choix visuels Système/Clair/Sombre, aperçu de code réactif, palettes claires/sombres
indépendantes, couleurs hexadécimales et sélecteurs, polices système/serif/monospace,
graisse, taille de texte et contraste des éléments secondaires. Préréglages Corpus,
Papier et Océan ; copie JSON (avec repli manuel), import validé et réinitialisation
par palette. Application immédiate au portail et fil natif, persistance par origine
avec repli en mémoire. L’éditeur OpenCode avancé reste indépendant.
Validation : `node test_themes.cjs`, syntaxe JS, thème sombre observé et conservé
après rechargement, import invalide refusé et import valide accepté dans le navigateur.
Réglage Système rétabli après le test. Les polices ne sont pas téléchargées ; le
curseur de contraste ne constitue pas une certification d’accessibilité des couleurs.

### Profil local — 23 septembre 2026

Présentation centrée avec avatar initiales, nom modifiable persistant, indicateurs réels sur 30 jours, grille quotidienne/hebdomadaire/cumulée, séries de jours actifs, méthodes consultées et outils terminés. Export JSON local sans messages. Aucune invitation ni publication distante ; aucun forfait ou chiffre Codex recopié. Les conversations sont comptées toutes dates, explicitement. Les mesures absentes sont signalées. La durée du plus long chat et les pourcentages de raisonnement ne sont pas calculés faute de métriques adaptées.

Validation : `node --check projets/corpus-local-llm-migration/portal/app.js` ; 40 tests Python réussis. Interface servie vérifiée dans le navigateur : données locales chargées, trois vues, formulaire du nom. Le téléchargement JSON est implémenté mais le fichier téléchargé n’a pas été contrôlé.

### Options du chat et discussion latérale (23 septembre)

L’en-tête des conversations locales propose renommage OpenCode, épinglage local,
copie du texte, export d’un instantané JSON, ouverture de fenêtre, lancement du
dossier dans les applications disponibles et duplication dans un worktree Corpus
avec contexte textuel. La duplication part de HEAD ; elle ne transporte pas les
modifications non validées. Le panneau Environnement/Sources lit les données Git
réelles et rejoint les réglages existants ; il ne propose pas encore le sélecteur
complet de branches ni les commandes de commit des captures.

Les discussions parallèles utilisent `/corpus/api/parallel`, relayé vers llama
à l’intérieur du bac à sable hors réseau. Pas de session OpenCode, outil, fichier
ni localStorage pour leurs échanges. Le contexte est un instantané textuel des
24 000 derniers caractères du parent, actualisable explicitement. Les messages
latéraux sont bornés à 40 / 24 000 caractères et les réponses à 2 048 tokens.
Fermeture/rechargement efface le panneau ; transfert vers le parent uniquement
par ajout explicite au brouillon. Le modèle est partagé, donc les générations
peuvent attendre le même moteur. La fermeture interrompt l’attente côté client,
pas nécessairement immédiatement le calcul déjà commencé côté modèle.

La planification actuelle conserve des messages datés dans ce navigateur et les
met en file seulement tant que la page reste ouverte. Les échéances manquées
requièrent une reprise manuelle via Planifié. Ce n’est pas un ordonnanceur système.
Le partage est un export local, pas un lien public. Les applications de bureau
ne sont lancées que sur clic et sur un projet enregistré ; le succès du lancement
ne prouve pas que la fenêtre soit visible.

Validation : 45 tests Python, six suites JS, syntaxe JS/Python ; test intégré des
relais TCP/Unix sur ports temporaires et réponse réelle du modèle sur contexte
synthétique. Menu et panneau observés dans le navigateur. Les actions de bureau,
création de worktree et planification ne sont pas validées de bout en bout sur
les données personnelles. Aucun commit ni partage externe effectué.

Contrôle navigateur final sur `localhost:18743` : le chat latéral répond « La
forme décrite est un rectangle et sa couleur est rouge » à partir du fil de test
existant ; transfert observé dans le brouillon principal, ensuite effacé sans
envoi ; fermeture du panneau et aperçu de partage vérifiés. Résumé Git et nom de
la pièce jointe observés. Un ancien onglet sur `127.0.0.1` est revenu à l’interface
OpenCode lors d’une navigation ; une nouvelle page sur `localhost` a affiché
Corpus et exécuté correctement le test. La cause de cet ancien onglet n’est pas
établie.

### Navigateur partagé dans le panneau droit (23 septembre)

Le portail affiche maintenant une vue interactive, actualisée environ toutes les
1,8 secondes, du Chromium utilisé par `browser_request`. Il ne s’agit pas d’un
iframe indépendant : navigation, clics, touches, défilement et saisie utilisateur
passent par le même contrôleur. Retour/avance/rechargement, agrandissement,
masquage et fermeture de session sont raccordés. Le navigateur peut être activé
directement dans le panneau ; son état activé est enregistré. Masquer le panneau
conserve la session ; fermer la session efface son contexte temporaire.

Les commandes du modèle restent soumises à approbation. Le panneau affiche les
demandes et leurs arguments, avec autorisation/refus. Le canal MCP ne peut pas
invoquer le canal utilisateur direct. Le navigateur contrôlé ne peut pas joindre
le port du portail de ses propres approbations. Les origines tierces bloquées
sont listées ; leur autorisation est un clic utilisateur explicite. Snapshot
fournit aussi un inventaire borné des champs/liens/boutons avec sélecteurs, sans
extraire les valeurs des champs.

Validation : 51 tests Python passent ; syntaxe JS/Python. Sur une page locale
synthétique, navigation depuis le panneau, clic dans un champ, saisie et Entrée
ont affiché « Reçu : SAISIE CORPUS ». Une demande `browser_request` envoyée par
le processus MCP est apparue dans le panneau, a été approuvée et a remplacé le
champ par « ACTION OUTIL CORPUS », visible dans le même panneau ; browser_result
renvoie done. Ce test valide le transport MCP et le contrôleur, pas le choix
autonome d’un outil par Qwen. Aucun site externe ni authentification testés.

Limites : une page pilotée à la fois ; vue par captures, pas un flux vidéo ou un
onglet Chromium natif. La saisie de texte passe par le champ sous la vue. Les
fenêtres secondaires et WebSockets restent bloqués ; les sites dépendant de
ces mécanismes ne sont pas garantis fonctionnels. Aucun accès réseau global
n’est ouvert automatiquement.

### Onglets et menu du navigateur (23 septembre)

Le navigateur partagé dispose désormais de 12 onglets maximum, chacun avec son
jeu d’origines autorisées. Le modèle peut demander création, sélection et
fermeture d’onglet via les mêmes approbations ; snapshot/frame indiquent l’onglet
actif. Les fenêtres secondaires spontanées restent bloquées.

Menu : recherche dans la page, zoom 50–200 %, vue mobile 390×844 ou bureau
1100×800, capture PNG, export PDF imprimable, historique temporaire,
téléchargements de la session, effacement confirmé des données temporaires et
accès aux paramètres. Aucun coffre de mots de passe n’est simulé : l’entrée
explique la limite. L’effacement conserve les fichiers déjà téléchargés.
Ctrl+Alt+B masque/affiche le panneau ; Ctrl+T dans le panneau crée un onglet si
le navigateur hôte laisse passer le raccourci. Le bouton + reste disponible.

Validation complémentaire : 54 tests Python passent. Dans le portail, deux vrais
onglets créés, sélection du premier, zoom 110 %, recherche avec résultat visible,
vue mobile et Ctrl+Alt+B vérifiés. PDF de la page synthétique généré et signature
%PDF vérifiée (16 020 octets). Le raccourci par défaut des conversations devient
Ctrl+Alt+S pour éviter le conflit avec le navigateur.


### Consolidation des points 1 à 6 — 23 septembre 2026

Périmètre : vérifications réelles, vidéo/audio, verrou Plan, planification côté
service, préparation du partage local et raccordements UI/fichiers/Git.
Le point 7 est exclu : aucun ajout à l’index, commit, push ou consolidation Git.

- Vidéo : décodage local isolé du réseau, 4 à 12 images horodatées réparties
  sur la durée ; audio transcrit localement par segments de 60 secondes.
  Bornes : 60 Mo et dix minutes. Le modèle reçoit les images échantillonnées
  et la transcription, pas le flux vidéo complet. Une vidéo synthétique de
  3,4 secondes a effectivement produit quatre JPEG et une transcription ;
  Qwen a reconnu le rouge sur une image extraite. Une erreur de transcription
  est conservée dans le compte rendu. Les longues vidéos et tous les codecs
  n’ont pas été validés en situation réelle.
- Plan : agent dédié, permissions refusées et plugin `plan_guard.mjs` qui
  interrompt toute exécution d’outil pour cet agent, même si la session accorde
  des permissions. La configuration active référence le plugin. Le refus du
  hook et le retour au mode normal sont testés ; un essai réel demandant une
  écriture n’a produit aucun appel d’outil. Cet essai réel précède l’ajout du
  verrou complémentaire, et ne constitue pas une tentative forcée de le contourner.
- Planification : échéances persistantes SQLite et exécution par le service,
  même sans page de conversation. Une échéance synthétique a été transmise et
  a reçu `ECHEANCE_OK`, sans ouvrir sa conversation. Le PC et le moteur doivent
  fonctionner ; les échéances en attente reprennent au démarrage. Un envoi
  incertain n’est pas rejoué automatiquement. Les anciennes échéances du
  navigateur sont conservées et proposées à la replanification explicite.
- Partage : instantanés locaux immuables avec jeton aléatoire et révocation,
  contenu HTML échappé, lecture seule. Création, lecture et révocation vérifiées
  sur le service actif. Pas d’hébergement ni de publication externe.
- UI : accueil ajusté, filtres de fichiers Git, panneau Sources et aperçu image
  vérifiés dans le navigateur. Chat express testé jusqu’à la réponse et au suivi
  de contexte (`Bleu`, puis `Ballon`). Durée et dates de messages observées.
  Lecture du README via le service fichiers vérifiée. Les fichiers consultables
  sont confinés au projet ; certaines zones internes restent exclues.
- Git : branche, indexation sélectionnée, commit et push sont raccordés à des
  confirmations explicites. Le dialogue a été observé en lecture ; aucune de
  ces opérations d’écriture n’a été exécutée sur le dépôt de l’utilisateur.

Validation : `python3 -m unittest discover -s projets/corpus-local-llm-migration
-p 'test_*.py'` : 60 tests passent (avec accès aux sockets locales).
Les six `test_*.cjs`, `node test_plan_guard.mjs` et la vérification syntaxique
`node --check portal/app.js` passent. Le service actif a été redémarré après
les changements Python/configuration ; les fichiers UI sont servis directement.
Preuves synthétiques : `VALIDATION_CONSOLIDATION_2026-09-23.json`.

Limites observées : un contexte neuf peut prendre plusieurs minutes à charger
sur cette machine ; la bulle express attend si le modèle est déjà occupé.
La fidélité graphique reste une adaptation, pas une reproduction pixel à pixel.
Ces essais bornés ne valident pas toutes les combinaisons de fonctionnalités,
ni une utilisation autonome prolongée. Aucun changement Git de consolidation.

## Génération visuelle locale — 23 septembre 2026

FLUX.2 Klein et FastWan intégrés au studio, à la file persistante et aux outils MCP de Qwen. Déploiement et rendus réels vérifiés ; voir `MEDIA_GENERATION.md` et `VALIDATION_MEDIA_2026-09-23.json` pour les choix, mesures et limites. Pas de consolidation Git.

### Audio génératif local — 23 septembre 2026

Qwen3-TTS VoiceDesign et ACE-Step 1.5 Turbo installés, versions et SHA épinglés. Studio commun et outils MCP raccordés à la file média existante, lecture expressive et annulation ajoutées. Voix validée via Qwen jusqu’au WAV ; musique CPU générée, chant expérimental (paroles non fidèles aux essais). Lecture audible navigateur non confirmée après plantage de l’outil de test. Voir AUDIO_GENERATION.md et VALIDATION_AUDIO_2026-09-23.json.

### Documents libres et file des messages — 23 septembre 2026
14 formats générés avec Pandoc/LibreOffice local complété par Calc/Impress. Studio et MCP raccordés, PDF par interface et ODT par MCP vérifiés. Menu compact de file, chat latéral et Orienter sans interruption. Correction du relais HTTP keep-alive ; WebSocket conservé. Voir DOCUMENTS_GENERATION.md.
