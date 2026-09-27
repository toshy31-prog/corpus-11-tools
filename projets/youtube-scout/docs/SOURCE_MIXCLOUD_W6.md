# Mixcloud W6 — adaptateur expérimental non activé

## Accès officiel et observation

[Documentation officielle API](https://www.mixcloud.com/developers/) consultée le 27 septembre 2026 : lecture publique sans authentification annoncée, objets show/user/tag, listes cloudcasts et pagination limit/offset. OAuth réservé aux actions protégées ; cet adaptateur ne propose aucune écriture ni token.

Le point racine `https://api.mixcloud.com/` redirige vers cette documentation. La lecture par l'outil web de l'exemple officiel `https://api.mixcloud.com/spartacus/party-time/` a échoué (« not accessible via this tool »). Cela ne prouve pas une panne générale de l'API. Aucune réponse JSON réelle observée dans ce lot ; un probe réseau séparé reste nécessaire. Aucun HTML de secours ni extraction de page.

## Contrat livré

`lib/mixcloud-discovery.mjs` exporte `readMixcloudShows({username, fetch, maxPages, pageSize, timeoutMs, maxBytes, signal})`. Le transport doit être injecté explicitement. Username public requis (pas `/me/`), maximum cinq pages de cent objets et trente secondes par page. Pagination reconstruite vers le seul hôte officiel ; liens `next` jamais suivis. Pas de retry automatique, redirections interdites, credentials omis. Timeout et annulation couvrent transport et lecture du corps. Les erreurs HTTP, notamment 429, remontent sans contournement.

Durcissement : lecture streaming obligatoire, plafond par corps de 1 Mio par défaut, configurable de 1 octet à 4 Mio. Le plafond porte sur les octets du flux livré par Fetch, avant décodage UTF-8 et JSON ; arrêt/annulation dès dépassement. Content-Length sert seulement au rejet anticipé, jamais à faire confiance à un flux plus long. Le décodage synchrone d'un corps déjà borné ne peut pas être interrompu par le timer JavaScript ; la durée exacte n'est donc pas une borne CPU stricte. L'allocation d'un chunk par le transport lui-même précède notre contrôle.

Sortie isolée : entités `show`, `user`, `tag`, arêtes sourcées `uploaded_by` et `tagged_with`. Une émission n'est pas un morceau ; un uploader n'est pas un artiste confirmé ; un tag n'est pas une scène documentée. Champs tracklist/sections non importés, aucune collaboration ni crédit inventé. Les identifiants reposent sur les clés API, jamais sur les noms. Ce graphe expérimental n'est relié ni au registre ni au moteur de production.

## Preuves et limites

`node --test lib/mixcloud-discovery.test.mjs` : code 0, un fichier TAP réussi, cinq cas de tests après durcissement. Fixtures synthétiques : pagination bornée malgré URL hostile, déduplication, provenance, absence de faux morceaux, refus paramètres/HTML/HTTP, timeout et annulation ; dépassement de 33 octets sous budget 32 rejeté avant JSON et flux annulé, budget exact accepté ; corps bloqué après en-têtes annulé au timeout. Ce n'est pas un test de disponibilité réel.

Limites : pagination offset susceptible de déplacement pendant des publications concurrentes ; seules les clés ASCII admises sont importées ; aucune promesse d'exhaustivité. Une erreur tardive rejette le lot entier plutôt que masquer un échec. La valeur `activated:false` décrit ce prototype, pas un contrôle d'autorisation réseau. Injecter un fetch réel peut envoyer le username public fourni : l'appelant doit obtenir l'autorisation appropriée.

Lecture autorisée par l'API n'implique pas licence ouverte de redistribution des contenus. Aucun audio téléchargé, aucune dépendance ni code Mixcloud copié, aucune licence de données supposée. Avant intégration : probe officiel borné, contrôle des conditions d'utilisation et décision explicite sur la présentation des liens éditoriaux.
