# Registre d'épisodes de l'écosystème v0

Le registre transforme deux instants structurels de Corpus en un épisode local
et comparable : matériaux ajoutés, retirés ou modifiés, puis relations
explicites ajoutées, retirées ou modifiées. Pour une modification il conserve
les métadonnées **avant et après** (chemin, surface, taille, extension,
hachage), jamais le texte du fichier.

```bash
python3 research/active/corpus-open-model/src/ecosystem_episode_ledger.py
```

Au premier passage, il pose une ligne de base. Ensuite, une différence hors du
projet `corpus-open-model` est ajoutée à
`artifacts/ecosystem-episodes-v0.jsonl`. Ces artefacts locaux sont ignorés par
Git. Une modification du collecteur lui-même n'est donc pas confondue avec une
évolution de Corpus.

Ce n'est pas encore un modèle neuronal. C'est le matériau expérimental minimal
pour comparer plus tard, sur des épisodes futurs gelés, une baseline explicite
(fréquences, voisinage, persistance) et un noyau local entraîné. Aucun
entraînement, écriture dans Corpus, interprétation sémantique, ni proposition
automatique n'est déclenché.
