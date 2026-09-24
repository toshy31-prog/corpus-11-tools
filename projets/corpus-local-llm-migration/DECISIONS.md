# Choix pragmatiques pour le premier Corpus hors ligne

> Mise à jour du 23 septembre : installation autorisée et migration engagée.
> Le [suivi actuel](MIGRATION.md) et [state.json](state.json) font foi pour
> les installations et essais ; les formulations de préparation ci-dessous
> décrivent les décisions initiales du 22 septembre.

Décision de préparation du **22 septembre 2026**. Architecture retenue pour un
pilote ; installation et fonctionnement non validés. Cette fiche remplace les
préférences provisoires de la première recherche.

**Correction après retour utilisateur :** Qwen3 8B est retiré de la sélection :
son niveau d'usage est jugé insuffisant par l'utilisateur. Aucun modèle de
remplacement n'est sélectionné. Voir les [pistes de capacité et de matériel](MODELES-CAPACITE.md).
La [recherche actualisée](COMPARAISON-CANDIDATS.md) retient désormais Qwen3.8-27B
UD-Q5_K_M pour le premier essai et DeepSeek-V4-Flash-0731 pour la cible dédiée
ambitieuse ; ce sont des priorités d'évaluation, pas des modèles admis en production.
OpenCode et llama.cpp restent candidats, sous réserve du modèle retenu.
La [lecture transversale de Corpus](ECOSYSTEME.md)
et les [épreuves](EPREUVES.md) ajoutent conversation, création, recherche, mémoire,
produits et continuité aux critères de code. Les fonctions d’interface, de médias
et de planification restent à couvrir explicitement.

## Le critère confirmé

L’utilisateur accepte une origine commerciale si le code est libre, si l’usage
peut être hors ligne et si Corpus peut ensuite intervenir sur les composants.
La priorité devient donc la maîtrise effective des copies et des modifications.

**En simple :** peu importe qui a fabriqué l’outil, à condition que nous puissions
le garder, le comprendre, le réparer et continuer sans sa permission distante.

## Architecture retenue

| Partie | Choix | Raison et portée |
| --- | --- | --- |
| Atelier agentique | **OpenCode**, d’abord en terminal ; interface graphique ensuite | Sources sous MIT, connexion à llama.cpp et chargement de `SKILL.md` documentés. Plus directement adapté à la reprise d’un atelier agentique Corpus que le changement d’environnement vers Emacs. Choix de conception, sans benchmark de supériorité. |
| Moteur d’inférence | **llama.cpp**, directement | Sources sous MIT ; modèles sur disque et mode hors ligne documenté. Réduit le nombre d’intermédiaires à maintenir. Son lien à Hugging Face n’est plus éliminatoire au regard du critère confirmé. |
| Modèle | **Qwen3.8-27B prioritaire pour essai ; DeepSeek-V4-Flash-0731 pour cible dédiée** | Qwen3 8B retiré. Priorités issues de la [comparaison sourcée](COMPARAISON-CANDIDATS.md), aucune admission ni installation. |
| Mémoire Corpus | **Fichiers Markdown/JSON et Git local** ; index dérivé reconstructible si nécessaire | Sources et décisions restent indépendantes de l’application et du modèle. Pas de base vectorielle ni d’entraînement ajoutés avant un besoin observé. |
| Distribution | **Dossier autonome de sources, dépendances et poids versionnés** | Permettre une réinstallation et une reconstruction hors ligne, au-delà du simple fonctionnement d’un logiciel déjà installé. Paquet à préparer, pas encore constitué. |

