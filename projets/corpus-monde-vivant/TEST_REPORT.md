# Rapport de tests — palier 3D, 13 septembre 2026

## Rust

Commande : `./check.sh`.
Formatage et `clippy --all-targets -- -D warnings` : réussis.
**19 tests réussis** : 16 du modèle, 3 d’intégration du processus.

Couvre les sentiers, la divergence à temps égal, le rejeu, l’épuisement, la
maintenance, le refus, les observations contradictoires/non détectées, puis :
pont/démontage, clôture/détour d’habitant, repos d’abri, réserve sans création de
matières, lecture v1/v2, processus continu, seconde ouverture refusée et sauvegarde
invalide non écrasée.

Les tests de modèle qui posent un état initial à la main sont des fixtures,
pas des parties humaines ni des preuves d’émergence hors des règles choisies.

## Couplage 3D

`game-3d/smoke.gd` exécuté sur un monde neuf avec Godot headless :
**17 assertions réussies**. Marche physique, collision terrain, stabilité du PID,
temps sans geste, pause, ciblage, récolte via interaction, souche visible dans la
scène, aperçu, construction, obstacle, démontage, passage rouvert, second monde,
reprise du premier, fichier de caméra/position.

Même test exécuté graphiquement depuis le paquet extrait dans
`/tmp/corpus-portable-iE69Mx/CORPUS-3D-linux/`, cwd `/tmp` :
**18 assertions réussies**, dont la capture du viewport réel.
NVIDIA RTX 4070 Laptop, OpenGL Compatibility. Aucune erreur de script à l’exécution.
Un premier essai graphique confiné n’avait pas accès à OpenGL ; il a été arrêté,
puis relancé avec l’accès graphique local autorisé. Cela ne valide pas d’autres GPU.

Reproduction sans toucher aux parties : `./check-3d.sh` (nouveau dossier temporaire).

## Scène construite

`scenario.gd` : récolte par commandes ordinaires, trajets, abri, foyer et balise.
Aucune injection d’inventaire. Les déplacements du scénario sont automatisés ;
ce n’est pas une preuve de confort des commandes pour une personne.
Capture réelle : `audit/3d-constructions.png`.

## Paquet et conservation

`./package-3d.sh` produit un exécutable de lancement Linux + Godot + noyau + scène,
et l’archive `dist/CORPUS-3D-linux.tar.gz` (environ 76 Mio).
Archive extraite hors du projet puis tests headless et graphiques exécutés depuis
cette copie. Le jeu n’a pas besoin du compilateur ni du runtime du chantier.
Le script de test externe est un outil de validation, pas une dépendance de jeu.

Snapshot pré-3D : `preserved/native-2d-v0.2-before-3d.tar.gz`, intégrité gzip et
SHA-256 vérifiés. Prototype web non modifié dans ce palier.

## Ce que cela ne prouve pas

La compréhension humaine sans explication, le plaisir, la profondeur d’une longue
partie, le fonctionnement sur d’autres machines et la totalité de la vision Corpus
ne sont pas établis. Les tests locaux sont ceux du chantier, pas une validation
indépendante. Voir les limites et pistes dans ETAT_DU_CHANTIER.md.
