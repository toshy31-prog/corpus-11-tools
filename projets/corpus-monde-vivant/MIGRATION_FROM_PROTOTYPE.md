# Migration depuis les prototypes

## Préservé

- Prototype navigateur original : `../corpus-ce-qui-reste-possible/`.
- Archive scellée : `preserved/corpus-ce-qui-reste-possible-2026-09-13.tar.gz`.
- Première démo Rust/Godot en grille : `frontend-godot/`.
- Archive correspondante : `preserved/native-grid-v0.1-2026-09-13.tar.gz`.
- Sommes de contrôle : `preserved/SHA256SUMS.md`.

## Conservé dans le nouveau jeu

- noyau Rust déterministe ;
- base + journal de commandes ;
- temps, ressources, habitants, usages, entretien et traces ;
- fournisseurs situés qui ne fusionnent pas silencieusement les contradictions ;
- absence de score global.

## Abandonné dans l'expérience principale

- carte entière cadrée comme une grille de simulation ;
- cellules et lettres comme représentation des personnes ;
- panneau latéral expliquant les variables du moteur ;
- boutons de construction séparés spatialement du lieu ciblé.

## Nouvelle traduction

Le terrain devient texture et milieu, les ressources deviennent objets, les
habitantes deviennent corps animés, la construction est visée devant le joueur,
et les conséquences du noyau sont traduites en chemins, absences, usure, mouvement
et formes bâties.
