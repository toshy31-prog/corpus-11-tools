# Modèle ouvert fondé sur Corpus

## Objet

Construire et éprouver un **noyau IA open source**, gouverné par les matériaux
de l'ensemble du dépôt Corpus. Le noyau n'est pas un LLM : il manipule des
objets traçables (questions, affirmations, sources, hypothèses, capacités,
conditions de renversement et décisions). Un LLM local ou distant peut
ultérieurement servir d'adaptateur de langage, sans devenir le dépositaire de
la mémoire, des règles de portée ou de la décision.

`Corpus entier` signifie ici que chaque fichier de travail pertinent est
inventorié et adressable dans un instantané. Cela ne veut pas dire que tout
texte est une donnée d'entraînement, ni qu'une archive, une recherche ou une
fixture devient une règle active. Les statuts du dépôt restent préservés :
produit, recherche, archive, transfert et sortie générée sont distingués.

## Hypothèse de travail

Une représentation structurée, versionnée et exécutable des relations Corpus
peut conserver mieux les frontières de portée et la provenance qu'un simple
fine-tuning sur les documents. C'est une hypothèse à tester ; le prototype ne
prouve ni une supériorité générale ni une intelligence autonome.

## Architecture visée

```text
Question / documents
        │
adaptateur linguistique optionnel (LLM remplaçable)
        │
contrat structuré de requête
        │
┌──── noyau Corpus Open Model ────┐
│ registre de snapshot + hachages │
│ graphe de rôles et de relations │
│ routage explicite de capacités  │
│ ledger de preuves et de portée  │
│ conditions de renversement      │
└─────────────────────────────────┘
        │
sortie structurée, explicable et vérifiable
```

Le prototype actuel (`src/`) couvre le registre de snapshot, un graphe de
connaissances statué, un routeur déterministe de référence et
**CorpusNet-Router v0**, un vrai réseau neuronal
multi-étiquette : sac de mots → 32 neurones `tanh` → une sortie sigmoïde par
capability. Il est entraîné localement, sans dépendance ni poids externes, sur
la partition `train` des évaluations de routage et les descriptions des skills.
Le snapshot rend le reste du Corpus adressable tout en évitant d'absorber sans
distinction les archives, résultats de recherche et fixtures comme des vérités
d'entraînement.

## Premier test qui compte

À instantané identique, le noyau doit :

1. conserver la distinction entre les surfaces (`product`, `research`,
   `transfer`, `archive`, `workspace`) ;
2. sélectionner seulement des capacités déclarées à partir de signaux
   explicites ;
3. retourner les limites et la condition de révision avec chaque recommandation ;
4. modifier son empreinte si un matériau pris en compte change.

Le test ne mesure pas encore la qualité sémantique d'un LLM ni un effet dans le
monde extérieur.

## Démarrage

Depuis la racine du dépôt :

```bash
python3 research/active/corpus-open-model/src/build_snapshot.py
python3 research/active/corpus-open-model/src/build_knowledge_graph.py
python3 research/active/corpus-open-model/src/audit_dependencies.py
python3 research/active/corpus-open-model/src/evaluate.py
python3 research/active/corpus-open-model/src/benchmark_v1.py
python3 research/active/corpus-open-model/src/train_graph_neural_router.py
python3 research/active/corpus-open-model/src/validate_graph_neural_router.py
python3 research/active/corpus-open-model/src/lint_candidate_data.py
python3 research/active/corpus-open-model/src/prepare_candidate_data.py
python3 research/active/corpus-open-model/src/select_candidate_v1.py
python3 research/active/corpus-open-model/src/train_doctrine.py
python3 research/active/corpus-open-model/src/query_doctrine.py "Comment séparer une corrélation d'un effet causal ?"
python3 research/active/corpus-open-model/src/train_contrastive_doctrine.py
python3 research/active/corpus-open-model/src/select_contrastive_doctrine.py
python3 research/active/corpus-open-model/src/compute_profile.py
python3 research/active/corpus-open-model/src/train_tiny_doctrine.py
python3 research/active/corpus-open-model/src/evaluate_tiny_doctrine_test.py
python3 research/active/corpus-open-model/src/organism_environment.py
python3 research/active/corpus-open-model/src/metabolic_cycle.py freeze
python3 research/active/corpus-open-model/src/probe_metabolic_cycle.py --checkpoint research/active/corpus-open-model/artifacts/tiny-doctrine-encoder-v1.3-best.pt
python3 research/active/corpus-open-model/src/predict_neural_router.py "Quel confondeur peut expliquer cet effet ?"
python3 research/active/corpus-open-model/tests/test_kernel.py
python3 research/active/corpus-open-model/tests/test_lab_contracts.py
```

Les programmes produisent un snapshot, un graphe, des poids et un rapport sous
`artifacts/`, ignorés par Git : ce sont des dérivations locales de l'état
observé, reconstruisibles à tout moment.

Le script unique `python3 research/active/corpus-open-model/src/run_lab.py`
reconstruit snapshot, graphe et rapport, sans Codex, GPT, API ni GPU.

## Portée et condition d'arrêt

Cette recherche entraîne un petit modèle local mais ne le publie ni ne le
déploie. Elle s'arrête si le noyau ne préserve pas de gain mesurable de
traçabilité ou de contrôle de portée par rapport à un baseline documentaire
explicite. Une primitive
généralisable ne pourra rejoindre Corpus qu'au travers du registre
`transfers/` et de ses contrôles indépendants.

