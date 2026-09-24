# Recherche des candidats pour tout Corpus

Recherche publique du **22 septembre 2026**. Sources primaires : éditeurs des
modèles, textes de licence, producteurs des quantifications, mainteneurs des
ateliers et évaluation publiée par Artificial Analysis. Aucun modèle téléchargé
ou exécuté. Les recommandations ci-dessous sélectionnent des **essais**, pas une
migration déjà validée.

Cette recherche remplace la première liste de trois modèles dans
[MODELES-CAPACITE.md](MODELES-CAPACITE.md). Qwen3 8B reste hors sélection.

## Choix pragmatiques

1. **Premier essai sur le poste actuel : Qwen3.8-27B, quantification UD-Q5_K_M,
   avec llama.cpp et OpenCode.** Le choix porte sur une génération récente,
   polyvalente et documentée, sous Apache-2.0 ; son intérêt ne vient pas d'une
   présence préalable sur disque. La taille permet d'envisager un essai en RAM,
   pas de garantir une vitesse confortable ou une équivalence à Codex.
2. **Cible de capacité plus ambitieuse sur machine dédiée : DeepSeek-V4-Flash-0731.**
   Licence MIT et résultats agentiques publiés pertinents ; traiter le moteur,
   l'encodage des messages et le matériel comme un vrai chantier. La variante
   GGUF examinée occupe environ 155 Go. Dimensionnement préliminaire à étudier
   autour de 256 Gio de mémoire système, avec accélération à mesurer ; ce chiffre
   est une enveloppe d'étude, pas une configuration garantie ni un ordre d'achat.
3. **Mistral Small 4 et Qwen3-Coder-Next restent des rivaux ciblés** pour une station
   intermédiaire. Le premier est polyvalent, le second spécialiste du code.
   Aucun n'est déclaré supérieur au 27B sur les usages Corpus par sa seule taille.
4. **OpenCode reste le premier atelier d'essai ; Hermes devient son rival transversal.**
   Comparer leur reprise de tâches et leur mémoire sur le même modèle. Ne pas
   installer deux orchestrateurs en cascade avant d'avoir observé ce que cela apporte.

**En simple :** une piste sérieuse pour vérifier le potentiel du PC actuel, une
autre pour viser davantage de capacité chez toi. Si le premier essai ne satisfait
pas le niveau recherché, on ne baisse pas les exigences pour le déclarer réussi.

## Les modèles : pourquoi les garder ou les écarter

Les tailles ci-dessous sont celles des fichiers indiqués, en Go décimaux, **pas**
la consommation totale du programme. Les quantifications Unsloth sont des
transformations des poids officiels réalisées par un autre producteur.

