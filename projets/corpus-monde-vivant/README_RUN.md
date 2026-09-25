# Jouer à CORPUS 3D — Linux x86-64

Dans le dossier autonome, double-cliquer **CORPUS** (exécutable), ou lancer
`./JOUER.sh`. Garder le dossier entier : runtime, noyau et scène.
Aucun navigateur, Java, serveur web, compilateur ou accès Internet requis.
Les pilotes graphiques et bibliothèques Linux usuelles restent nécessaires.
Ce n’est pas un exécutable Windows.

Depuis le chantier : `./JOUER-3D.sh` ou `CORPUS-3D.desktop`.
`JOUER-GRAPHIQUE.sh` ouvre désormais la 3D ; `JOUER-2D.sh` conserve l’ancienne vue.

## Les premiers gestes

1. Cliquer « Entrer dans la vallée ».
2. S’approcher de l’arbre devant soi, puis **E** pour prendre du bois.
3. Explorer : plantes pour les fibres, rochers pour la pierre, personnes pour les rencontres.
4. Choisir avec **1–8** ou la barre ; aperçu devant soi, **E** ou clic pour construire.
5. Un foyer coûte 1 bois + 1 fibre ; un abri 3 bois + 2 fibres.
   Un pont coûte 2 bois + 1 pierre et se place sur l’eau.

## Commandes

- ZQSD / WASD / flèches : marcher ; Maj : courir ; Espace : sauter.
- Clic droit maintenu + souris : caméra ; molette : zoom.
- E : agir ; 1–8 : balise, foyer, atelier, pont, abri, clôture, réserve, jardin.
- X près d’un ouvrage : démonter avec récupération partielle.
- R près d’une réserve/foyer : déposer ; E : reprendre le stock commun.
- Échap : annuler la construction, puis pause. F3 : diagnostic facultatif.

Le jardin demande une organisation collective préalable. Le retour indique les
matières manquantes, les lieux incompatibles et les refus. Les ouvrages s’usent
et peuvent être réparés avec du bois. Le monde continue sans déplacement du joueur,
mais ne tourne ni en pause ni pendant que l’application est fermée.

## Mondes et sauvegardes

Sauvegarde automatique après les gestes et les cycles. La fermeture normale attend
les commandes en cours. Le menu permet de créer et de reprendre plusieurs mondes
sans en supprimer. Le dernier monde choisi est repris au prochain lancement.

Emplacement par défaut : dossier de données Godot
`app_userdata/CORPUS — La vallée des passages/worlds` sous le dossier XDG
(généralement `~/.local/share/godot/`).
Le monde est dans `.save`, caméra et position précise dans `.save.view`.
Une sauvegarde invalide est refusée sans remplacement. Deux fenêtres 3D ne peuvent
pas écrire simultanément le même monde.

Dossier choisi : `./JOUER.sh --saves /chemin/vers/mes-mondes`.

## Depuis les sources

`./check.sh` : contrôles Rust. `./package.sh` : noyau.
`./package-3d.sh` : dossier autonome et archive Linux.
Les versions précédentes restent dans `preserved/`.
