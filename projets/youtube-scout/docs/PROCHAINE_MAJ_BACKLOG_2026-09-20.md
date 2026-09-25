# Prochaine mise à jour — problèmes signalés et critères de correction

Statut historique : préparation du 20 septembre 2026. Le diagnostic ci-dessous décrit l’état avant correction. Mise en œuvre locale ultérieure : [Scout 0.15.0, périmètre et validation](MISE_A_JOUR_0.15.0_2026-09-20.md), avec les demandes supplémentaires de tri et de filtre autres artistes. Les réserves sur les catalogues réels restent applicables.

Périmètre : identification, pertinence des découvertes et continuité du parcours. Conserver la bibliothèque, les annotations personnelles, les identités distinctes et les preuves. Ne pas fusionner des artistes sur leur seul nom.

## 1. Titre pris comme indice d’artiste : « GREEN DAY »

**Observation.** La capture Scout affiche uniquement « SOURCE GREEN DAY ». La capture YouTube montre « GREEN DAY » comme titre, une chaîne YH 261 et une description comportant YH 261 et Nilma. Ces crédits doivent être interprétés avec leur rôle ; le nom de chaîne n’est pas, à lui seul, une identité d’artiste.

**Cause vérifiée, portée limitée.** `artistSearchHint("GREEN DAY")` retourne « GREEN DAY ». Ce résultat peut préremplir le champ « Nom de l’artiste » dans `renderArtistCorrection`. Le bandeau principal du mix affiche `seedLabel`, sans artiste. Cela crée une ambiguïté concrète titre/artiste. Les captures ne prouvent pas que Scout a associé ce morceau au groupe Green Day : aucune telle association n’est montrée.

**À traiter.**

- Présenter séparément titre, artiste ou crédits disponibles, chaîne et statut d’identification. Afficher « artiste à confirmer » quand nécessaire.
- Ne pas transformer silencieusement un titre sans séparateur en nom d’artiste suggéré comme fiable.
- Exploiter les crédits structurés disponibles, avec leur provenance, et le contexte du morceau pour rechercher des candidats. Ne pas traiter chaque nom de la description comme interprète.
- Conserver le contexte d’une carte lorsqu’on choisit « Continuer ». Le gestionnaire construit actuellement un départ minimal avec id, type, label et URL ; vérifier la récupération des autres métadonnées depuis le graphe, sans conclure qu’elles sont effacées.

**Acceptation.** Une vidéo intitulée GREEN DAY ne devient pas le groupe Green Day sur la seule égalité du texte. Les crédits YH 261 / Nilma restent accessibles avec leur provenance et leurs rôles connus ou non déterminés. Une identité incertaine laisse une correction manuelle utilisable.

## 2. Recherche d’artiste trop permissive : TH et TH 93

**Observation.** TH 93 propose 93MillionMilesFromTheSun ; TH propose notamment Jauzas the Shining, Dj.Booth et The Black Tone.

**Cause vérifiée.** `catalogueArtistChoices` accepte chaque mot de la requête comme sous-chaîne n’importe où dans le nom. Les candidats locaux sont parcourus avant les noms du registre, puis la liste est limitée à huit groupes sans classement préalable par pertinence. Reproduction en mémoire : les faux candidats ci-dessus passent le filtre. Leur présence ne prouve pas qu’une mauvaise identité a été confirmée.

**À traiter.**

- Pour les noms courts, privilégier le nom exact ou un alias documenté ; une occurrence de « th » dans « the » ou « booth » ne suffit pas.
- Classer les correspondances avant la limite d’affichage ; ne pas laisser l’ordre d’insertion masquer un candidat exact.
- Désambiguïser avec le titre et les crédits disponibles, sans fusion automatique des homonymes.
- Prévoir « Aucun de ces artistes », une recherche reformulable et l’ajout d’un lien exact de catalogue. Une annotation libre reste distincte d’une identité catalogue confirmée.

**Acceptation.** Cas TH, TH 93, noms à ponctuation, alias, homonymes et candidat exact après huit mauvais candidats. Afficher honnêtement l’absence de correspondance plutôt que remplir la liste de fragments de noms.

## 3. Réglages perdus entre deux départs

**Observation.** Sur « barz en l’air », Compilations est désactivée et sept directions sont actives. Sur le départ suivant « GREEN DAY », huit directions sont actives. Les captures seules ne retracent pas chaque clic intermédiaire.

