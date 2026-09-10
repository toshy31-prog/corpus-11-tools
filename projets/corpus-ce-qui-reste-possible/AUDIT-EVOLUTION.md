# Audit du chantier · monde évolutif

État vérifié le 10 septembre 2026. Cet audit distingue ce qui est exécutable de
ce qui reste seulement projeté.

## Ce qui existe réellement

- `evolution.html` est une boucle spatiale jouable au clavier ou à la souris.
- Le monde tourne indépendamment des gestes : habitantes, énergie, dépôts et
  repousses avancent selon un temps déterministe.
- Le premier centre est choisi par le joueur, sans ordre obligatoire : balise,
  foyer ou atelier.
- La balise ajoute un retour spatial, révèle les noms et modifie le trajet de Mara.
- Le foyer modifie les trajets et l'énergie, puis reçoit la production des
  personnes effectivement aidées.
- L'atelier double les prélèvements, allonge localement la repousse et ouvre la
  construction de ponts.
- Un pont modifie la traversabilité d'une case d'eau.
- Les centres peuvent ensuite être composés, mais le premier choix reste inscrit.
- L'état est sauvegardé localement. Aucun score global ne résume le monde.
- Les branches du moteur sont couvertes par 7 tests dédiés ; la suite totale
  compte 39 tests passants.

## Ce qui relève encore du prototype

- La carte, les ressources, les personnes, les besoins et les dialogues sont fixes.
- Trois centres ne constituent pas encore une évolution sociale ouverte.
- Les habitantes suivent des routes simples ; elles ne décident pas encore de
  construire, refuser, migrer, s'allier ou démanteler une institution.
- Les effets sont réels dans le moteur, mais leur profondeur ludique reste faible :
  un trajet dévié ou une repousse plus lente peut encore passer inaperçu.
- Le monde ne rattrape pas le temps écoulé lorsque la page était fermée.
- Il n'existe ni agriculture, ni propriété, ni conflit d'usage, ni génération,
  ni transmission longue, ni changement d'échelle.
- Aucun playtest humain n'établit encore que la boucle est amusante ou claire.

## Risques de faux-semblant

1. Ajouter des « âges » audiovisuels sans nouveaux rapports causaux reproduirait
   exactement le bluff d'Evoland.
2. Multiplier les recettes sans autonomie des habitantes réduirait Minecraft à
   un menu de fabrication.
3. Transformer les besoins en quêtes fixes réduirait le RPG à des distributeurs
   de texte.
4. Afficher davantage d'indicateurs pourrait remplacer le monde par son tableau
   de bord.
5. Permettre toutes les constructions dans chaque partie pourrait faire converger
   les branches et annuler progressivement la portée du premier choix.

## Prochain incrément prioritaire

Faire produire les évolutions suivantes par l'histoire effective de la partie :

- les prélèvements répétés raréfient une matière et déplacent les activités ;
- les relations entretenues font apparaître une institution commune différente ;
- les chemins réellement empruntés deviennent routes, puis attirent ou excluent ;
- les habitantes proposent, refusent ou détournent des constructions ;
- certaines possibilités deviennent incompatibles, coûteuses à défaire ou
  transmissibles à la génération suivante.

Le prochain seuil de validation n'est donc pas « ajouter du contenu ». Il faut
obtenir deux parties issues de la même carte où les pratiques du joueur produisent,
sans scénario de phases, des géographies, des institutions et des problèmes
durablement différents.