Voir aussi [`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md)
et [`state/current_state.md`](state/current_state.md).
La [fiche de données](DATA_CARD.md), le [protocole d'évaluation](EVALUATION_PROTOCOL.md)
et la [déclaration de dérivation](DERIVATION_AND_DEPENDENCIES.md) font partie
du contrat du laboratoire.

Le [premier test gelé](reports/2026-08-26-initial-held-out-evaluation.md) n'a
pas retenu le réseau v0 : la baseline lexicale est actuellement meilleure.
Le [benchmark v1](benchmarks/v1/README.md) étend ce constat à des paraphrases,
langues et négatifs distincts, sans être une validation externe.
Ses [résultats observés](reports/2026-08-26-benchmark-v1.md) ne servent pas à
régler les paramètres des modèles existants.

`compile_historical_change_pairs_v2.py` ouvre une expérience différente : des
révisions textuelles réelles de Git (fichier parent → fichier du commit), et
non les seuls chemins ou sujets de commits. `train_historical_change_coherence_v2.py`
compare un encodeur neuronal de ces révisions à une baseline Jaccard, avec une
partition chronologique par commit. Le test reste fermé tant que le réseau ne
bat pas la baseline sur validation. Cette expérience n'attribue aucune
intention aux commits et ne vaut pas comme prédiction de l'évolution future.

`train_ecosystem_world_model_v0.py` est le premier essai de noyau récurrent :
il condense la succession de révisions réelles dans un état neuronal et prédit
le prochain événement historique. Sa sélection reste soumise à une baseline
de prévalence sur validation chronologique ; le test final n'est jamais ouvert
par le script d'entraînement. Un état récurrent n'est pas une preuve
d'émergence : c'est seulement la première condition matérielle testable d'une
continuité neuronale locale.

`GraphCorpusNet v1` est la prochaine architecture expérimentale : il encode la
requête par embeddings neuronaux et propage les relations `requires`/`uses` du
graphe entre capabilities. Il ne lit pas encore l'intégralité du texte des
documents, et il n'est pas sélectionné pour l'usage. Sa
[validation](reports/2026-08-26-graph-v1-validation.md) l'a écarté avant tout
benchmark v2.

Le [jeu candidat v1](data/v1/README.md) prépare des exemples d'usage et des
négatifs isolés des tests. Il n'est pas chargé par les scripts d'entraînement
actuels tant qu'un protocole de partition et de sélection v2 n'est pas accepté.
Son [protocole de partition](PROTOCOL_CANDIDATE_V1.md) conserve les familles
entières dans une seule partition. La [sélection](reports/2026-08-26-candidate-v1-selection.md)
n'a pas retenu le candidat enrichi et a préservé son test final.

Le noyau qui s'entraîne réellement sur les textes de l'écosystème est
`DoctrineCorpusNet v1` : voir son [contrat](DOCTRINE_TRAINING.md). Il est
auto-supervisé et statutaire, non génératif et non sélectionné pour l'usage.
Son [premier entraînement](reports/2026-08-26-doctrine-corpusnet-v1.md) est
réel mais sa récupération est actuellement écartée par diagnostic géométrique.

La variante [contrastive](reports/2026-08-26-contrastive-doctrine-v1-selection.md)
apprend explicitement passage → capability, mais son premier paramétrage est
également écarté avant le benchmark gelé.

Le profil matériel et l'encodeur Transformer compact pour 8 Go de VRAM sont
décrits dans [COMPUTE_PROFILE.md](COMPUTE_PROFILE.md). Il nécessite PyTorch CUDA
sur la machine locale ; le runtime actuel ne présente pas cette capacité.

Le test MLM de `TinyDoctrineEncoder v1.3` est une ouverture unique documentée
dans [PROTOCOL_TINY_V1_3_TEST.md](PROTOCOL_TINY_V1_3_TEST.md).
Son [résultat final](reports/2026-08-26-tiny-doctrine-v1.3-test.md) établit une
généralisation de MLM limitée, non une capacité de raisonnement Corpus.

L'[espace d'émergence observable](EMERGENCE_CONTRACT.md) commence avec un
observatoire statutaire et append-only : il ne définit pas ce que l'IA doit
devenir et n'attribue aucune émergence à ses traces.
Le [cycle métabolique v0](METABOLIC_CYCLE_V0.md) lie explicitement un état du
milieu et un checkpoint, sans entraînement automatique.

La [membrane d’alimentation écologique v0](ECOLOGICAL_FEED_V0.md) est la suite
expérimentale : elle préserve les frontières de documents et présente au modèle
les statuts et relations déclarés comme contexte séparé. `v1.3` reste le point
zéro MLM textuel gelé ; `v1.4` a une nouvelle partition et exclut entièrement
le test v1.3 déjà observé.

L’[ablation relationnelle v1.5](RELATION_ABLATION_V1_5.md) est préparée sans
entraînement ni test observé. Elle compare un signal de relation déclaré à une
neutralisation complète de ce signal, sur une partition qui exclut les tests
v1.3 et v1.4 déjà observés.

Les [triplets déclarés v1.6](DECLARED_TRIPLES_V1_6.md) remplacent ce compteur
par des objets `source — relation — cible`, accompagnés de corruptions
contrôlées. Leur compilation est inspectable avant tout entraînement.
