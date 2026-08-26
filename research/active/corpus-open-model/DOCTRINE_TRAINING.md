# Entraînement sur l'écosystème doctrinal Corpus

## Ce que « s'entraîner sur Corpus » signifie ici

`DoctrineCorpusNet v1` lit les textes admissibles de l'écosystème Corpus et
apprend, sans labels de réponse, quelles unités lexicales apparaissent dans des
contextes proches. C'est un entraînement auto-supervisé de type *skip-gram avec
negative sampling*, exécuté localement.

Il n'est pas un LLM : il ne prédit pas le prochain texte et ne sait pas suivre
une instruction complète. Il produit des embeddings de mots et de passages,
utilisés pour rapprocher une requête d'une description de capability.

## Carriers et frontières

Le compilateur lit les fichiers textuels de `corpus-11-tools/`, `research/`,
`transfers/` et de la racine, à l'exception du projet lui-même, des artefacts,
des sorties générées, dépendances et métadonnées Git. Chaque document conserve
une surface et un statut : produit déclaré, recherche bornée, transfert ou
mémoire historique. Ces statuts sont indexés et ne deviennent jamais des labels
de vérité.

La recherche `corpus-open-model/` est exclue de son propre entraînement : ni
ses benchmarks, ni ses exemples synthétiques, ni ses rapports ne peuvent se
réinjecter comme doctrine.

## Portée réelle

Un embedding appris sur une cooccurrence ne démontre pas qu'une relation est
vraie, qu'une capability est valide, ni qu'un passage de recherche est une règle
active. Il ne remplace pas le graphe, les procédures de Corpus ou la provenance.

L'entraînement est limité par un budget de paires par document pour que chaque
carrier contribue sans donner tout le poids aux fichiers les plus longs. Le
manifest produit indique exactement le nombre de documents, tokens et paires.

## Dépendances

Python standard uniquement. Aucun poids externe, API, GPU, Codex ou GPT n'est
requis à l'exécution. L'absence de dépendance externe ne constitue pas une
preuve d'autonomie, de qualité ou de droit de redistribution.
