# Livraison locale des initiatives Corpus

Mandat confirmé le 19 septembre 2026 : une amélioration locale réversible ne
s'arrête plus aux tests du worktree. La tâche autonome peut l'intégrer dans
`/home/olivier/Documents/ChatGPT/Corpus`, avec sélection explicite, comparaison,
tests et récupération. Cette autorisation remplace l'ancienne interdiction
générale d'écrire dans ce dépôt depuis la tâche dédiée.

## Avant de modifier

Vérifier le statut actuel du projet et les instructions applicables dans le
dépôt principal. Les projets archivés ou abandonnés sont exclus. Comparer les
fichiers nécessaires au worktree ; si une différence est un travail non livré,
la conserver et la traiter séparément. Ne jamais synchroniser tout le dépôt ou
copier une ancienne version sur une version plus récente. La carte des projets
et les décisions utilisateur priment sur la présence des dossiers dans l'ancien
worktree.

Fixer une liste fermée de fichiers, l'effet utile attendu et des commandes de
contrôle local appropriées. Synchroniser les seuls fichiers nécessaires après
comparaison. Le point de départ doit être identique dans les deux copies.
Déclarer aussi les dépendances pertinentes à surveiller avec `--watch` ; elles
devront rester identiques jusqu'à la fin. Ne pas lire ou exporter de données
privées. Un fichier supprimé du dépôt principal ne doit jamais être recréé par
simple synchronisation.

Préparer le lot **avant** l'édition, depuis le worktree :

```bash
python3 /home/olivier/Documents/ChatGPT/Corpus/scripts/autonomy_integrate.py prepare \
  --source "$PWD" --target /home/olivier/Documents/ChatGPT/Corpus \
  --file chemin/du/fichier --watch chemin/dependance \
  --goal 'Effet utile et critère observable' \
  --check '["python3", "chemin/du/controle.py"]'
```

Chaque `--check` contient les arguments JSON d'une commande, sans shell implicite.
Utiliser des contrôles locaux revus, sans communication externe ni modification
de données d'usage. Ils s'exécutent dans le worktree puis dans le dépôt principal,
avec un délai maximal de trois minutes chacun. Adapter le découpage si un contrôle
justifié nécessite plus de temps ; ne pas remplacer un vrai test par `true`.

## Modifier, vérifier et livrer

Modifier uniquement la liste préparée. Avant livraison, relire le diff, confirmer
le statut actif du projet et vérifier qu'aucune action sensible n'est incluse.
Utiliser la copie de référence de l'outil dans le dépôt principal :

```bash
python3 /home/olivier/Documents/ChatGPT/Corpus/scripts/autonomy_integrate.py apply /chemin/du/lot.batch.json
```

L'outil vérifie les empreintes initiales, exécute les contrôles du candidat,
recontrôle les empreintes, sauvegarde les versions antérieures, applique la liste
fermée, exécute les contrôles dans le dépôt principal puis vérifie les fichiers
et dépendances surveillées. Il ne touche pas l'index Git et ne crée pas de commit.
Le statut `integrated` constitue le reçu de livraison locale.

Les reçus et journaux sont conservés dans le dépôt principal sous
`.dev-local/autonomy/delivery/`. Reporter leur chemin dans l'état compact de
l'automatisation. Distinguer `complete_local` (worktree), `integrated` (dépôt
principal vérifié) et les étapes éventuelles de publication/installation.
Ne pas compter une seconde fois comme nouveau gain la même correction au seul
motif qu'elle a changé de copie. Ne pas créer un rapport à chaque réveil.

## Échec, conflit et récupération

- Un échec des tests du candidat ou une différence de départ laisse les fichiers
  du dépôt principal intacts. Réparer le candidat ou réexaminer la différence.
- Un échec après application restaure les versions antérieures seulement lorsque
  les fichiers courants correspondent encore aux versions livrées.
- Une modification concurrente inattendue est conservée, signalée dans le reçu
  et empêche toute livraison suivante jusqu'à résolution.
- Une interruption pendant les écritures laisse un reçu `applying`. Le prochain
  cycle doit le résoudre avant de livrer autre chose.

Pour reprendre un retour arrière ou retirer une livraison inchangée :

```bash
python3 /home/olivier/Documents/ChatGPT/Corpus/scripts/autonomy_integrate.py recover /chemin/du/recu.receipt.json
```

Un conflit se résout par comparaison des versions, pas par écrasement forcé ou
suppression du reçu. Une différence non ambiguë peut être préparée dans un
nouveau lot après résolution ; une décision utilisateur contradictoire ou une
perte potentielle nécessite son arbitrage.

## Autorité et limites

Les publications, installations du plugin actif, changements de permissions,
secrets, projets sensibles, suppressions destructrices et réécritures Git restent
hors délégation. Le mécanisme refuse les suppressions de fichiers, les chemins
protégés ou archivés connus, les liens symboliques et les changements de modes
existants. Il refuse aussi sa propre modification et celle des consignes
d'autorité : cette maintenance exige une revue séparée.

La délégation n'ajoute aucun droit au sandbox. Si l'écriture du dépôt principal
y est refusée, employer seulement le mécanisme d'approbation technique disponible
pour la commande locale exacte déjà autorisée ; ne pas modifier les permissions,
changer de voie pour contourner un refus ou annoncer une intégration non réalisée.
En cas de refus définitif, conserver le lot et signaler la limite technique.

L'outil n'est ni un sandbox pour les commandes de test ni une preuve de pertinence
sémantique. Le verrou coordonne uniquement ses propres livraisons, pas les autres
éditeurs. Les écritures sont atomiques fichier par fichier, sans transaction globale
du système de fichiers. Les empreintes réduisent le risque de concurrence sans
éliminer toute course avec un outil extérieur ; éviter les fichiers occupés par
une autre tâche. Les dépendances non déclarées restent à apprécier par l'agent.

## Vérification du mécanisme

```bash
python3 -W error::ResourceWarning -m unittest discover -s scripts -p test_autonomy_integrate.py -v
```

17 scénarios temporaires couvrent livraison et restauration, éditions concurrentes,
copie ancienne, dépendances modifiées, refus avant écriture, échec après écriture,
interruption partielle, reprise, chemins protégés, liens, modes, double application
et corruption des données de récupération. Ces contrôles ne suffisent pas à
établir une autonomie générale ; une livraison réelle distincte les complète.
