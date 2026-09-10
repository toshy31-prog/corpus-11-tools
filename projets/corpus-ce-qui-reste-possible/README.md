# CORPUS — Ce qui reste possible

Prototype jouable d'un jeu politique situé dans la vallée fictive de Sereine.
La première campagne tient en une échéance : empêcher l'expulsion de la famille
Neris avant vendredi, sans réduire la situation à une quête de preuves, à une
vue omnisciente ou à un score moral.

## Jouer

Le prototype n'a aucune dépendance externe. Le moyen le plus simple est d'ouvrir
directement `index.html` dans un navigateur récent. La version navigateur est
regroupée dans `browser.js`, donc Firefox accepte aussi l'ouverture en `file://`.

`evolution.html` ouvre une seconde expérience : un monde spatial inspiré du
croisement entre Evoland, Minecraft et une simulation RPG. Le joueur choisit
le premier centre du monde — balise, foyer ou atelier — et chaque construction
change des règles effectives : routes, énergie, rendement, repousse ou passages.
La campagne systémique reste disponible dans `index.html` comme laboratoire de
causalité.

Le lien **Ouvrir le builder** mène à `studio.html`. Le studio permet de modifier
et de créer des positions, seuils, actions et dimensions de bilan. Pour chaque action, il expose les
textes, conditions, effets, relais et délais, tout en laissant disponible la
source JSON complète. Il conserve un brouillon local, valide en continu et
exporte un fichier de campagne. Les modifications peuvent être annulées et
rétablies sans toucher à la version compilée du dépôt.

Pour le servir localement avec Python 3 :

```bash
cd projets/corpus-ce-qui-reste-possible
npm start
```

Puis ouvrir `http://localhost:4173`.

La campagne est sauvegardée automatiquement dans le stockage local du navigateur.
L'état complet peut aussi être exporté en JSON depuis l'interface.

## Vérifier

```bash
cd projets/corpus-ce-qui-reste-possible
npm test
```

Après une modification de `engine.js` ou `game.js`, `npm run build` régénère
`browser.js`, `studio-browser.js` et `campaign.generated.js`. La commande de test
le fait également.

```bash
npm run validate
```

Cette commande compile puis valide `campaigns/sereine.campaign.json`. Pour
activer un brouillon exporté par le studio, remplacer ce fichier, puis exécuter
`npm test`. Le navigateur ne remplace jamais silencieusement la source du dépôt.

Les tests portent sur les distinctions constitutives de la boucle : savoir
situé, transmission non automatique, mandat d'usage, séparation entre ordre
signé, reçu et appliqué, refus contournable, seuils temporels et absence de score
global.

## Périmètre du prototype

- quatre personnes habitables dont les connaissances ne fusionnent pas ;
- quatre scènes qui changent avec les conséquences matérielles ;
- vingt et un gestes avec conditions, délais et effets croisés ;
- quatre événements temporels irréversibles ;
- supports et ordres qui doivent être transmis, reçus puis rendus exécutables ;
- bilan final vectoriel : sécurité, capacité de rester, recours, subsistance,
  capacité collective, mémoire, parole, coût du refus et milieu écologique ;
- aucune fin parfaite et aucun total agrégé.

La doctrine de traduction, ses choix et ses pertes sont consignés dans
`CORPUS_GAME_TRANSLATION.md`.

## État du builder

Le format déclaratif pilote maintenant l'identité, les positions, les savoirs,
les conditions, les durées variables, les effets, les relais, les effets
différés et les seuils temporels. Une action ajoutée dans le JSON est donc
exécutable sans fonction JavaScript portant le même identifiant.

L'ouverture, les résultats narratifs des actions, les variantes et les dimensions
du bilan final sont maintenant déclarés dans la campagne. Les quatre
illustrations propres à Sereine restent spécialisées dans le code. Un acteur sans
illustration dédiée reçoit une scène générique. Le builder n'est donc pas encore
un générateur visuel complet de campagnes.
