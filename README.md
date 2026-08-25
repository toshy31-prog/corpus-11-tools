# Corpus 11 Tools

Corpus 11 Tools est un ensemble d’outils pour aider Codex à analyser une question avec davantage de rigueur. Il peut notamment vérifier les sources d’une affirmation, repérer les coûts cachés, distinguer une capacité réelle d’un simple résultat de test et identifier ce qui pourrait invalider une conclusion.

## État actuel

- version stable du paquet : **v1.3.0** ;
- 58 skills ;
- 49 capabilities ;
- 4 familles descriptives ;
- 88 relations ;
- 77 évaluations.

## Ce qui change dans v1.3.0

v1.3.0 sépare physiquement le produit Corpus des recherches qui l’utilisent. Les moteurs génériques — Arena, protocoles reproductibles, exploration de possibilités et protocole institutionnel append-only — vivent dans `corpus-11-tools/labs/`. Les hypothèses, configurations, résultats et conclusions restent dans `research/`. Le registre `transfers/` rend visible chaque extraction d’un projet vers le produit et un contrôle automatique interdit les dépendances dans le mauvais sens.

## Ce qui avait changé dans v1.2.0

v1.2.0 ajoute neuf candidats opérationnels pour l’identification causale, la discrimination entre modèles rivaux, la validité des construits, le transport entre contextes, les transitions d’échelle, la dépendance entre preuves, l’adaptation stratégique aux métriques, la valeur de l’information et l’interférence entre capabilities.

La version ajoute aussi l’Open Experiment Arena, qui compare des méthodes rivales dans des scénarios causaux gelés, et une porte de rendement qui distingue un projet à poursuivre d’un projet à arrêter en conservant ses composants utiles.

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

