# Inventaire initial — 22 septembre 2026

> Complément ultérieur de la même journée : Qwen3 8B trouvé sur disque et contrôlé
> contre son manifeste local ; RTX 4070 Mobile visible par `lspci`, accélération
> toujours non vérifiée. Voir [les décisions](DECISIONS.md) et le
> [relevé technique](OBSERVATIONS-2026-09-22.json). Les mentions « non inspecté »
> ci-dessous décrivent uniquement le relevé initial.

Relevé borné par lecture des fichiers cités et inspection matérielle sans lancement
de modèle. Ce n’est pas un audit exhaustif de tous les appels réseau. Les contenus
privés, secrets, historiques de conversations et poids n’ont pas été inventoriés.

## Surfaces à migrer ou préserver

| Surface | Fait observé / référence | Travail de migration restant |
| --- | --- | --- |
| Méthodes Corpus | Le [README racine](../../README.md) décrit un plugin Codex ; les [skills](../../corpus-11-tools/skills/) existent sous forme de fichiers. | Charger et sélectionner les instructions dans un hôte local ; vérifier leur comportement, pas seulement leur lisibilité. |
| Conversation et orchestration | La préparation actuelle s’exécute dans Codex. Le [produit conversationnel](../../research/active/model-response-comparison-harness/README.md) cible une surface native Codex. | Interface locale, contexte, appels d’outils, permissions, interruption et reprise ; aucune compatibilité de remplacement établie. |
| Noyau Corpus Open Model | Le [laboratoire](../../research/active/corpus-open-model/README.md) distingue noyau, routeurs expérimentaux et adaptateur linguistique. | Réutiliser les composants pertinents ; conserver les verdicts négatifs. Ses petits réseaux ne sont pas un LLM conversationnel de remplacement. |
| Pont local existant | [corpus_cortex.py](../../research/active/corpus-open-model/src/corpus_cortex.py) construit des extraits lexicaux et une requête vers `127.0.0.1:11434/api/chat`. | Auditer sélection des sources, erreurs, proxy/redirections et serveur effectif ; exécuter un cas réel autorisé. Une URL locale ne prouve pas l’absence de trafic sortant du serveur. |
| Comparaison des réponses | Le [harness](../../research/active/model-response-comparison-harness/README.md) importe manuellement et anonymise deux réponses ; ses bras documentés sont GPT et Codex. | Préparer un protocole versionné pour candidat local sans falsifier les anciens bras, ni appeler GPT pour constituer une référence. |
| Automatisations | [autonomy_schedule.py](../../scripts/autonomy_schedule.py) prépare une demande pour le heartbeat natif ; [PILOTAGE_CORPUS.md](../../PILOTAGE_CORPUS.md) décrit le pilotage. | Remplacer séparément l’horloge et l’agent de décision ; préserver verrouillage, budget, arrêt et absence de double exécution. État actuel du scheduler non vérifié. |
| Livraison et maintenance | [autonomy_integrate.py](../../scripts/autonomy_integrate.py) et [le cadre de livraison](../../AUTONOMIE_INTEGRATION_LOCALE.md) sont présents. | Examiner les interfaces réutilisables ; un script local n’assure pas que son orchestration soit indépendante de Codex. |
| Mémoire et historiques | Les fichiers du dépôt et les historiques détenus par l’hôte sont des supports différents. Aucun export d’historique effectué. | Définir sélection, provenance, confidentialité, reprise et formats d’export. Aucune copie globale de la mémoire utilisateur. |
| Recherche et preuves | [Index](../../research/README.md), [portefeuille](../../research/portfolio.json) et [transferts](../../transfers/README.md) existent. | Préserver statuts, références et jeux réservés ; rendre les commandes utiles lançables sans agent distant. |
| MUBI Scout | [README](../mubi-film-scout/README.md) et [serveur](../mubi-film-scout/server.mjs) : adaptateur LLM local optionnel et sources métier externes. | Tester un backend réel séparément de la disponibilité des catalogues ; conserver données et validation des brouillons. |
| YouTube Scout | [README](../youtube-scout/README.md) : application locale avec bibliothèque et fournisseurs de données. | Cartographier les accès externes et le mode dégradé ; ne pas confondre API de contenu et inférence GPT. |
| Jeu, archives, autres projets | [Carte des projets](../../CARTE_DES_PROJETS.md) : entrées et limites documentées, dont un dossier de développement 3D incomplet. | Préserver les capacités existantes et vérifier chaque usage retenu ; ne pas étendre ce chantier en reconstruction des jeux. |
| Documents et médias | Des outils de documents, navigation et médias sont fournis par l’hôte de cette session. | Classer chaque fonction nécessaire : outil local réutilisable, remplaçant à éprouver, ou perte assumée. Aucun équivalent multimodal n’est encore validé. |

Les dossiers privés demeurent exclus de l’indexation et des corpus de test tant
qu’un périmètre spécifique n’est pas établi. Leur existence ne vaut pas permission
de les utiliser pour l’entraînement ou les embeddings.

## Environnement observé

| Mesure | Résultat | Portée |
| --- | --- | --- |
| CPU logiques (`os.cpu_count`) | 16 | Vue de cette session, pas un benchmark. |
| RAM (`/proc/meminfo`) | 31,05 Gio totaux ; 24,50 Gio disponibles | Disponibilité instantanée. |
| Stockage (`shutil.disk_usage`) | 97,67 Gio libres sur le volume du dépôt | À réobserver avant tout téléchargement. |
| Exécutables (`shutil.which`) | Ollama, Python 3, Node et `nvidia-smi` trouvés | Présence dans le `PATH` uniquement. |
| Autres serveurs | `llama-server` et `vllm` non trouvés dans le `PATH` | Ne prouve pas leur absence dans d’autres environnements. |
| GPU | `nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader` : code 9, communication avec le pilote impossible | Modèle GPU, VRAM et accélération non vérifiés ; ne pas conclure à une panne de la machine depuis ce seul environnement. |
| Serveur et poids | Non interrogés | Aucun modèle sélectionné ou essayé. |

## Conclusion permise

Des points d’appui locaux existent. **La migration complète n’est pas démontrée** :
le moteur de langage, l’hôte agentique et les automatisations restent à qualifier
ensemble. Aucun choix de taille de modèle ou promesse de performance ne découle
de ce relevé seul.