**Mécanisme vérifié dans le code.** `setScoutMixerParameter` modifie `activeDig.synthPatch`. Lors d’un changement de départ, `openExploration` remplace ce patch par `initialScoutPatch()`, qui relit les cases de l’ancien sélecteur de directions, et non les potards courants. L’ouverture depuis le sélecteur peut avoir coché les huit cases. Ce mécanisme peut donc réactiver une direction coupée.

**À traiter.** Distinguer les préférences de recherche, le contexte propre au morceau et les résultats de chaque départ. Proposition : « Continuer » conserve les poids et la profondeur, renouvelle les résultats, et signale les directions non applicables au nouveau départ. Réinitialiser les préférences devient un geste explicite.

**Acceptation.** Couper Compilations, changer un dosage et la profondeur, continuer vers un morceau, puis revenir : les choix sont cohérents, sans résultats attribués au mauvais départ ni réactivation silencieuse. Vérifier également la reprise d’une session sauvegardée.

## 4. Filtre sur une direction désactivée : faux écran vide

**Observation.** Le filtre reste « Compilations · désactivée ». Le résultat annonce zéro piste alors que Labels, Collaborations, Chaînes YouTube et Période ont des pistes disponibles. Ces pistes sont masquées, pas démontrées perdues.

**Cause vérifiée.** Le bouton d’activation modifie le poids de la direction sans réconcilier `directionFilter`. Le filtre peut toujours désigner une direction exclue du mélange. Le bouton de recherche charge les directions actives indépendamment de ce filtre d’affichage.

**À traiter.**

- Proposition : quand on désactive la direction affichée, revenir à « Toutes les directions actives », avec un retour d’information bref. Ne pas réactiver la direction à la place de l’utilisateur.
- Empêcher la sélection accidentelle d’un filtre devenu invalide. Une éventuelle consultation du cache d’une direction désactivée doit être un mode explicite, pas une liste vide ambiguë.
- Distinguer « aucune piste dans ce filtre », « pas encore recherché », « toutes les pistes parcourues » et « recherche sans résultat ».
- Rapprocher l’action de récupération de la zone vide. Ne pas inviter à relancer une recherche globale pour résoudre un simple masquage.
- Préciser la portée de « Recommencer la liste » : le gestionnaire actuel réinitialise l’historique d’affichage de toutes les directions du départ, même avec un filtre actif.

**Acceptation.** Tester filtrer → désactiver → réactiver, pagination, recommencement et changement de départ. Les gestes d’affichage ne lancent pas de requête fournisseur ; une direction désactivée conserve ses données.

## 5. Lien documenté mais recommandation trop lointaine : Led Zeppelin → Bruno Mars

**Constat du diagnostic précédent.** Le chemin affiché passe par une sortie de Led Zeppelin, Atlantic, une sortie de Bruno Mars, puis ses morceaux. Un label commun fournit une relation de catalogue, pas une preuve de proximité sonore. Les candidats label observés étaient concentrés sur un même album de Bruno Mars.

**À traiter.**

- Distinguer proximité relationnelle, lien éditorial large et éventuelle ressemblance musicale ; ne pas présenter ces notions comme équivalentes.
- Réduire la domination d’un label très large sans interdire nominativement un artiste. Des éléments documentés supplémentaires peuvent renforcer une piste ; ne pas les inventer.
- Diversifier les candidats à la collecte autant qu’à l’affichage : plusieurs artistes et sorties, plutôt qu’un album occupant la direction entière.
- Rendre les liens éloignés identifiables et optionnels. Une analyse acoustique serait un chantier séparé, pas une capacité déjà présente.

**Acceptation.** Comparer grand label et petit label ; contrôler diversité d’albums, explication du chemin, conservation des preuves et accès volontaire aux liens éloignés.

## 6. Compteurs, états et hiérarchie de l’interface

- « 7 activées » et « Chercher dans 5 directions » comptent respectivement les directions activées et celles ayant une opération de lecture possible. Ce n’est pas, à lui seul, un calcul erroné. Expliquer cette différence près de l’action.
- Distinguer chargées, admissibles avec les réglages, déjà parcourues et actuellement affichées. Ne pas additionner les compteurs des routes comme s’il s’agissait de pistes uniques.
- Sur GREEN DAY, huit directions non consultées et zéro résultat peuvent être un état initial normal. En revanche, « Identification du départ avant lecture du catalogue… » ne doit pas ressembler à une opération en cours quand l’interface attend un clic. Vérifier cette transition sur une reproduction contrôlée.
- Garder un seul ensemble de commandes. Afficher le morceau et son identité, l’état utile et l’action suivante avant les réglages détaillés. Ne pas ajouter un second panneau pour expliquer le premier.
- Le titre d’un autre onglet, par exemple une vidéo parlant de Freeze Corleone, ne prouve pas à lui seul que Scout a recommandé une chronique non musicale. Ce point reste à reproduire avant de le classer comme défaut confirmé.

