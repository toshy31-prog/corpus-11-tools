# Corpus 11 Tools — documentation technique

Pour une présentation générale et des exemples accessibles sans connaissance préalable du projet, consulter le [README à la racine du dépôt](../README.md).

Vocabulaire utilisé ci-dessous : l’**architecture 11.x** est la représentation opérationnelle du projet ; un **skill** est un paquet d’instructions utilisable par Codex ; une **capability** est un comportement possible sous conditions ; une **famille** est un regroupement descriptif ; une **relation** relie deux éléments du **graphe**, c’est-à-dire la carte de ces éléments et de leurs dépendances ; une **évaluation** est un scénario de test. La **provenance** retrace l’origine d’un élément et un **backlink** renvoie vers cette origine. La **frontière de neutralité** sépare ce que la méthode sélectionne de ce qui peut être attribué au système étudié.

Ce plugin supplémentaire repose sur l’architecture 11.x fournie. Il ne remplace pas le bot et ne constitue pas une migration.

## État actuel

- version prévue : **v1.2.0** (`1.2.0-alpha.1`) ;
- 58 skills ;
- 49 capabilities ;
- 4 familles descriptives ;
- 88 relations ;
- 71 évaluations.

## Changement public de v1.2.0

v1.2.0 ajoute neuf candidats de conception : identification causale, discrimination de modèles rivaux, validité des construits, transportabilité, transition d’échelle, dépendance des preuves, adaptation stratégique, valeur de l’information et audit d’interférence entre capabilities.

Ils répondent à des lacunes explicites de l’architecture et de la recherche courante. Ils restent `design_candidate_unvalidated` : le paquet peut vérifier leur forme, leur routage et leur non-régression locale sans établir leur robustesse universelle. Les neuf facultés historiques restaurées en v1.1.0 restent présentes et bornées séparément.

## Catégories à distinguer

| Catégorie | Nombre | Rôle et statut |
|---|---:|---|
| Capability 11.x native | 31 | Nœud opérationnel issu de l’architecture 11.x. Sa présence n’établit ni réussite générale ni robustesse. |
| Faculté historique récupérée | 9 | Capability réintroduite avec provenance antérieure et statut `recovered_candidate_unvalidated`. Elle complète 11.x sans remplacer une capability native. |
| Candidat de conception v1.2 | 9 | Nouvelle capability motivée par une lacune ou un besoin discriminant observé, avec statut `design_candidate_unvalidated` et sans backlink 10.x fabriqué. |
| Wrapper explicit-only | 3 | Mode d’invocation avec `allow_implicit_invocation: false` : `fiction-mechanism-transformation`, `expand-then-audit` et `corpus-context-library` ne sont chargés qu’après désignation explicite complète. Ce mode n’est pas un statut de capability. |
| Famille descriptive | 4 | Regroupement de routage non exécutable ; une famille ne devient jamais une capability. |

Les 49 capabilities correspondent donc aux 31 natives, aux 9 facultés récupérées et aux 9 candidats de conception. Les 58 skills comprennent ces 49 wrappers de capability et 9 skills de routage, procédure, génération, provenance, règle, contexte ou expérimentation.

## Contenu

- 1 skill de routage 11.x.
- 49 skills centrés sur les capabilities du graphe : 31 natives, 9 récupérations locales bornées et 9 candidats de conception.
- 4 familles descriptives de routage, dont une comparaison capacité directe/inverse sans nouvelle capability.
- 1 procédure conditionnelle `explore-first`.
- 1 procédure candidate `open-experiment-arena` reliant méthodes rivales, prédictions, actions et conséquences dans un monde causal gelé.
- 1 procédure de génération fictionnelle extérieure au corpus.
- 1 skill de provenance/backlinks 10.x.
- 1 bibliothèque contextuelle explicite pour les deux ouvrages PDF.
- 3 règles/procédures compactes récupérées : convention de confiance, discipline de conclusion et expansion puis audit.
- 1 dépôt non exécutoire des archives 9.2, Atlas 3.0, 10.0, 10.1, correctif 10.3 et manuel visuel, avec empreintes et lacunes explicites.
- Evals de routage et de non-régression.
- Garde de gouvernance épistémique séparant critères de sélection, rôles des lois, frontière de neutralité et propriétés attribuées au système.
- Outils déterministes de validation de paquet, contrôle de graphe et lecture de provenance.
- 88 relations et 71 évaluations de routage/non-régression.

Les capabilities restent des possibles comportementaux sous conditions. Les fichiers `SKILL.md` sont des wrappers d’invocation : ils ne redéfinissent pas une capability comme algorithme.

Les facultés anciennes récupérées sont marquées `recovered_candidate_unvalidated`. Elles complètent l'architecture sans rétablir le routage obligatoire, la constitution monolithique, l'ordre fixe de réponse ni les interdits fictionnels absolus des anciennes versions.

La famille `FAM.REVERSAL_ASYMMETRY` relie les briques existantes lorsque l'établissement d'une capacité est comparé à l'annulation de ses effets. Elle impose deux profils séparés et interdit de conclure qu'une capacité inverse est acquise parce que la capacité directe l'est.

## Installation locale

Depuis la racine du dépôt cloné :

```bash
codex plugin marketplace add .
codex plugin add corpus-11-tools@corpus-11-local
```

Le catalogue inclus référence déjà `./corpus-11-tools`. Ouvrir ensuite une nouvelle tâche Codex pour charger le plugin installé.

Pour intégrer le plugin à un autre catalogue local, utiliser `docs/marketplace.example.json` comme modèle et adapter son chemin.

## Validation

```bash
python tools/validate_package.py
python tools/check_graph.py
python tools/show_provenance.py CAP.PROTOCOL_ROBUSTNESS
python tools/project_yield_gate.py chemin/vers/record.json
sha256sum -c archives/legacy/MANIFEST.sha256
```

## Statut

Le paquet `1.2.0-alpha.1` contient désormais 58 skills, 49 capabilities, 4 familles, 88 relations et 71 évaluations. `open-experiment-arena` reste une procédure expérimentale candidate : ses tests synthétiques n’établissent ni scénario extérieur indépendant, ni gain de capability, ni usage de terrain. Les neuf nouveaux outils restent `design_candidate_unvalidated`, et les neuf facultés récupérées restent `recovered_candidate_unvalidated`.

Les lacunes historiques restent documentées dans `docs/legacy-loss-audit.md` et `archives/legacy/STATUS.md` : Atlas 2.7, Corpus 9.8, Corpus 10.2, la release 10.4 complète et la source éditable du manuel n’ont pas été retrouvés ni reconstruits par supposition.
