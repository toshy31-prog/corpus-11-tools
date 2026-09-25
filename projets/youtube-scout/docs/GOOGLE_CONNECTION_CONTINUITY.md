# Connexion Google : continuité et activation séparées

## Ce qui change

Scout conserve la connexion temporaire Google Identity Services existante. Sans
configuration supplémentaire, aucune nouvelle autorisation n’est lancée et aucun
fichier de jeton renouvelable n’est lu. L’expiration temporaire est signalée à
l’interface globale ; la bibliothèque et le parcours ne sont pas supprimés.

Un second mode, **optionnel**, utilise le serveur local pour l’échange de code
OAuth et le renouvellement. Une fois activé et autorisé par l’utilisateur, l’accès
court est renouvelé avant échéance et à la reprise des lectures. Les appels
simultanés partagent un renouvellement. Une indisponibilité réseau conserve
l’autorisation et propose de réessayer ; `invalid_grant` impose une reconnexion.
Le renouvellement ne relance pas un import complet ou toutes les recherches.

## Activation (non effectuée par les tests)

1. Dans votre projet Google Cloud, conserver YouTube Data API activée et un client
   OAuth **Application Web**. Ajouter exactement l’URI de redirection
   `http://localhost:4181/oauth/google/callback` (adapter uniquement le port si le
   serveur utilise un autre port). Cette modification externe nécessite votre accord.
2. Fournir au processus local `SCOUT_GOOGLE_CLIENT_ID` et
   `SCOUT_GOOGLE_CLIENT_SECRET`. Le secret doit venir d’un environnement protégé ou
   d’un gestionnaire de secrets : ne pas le coller dans ce dépôt, une commande
   conservée dans l’historique, un ticket ou une sauvegarde Scout.
3. Optionnel : `SCOUT_GOOGLE_ORIGIN` fixe l’origine canonique, par défaut
   `http://localhost:4181`. Seules `localhost` et `127.0.0.1` au port du serveur sont
   acceptées. Utiliser la même origine dans le navigateur et Google Cloud.
4. Après un redémarrage explicitement autorisé, cliquer « Connecter avec
   renouvellement automatique ». Le consentement Google porte uniquement sur
   `youtube.readonly`, avec accès hors ligne. Scout ne modifie pas vos playlists.

Le secret client n’est jamais envoyé au navigateur. Le jeton de renouvellement
est enregistré par défaut dans
`$HOME/.local/share/youtube-scout/google-oauth.json`, **hors dépôt et hors exports
Scout**. `SCOUT_GOOGLE_TOKEN_FILE` permet un autre chemin absolu hors projet ;
choisir un répertoire dédié privé, jamais un dossier synchronisé. Un chemin dans
le projet (notamment `public/`) est refusé, y compris via un lien symbolique.
Le répertoire doit appartenir à l’utilisateur et avoir le mode `0700`, le fichier
`0600`. Les fichiers symboliques ou insuffisamment protégés sont refusés. Ce
stockage est protégé par les permissions du système, **pas chiffré** : un autre
processus du même compte et les sauvegardes complètes de la machine peuvent y
accéder. L’accès court reste en mémoire ; il n’entre pas dans les exports.

« Déconnecter » oublie le jeton dans le serveur local et l’onglet. Cela ne révoque
pas à distance l’autorisation Google : la révocation explicite reste disponible
dans votre compte Google. Après retrait du mode serveur, la connexion temporaire
reste disponible ; ne pas confondre désactivation de configuration et suppression
du jeton du disque.

## Limites honnêtes

Aucune session Google n’est garantie permanente. Une révocation, une autorisation
limitée dans le temps, les règles du projet Google ou une erreur de configuration
peuvent imposer un nouveau consentement. En particulier, un projet Google de type
**External** conservé en statut **Testing** produit normalement un jeton de
renouvellement limité à **7 jours** pour `youtube.readonly` : ce périmètre n’entre
pas dans l’exception réservée aux seules informations de profil. Scout ne change
pas le statut de publication du projet à votre place.
[Règles Google d’expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

Le code est testé avec un fournisseur
simulé ; **le consentement réel, la configuration Cloud et un renouvellement réel
ne sont pas validés tant que cette activation n’a pas été faite**.

Les routes locales exigent l’hôte exact, une requête même origine avec un en-tête
non simple, et du JSON pour les actions. Le retour Google utilise un `state` à
usage unique, une liaison au navigateur par cookie HttpOnly/SameSite et PKCE.
Ni les codes, ni les secrets, ni les erreurs brutes Google ne sont reflétés dans
les statuts. Les requêtes d’échange ont un délai borné et refusent les redirections.
Ce serveur reste destiné à un utilisateur local, pas à un hébergement multi-user.

## Preuves reproductibles, isolées

```sh
node --test lib/google-oauth.test.mjs public/connection-panel.test.mjs tests/google-oauth-http.test.mjs
```

Les tests utilisent des jetons factices, des fichiers temporaires et des serveurs
sur ports éphémères. Aucun compte Google ni la bibliothèque réelle ne sont appelés.
Ils couvrent expiration, rotation, absence de refresh token, refus du consentement,
rejeu du callback, origine hostile, absence de fuite dans le statut, indisponibilité,
révocation et réponses tardives après déconnexion/changement de compte.

Références primaires :
[Google : modèle serveur et accès hors ligne](https://developers.google.com/identity/protocols/oauth2/web-server#offline),
[Google : modèle code](https://developers.google.com/identity/oauth2/web/guides/use-code-model),
[Google : limites du modèle de jeton navigateur](https://developers.google.com/identity/oauth2/web/guides/use-token-model#token_expiration).
