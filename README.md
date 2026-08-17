# Corpus 11 Tools

Corpus 11 Tools est un ensemble d’outils pour aider Codex à analyser une question avec davantage de rigueur. Il peut notamment vérifier les sources d’une affirmation, repérer les coûts cachés, distinguer une capacité réelle d’un simple résultat de test et identifier ce qui pourrait invalider une conclusion.

## État actuel

- version prévue : **v1.2.0** (`1.2.0-alpha.1`) ;
- 57 skills ;
- 49 capabilities ;
- 4 familles descriptives ;
- 88 relations ;
- 69 évaluations.

## Ce qui change dans v1.2.0

v1.2.0 ajoute neuf candidats opérationnels pour l’identification causale, la discrimination entre modèles rivaux, la validité des construits, le transport entre contextes, les transitions d’échelle, la dépendance entre preuves, l’adaptation stratégique aux métriques, la valeur de l’information et l’interférence entre capabilities.

Ils complètent les neuf facultés historiques restaurées en v1.1.0. Les nouveaux outils sont des `design_candidate_unvalidated` : leur écriture et leurs tests locaux ne les rendent ni universels ni scientifiquement établis.

## Qu’est-ce que Corpus 11 Tools ?

Corpus 11 Tools est un plugin pour Codex. Il ajoute des méthodes d’analyse, d’audit et de vérification que Codex peut mobiliser selon la question posée.

Ce projet n’est ni une intelligence artificielle séparée, ni une théorie scientifique. Il organise des outils de raisonnement et conserve une séparation explicite entre leur fonctionnement, les expériences de recherche et les documents utilisés pour en retracer l’origine.

## À quoi ça sert ?

Le projet aide notamment à :

- vérifier si plusieurs affirmations reposent réellement sur des sources indépendantes ;
- déterminer si une relation causale est identifiée ou seulement compatible avec les observations ;
- comparer une hypothèse à des modèles rivaux et à un baseline standard ;
- vérifier qu’un score mesure bien le phénomène qu’on lui attribue ;
- distinguer un résultat observé de l’interprétation qu’on lui donne ;
- repérer les coûts ou dépendances cachés derrière une performance ;
- tester si une conclusion résiste à un changement de protocole ou de contexte ;
- tester si un résultat se transporte vers une autre population ou une autre échelle ;
- choisir le plus petit ensemble d’expériences capable de changer une décision ;
- formuler ce qui obligerait à réviser ou abandonner une conclusion ;
- conserver la question de l’utilisateur sans la remplacer par le vocabulaire de la méthode.

## À qui est-ce destiné ?

Corpus 11 Tools peut servir aux personnes qui utilisent Codex pour examiner une affirmation, une expérience, un ensemble de sources, une transformation ou une situation complexe. Il s’adresse aussi aux personnes qui développent ou auditent le projet, mais il n’est pas nécessaire de connaître son architecture interne pour comprendre les usages de base.

## Trois exemples concrets

### Une expérience fonctionne une fois. Peut-on dire que la méthode est robuste ?

Corpus distingue une réussite locale d’une robustesse démontrée dans plusieurs conditions. Cette distinction aide à poser les vérifications nécessaires sans promettre qu’une réponse correcte est garantie dans tous les cas.

### Deux sources répètent la même affirmation. Est-ce deux preuves indépendantes ?

Corpus examine leur **provenance**, c’est-à-dire leur origine et leur chaîne de transmission, afin de déterminer si une source reprend simplement l’autre.

### Un modèle compresse très bien les données. A-t-il découvert leur vraie structure ?

Corpus distingue la qualité descriptive de la compression de l’attribution d’une structure réelle au phénomène étudié. Un bon résultat ne suffit pas, à lui seul, à établir cette attribution.

## Comment ça fonctionne ?

Codex ne charge pas toute la méthode pour chaque question. Le système essaie d’identifier les capacités pertinentes et leurs dépendances importantes. Cette représentation opérationnelle s’appelle l’**architecture 11.x**.

Le projet emploie ensuite quelques termes techniques :

- un **skill** est un paquet d’instructions et d’outils utilisable par Codex ;
- une **capability** est un type de comportement possible sous certaines conditions ;
- une **famille** est une catégorie descriptive qui regroupe certaines capabilities sans devenir elle-même une capacité exécutable ;
- une **relation** est un lien de dépendance ou de spécialisation entre des éléments ;
- le **graphe** est la représentation de l’ensemble de ces éléments et de leurs relations ;
- une **évaluation** est un scénario de test destiné à vérifier le comportement attendu ;
- un **backlink** est un renvoi vers un document antérieur utilisé pour contrôler la provenance d’un élément.

La version actuelle contient :

- 57 skills ;
- 49 capabilities ;
- 4 familles descriptives ;
- 88 relations ;
- 69 évaluations.

La présence d’une capability dans le projet ne signifie pas que cette capacité est scientifiquement établie. Elle décrit seulement un comportement que le système peut tenter de produire sous certaines conditions.

## Installation étape par étape

### Méthode recommandée : utiliser le catalogue local fourni

1. Cloner le dépôt :

   ```bash
   git clone https://github.com/toshy31-prog/corpus-11-tools.git
   cd corpus-11-tools
   ```

