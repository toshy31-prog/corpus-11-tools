# CORPUS — La vallée des passages

Prototype natif **3D**, Godot + simulation Rust persistante. Un personnage marche,
récolte, rencontre des habitants et construit dans une petite vallée. Les usages
modifient chemins, ressources, trajets, repos et entretien.

**Le but reste de transformer Corpus en jeu : les actes du joueur changent qui
pourra agir après lui.** La 3D sert cette expérience ; elle ne valide pas sa
profondeur ni son plaisir. Le programme transforme l’état par des règles écrites :
il ne réécrit pas son moteur et n’invente pas librement de nouvelles mécaniques.

Lancer `./JOUER-3D.sh`, ou double-cliquer `dist/CORPUS-3D-linux/CORPUS`.
[Commandes et sauvegardes](README_RUN.md).

## Présent

- Marche continue, saut, caméra orbitale, relief, eau animée, modèles 3D.
- Récolte/épuisement visibles ; huit ouvrages, aperçu, coûts, démontage, réserve.
- Ponts praticables, clôtures qui détournent, abris qui attirent les habitants fatigués.
- Sentiers issus des usages, entretien, perte de capacités, refus local et reprise.
- Horloge indépendante des déplacements, pause, sélection et reprise de mondes.
- Processus Rust long vivant, journal ouvert, verrou et sauvegarde par renommage.
- Observations analytiques distinctes du rendu, sans score global en jeu.

## Vérifier et poursuivre

`./check.sh` : 19 tests Rust, formatage et analyse statique.
`game-3d/smoke.gd` : couplage graphique.
`game-3d/scenario.gd` : collecte puis constructions sans inventaire injecté.

[État et limites](ETAT_DU_CHANTIER.md) · [Tests](TEST_REPORT.md) ·
[Architecture](ARCHITECTURE.md) · [Open source](OPEN_SOURCE.md).

Le prototype web et les façades 2D sont conservés. Aucune publication,
installation globale ou suppression de sauvegarde dans cette livraison.
