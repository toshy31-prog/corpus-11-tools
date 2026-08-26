# Membrane d’alimentation écologique v0

## Ce qui change

`EcologicalTinyEncoder v1.4` n’entraîne plus le Transformer sur un flux où les
documents se rejoignent arbitrairement. Chaque séquence reste dans un seul
carrier et reçoit, séparément du texte, quatre signaux observables :

- la frontière du document ;
- la surface (`workspace`, `product`, `research`, `transfer`, `archive`) ;
- son statut déclaré par le graphe ;
- un compteur borné de relations déclarées du graphe.

Le statut et le compteur sont des embeddings dédiés. Ils ne deviennent donc ni
des mots ordinaires, ni des étiquettes de vérité, ni une instruction d’exécuter
le matériau.

## Partition et non-réemploi

La partition v1.4 utilise le hachage salé
`tiny-doctrine-ecological-v1.4:path`. Les 78 documents du test v1.3 déjà
observé sont exclus de tous les ensembles v1.4 — entraînement, validation et
test. Le test v1.4 est neuf et reste fermé jusqu’à la sélection d’un checkpoint
sur validation.

## Observable et limite

L’observable minimal est une comparaison, à protocole gelé, entre MLM textuel
v1.3 et MLM contextuel v1.4 : perte validation, perte test ouverte une fois,
empreinte du corpus, nombre de documents et statuts effectivement ingérés.

Un écart ne prouvera pas que le modèle comprend les relations, se nourrit de
l’écosystème, possède une mémoire ou qu’une émergence a eu lieu. Il montrera
seulement que ce contexte déclaratif a modifié une mesure de prédiction de
tokens dans cette partition.

## Audit de l’effet de méthode

La membrane rend visibles seulement les fichiers textuels autorisés et les
relations présentes dans le graphe déclaré. Elle masque donc les relations non
déclarées, les formats non textuels et tout ce que l’inventaire ne porte pas.
Le compilateur exclut son propre projet, les artefacts générés et les
environnements virtuels afin d’empêcher l’auto-ingestion. Si les signaux
structurels n’améliorent aucune mesure discriminante ou effacent une frontière
de statut, la représentation doit être retirée ou modifiée.

## Exécution locale

```bash
cd ~/Documents/ChatGPT/Corpus
source .venv-tiny-doctrine/bin/activate

# Audit sans GPU : le test reste fermé.
python research/active/corpus-open-model/src/inspect_ecological_feed.py

# Phase de sélection : validation seulement, test v1.4 toujours fermé.
python research/active/corpus-open-model/src/train_ecological_tiny.py --steps 1000 --eval-every 200
```

N’exécuter `evaluate_ecological_tiny_test.py` qu’après avoir enregistré la
sélection du meilleur checkpoint v1.4. Le programme refusera toute seconde
ouverture du test à moins de supprimer manuellement l’artefact, ce qui serait
une violation du protocole.
