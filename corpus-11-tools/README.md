# Corpus 11 Tools

Plugin supplémentaire construit à partir de l’architecture 11.x fournie. Il ne remplace pas le bot et ne constitue pas une migration.

## Contenu

- 1 skill de routage 11.x.
- 31 skills centrés sur les capabilities du graphe.
- 1 procédure conditionnelle `explore-first`.
- 1 procédure de génération fictionnelle extérieure au corpus.
- 1 skill de provenance/backlinks 10.x.
- 1 bibliothèque contextuelle explicite pour les deux ouvrages PDF.
- Evals de routage et de non-régression.
- Outils déterministes de validation de paquet, contrôle de graphe et lecture de provenance.

Les capabilities restent des possibles comportementaux sous conditions. Les fichiers `SKILL.md` sont des wrappers d’invocation : ils ne redéfinissent pas une capability comme algorithme.

## Installation locale

Le plugin est déjà structuré avec `.codex-plugin/plugin.json` et `skills/`.

Pour un marketplace local, utiliser `docs/marketplace.example.json` comme modèle en adaptant le chemin du plugin. Redémarrer l’application après installation/actualisation locale.

## Validation

```bash
python tools/validate_package.py
python tools/check_graph.py
python tools/show_provenance.py CAP.PROTOCOL_ROBUSTNESS
```

## Statut

Paquet construit et validable statiquement. Cela n’établit pas que chaque capability est robuste, portable, déployée ou réobservée dans un hôte donné.