## 7. Deux boutons de départ incohérents et contexte Topic incomplet

**Nouveau signalement.** Captures du 20 septembre, 03:53–03:54 : « EVERYWHERE I GO / BABY I GOT U ». La suggestion affiche « DavidDeuxFois », avec la mention « correction personnelle », la chaîne « DavidDeuxFois - Topic » et une description fournie par TuneCore créditant DAVIDDEUXFOIS. L’utilisateur signale que « Explorer morceau + artiste » ne fonctionne pas, puis une exploration normale vide.

**Vérifications locales, sans requête fournisseur.**

- Dans `public/app.js`, le gestionnaire `.artist-load` retourne immédiatement `useVideoAsSeed(video)` si `#seed-dialog` est ouvert. Cette fonction appelle alors uniquement `workspace.selectSeed(...)`. Le bouton sélectionne donc la vidéo mais n’exécute ni `openExploration` ni `loadArtistDetails` dans cette branche. Son libellé promet une autre action que celle réellement exécutée.
- `guessArtist` reconnaît déjà le suffixe Topic. Un diagnostic en mémoire avec le titre et la chaîne de la capture retourne bien « DavidDeuxFois ». Il serait inexact de conclure que Scout ignore systématiquement les chaînes Topic.
- `hydrateExplorationSeed` utilise la chaîne Topic et `resolvedArtist(video)` comme indices de recherche. La correction personnelle peut donc entrer dans ce chemin ; sa perte générale n’est pas établie.
- Deux représentations de la correction coexistent : `artistCorrections[video.id]` pour les suggestions, et `departureArtist` pour le départ. Le champ de correction du départ lit cette seconde annotation, sinon `artistSearchHint(seed.label)`, sans reprendre directement la première. Reproduction : ce dernier appel retourne le titre entier « EVERYWHERE I GO / BABY I GOT U ».
- `recordingDetails` envoie titre, artiste, durée et éventuellement un lien Bandcamp ; ni chaîne ni description. `resolveRecording` construit également le plan avec seulement titre, artiste et durée, bien que `runtimeRecordingPlan` accepte chaîne, description et données Topic. Le contexte affiché dans la suggestion n’est donc pas intégralement transmis au résolveur du morceau.
- Le diagnostic du plan avec le bon artiste produit une requête « DavidDeuxFois + EVERYWHERE I GO / BABY I GOT U ». Cela ne démontre pas un remplacement systématique de l’artiste par le titre. Les hypothèses et confirmations doivent rester distinctes.

**À traiter.**

- Un seul geste de lancement depuis le sélecteur, avec un contrat identique pour les suggestions et la recherche. Retirer ou renommer le bouton qui ne fait que sélectionner ; ne pas ajouter une seconde action concurrente.
- Une correction personnelle cohérente pour cette vidéo à travers suggestion, départ, formulaire et reprise. La distinguer explicitement d’une fiche catalogue confirmée ; remplacer le mélange « artiste probable · correction personnelle » par un statut compréhensible.
- Transmettre le titre, l’artiste renseigné, la chaîne, la description et leur provenance là où ils sont nécessaires. Prioriser la saisie utilisateur pour la recherche sans en faire automatiquement un identifiant catalogue ni une identification de l’enregistrement.
- Utiliser Topic comme indice de provenance, pas comme nom d’artiste ou preuve universelle. Exploiter les crédits de description selon leurs rôles, en séparant artiste, producteur, label et distributeur. « Provided to YouTube by TuneCore » ne désigne pas l’interprète.
- Conserver le titre composé avec `/` ; ne pas le découper arbitrairement en artiste et titre, ni en deux enregistrements confirmés.

