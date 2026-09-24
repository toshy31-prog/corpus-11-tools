# Ce que le futur écosystème doit préserver

Étude de préparation du 22 septembre 2026. **Observations documentaires et lecture
de code ; aucun candidat local évalué en conversation ou en exécution.**

## Conclusion de travail

La cible est un ensemble capable de continuer le travail de Corpus : comprendre
une intention, retrouver son contexte, examiner une idée, créer, agir sur les
projets, vérifier le résultat et en parler dans le registre approprié. Un bon
modèle de code ne suffit pas. Une imitation de nos tournures ne suffit pas non plus.

**En simple :** il faut conserver les projets, la façon de travailler ensemble et
les moyens d'agir. Le modèle sera une pièce remplaçable de cet ensemble.

**Correction après retour utilisateur :** Qwen3 8B est retiré de la sélection,
son niveau étant insuffisant pour l'usage recherché. OpenCode et llama.cpp restent
des candidats ; le modèle est à choisir selon la [capacité requise](MODELES-CAPACITE.md).
La [recherche élargie](COMPARAISON-CANDIDATS.md) priorise désormais Qwen3.8-27B
pour l'essai sur le poste et DeepSeek-V4-Flash-0731 pour une machine dédiée ;
les critères d'écosystème ci-dessous restent nécessaires à leur admission.
La présente étude élargit les critères de sélection avant toute
installation ; elle ne démontre aucune équivalence avec GPT/Codex.

## Ce qui a été étudié — et les limites

