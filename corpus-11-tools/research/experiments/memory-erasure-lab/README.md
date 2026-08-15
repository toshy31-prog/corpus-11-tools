# Laboratoire mémoire–effacement

Application web locale, sans dépendance externe, pour comparer récupération et désinscription d'un bit dans un réseau de mémoires.

## Choix retenus

- huit mémoires par défaut, extensibles de quatre à seize ;
- arbre binaire par défaut, avec contrôles ligne, anneau, étoile et maillage ;
- états binaires conservés lorsqu'un nœud passe hors ligne ;
- diffusion synchrone ou asynchrone à graine reproductible ;
- effacement par onde locale, accès direct ou ordre inverse ;
- pannes de nœud ou de liaison ;
- contrefactuel exact : toutes les mémoires doivent être revenues à zéro ;
- trace accessible : bit encore atteignable depuis le port de lecture ;
- trace latente : bit conservé mais actuellement inaccessible ;
- coût énergétique remplacé par un proxy explicite en nombre d'opérations.

## Lancer

Depuis ce dossier :

```bash
python3 -m http.server 8765
```

Puis ouvrir `http://127.0.0.1:8765/`.

## Tester

```bash
node --test test-simulator.mjs
```

## Export

L'interface exporte un instantané JSON conforme au schéma `memory-erasure-lab/v1` et les campagnes répétées en CSV. Ces données sont des sorties simulées, pas des mesures physiques.