**Acceptation.** Rejouer le cas DavidDeuxFois depuis les suggestions et depuis la recherche, avec et sans correction personnelle, puis après reprise. Un lancement doit afficher le même couple titre/artiste et le même statut d’identité. Le bouton ne doit jamais sembler inactif parce qu’il ne fait que resélectionner la carte. Tester aussi une chaîne éditoriale non Topic, une description ambiguë et une correction contredisant une ancienne inférence.

### Cas complémentaire : Jeune Morty — John Gotti (Freestyle)

**Signalement du 20 septembre, 04:04.** La page YouTube montre le titre « John Gotti (Freestyle) », la chaîne « Jeune Morty » sans suffixe Topic visible, et la ligne de description « John Gotti (Freestyle) · Jeune Morty ». La mention « Provided to YouTube by DistroKid » renseigne la distribution, pas l’interprète. La fiche Scout montre le titre seul, un dossier partiel et huit directions « Pas encore consultée ».

**Apport de ce cas.** Une correction limitée à retirer « - Topic » du nom de chaîne serait insuffisante : le crédit artiste est ici explicite dans la description, même sans ce suffixe affiché. Le titre contenant un nom de personne ne doit pas devenir automatiquement une requête d’artiste. « Freestyle » doit rester disponible comme information de version, sans être perdu par la normalisation.

**À vérifier, sans conclusion anticipée.** Cette capture n’établit ni une attribution confirmée à un artiste nommé John Gotti, ni une absence de Jeune Morty dans les catalogues, ni le même défaut de bouton que dans la fenêtre DavidDeuxFois. Les directions non consultées indiquent un état différent des recherches échouées du cas précédent. La transmission effective des crédits et le comportement au lancement restent à rejouer.

**Critères de régression à ajouter.**

- Restituer « John Gotti (Freestyle) — Jeune Morty », avec la provenance du crédit et un statut catalogue distinct ; une fiche externe homonyme ne doit jamais être confirmée sur le titre seul.
- Obtenir un contexte de recherche cohérent si la chaîne est affichée « Jeune Morty » ou « Jeune Morty - Topic », à crédits identiques ; ne pas dépendre exclusivement du nom visible de chaîne.
- Garder la version Freestyle et le lien vers la vidéo d’origine lors de la sélection, de « Continuer » et de la reprise.
- Si l’identification catalogue reste incertaine, conserver l’artiste crédité à l’écran et proposer une vérification ou correction ciblée, plutôt qu’un tableau vide sans contexte.

Sources fournies : `/tmp/codex-clipboard-cd5a9f77-bfdc-4e7b-a2ee-11f68e612256.png` et `/tmp/codex-clipboard-346b4c57-2640-4c37-9e0b-c8297fe2906b.png`. Complément documentaire seulement ; aucune nouvelle recherche externe ni reproduction navigateur effectuée pour ce cas.

## 8. Échec de source présenté comme absence de recherche

**Observation.** La capture du cas DavidDeuxFois affiche huit directions « Consultée · recherche incomplète », MusicBrainz et Wikidata « indisponible », Discogs et recording « non trouvé », puis « Choisissez vos directions puis lancez la recherche ». La route YouTube invite à se connecter. Ces messages n’expliquent pas une prochaine action cohérente.

**Limite.** Les captures ne permettent pas de diagnostiquer la cause de l’indisponibilité, un éventuel jeton expiré, ni l’absence réelle de l’artiste dans les catalogues. Aucun appel réel n’a été relancé pour cette préparation.

**À traiter.** Séparer identification incertaine, source indisponible, aucun résultat et recherche non lancée. Afficher une action adaptée : corriger l’identité, réessayer la source défaillante, reconnecter YouTube si nécessaire, ou poursuivre avec les sources utilisables. Ne pas prétendre que le morceau lui-même est confirmé simplement parce qu’un nom issu de Topic est connu. Vérifier l’état de connexion effectif avant d’attribuer le problème à l’utilisateur.

**Acceptation.** Simuler une indisponibilité MusicBrainz, un résultat Discogs vide et une session YouTube expirée, séparément puis ensemble. Garder visibles le titre, l’artiste renseigné et les éléments utilisables ; aucun message « lancez la recherche » ne doit masquer une recherche déjà échouée.

## 9. Le vivier propose de garder des sources au lieu de les explorer

**Demande utilisateur explicite, 20 septembre à 04:09.** Dans « Me proposer des départs », les morceaux sont déjà dans les playlists de l’utilisateur. L’action souhaitée est de chercher à partir de ces morceaux, pas de les ajouter au carnet. Retirer « Garder » de ce sélecteur fait partie du comportement demandé pour la future mise à jour.