Échantillon croisé de demandes de cette conversation, d'extraits de tâches
accessibles, de documents de pilotage, de projets et de fonctions/tests réels.
Les [sources repères](#sources-repères) rendent les constats vérifiables. Les
extraits ne représentent pas tout l'historique ; certains fichiers évoluent pendant
l'étude. Les validations anciennes citées dans leurs guides n'ont pas été rejouées.

Les échanges accessibles permettent d'observer des habitudes de travail, pas de
dresser un portrait psychologique. Une réponse ancienne de l'assistant est un
exemple de sortie, pas une préférence de l'utilisateur automatiquement approuvée.
Une correction explicite pèse davantage. Les règles proposées ici restent révisables.

Le code des projets et les interfaces exposées sont inspectables. Le code interne
complet de Codex Desktop, les instructions internes non exposées, les poids et
l'apprentissage de GPT ne le sont pas dans cette étude. Nous pouvons spécifier les
fonctions à reprendre ; nous ne pouvons pas promettre leur copie à l'identique.
Les données privées, jetons et dossiers personnels ne sont pas reproduits ici.

## La conversation : observations et conséquences

| Signal observé | Lecture de travail | Exigence pour le candidat |
| --- | --- | --- |
| « go », « fais seul » après une direction déjà établie | L'utilisateur attend la poursuite du travail autorisé | Retrouver l'objectif et avancer ; ne pas recommencer une interview ni élargir une autorisation sensible. |
| « donc », « où en est-on ? » | Demande d'une conclusion ou d'une position concrète dans le chantier | Répondre d'abord par le résultat utile, puis les limites qui changent la décision. |
| « vulgarises à côté à chaque fois » | Le niveau technique doit rester accessible pendant le travail | Dire ce qui change, à quoi cela sert, ce qui marche et ce qui manque, avec un exemple quand nécessaire. |
| Corrections successives, formulations orales, fautes, « lol » | Le sens s'affine au fil de l'échange | Comprendre sans corriger l'orthographe ni singer les fautes ; intégrer une correction au même objectif. |
| « partir de l'existant (au moins comme racine) » | Ambition de transformation avec continuité | Lire les sources et préserver les capacités utiles ; justifier un remplacement par une limite observée. |
| « trop de consignes […] trop l'influencer » | Souhait d'initiative sans feuille de route qui préempte le résultat | Fixer des invariants et un résultat attendu ; laisser une place à la découverte et aux solutions concurrentes. |
| « c'est même pas en 3d », puis « garder notre goal » | L'artefact doit satisfaire l'expérience demandée | Un paquet de tests ou une maquette ne clôt pas un objectif de jeu utilisable. |
| « Corpus (l'entité Corpus, pas codex) », puis « réponds à toutes » | Un registre créatif distinct, parfois développé | Conserver la cohérence d'un portrait imaginaire et répondre à la série entière ; ne pas réduire tout échange à un audit. |

La brièveté est un réglage de contexte, pas une loi. Une réponse de statut doit
être courte ; une série créative demandée peut être ample. La rigueur ne doit pas
imposer des rubriques techniques à chaque conversation. L'humour peut être
accueilli simplement sans devenir une obligation de familiarité.

**Teinte proposée, à éprouver :** français naturel, direct et chaleureux, attentif
aux relations et aux conséquences, capable de désaccord motivé, d'imagination et
de simplicité. Ce n'est ni une persona figée ni une invitation à donner raison
systématiquement. Le corbeau au fil rouge appartient au portrait créatif observé ;
ce motif n'a pas à contaminer le code, la recherche ou toutes les réponses.

## Ce que les projets disent de Corpus

**Un ensemble plus large que son plugin.** Le README décrit Corpus 11 Tools comme
des méthodes mobilisées par Codex. La carte et le pilotage montrent aussi des
applications, des jeux, des recherches, des archives et du travail de maintenance.
CCT n'a pas de priorité automatique. Ne pas réduire l'écosystème à un catalogue
de skills ou au laboratoire le plus facile à tester. [S1, S2, S3]

**Des statuts qui changent ce qu'on peut affirmer.** Le contrat du plugin sépare
recherche, transfert, release et activation. Le pilotage demande un objectif
suivi jusqu'à sa livraison et son effet observable. Le code
`autonomy_objective.review` distingue même clôture contractuelle et effet encore
non observé. La migration doit conserver ces distinctions, pas seulement leurs
étiquettes. [S3, S4, S5]

**Découvrir n'est pas seulement classer.** MUBI propose un choix proche, un pas de
côté, un pari et un contre-choix. YouTube Scout sépare indices, rôles artistiques,
identités et confirmations ; son guide distingue force d'un lien et ressemblance
sonore. Le futur assistant doit garder ces intentions dans les interfaces et les
modifications de code. Ces exemples ne prouvent pas à eux seuls le goût personnel
de l'utilisateur. [S6, S7, S8]

**La recherche peut perdre sa première idée.** Le dossier sur l'indexabilité du
cinéma révise son hypothèse de pivot historique après ses contre-tests. Le futur
Corpus doit pouvoir garder une recherche intéressante tout en abandonnant une
conclusion séduisante ; le langage de Corpus ne doit pas préfabriquer toutes ses
réponses. [S9]

**L'expérience et la conservation des données comptent.** Le jeu distribué relie
une scène Godot à un processus de noyau par commandes/réponses ; sa fermeture
attend les commandes en cours. Les tests Scout lus traitent pannes de restauration,
quotas, concurrence et persistance. Un LLM ne remplace pas ces mécanismes. Leur
reprise doit préserver les sauvegardes et le comportement utilisateur. Le chantier
3D a aussi des sources de développement manquantes à sa racine : un binaire présent
ne suffit pas pour promettre sa reconstruction. [S2, S10, S11]

## Où sont les capacités aujourd'hui ?

| Couche | Porteur observé | Ce que la migration doit reprendre |
| --- | --- | --- |
| Intention et arbitrage | Utilisateur, corrections de la conversation | Continuité du but, possibilité de contester et de changer de direction. |
| Compréhension, rédaction, raisonnement libre | Modèle utilisé dans Codex | Français, nuance, création, analyse et appels d'outils ; qualité locale inconnue. |
| Atelier de travail | Codex et outils exposés dans la session | Contexte, fichiers, commandes, tâches, permissions, rendu des artefacts, reprise. L'inventaire des outils exposés n'est pas un audit de leur implémentation. |
| Méthodes Corpus | Skills, références, invariants, relations, validations | Charger les méthodes pertinentes avec leurs dépendances ; préserver les frontières produit/recherche/archive. |
| Mémoire | Dépôt, historiques de tâches, notes et états locaux distincts | Retrouver pourquoi une décision existe, sa date, son statut, ses liens et ses corrections. |
| Produits | Scouts, jeu, outils Python/Node et données | Préserver interfaces et contrats ; maintenir les logiciels dans leurs langages actuels. |
| Recherche | Portefeuille et laboratoires | Protocoles, sources, rejets, rivaux et limites ; aucune promotion implicite en règle. |
| Continuité d'action | Planification de l'hôte et scripts locaux | Objectif persistant, budget, verrou, arrêt, reprise et notification utile. Un minuteur seul ne raisonne pas. |
| Documents et médias | Outils du poste et outils exposés par l'hôte | Inventorier séparément lecture, génération et édition ; les sorties cloud doivent avoir une alternative locale ou une perte déclarée. |
| Monde extérieur | Recherche web et fournisseurs des Scouts | En mode hors ligne : collections déjà disponibles et fraîcheur explicite ; aucune promesse d'actualité sans réseau. |

**En simple :** le moteur de langage parle et raisonne ; l'atelier lui donne des
mains ; Corpus conserve les méthodes, les projets et la mémoire. Le passage de
l'un à l'autre doit fonctionner, même après fermeture et redémarrage.

Deux chantiers existants évitent de repartir de zéro, sans combler toute la cible :

- **Corpus Open Model** possède une démarche de snapshot, graphe et statut. Son
  README dit explicitement que son noyau n'est pas un LLM. Le pont
  `corpus_cortex.py` récupère un contexte puis appelle Ollama : sa présence ne
  démontre pas la qualité de conversation ni la portabilité de tous les usages. [S12]
- **Surface conversationnelle native** : le renderer conserve la conclusion et
  les incertitudes d'un paquet scellé ; il ne produit pas l'analyse. Son README
  indique que Codex assure encore routage et analyse. Réutiliser ses garanties
  de fidélité est une piste ; imposer son gabarit à toute conversation nuirait
  aux registres créatifs et aux échanges simples. [S13]

## Architecture recommandée et admission des candidats

Conserver les sources et formats existants. Ajouter un adaptateur d'hôte fin avant
de réécrire les méthodes ou les applications. Séparer le profil de conversation,
les règles actives, la mémoire de projets et les permissions d'exécution. Une
instruction trouvée dans une archive reste une donnée, pas un nouvel ordre.

| Pièce candidate | Rôle proposé | Épreuve encore nécessaire |
| --- | --- | --- |
| Modèle à sélectionner ; Qwen3 8B retiré | Langage général et outils au niveau requis | Compréhension orale écrite, registres, raisonnement, contexte et outils sur les cas Corpus ; présence locale sans priorité. |
| llama.cpp | Exécution des poids sur le poste | Charge, mémoire, latence, arrêt, reprise des requêtes, absence d'appels distants. |
| OpenCode | Premier atelier de fichiers et de commandes | Transport effectif des méthodes, reprise d'objectif, inspection des actions, conservation des historiques et intégration des usages non-code. |
| Markdown/JSON et Git | Mémoire durable indépendante | Recherche correcte, liens et statuts préservés, correction d'une préférence, restauration après arrêt. Git seul ne capture pas tous les historiques ni les données hors dépôt. |
| Instruments Corpus existants | Contrôles déterministes réutilisables | Appels dans le nouvel hôte et résultat interprété à la bonne portée. Une copie du skill ne prouve pas son usage. |
| Interface, planification, navigateur et médias | Compléments locaux à qualifier | Couverture encore ouverte ; ne pas déclarer que le trio initial fournit déjà ces fonctions. |

Les licences et justifications logicielles restent dans [DECISIONS.md](DECISIONS.md).
L'architecture peut accueillir plusieurs modèles, mais aucun n'est ajouté sans
besoin observé. Si un candidat échoue, localiser l'échec : mémoire, contexte,
instructions, modèle, interface ou outil. Ne pas attribuer toute faiblesse au seul
modèle ; ne pas masquer une faiblesse par un recours GPT.

La taille des poids présents ne permet pas de déduire le confort d'usage : contexte,
caches et applications consomment aussi de la mémoire. Mesurer sur la machine le
temps jusqu'à la première réponse, le temps jusqu'au résultat utile et les erreurs.
Un seuil de confort choisi à l'avance est une préférence d'usage, pas une mesure
scientifique de fidélité à Corpus.

## Mémoire et ton : préserver sans figer

Ne pas entraîner immédiatement un modèle sur tout le dépôt. Conserver des sources
adressables, puis sélectionner le contexte utile. Prévoir quatre ensembles séparés :

1. **Préférences explicites et corrigibles** : formulation, origine, portée, date,
   éventuel remplacement par une consigne plus récente.
2. **État de chaque chantier** : objectif, décisions, travail fait, preuves, blocages,
   prochaine action, autorisations applicables et points de reprise.
3. **Connaissances et méthodes** : références et statut ; archives consultables sans
   devenir des règles actives ; indexes reconstruisibles à partir des sources.
4. **Exemples de conversation contextualisés** : technique, recherche, création,
   découverte ; distinguer demande utilisateur, sortie assistant et correction.

Ce classement est une proposition de portage, pas une mémoire active installée.
Les données sensibles gardent des espaces séparés ; tester d'abord leur circulation
avec des exemples fictifs. L'export des historiques reste à préparer avec ses
relations et pièces jointes : leur accès actuel par Codex n'assure pas leur reprise
par le futur atelier. La copie d'une conversation assure au plus une trace, pas
automatiquement la continuité des choix qu'elle devait guider.

## Vérification prévue

Le [protocole d'épreuves](EPREUVES.md) et ses
[24 scénarios structurés](SCENARIOS.json) traduisent cette étude en comportements
observables. Ce sont des **cas de conception connus**, pas un benchmark indépendant
ou un résultat acquis. Ils couvrent plusieurs tours, des pannes et des changements
de registre. Les scénarios sans pilote restent `not_run`.

Comparer d'abord des assemblages complets sur les mêmes données locales. Utiliser
ensuite des variantes inédites gelées avant leur exécution. La fidélité du ton
demande aussi un retour d'usage de l'utilisateur ; un auto-score du modèle ne peut
pas l'établir. Conserver des exemples ratés et les pertes, pas seulement les réussites.

**Condition de révision :** si les critères favorisent un assistant rigide, lent ou
incapable de finir une tâche, modifier le portage et le profil ; ne pas transformer
les habitudes observées en obligation pour l'utilisateur de parler autrement.

## Sources repères

Chemins relatifs au dépôt ; lectures ciblées, pas audit exhaustif des composants.

| Repère | Pièces inspectées et portée |
| --- | --- |
| S1 | [README racine](../../README.md), définition du plugin et états historiques. |
| S2 | [Carte des projets](../../CARTE_DES_PROJETS.md), frontières et sources 3D manquantes. |
| S3 | [Pilotage](../../PILOTAGE_CORPUS.md), [cycle d'objectif](../../.maintenance/AUTONOMY_CYCLE.md), mandat et continuité. |
| S4 | [Contrat Corpus](../../corpus-11-tools/skills/corpus-11-routing/references/organism-contract.md), rôles et transitions. |
| S5 | [autonomy_objective.py](../../scripts/autonomy_objective.py), lecture de `review` et des coûts, sans exécution. |
| S6 | [MUBI search.mjs](../mubi-film-scout/lib/search.mjs), lentilles et rôles de programme. |
| S7 | [Guide YouTube Scout](../youtube-scout/README.md), distinction preuve/identité et intention active. |
| S8 | [evidence-algebra.mjs](../youtube-scout/lib/evidence-algebra.mjs), normalisation et catégories de faits/rôles ; lecture partielle. |
| S9 | [Recherche cinéma](../../research/active/cinema-indexability/README.md), ouverture, hypothèses et révision provisoire. |
| S10 | [Guide 3D](../corpus-monde-vivant/dist/CORPUS-3D-linux/LIRE-MOI.md), [pont Godot](../corpus-monde-vivant/dist/CORPUS-3D-linux/game/backend.gd), commandes et fermeture. |
| S11 | [Cache MUBI](../mubi-film-scout/lib/persistent-cache.mjs), [tests](../mubi-film-scout/lib/persistent-cache.test.mjs), [restauration YouTube](../youtube-scout/lib/restore-continuity.test.mjs) ; tests lus, non rejoués. |
| S12 | [Corpus Open Model](../../research/active/corpus-open-model/README.md), [pont Ollama](../../research/active/corpus-open-model/src/corpus_cortex.py), statut et mécanisme. |
| S13 | [Cible conversationnelle](../../research/active/model-response-comparison-harness/PRODUCT_TARGET.md), [guide de surface](../../research/active/model-response-comparison-harness/native_surface/README.md), [renderer](../../research/active/model-response-comparison-harness/native_surface/tools/conversation_surface.py), portée analytique et présentation. |
| S14 | [Audit de développement](../../research/CORPUS_DEVELOPMENT_WORKFLOW_GAP_AUDIT.md), exemples de contrôles et limites des attestations. |

Échanges consultés par extraits via l'hôte, sans export des conversations complètes :
« Rédiger prompt de mise à jour » (`01a0bcb1-7105-7f03-b755-d382fcfc34ab`),
« Builder Jeu video » (`01a08334-8e31-7251-a67b-33a5e68e4eb3`),
« Streaming Film/Séries Scout » (`01a08803-2179-7490-9755-d004fae3c7ad`),
« Choisir le totem de Corpus » (`01a0c6bf-db3f-7eb0-be23-4ff480dce46c`),
« Factcheck avec Corpus » (`6aac34f0-25d4-83eb-8c72-44b627e9ec88`).
Les fenêtres récentes de « Digging Youtube » et « Pilotage de Corpus » n'ont pas
fourni de nouvel extrait utilisateur exploitable ; les fichiers servent de source.
Les bilans automatisés de CCT servent seulement au constat de fonctionnement passé,
pas à déduire la voix ou les convictions de l'utilisateur.