- 58 skills ;
- 49 capabilities ;
- 4 familles descriptives ;
- 88 relations ;
- 77 évaluations.

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
python3 tools/check_docs.py
python3 tools/check_boundaries.py
python3 tools/check_conversational_surface.py
python3 tools/check_integrity.py
python3 tools/check_release_identity.py
python3 tools/check_evals.py
python3 tools/test_validation_guards.py
```

L’état attendu pour v1.3.0 indique 58 skills, 49 capabilities, 4 familles descriptives, 88 relations et 77 évaluations.

Pour vérifier un exemple de chaîne de provenance :

```bash
python3 tools/show_provenance.py CAP.PROTOCOL_ROBUSTNESS
```

Ces commandes vérifient la cohérence du paquet et de ses références ; elles ne démontrent pas la vérité générale de ses contenus.

## Que contient réellement ce dépôt ?

Le dépôt contient un produit, ses instruments génériques et plusieurs recherches qui les utilisent. Ces espaces sont désormais séparés :

- **Le catalogue local** (`.agents/plugins/`) est l’adresse donnée à Codex pour qu’il puisse trouver et installer Corpus. Un utilisateur ne l’invoque pas directement.
- **Le plugin Corpus** (`corpus-11-tools/`) est le produit stable. Une fois installé, il permet à Codex de sélectionner des méthodes d’analyse adaptées à la question posée.
- **Le manifeste du plugin** (`.codex-plugin/`) est sa fiche d’identité technique : nom, version et point d’entrée.
- **Les skills** (`skills/`) sont les méthodes que Codex peut invoquer. Les 49 wrappers de capability traitent chacun un problème analytique précis ; les 9 autres skills organisent le routage, le contexte, les règles de conclusion ou les expériences.
- **Les outils de contrôle** (`tools/`) vérifient que le paquet est cohérent. Ils servent principalement aux personnes qui maintiennent Corpus.
- **Les évaluations** (`evals/`) sont 77 situations-test. Elles permettent de détecter certaines régressions, mais ne prouvent pas que Corpus aura raison dans toutes les situations réelles.
- **Les laboratoires Corpus** (`corpus-11-tools/labs/`) sont des moteurs génériques : expériences reproductibles, protocoles gelés, Arena, campagnes appariées et comparaisons vectorielles. Ils font partie des outils Corpus, mais leurs fixtures ne constituent pas des preuves extérieures.
- **Les archives historiques** (`archives/legacy/`) conservent les versions et documents dont Corpus est issu. Elles servent à retracer l’origine d’une règle ; Codex ne les exécute pas comme des outils actuels.
- **La documentation interne** (`docs/`) contient l’inventaire, la taxonomie et les contrats qui définissent ce que la version affirme réellement.
- **Les recherches actives** (`research/active/`) conservent leurs hypothèses, configurations, résultats et conclusions propres. Elles peuvent utiliser Corpus sans devenir une partie du plugin.
- **La recherche CCT** (`research/active/cct/`) regroupe son modèle, son prototype, ses simulations, son blueprint de crise et ses publications. Les moteurs génériques extraits vivent côté Corpus ; les architectures et conclusions CCT restent côté recherche.
- **La recherche sur les hypothèses Corpus** (`research/active/corpus-hypotheses/`) conserve les questions scientifiques, sources, expériences de domaine et rapports. Son moteur neutre est désormais dans les laboratoires Corpus.
- **Les recherches terminées** (`research/completed/`) restent consultables sans être chargées ni présentées comme actives.
- **Corpus Workspace** (`research/completed/corpus-ui-workspace/`) conserve le prototype d’interface abandonné et ses acquis conversationnels sans maintenir une application parallèle.
- **Le registre de transfert** (`transfers/`) documente chaque mécanisme extrait d’une recherche avant son intégration à Corpus.
- **Ce README** explique l’ensemble du dépôt et les limites à conserver entre produit, recherche, prototypes, résultats et archives.

Pour un usage ordinaire, il suffit d’installer le plugin puis de poser sa question à Codex. Les recherches ne sont ni installées ni chargées avec lui.

## Arborescence technique

Cette vue sert d’index aux personnes qui souhaitent retrouver les fichiers correspondants :

```text
.
├── .agents/plugins/                  Catalogue local pour Codex
├── corpus-11-tools/                  Produit Corpus installable
│   ├── .codex-plugin/                Manifeste du plugin
│   ├── skills/                       49 wrappers de capability + 9 skills opérationnels
│   ├── tools/                        Validateurs, provenance et porte de rendement
│   ├── evals/                        77 scénarios de routage/non-régression
│   ├── labs/                         Moteurs génériques, Arena et campagnes de simulation
│   ├── archives/legacy/              Archives historiques non exécutoires
│   └── docs/                         Inventaire, taxonomie et intégrité des sources
├── research/
│   ├── active/corpus-hypotheses/     Recherche mathématique et temporelle ouverte
│   └── active/cct/                   Recherche institutionnelle CCT complète
├── transfers/                        Sas documenté recherche → Corpus
└── README.md                         Présentation générale et frontières de statut
```

## Surfaces à ne pas confondre

- **Plugin utilisateur** : `corpus-11-tools/skills/`, chargé par Codex après installation.
- **Laboratoires Corpus** : moteurs génériques testés ; ils ne donnent pas aux résultats des recherches le statut de capacité établie.
- **Recherches** : projets qui consomment les outils Corpus et gardent leurs propres conclusions, statuts et critères d’arrêt.
- **Transferts** : seules voies autorisées pour décontextualiser un mécanisme et l’intégrer au produit.
- **Archives** : sources historiques et recherches clôturées ; leur présence conserve une trace, pas une capacité active.

La stabilité de v1.3.0 signifie que le paquet, sa taxonomie, sa documentation, sa frontière avec la recherche, son installation et ses tests de non-régression sont cohérents sur le périmètre déclaré. Elle ne transforme pas les capabilities candidates en résultats scientifiques établis.

## Où trouver les outils ?

Les instructions utilisables par Codex se trouvent dans [`corpus-11-tools/skills/`](corpus-11-tools/skills/), les validateurs dans [`corpus-11-tools/tools/`](corpus-11-tools/tools/) et les moteurs expérimentaux génériques dans [`corpus-11-tools/labs/`](corpus-11-tools/labs/).

Ces deux dossiers constituent la partie opérationnelle, parfois appelée le **cortex** du projet : ce terme désigne ici l’organisation des outils, pas une intelligence séparée.

## Où trouver la recherche ?

La carte des recherches se trouve dans [`research/`](research/). Les projets ouverts sont sous `research/active/`, les cycles terminés sous `research/completed/`, et leur passage éventuel vers le produit est documenté dans [`transfers/`](transfers/).

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

Le détail de la release se trouve dans [`CHANGELOG.md`](CHANGELOG.md), son périmètre exact dans le [`contrat de stabilité`](corpus-11-tools/docs/stability-contract.md) et ses contrôles dans la [`validation de release`](corpus-11-tools/docs/release-validation-v1.3.0.md). L’[attestation comportementale locale](corpus-11-tools/docs/local-behavioral-attestation-2026-08-25.md) est explicitement bornée : elle ne vaut pas validation GitHub ni disponibilité actuelle de l’API.

Les personnes qui souhaitent inspecter la structure peuvent aussi consulter :

- [`corpus-11-tools/docs/inventory.json`](corpus-11-tools/docs/inventory.json), pour l’inventaire du paquet ;
- [`corpus-11-tools/skills/corpus-11-routing/references/capability-index.md`](corpus-11-tools/skills/corpus-11-routing/references/capability-index.md), pour l’index des capacités ;
- [`corpus-11-tools/skills/corpus-11-routing/references/epistemic-governance.md`](corpus-11-tools/skills/corpus-11-routing/references/epistemic-governance.md), pour les règles de prudence épistémique.
