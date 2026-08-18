# Corpus Experiment Lab

Infrastructure d’exécution neutre pour les expériences utilisant Corpus.

Le cœur connaît seulement un état opaque, des transformations nommées, des perturbations, des observateurs, des critères, des contrôles et des classificateurs. Il exécute et journalise ; la signification scientifique, les seuils et les conditions de renversement appartiennent aux adaptateurs conservés avec chaque recherche.

## Composants génériques

- `core/` : moteur, contrôles, classification et reproductibilité ;
- `governance/` : gel de protocole, verrou d’exécution, clôture avec attestation des artefacts et garde contre l’accès anticipé aux résultats ;
- `arena/` : comparaison aveugle de méthodes rivales sur des essais causaux appariés ;
- `schemas/` : contrat déclaratif d’expérience ;
- `tests/` : tests propres au cœur.

Les adaptateurs scientifiques auparavant mélangés au moteur vivent maintenant sous [`../../../research/active/corpus-hypotheses/lab-adapters/`](../../../research/active/corpus-hypotheses/lab-adapters/). Ils importent ce laboratoire ; le laboratoire ne les importe pas.

`governance/execution-closure.mjs` vérifie le protocole et le chemin de calcul verrouillés avant exécution, exige un nouveau dossier de sortie, hache les artefacts déclarés et écrit une attestation sans écrasement. L’adaptateur choisit la fonction d’exécution, son descripteur et la liste des artefacts ; la primitive ne connaît ni domaine scientifique, ni seuil, ni conclusion.

## Contrat du cœur

Chaque adaptateur fournit :

- `createState(configuration)` ;
- des registres d’opérations, perturbations, observateurs, critères, contrôles et classificateurs ;
- une classe d’observation/adversaire explicite ;
- ses conventions, prédictions et conditions de renversement.

Les observateurs et critères reçoivent une copie de l’état et du flux aléatoire. Ils ne peuvent pas modifier silencieusement l’exécution vivante. Chaque opération et perturbation est journalisée avec ses empreintes avant/après.

## Open Experiment Arena

`arena/` exécute des méthodes rivales sur les mêmes essais gelés, exige leurs prédictions avant action, aveugle leurs identités publiques et conserve des résultats vectoriels sans vainqueur agrégé caché.

Les alias `ilyana`, `thermal` et autres sont des fixtures de développeur, jamais des utilisateurs ou des preuves extérieures.

```bash
node corpus-11-tools/labs/experiment-lab/arena/cli.mjs list
node corpus-11-tools/labs/experiment-lab/arena/cli.mjs test
```

## Statut

Le cœur, la gouvernance de protocole, la clôture attestée et l’Arena sont écrits et testés. Cela n’établit ni universalité de l’abstraction, ni validité scientifique des adaptateurs, ni transport terrain.
