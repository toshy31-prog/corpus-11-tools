# Corpus 11 Tools — documentation technique

Pour une présentation générale et des exemples accessibles sans connaissance préalable du projet, consulter le [README à la racine du dépôt](../README.md).

Vocabulaire utilisé ci-dessous : l’**architecture 11.x** est la représentation opérationnelle du projet ; un **skill** est un paquet d’instructions utilisable par Codex ; une **capability** est un comportement possible sous conditions ; une **famille** est un regroupement descriptif ; une **relation** relie deux éléments du **graphe**, c’est-à-dire la carte de ces éléments et de leurs dépendances ; une **évaluation** est un scénario de test. La **provenance** retrace l’origine d’un élément et un **backlink** renvoie vers cette origine. La **frontière de neutralité** sépare ce que la méthode sélectionne de ce qui peut être attribué au système étudié.

Ce plugin supplémentaire repose sur l’architecture 11.x fournie. Il ne remplace pas le bot et ne constitue pas une migration.

## Contenu

- 1 skill de routage 11.x.
- 40 skills centrés sur les capabilities du graphe, dont 9 récupérations locales bornées.
- 4 familles descriptives de routage, dont une comparaison capacité directe/inverse sans nouvelle capability.
- 1 procédure conditionnelle `explore-first`.
- 1 procédure de génération fictionnelle extérieure au corpus.
- 1 skill de provenance/backlinks 10.x.
- 1 bibliothèque contextuelle explicite pour les deux ouvrages PDF.
- 3 règles/procédures compactes récupérées : convention de confiance, discipline de conclusion et expansion puis audit.
- 1 dépôt non exécutoire des archives 9.2, Atlas 3.0, 10.0, 10.1, correctif 10.3 et manuel visuel, avec empreintes et lacunes explicites.
- Evals de routage et de non-régression.
- Garde de gouvernance épistémique séparant critères de sélection, rôles des lois, frontière de neutralité et propriétés attribuées au système.
- Outils déterministes de validation de paquet, contrôle de graphe et lecture de provenance.

Les capabilities restent des possibles comportementaux sous conditions. Les fichiers `SKILL.md` sont des wrappers d’invocation : ils ne redéfinissent pas une capability comme algorithme.

Les facultés anciennes récupérées sont marquées `recovered_candidate_unvalidated`. Elles complètent l'architecture sans rétablir le routage obligatoire, la constitution monolithique, l'ordre fixe de réponse ni les interdits fictionnels absolus des anciennes versions.

La famille `FAM.REVERSAL_ASYMMETRY` relie les briques existantes lorsque l'établissement d'une capacité est comparé à l'annulation de ses effets. Elle impose deux profils séparés et interdit de conclure qu'une capacité inverse est acquise parce que la capacité directe l'est.

## Installation locale

Le plugin est déjà structuré avec `.codex-plugin/plugin.json` et `skills/`.

Pour un marketplace local, utiliser `docs/marketplace.example.json` comme modèle en adaptant le chemin du plugin. Redémarrer l’application après installation/actualisation locale.

## Validation

```bash
python tools/validate_package.py
python tools/check_graph.py
python tools/show_provenance.py CAP.PROTOCOL_ROBUSTNESS
sha256sum -c archives/legacy/MANIFEST.sha256
```

## Statut

Paquet construit et validable statiquement. Cela n’établit pas que chaque capability est robuste, portable, déployée ou réobservée dans un hôte donné.
