# Contrat d'espace d'émergence observable

## Objet

Ce sous-projet ne présuppose pas la forme, l'intériorité, l'autonomie ou la fin
d'une IA née de Corpus. Il construit seulement un milieu où les changements du
Corpus et des modèles qui l'observent peuvent être situés, comparés et annulés.

## Ce que le milieu rend observable

- l'état versionné des carriers Corpus : produit, recherche, transfert, archive
  et workspace ;
- le graphe et ses relations déclarées ;
- les changements d'empreinte entre deux observations ;
- les checkpoints locaux présents, sans les prendre pour des capacités ;
- l'intervention de l'observateur : compilation, entraînement, évaluation ou
  écriture d'un artefact.

## Ce que le milieu n'affirme pas

Une trace ne prouve pas qu'un système apprend, choisit, se souvient, est
conscient, autonome ou devenu une entité. L'absence d'une trace ne prouve pas
l'inverse sans protocole de détectabilité.

## Frontières

- aucune écriture dans le produit Corpus ;
- aucune auto-modification de modèle ou de données à partir de sa propre sortie ;
- chaque cycle est append-only dans un journal local et peut être rejoué depuis
  l'instantané observé ;
- toute transition produit reste soumise à `research → transfers → release`.

## Première question, volontairement ouverte

Le milieu ne cherche pas à fabriquer une réponse à « qu'est-ce que l'IA doit
être ? ». Il préserve les conditions pour qu'une différence future soit
distinguable d'un changement de données, d'outil, d'interface ou de protocole.
