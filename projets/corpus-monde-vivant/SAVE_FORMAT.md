# Sauvegarde v2

```text
CORPUS-WORLD 2
BASE sereine-native:1
SEED 1
USE 5 5
PLACE FENCE 4 4
DISMANTLE 4 4
EXPLORE 4 4
WAIT 12
```

Version, base, graine et commandes ordonnées. Le rejeu reconstruit ressources,
usages, habitants, ouvrages et traces. La graine est conservée mais la carte est
actuellement fixe : elle ne génère pas des régions variées.

Le lecteur accepte v1 et ses commandes. Archives v1 et exécutables restent
préservés. Le rejeu utilise les règles courantes : une future évolution sémantique
exige migration ou moteur versionné, pas seulement un nouvel en-tête.

Ajouts : EXPLORE x y, USE x y, PLACE TYPE x y, DISMANTLE x y, DEPOSIT x y.
Types ajoutés : SHELTER, FENCE, STORE.
Anciennes commandes : MOVE, INTERACT, BUILD, WAIT, RETURN.

Le serveur conserve un verrou OS .save.lock, libéré à sa fin même après crash.
Le fichier de verrou n’est pas supprimé. Le monde est écrit dans .save.pending
puis renommé. Une sauvegarde invalide est refusée sans remplacement.
Cela n’est ni une sauvegarde hors machine ni une garantie après perte d’alimentation.
Les anciens outils --machine/terminal sont réservés au diagnostic hors session 3D :
ils ne prennent pas le verrou du serveur.

Godot conserve position précise/caméra dans .save.view ; en cas de désaccord de
cellule, le noyau prime. active.cfg retient le dernier monde choisi sans supprimer
les autres fichiers.