| Modèle | Faits documentés | Décision de recherche |
| --- | --- | --- |
| **Qwen3.8-27B** | Généraliste avec vision, génération récente orientée aussi vers les tâches longues ; licence Apache-2.0 vérifiée dans le texte. GGUF UD-Q5_K_M : 19,8 Go ; UD-Q4_K_M : 16,5 Go. | **Prioritaire pour essai sur le PC.** Vérifier français, raisonnement, création et outils, pas uniquement le code. [Modèle](https://huggingface.co/Qwen/Qwen3.8-27B), [licence](https://huggingface.co/Qwen/Qwen3.8-27B/blob/main/LICENSE), [fichiers](https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/tree/main). |
| **DeepSeek-V4-Flash-0731** | Version officielle de juillet, modèle texte ; code et poids annoncés sous MIT. Le dépôt affiche 304B paramètres, avec module spéculatif ; ce nombre ne se confond pas avec celui du modèle principal sans ce module. UD-Q4_K_XL : 155 Go. | **Cible ambitieuse à instruire sur serveur local.** Vision à traiter avec un composant distinct si nécessaire. [Modèle](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731), [GGUF](https://huggingface.co/unsloth/DeepSeek-V4-Flash-0731-GGUF/tree/main/UD-Q4_K_XL). |
| **Mistral Small 4, 119B-2603** | Texte/image, français explicitement annoncé, raisonnement et outils ; Apache-2.0 affichée. UD-Q4_K_M : 73,8 Go, hors projecteur visuel. | **Rival polyvalent de station locale**, à comparer au 27B avant de lui attribuer un gain. Enveloppe mémoire système de 128 Gio à étudier, vitesse non établie. [Modèle](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603), [GGUF](https://huggingface.co/unsloth/Mistral-Small-4-119B-2603-GGUF/tree/main/UD-Q4_K_M). |
| **Qwen3-Coder-Next** | Spécialiste agentique texte, 80B au total et 3B actifs ; Apache-2.0 affichée. Q4_K_M : 48,5 Go. | **Spécialiste éventuel**, si un échec de développement justifie cette seconde pièce. Ne couvre pas à lui seul tous les registres de Corpus. [Modèle](https://huggingface.co/Qwen/Qwen3-Coder-Next), [fichiers](https://huggingface.co/unsloth/Qwen3-Coder-Next-GGUF/tree/main). |
| **Qwen3.6-35B-A3B** | Génération antérieure, texte/image, architecture à experts et Apache-2.0. | **Comparateur secondaire** si la latence du 27B dense rend l'usage impraticable. Son avantage de vitesse sur ce PC est une hypothèse à mesurer. [Modèle](https://huggingface.co/Qwen/Qwen3.6-35B-A3B). |
| **Olmo 3 32B Think** | Apache-2.0 ; publication de code et de données d'entraînement associées. La fiche déclare l'anglais. | **Référence d'ouverture de la chaîne d'apprentissage**, sans preuve suffisante pour en faire le premier assistant français de Corpus. [Fiche et ressources](https://huggingface.co/allenai/Olmo-3-32B-Think). |

### Des poids téléchargeables, mais des conditions qui changent le choix

La famille ou la marque ne détermine pas la licence d'une version. Pour la cible
libre et modifiable définie par l'utilisateur, les modèles suivants ne sont pas
retenus comme socle par défaut. Cela ne veut pas dire que leur usage personnel
local est interdit ; cela signifie que leurs conditions ne sont pas les mêmes
que celles d'une distribution sous MIT ou Apache-2.0.

| Modèle examiné | Condition effectivement lue | Conséquence pour Corpus |
| --- | --- | --- |
| **Qwen3.8-Flash-Next** | Qwen Community License 1.0 : licence distincte pour certains usages commerciaux lorsque le licencié exerce une activité de Model as a Service ou d'assistant de code/bureautique ; exception d'usage interne définie dans le texte. | **Retiré de la recommandation après lecture de la licence exacte.** Ne pas lui attribuer la licence Apache du 27B. [Licence](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/main/LICENSE). |
| **GLM-5.3** | Licence spécifique : revue de sécurité Z.ai pour certains opérateurs de services de modèles dépassant 10 milliards USD de chiffre d'affaires sur douze mois. | Poids accessibles, mais condition sectorielle et de taille ; pas retenu sous l'exigence de libertés générales. [Licence](https://huggingface.co/zai-org/GLM-5.3/blob/main/LICENSE). |
| **Kimi K3** | Accord distinct pour certaines activités de service de modèle au-delà de 20 millions USD sur douze mois, et autres obligations d'affichage à grande échelle ; exceptions d'usage interne. | Pas retenu comme socle libre sans ces conditions. [Licence](https://huggingface.co/moonshotai/Kimi-K3/blob/main/LICENSE). |
| **MiniMax M3** | Conditions commerciales : affichage, notification ou autorisation selon revenus ; restrictions d'usage supplémentaires. | Pas retenu pour un socle affranchi de ces obligations envers l'éditeur. [Licence](https://huggingface.co/MiniMaxAI/MiniMax-M3/blob/main/LICENSE). |
| **Mistral Medium 3.5** | MIT modifiée : exclusion des droits au-delà d'un seuil de chiffre d'affaires mensuel de l'entreprise/employeur, sauf accord commercial séparé. | Ne pas assimiler « Modified MIT » à MIT. Small 4 est examiné séparément. [Texte](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/main/LICENSE). |

Flash-Next avait un intérêt technique : son support a été fusionné dans llama.cpp
et son GGUF UD-Q4_K_XL représente environ 111 Go. Cela reste une piste technique
écartée par le critère de licence, pas une panne ni une absence de poids.
[Support fusionné](https://github.com/ggml-org/llama.cpp/pull/27742),
[fichiers](https://huggingface.co/unsloth/Qwen3.8-Flash-Next-GGUF/tree/main/UD-Q4_K_XL).

## Ce que valent les indices de capacité trouvés

**Qwen3.8-27B dispose d'un signal extérieur à sa fiche commerciale.** Artificial
Analysis publie une évaluation de la variante `xhigh`. Sa page le situe en tête
de sa classe de taille, pas de tous les modèles, et signale une forte verbosité.
Leur mesure n'est ni celle du GGUF choisi sur ce PC ni une évaluation de notre
français conversationnel. [Évaluation et définition des classes](https://artificialanalysis.ai/models/qwen3-8-27b).

Les tableaux Qwen incluent des protocoles différents, des benchmarks internes,
des scores repris d'autres publications et, pour certains jugements, des modèles
propriétaires. DeepSeek publie aussi des résultats dont le harnais de code était
indiqué « à publier » dans la fiche consultée. Ces sources justifient une priorité
d'essai ; elles ne fournissent pas une preuve de supériorité dans OpenCode hors ligne.
[Notes Qwen](https://huggingface.co/Qwen/Qwen3.8-27B#benchmark-results),
[notes DeepSeek](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731#introduction).

**Ce que cette recherche n'a pas trouvé :** une comparaison directement applicable
à tout Corpus, en français, avec nos méthodes, nos historiques et les formats
quantifiés retenus. Aucune estimation chiffrée de « pourcentage de GPT retrouvé ».
La combinaison de modèles n'est pas supposée additionner leurs intelligences.

## L'atelier autour du modèle

| Composant | Faits documentés | Choix proposé |
| --- | --- | --- |
| **llama.cpp** | Moteur libre, serveur et interface web, appels d'outils et option hors ligne. | Moteur du premier essai. Utiliser des chemins locaux, des versions figées et une isolation réseau couvrant aussi les outils. [Serveur](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md). |
| **OpenCode** | Dépôt MIT, atelier agentique et application graphique ; configuration de fournisseurs et d'un modèle auxiliaire. | Premier atelier pour éprouver le travail sur les projets. Configurer aussi les titres/résumés en local ; contrôler la configuration fusionnée. [Dépôt](https://github.com/anomalyco/opencode), [configuration](https://opencode.ai/docs/config/), [options réseau](https://opencode.ai/docs/fr/cli/). |
| **Hermes Agent** | Dépôt MIT ; mémoire persistante, recherche de sessions, skills et planificateur. Documentation d'un moteur llama.cpp local ou d'un endpoint local manuel. | Rival pertinent pour la continuité de conversation et les tâches longues. Ses intégrations cloud et sa production automatique de skills ne deviennent pas implicitement des composants Corpus admis. [Dépôt](https://github.com/NousResearch/hermes-agent), [modèles locaux](https://hermes-agent.nousresearch.com/docs/user-guide/local-models). |
| **Pi** | Dépôt MIT, composants d'agent et extensions ; isolation locale documentée. | Alternative de construction plus modulaire ; demanderait davantage d'assemblage pour l'expérience globale visée. Gardé en réserve. [Dépôt](https://github.com/badlogic/pi-mono). |

La capacité d'installer un serveur local n'assure pas que les appels d'outils,
les images, les interruptions et la reprise marchent dans cet assemblage.
Conserver les sources de Corpus, ses projets Python/Node/Godot/Rust et leur mémoire
adressable. Un nouvel hôte doit s'adapter à ces contrats avant tout remplacement.

Architecture d'essai : **conversation → hôte → modèle local + outils Corpus +
mémoire indépendante**. Les exports d'historiques et pièces jointes, la navigation
locale, les documents et les médias restent des lots distincts de portage. Les
sources fraîches des Scouts et du web ne deviennent pas disponibles sans réseau.

## Matériel : capacité de charger et confort d'usage

Lecture actuelle de `/proc/meminfo` : **31,05 Gio de RAM totale**, environ
**23,95 Gio disponibles**, 16 CPU logiques, le 22 septembre à 21:49 UTC. Disponibilité
volatile. L'accélération GPU reste non qualifiée ; ne pas additionner une VRAM
supposée à la RAM observée. Le relevé antérieur indiquait 97,6 Gio libres sur le
volume Corpus ; espace à revérifier avant téléchargement.

- **Poste actuel :** 19,8 Go correspondent à environ 18,4 Gio pour les seuls poids
  Q5 du 27B. L'essai texte paraît envisageable à contexte borné, mais le moteur,
  les caches et les applications réduisent la marge. Pour la vision, le projecteur
  F16 publié ajoute environ 928 Mo. Commencer par mesurer 16k de contexte puis 32k,
  au lieu de promettre le maximum annoncé. Ces tailles sont des paramètres proposés,
  non des tests déjà passés. La vitesse CPU d'un modèle dense reste une inconnue majeure.
- **Station intermédiaire :** étudier 128 Gio de RAM pour la piste Mistral à
  73,8 Go et/ou le spécialiste code à 48,5 Go, en les chargeant séparément.
  Le débit mémoire, l'accélération et le contexte doivent être mesurés ; avoir
  assez de RAM ne donne pas automatiquement une conversation réactive.
- **Cible ambitieuse :** étudier une machine à 256 Gio pour DeepSeek à 155 Go,
  avec stockage suffisamment large pour les poids, sources et sauvegardes.
  La documentation de déploiement fournisseur illustre également une configuration
  de serveur multi-GPU ; elle ne constitue pas une performance annoncée sur un PC.

Les nombres de paramètres actifs servent à expliquer une partie du coût de
calcul, pas la taille de l'ensemble des poids. Aucun achat de Mac, NVIDIA ou autre
matériel propriétaire n'est implicitement conseillé. Le caractère libre des
pilotes, firmwares et dépendances reste à qualifier séparément du moteur MIT.

## Premier lot concret à préparer

Artefact repéré : `unsloth/Qwen3.8-27B-GGUF`, fichier
`Qwen3.8-27B-UD-Q5_K_M.gguf`, environ **19,8 Go**. La page expose ce SHA-256 :

`2de73110cb254cbf09b54b717578dadff12ef1194e7271527e68202f39ba4bfd`

Il s'agit d'une **empreinte publiée**, pas calculée sur une copie locale.
[Fiche du fichier](https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/blob/main/Qwen3.8-27B-UD-Q5_K_M.gguf).

Le lot devra figer les révisions exactes du moteur et de l'hôte, leurs sources,
leurs dépendances et la configuration d'outils. Préparer les six cas transversaux
C01/C03/C04/C07/C10/C19, puis reprise, images et contexte long. Les autres
[épreuves](EPREUVES.md) demeurent nécessaires avant une bascule de tout Corpus.

Ne pas commencer par une quantification très dégradée pour faire entrer un nom
plus gros dans la mémoire. Si la qualité est suffisante mais la latence mauvaise,
examiner le matériel ou le rival 35B à experts. Si la qualité reste insuffisante,
monter de candidat au lieu de maquiller le résultat par davantage de prompts.

**État de sortie :** recherche réalisée, candidats hiérarchisés, licences et
artefacts examinés ; compatibilité détaillée du paquet, essais et admission
encore à faire. Aucun téléchargement de poids, installation ou activation.
