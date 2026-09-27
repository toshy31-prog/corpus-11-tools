# Traitement d’entrée : diagnostic sans inférence — 27 septembre 2026

## Correctifs configurés après ce diagnostic

Le profil actif conserve `-ngl 99 --cpu-moe --load-mode none -b 256 -ub 256`.
Le 27 septembre, après demande de résolution de la panne et de la lenteur :

- `GGML_CUDA_DISABLE_FUSION=1` ajouté à l’environnement **du seul modèle principal CUDA** dans llama-swap. La pile historique pointe vers `mul_mat_vec_q_switch_ncols_dst<GGML_TYPE_Q4_K>` puis `ggml_cuda_try_fuse`. Le code b10964 lit cette variable dans l’exécution et l’optimisation du graphe. Contournement du chemin observé, pas preuve d’élimination de toute panne CUDA. La désactivation peut aussi coûter du débit ; effet net non mesuré.
- Délai de déchargement après inactivité passé de 300 à 1800 secondes pour le modèle principal. Cela conserve le modèle et son cache après utilisation ; aucun préchargement ni warmup automatique. RAM/VRAM restent occupées plus longtemps, jusqu’à expiration ou déchargement par le routeur.
- Modèle, quantification, contexte 16384, réponse maximale, attention et nombre de slots inchangés. Retrieval toujours CPU exclusif.
- Paramètres → Utilisation et ressources affiche ces réglages et leur statut non mesuré. Valeurs communes modifiables dans `runtime_limits.py` ; `corpus_local.py` régénère la configuration à chaque lancement. Ne pas modifier uniquement le YAML généré.

Observations matérielles actuelles : RTX 4070 Laptop, 8188 Mio, pilote 580.178.04 ;
31 Gio RAM, 24 Gio disponibles et 1,2 Gio de swap utilisé au relevé hors modèle.
L’occupation du swap ne prouve pas un échange disque pendant l’inférence historique.
La compilation CPU contient bien `-O3 -march=native` ; les indicateurs AVX à OFF
dans le cache CMake ne signifient donc pas un binaire dépourvu d’optimisation native.

Validation : quatre tests ciblés (`python3 -m unittest test_retrieval_cpu_config test_resources`),
syntaxe JavaScript et diff réussis. Service redémarré seulement après vérification
des sessions inactives et du warmup off. YAML régénéré avec environnement et délai
attendus, santé ready, profil exposé par `/corpus/api/resources`, sessions inactives.
Aucune inférence : stabilité réelle, débit et latence restent à confirmer.

## Épreuve bornée du 27 septembre — reçu perdu après le fournisseur

Une seule session `read/edit/bash` a été créée pour la copie de migration. Le
transcript OpenCode ne conserve qu’un message et une entrée assistant vide,
avec zéro token et zéro appel d’outil. En revanche, le journal local de
llama-server établit qu’une requête Qwen a fini après **202,08 secondes**, avec
une réponse HTTP 200 de 22 576 octets. Le driver de l’épreuve n’a donc pas
obtenu ni archivé la réponse à temps ; aucun reçu agentique n’est exploitable.
La copie, le contexte et la source sont inchangés. Ce résultat mesure une
attente fournisseur de 202 secondes et un défaut de raccord/réception, mais ne
prouve ni le contenu de la réponse, ni le débit en tokens, ni un appel d’outil.
Reçus : `.migration-smoke/bounded-e2e-latest.json` et
`bounded-e2e-verdict.json`.

Sources consultées : [noyaux CUDA officiels](https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-cuda/ggml-cuda.cu),
[schéma llama-swap : env et ttl](https://github.com/mostlygeek/llama-swap/blob/main/config-schema.json).
Les signalements [27835](https://github.com/ggml-org/llama.cpp/issues/27835) et
[26609](https://github.com/ggml-org/llama.cpp/issues/26609) ont aussi été examinés :
matériel ou chemin de panne différents, donc pas de désactivation aveugle de
Flash Attention ni d’affirmation d’un correctif amont identique.

Retour arrière : `CUDA_DISABLE_FUSION=False`, `MAIN_MODEL_IDLE_SECONDS=300`
dans `runtime_limits.py`, puis redémarrage du service inactif. Le profil
CPU/GPU antérieurement configuré reste indépendant de ce retour arrière.

## Faits

Le lancement CUDA défini dans corpus_local.py utilise -ngl 20, --n-cpu-moe 30, -b 256, -ub 64, -t 8 et -tb 8. Le contexte reste 16384. La trace scoped-cuda-crash.log confirme n_gpu_layers=20 et le refus de l’ajustement automatique de ce paramètre explicitement fixé. Cet avertissement ne prouve pas un manque de mémoire ni la cause du crash.

Dans le code installé b10964, src/llama-model.cpp:1496–1504 affecte les premières couches au CPU et les dernières au GPU selon n_gpu_layers. common/arg.cpp:2763–2771 place spécifiquement les experts des N premières couches sur CPU. Les deux options ne sont donc pas interchangeables : notre configuration laisse aussi des opérations hors experts au CPU. La localisation des poids ne suffit pas à établir le placement de chaque opération à l’exécution.

Mesure historique : 4504 tokens d’entrée en environ 421,52 secondes, puis erreur CUDA à l’étape suivante. Aucun nouveau chargement ou appel de modèle pour ce diagnostic.

## Recherche amont consultée

- Documentation officielle des lots physiques/logiques et paramètres : https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- Discussion de répartition MoE et traitement d’entrée : https://github.com/ggml-org/llama.cpp/discussions/15280
- Retours Qwen sur lots plus grands et experts CPU : https://github.com/ggml-org/llama.cpp/discussions/21112
- Erreur CUDA similaire mais autre chemin (llama-bench/MMQ), pas un correctif établi pour nous : https://github.com/ggml-org/llama.cpp/issues/24937

Les performances rapportées par d’autres utilisateurs ne sont ni une garantie ni une mesure sur notre machine. Aucun code tiers copié.

## Pistes classées et protocole proposé

1. Répartition : comparer un candidat -ngl 99 --cpu-moe à la configuration actuelle, à lots identiques. Cela privilégie les opérations hors experts sur GPU et conserve les experts en RAM. Vérifier d’abord le budget mémoire ; aucune assurance que cela rentre ni accélère notre modèle.
2. Lots : seulement après une répartition viable, comparer -b 256 -ub 256 à -b 256 -ub 64, sans changer le modèle, le contexte, le cache KV ou le sampling. Ne pas passer directement aux lots 2048 des exemples externes.
3. Stabilité : GGML_CUDA_DISABLE_FUSION=1 reste un diagnostic séparé, pas une optimisation de vitesse démontrée. Ne pas mélanger sa modification avec celle des lots lors d’une comparaison causale.

Avant tout futur essai : processus isolé sans relance, arrêt effectif sous 60 secondes chargement compris, entrée plafonnée à 128 tokens et sortie à 1 token pour mesurer le moteur, sans chaîne d’outils. Un dépassement donne un résultat incomplet, jamais un second essai automatique. Conserver modèle, précision et contexte de production ; le petit prompt est un instrument de mesure, pas une réduction des futures réponses. Un succès court ne prouve ni qualité, ni stabilité longue, ni gain sur 4504 tokens.

Statut : diagnostic documenté, configuration active inchangée, candidats non activés. Aucun essai long avant amélioration mesurée sur contrôle court et résolution du plantage.