2. Conserver ensemble les deux éléments déjà configurés :

   - `.agents/plugins/marketplace.json`, le catalogue local qui indique où trouver le plugin ;
   - `corpus-11-tools/.codex-plugin/plugin.json`, le manifeste qui décrit le plugin.

3. Depuis la racine du dépôt, enregistrer le catalogue local puis installer le plugin :

   ```bash
   codex plugin marketplace add .
   codex plugin add corpus-11-tools@corpus-11-local
   ```

   Le catalogue référence déjà le chemin relatif `./corpus-11-tools` : aucune modification n’est nécessaire lorsque la structure clonée est conservée.

4. Ouvrir une nouvelle tâche Codex après l’installation ou une actualisation afin de charger la version installée du plugin.

Les mêmes opérations restent accessibles dans l’interface de Codex pour les personnes qui préfèrent ne pas utiliser la CLI.

### Alternative : intégrer le plugin à un autre catalogue local

Le fichier [`corpus-11-tools/docs/marketplace.example.json`](corpus-11-tools/docs/marketplace.example.json) sert de modèle. Dans ce cas seulement, adapter le chemin `source.path` à l’emplacement réel du dossier `corpus-11-tools` dans cet autre catalogue.

## Première vérification après installation

Depuis le dossier du plugin, exécuter les validateurs fournis :

```bash
cd corpus-11-tools
python3 tools/validate_package.py
python3 tools/check_graph.py
```

L’état attendu pour l’alpha v1.2.0 indique 57 skills, 49 capabilities, 4 familles descriptives, 88 relations et 69 évaluations.

Pour vérifier un exemple de chaîne de provenance :

```bash
python3 tools/show_provenance.py CAP.PROTOCOL_ROBUSTNESS
```

Ces commandes vérifient la cohérence du paquet et de ses références ; elles ne démontrent pas la vérité générale de ses contenus.

## Structure du projet

```text
.
├── .agents/plugins/                 Catalogue local pour Codex
├── README.md                        Présentation générale
└── corpus-11-tools/
    ├── .codex-plugin/               Manifeste du plugin
    ├── skills/                      Outils opérationnels
    ├── tools/                       Validateurs et utilitaires
    ├── evals/                       Scénarios de vérification
    ├── archives/legacy/             Archives historiques non exécutoires
    ├── research/                    Recherche expérimentale
    ├── docs/                        Inventaires et métadonnées
    └── README.md                    Documentation technique
```

## Où trouver les outils ?

Les instructions utilisables par Codex se trouvent dans [`corpus-11-tools/skills/`](corpus-11-tools/skills/). Les validateurs et utilitaires se trouvent dans [`corpus-11-tools/tools/`](corpus-11-tools/tools/).

Ces deux dossiers constituent la partie opérationnelle, parfois appelée le **cortex** du projet : ce terme désigne ici l’organisation des outils, pas une intelligence séparée.

## Où trouver la recherche ?

La recherche expérimentale se trouve dans [`corpus-11-tools/research/`](corpus-11-tools/research/). Elle contient notamment les expériences, hypothèses, rapports et états de travail.

Les matériaux historiques 10.x et les références servant à retracer l’origine des éléments sont des archives de provenance. Une expérience de recherche n’est pas automatiquement une règle du cortex : son résultat doit conserver son statut propre et passer les étapes de validation prévues avant toute intégration opérationnelle.

## Limites et statut scientifique

- Corpus 11 Tools n’est pas une preuve de vérité.
- Une capability déclarée n’est pas automatiquement établie.
- Un test réussi ne démontre pas une robustesse universelle.
- Les neuf facultés historiques récupérées restent `recovered_candidate_unvalidated` : leur réobservation locale ne constitue pas une preuve de robustesse universelle.
- Les neuf outils d’inférence et de non-interférence ajoutés en v1.2.0 restent `design_candidate_unvalidated` tant qu’ils n’ont pas été réobservés sur des tâches indépendantes.
- Une expérience de recherche peut rester au statut `unknown`, c’est-à-dire sans conclusion suffisamment établie.
- Les sorties produites doivent être examinées avec leurs sources, leur protocole et leurs conditions d’observation.

Le projet maintient également une **frontière de neutralité** : une séparation entre ce que le dispositif sélectionne ou décrit et ce qui peut être attribué au système étudié. Cette garde évite de transformer automatiquement un critère de méthode en propriété scientifique.

## Documentation technique avancée

La documentation détaillée du plugin, de son contenu et de ses validations se trouve dans [`corpus-11-tools/README.md`](corpus-11-tools/README.md).

Les personnes qui souhaitent inspecter la structure peuvent aussi consulter :

- [`corpus-11-tools/docs/inventory.json`](corpus-11-tools/docs/inventory.json), pour l’inventaire du paquet ;
- [`corpus-11-tools/skills/corpus-11-routing/references/capability-index.md`](corpus-11-tools/skills/corpus-11-routing/references/capability-index.md), pour l’index des capacités ;
- [`corpus-11-tools/skills/corpus-11-routing/references/epistemic-governance.md`](corpus-11-tools/skills/corpus-11-routing/references/epistemic-governance.md), pour les règles de prudence épistémique.