Sources : [licence OpenCode](https://github.com/anomalyco/opencode/blob/dev/LICENSE),
[fournisseur llama.cpp](https://opencode.ai/docs/providers/#llamacpp),
[skills OpenCode](https://opencode.ai/docs/skills/),
[llama.cpp et licence](https://github.com/ggml-org/llama.cpp),
[mode hors ligne](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
[fiche officielle Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B).

**En simple :** l'atelier et le moteur sont des pistes ; le modèle doit encore
être choisi pour sa capacité à reprendre le travail. Chaque pièce devra rester
remplaçable séparément, et Corpus gardera ses documents chez lui.

## Pourquoi ces choix changent

Aider reste un recours pour une tâche de code bornée si le pilote OpenCode échoue.
Emacs/gptel n’est pas retenu pour le premier atelier : cela ajouterait une prise
en main sans gain encore observé pour l’utilisateur. Goose n’est pas ajouté en
parallèle. Nous préparons un seul chemin, sans multiplier les installations.

Apertus et OLMo restent des modèles de comparaison possibles. Leur origine
institutionnelle ne justifie plus à elle seule un téléchargement immédiat.
La présence d'un modèle sur le poste ne lui donne aucune priorité. Aucun changement automatique de modèle
si le pilote échoue : relever d’abord la cause, puis remplacer la pièce concernée.

Ollama et ses fichiers sont conservés tels quels, sans les inscrire au nouveau
pilote. Codex demeure l’outil de préparation actuel et
n’appartient pas à la cible de fonctionnement.

## Ce que « modifiable partout » doit vouloir dire

Pour chaque composant logiciel nécessaire au pilote : obtenir la source de la
version réellement utilisée, ses licences, ses dépendances et une recette de
construction ; produire et charger une copie modifiée localement. Une source
consultable en ligne ne suffit pas à prouver cela. **L’audit de l’ensemble des
dépendances exécutables n’est pas encore fait.**

Les méthodes, outils, interface et moteur pourront être adaptés dans leurs sources.
Pour le modèle, les poids sont des paramètres appris : ce ne sont pas des fonctions
que l’on corrige à la main. Les nouvelles pistes sont des modèles à poids ouverts ; cette
recherche n’établit pas la disponibilité de toute leur chaîne et de toutes leurs données
d’entraînement. Remplacement et adaptation des poids sont distincts d’une
reconstruction intégrale de son apprentissage.

**En simple :** nous visons l’accès à tout le logiciel de l’atelier. Nous ne
promettons pas de recréer un grand modèle de zéro sur ton ordinateur. Si la recette
d’entraînement entièrement ouverte devient une exigence, réévaluer ce choix avec
Apertus/OLMo avant la bascule.

Le profil CPU/GPU sera choisi après vérification des besoins du modèle ; un
fonctionnement possible sur CPU ne garantit pas un confort suffisant.
Une carte NVIDIA est visible, mais son pilote n’est pas utilisable depuis
cette session. Aucun pilote propriétaire n’est implicitement admis au titre de
« tout le code libre », et aucun achat ou changement de pilote n’est décidé.

## Observations qui fondent le pilote

Le relevé de cette session voit 16 CPU logiques, environ 31 Gio de RAM et 97,6 Gio
libres sur le volume Corpus. `lspci -nn` identifie une RTX 4070 Mobile et un circuit
Intel ; `nvidia-smi` échoue encore. Cela ne mesure pas les performances d’inférence.

Le manifeste local de `qwen3:8b` référence cinq fichiers, tous présents avec tailles
et SHA-256 conformes au manifeste. Le fichier modèle est au format GGUF et occupe
**5 225 374 496 octets** (environ 4,87 Gio). Cette vérification établit l’intégrité
par rapport au manifeste local, pas l’authenticité de la chaîne amont.
Voir le [relevé](OBSERVATIONS-2026-09-22.json).

La lecture HTTP de la liste Ollama sur `127.0.0.1:11434` a été refusée par
l’environnement (`Operation not permitted`). Ce refus ne signifie pas que le
service est arrêté. Aucun modèle n’a été chargé ou essayé pendant ce travail.

## Contrat de fonctionnement hors ligne

L’atelier et son moteur doivent partager un environnement sans accès externe,
tout en pouvant communiquer localement. Le blocage réseau doit inclure les outils
et sous-processus. Une simple instruction au modèle n’est pas un contrôle réseau.
Pas de repli cloud, y compris pour les résumés, titres et autres traitements annexes.

Préparer un profil isolé : seul fournisseur local autorisé, partage et mises à jour
automatiques désactivés, pas de plugins ou d’outils externes chargés implicitement.
OpenCode documente ces réglages et des options pour couper les téléchargements
automatiques de modèles/LSP. Il fusionne plusieurs sources de configuration :
vérifier la configuration effective, pas seulement un fichier exemple.
[Configuration](https://opencode.ai/docs/config/),
[variables et options](https://opencode.ai/docs/cli/).

Les droits applicatifs ne remplacent pas l’isolation système. Le pilote travaille
sur une copie non sensible et dispose seulement des fichiers nécessaires. Les
sources d’OpenCode et de llama.cpp deviendront des espaces de travail explicites
pour les modifications, avec construction et tests avant remplacement.
[Permissions OpenCode](https://opencode.ai/docs/permissions/).

**En simple :** même si un composant essayait d’appeler Internet, le mode hors
ligne doit l’en empêcher. Corpus pourra réparer ses outils dans une copie, puis
remplacer la version active après vérification.

## Ordre de réalisation retenu

Préalable : matérialiser et figer le premier lot transversal de [scénarios](SCENARIOS.json).
Les critères d’écosystème interviennent dès les premiers essais, sans attendre que
le candidat soit déjà retenu pour ses seules performances de code.

1. Choisir une liste courte pour le niveau requis, vérifier quantifications,
   licences et besoins matériels ; figer ensuite le paquet logiciel compatible.
2. Faire démarrer le moteur dans un environnement isolé, sur le matériel qualifié,
   avec un contexte représentatif et une seule requête à la fois au départ.
3. Brancher OpenCode en lecture seule ; porter un petit ensemble pertinent de
   méthodes Corpus avec leurs références. Ne pas injecter tout le dépôt dans chaque prompt.
4. Vérifier une modification dans une copie, son test, son annulation, puis une
   interruption et reprise. Mesurer le français, les erreurs et l’attente réelle.
5. Vérifier une petite modification du logiciel d’atelier lui-même, sa reconstruction
   hors ligne et le retour à l’original. Ce test matérialise « intervenir partout ».
6. Étendre aux autres usages, à l’interface graphique et enfin aux automatisations.

Les usages essentiels, l’absence de trafic externe et la restauration doivent
passer leurs contrôles avant bascule. Préparer les téléchargements et installations
précis avant leur approbation ; aucune activation n’est effectuée par cette fiche.

**Où nous en sommes :** atelier et moteur candidats, modèle à sélectionner selon
le niveau requis, étude transversale et 24 cas décrits. Le Qwen3 8B présent est
hors sélection après retour utilisateur. Restent les fixtures d’essai, le paquet
logiciel, l’inférence réelle, la continuité des usages, le test hors ligne et la
preuve que Corpus sait modifier puis reconstruire son atelier.
