# État du chantier — palier 3D, 13 septembre 2026

## Conclusion

La petite vallée est jouable en vraie 3D avec un noyau Rust continu et des ouvrages
qui agissent sur la simulation. Ce palier corrige la façade 2D et le redémarrage
du noyau à chaque geste. **Ce n’est pas encore le grand jeu Corpus de la conversation.**

Cap conservé : exploration et composition à la Minecraft, personnages à la RPG,
évolution de ce qui devient possible par les usages. Pas d’ères graphiques obligatoires,
de société notée ni d’interface normale omnisciente.

## Réalisé et testé localement

- Corps 3D animé, marche continue, saut, caméra rotative/zoom, relief et collisions.
- Huit ouvrages, aperçu, coûts et placement aligné sur la topologie du noyau.
- Pont : traversée ; clôture : trajet détourné ; abri : destination et énergie ;
  réserve : transfert de matières ; démontage : capacité retirée et retour partiel.
- Sentiers, pression, maintenance, refus et reprise restent calculés par Rust.
  Leurs paramètres sont des choix de conception, pas une preuve sociale.
- Un processus Rust par monde, échanges asynchrones et horloge distincte du rendu.
- Fermeture/reprise, sélection de mondes, refus d’un second écrivain et conservation
  d’une sauvegarde invalide contrôlés.
- Godot réellement intégré avec ses notices ; runtime inclus dans le paquet Linux.

## Limites qui comptent

1. Les pratiques transforment un état selon des règles existantes. Le moteur ne
   crée pas de nouveaux systèmes ni ses propres règles pendant le jeu.
2. Une carte fixe de 18 × 12 cellules logiques, sans régions, creusement ni voxels.
   Marche continue, mais placement/navigation encore discrets sous le rendu.
3. Trois habitants, routines simples, dialogues fixes et relations peu profondes.
4. Assemblée et refus très simplifiés : pas de juridictions, coercition nuancée,
   mémoire générationnelle ou institutions réinterprétables.
5. Stock commun abstrait, pas de logistique physique par coffre. Production des
   habitants simplifiée, sans chaîne complète de travail et d’extraction.
6. Forêt extérieure surtout décorative ; seuls dix sites sont récoltables.
   Les limites du terrain peuvent encore sembler artificielles.
7. Pas de son, manette, accessibilité complète ou sessions longues validées.
   Direction artistique low-poly provisoire.
8. Journal réécrit et rejoué : sa croissance impose de futurs instantanés et
   migrations. Aucune garantie contre une coupure électrique.
9. Linux x86-64 avec runtime complet assez lourd ; pas de Windows .exe ni
   d’AppImage optimisée. Portabilité graphique vérifiée sur cette machine seulement.
10. Compréhension immédiate, plaisir, profondeur et rejouabilité **non validés**
    par les tests automatisés ni par ma propre inspection.

## Prochain ordre utile

1. Une situation de dix minutes : un habitant doit franchir un passage, plusieurs
   solutions différentes, conséquences perceptibles sans panneau.
2. Porter/déposer/consommer et besoins situés pour remplacer les stocks abstraits.
3. Occupation des lieux, mémoires, réparation et réemploi par les habitants.
4. Topologie plus libre, placement physique cohérent et régions persistantes.
5. Coordination et refus plus riches, puis générations et retournements.

Ajouter une technologie ou du contenu seulement si cela augmente les gestes
possibles, leurs conséquences ou la capacité du monde à continuer sans le joueur.