**Constat vérifié.** `renderReserve` affiche uniquement « Écouter » et « Garder » pour les autres pistes. Son bouton appelle `toggleNotebook` : aucune action de sélection du départ n’est câblée sur ces lignes. `currentRanked`, qui alimente ce vivier, est construit depuis la bibliothèque. Il s’agit donc bien d’une action de parcours manquante, pas seulement d’un libellé peu clair. La carte principale, elle, possède « Choisir ce départ » : les deux niveaux de suggestions n’offrent pas les mêmes possibilités.

**Comportement cible.**

- Toutes les suggestions, y compris les autres pistes, sont des départs sélectionnables. Une seule logique : « Choisir ce départ », état sélectionné visible, puis le bouton commun « Explorer ce départ ».
- Enlever « Garder » des cartes principales et du vivier à l’intérieur du sélecteur. Conserver « Écouter » comme action secondaire pour reconnaître le morceau. Ne pas supprimer les éléments déjà enregistrés dans le carnet.
- Remplacer « Ouvrir le vivier classé · 12 autres pistes » par une formulation de choix, par exemple « Autres points de départ dans vos playlists », avec le nombre réel.
- Réserver l’action « Garder » au contexte où elle est utile, notamment les découvertes à retrouver dans le carnet. Distinguer ce contexte des morceaux sources déjà importés. Un éventuel badge « Déjà dans vos playlists » doit se fonder sur un identifiant établi, pas sur une ressemblance de titre.
- Préserver l’artiste renseigné et le contexte du morceau sélectionné, conformément aux cas d’identification précédents. Ne pas relancer les catalogues au simple clic de sélection.

**Acceptation.** Choisir une piste de la réserve (par exemple CORROSIF ou FREDO dans la capture), vérifier le récapitulatif et l’activation du bouton de lancement, puis ouvrir exactement ce départ. Le compteur du carnet doit rester inchangé. Couvrir souris, clavier, mobile, fermeture/annulation et rafraîchissement des suggestions ; une piste de réserve encore proposée ne doit pas perdre sa sélection parce que la synchronisation ne considère que les cartes principales. Les découvertes et les éléments déjà gardés restent accessibles sans migration destructive.

Source fournie : `/tmp/codex-clipboard-d9da4393-9929-42a5-8f46-80f39adf1cd1.png`. Lecture seule du code et ajout au document ; aucune modification de l’interface ni du carnet dans cette passe.

## Ordre proposé et validation future

1. Identification, transmission des corrections et noms courts : éviter d’entraîner tout le parcours sur une mauvaise personne.
2. Choix de tous les départs, continuité des réglages et cohérence du filtre : rendre les actions disponibles et fiables.
3. Pertinence et diversité des liens proposés.
4. Vérification transversale des textes, états, clavier, mobile et parcours complets.

La validation devra rejouer les cas signalés dans un navigateur isolé, avec données de test, puis distinguer les résultats simulés des recherches réellement vérifiées. Aucun nombre de tests unitaires ne suffira à certifier la pertinence musicale ou tous les parcours d’identification.

## Traces de cette préparation

- Lecture seule : `public/departure-workflow.mjs`, `public/scout-mixer-panel.mjs`, `public/app.js` ; diagnostic précédent du parcours label conservé comme tel.
- Petit diagnostic Node sans écriture : `artistSearchHint("GREEN DAY")`, `catalogueArtistChoices` sur des entités fictives pour TH et TH 93. Les comportements décrits ont été reproduits.
- Complément DavidDeuxFois : lecture de `lib/scout.mjs`, `lib/recording-resolution-runtime.mjs`, `server.mjs` et `public/workspace.mjs` ; diagnostic Node en mémoire de `guessArtist`, `artistSearchHint` et `runtimeRecordingPlan`. Aucun clic ni recherche réelle reproduit dans le navigateur personnel.
- Captures utilisateur : séries Led Zeppelin / Bruno Mars, TH / TH 93, barz en l’air (02:52) et GREEN DAY (02:54).
- L’audit des effets de l’interface a servi à séparer résultats absents, résultats masqués et identité réellement confirmée. Les hypothèses restantes sont signalées dans chaque cas.
- Seul ce document est ajouté puis complété : pas de modification du code, des données utilisateur ou du serveur ; pas de navigation ni de requête aux catalogues pour cette préparation.
