# Audit des interactions — Scout 0.14.2

Date : 19 septembre 2026. Périmètre : application locale, correctifs non publiés.

## Conclusion

Les captures signalaient un échec réel du parcours, malgré les tests de logique précédents. La sélection d’un morceau pouvait aboutir à une identification bloquée, cachée derrière des panneaux techniques, sans champ permettant de corriger le nom de l’artiste. Les commandes affichées ne correspondaient pas toutes aux actions alors possibles.

Le parcours est maintenant : choisir un départ → confirmer l’artiste si nécessaire → consulter des découvertes → éventuellement affiner ou demander une autre recherche. Les tests navigateur exigent des effets visibles et un état conservé, pas seulement l’absence d’exception.

## Correctifs et reproductions

1. **Confirmation inopérante sur un morceau seulement présent dans le navigateur.** L’envoi de la seule relation artiste laissait son extrémité vidéo absente du graphe serveur. La relation ne pouvait plus être utilisée après assainissement. Les deux mécanismes de confirmation transmettent maintenant les entités nécessaires et la relation dans la même ingestion. Test navigateur : import réel de fixtures → confirmation → résultats effectivement reliés au label → rechargement/reprise.
2. **Boucle d’identification sans correction.** Un formulaire visible propose les fiches locales ou une recherche par nom. « Space Travel — Nexxor » fournit Nexxor comme indice de recherche, jamais comme identité automatique. La validation reste un clic utilisateur, limité à ce départ ; elle ne confirme pas l’enregistrement exact. Une panne conserve un champ modifiable. Une confirmation peut être révoquée depuis la fiche du départ.
3. **Réglages incohérents au départ.** La sélection initiale des directions alimente désormais leurs poids ; choisir seulement Labels ne démarre plus avec huit directions actives. Les commandes inutilisables sont masquées pendant l’identification.
4. **Effets de bord des suggestions.** Composer ou renouveler des suggestions de la bibliothèque ne réinitialise plus les recherches ni les résultats du parcours actif. Deux modes distincts remplacent le formulaire unique : recherche directe / idées issues des playlists. Préférences et détails des suggestions restent facultatifs.
5. **Consultation d’onglet déclenchant une recherche.** Les huit onglets consultent uniquement leur direction. L’appel catalogue nécessite une action explicite. Les réglages locaux et la pagination locale ne déclenchent pas de recherche fournisseur.
6. **Import actif sans sélection.** « Tout désélectionner » désactive réellement l’import. L’état occupé est conservé pendant une opération.
7. **Fermeture et interruption.** Échap ferme le choix de départ même depuis une recherche renseignée. L’identification propose un arrêt visible et, après interruption, une action de récupération modifiable.
8. **Conservation de saisie.** Les rendus du même départ réutilisent le formulaire de correction. Les réponses tardives sont contrôlées par génération, départ et révision de requête.

## Contrôle des données existantes, sans écriture

Sur le graphe local observé, le morceau « Space Travel » existe mais ne dispose pas d’un artiste confirmé utilisable : zéro candidat Label. Une simulation **uniquement en mémoire**, ajoutant le choix explicite de la fiche Discogs Nexxor, rend accessibles 21 candidats Label, 6 Collaborations et 26 Période. Aucun des candidats ainsi calculés n’a pour artiste 808NOCHE ou KAS:ST. Les autres directions examinées sont vides.

Cette simulation ne constitue ni une confirmation de l’artiste par l’utilisateur, ni une vérification actuelle du catalogue distant. Aucun choix, nettoyage ou effacement n’a été appliqué à la bibliothèque personnelle. Une période commune reste insuffisante pour créer une relation musicale ; les tests existants de contexte et de reprise obsolète sont conservés.

## Couverture d’interactions

| Zone | Actions réellement exercées |
| --- | --- |
| Connexions | ID OAuth invalide/valide et mémoire ; API refusée/valide ; fermeture après vérification ; revérification ; OAuth simulé ; actualisation des playlists ; déconnexion ; jeton Discogs vide/malformé/refusé/valide ; suppression annulée/confirmée |
| Import | URL invalide/valide ; tout sélectionner/désélectionner ; case individuelle ; import de 18 vidéos fictives par le vrai formulaire et stockage |
| Outils annexes | formulaire Bandcamp URL incorrecte/correcte, artiste/titre/label/pistes ; fichiers JSON incorrect/correct ; ISRC invalide/valide et territoire ; fournisseurs non configurés |
| Sauvegarde | téléchargement ; absence des identifiants fictifs ; rejet d’un fichier invalide sans perte ; suppression annulée/confirmée puis restauration de la bibliothèque fictive |
| Choix du départ | ouverture souris/clavier ; quatre types ; pagination ; recherche vide/sans correspondance ; choix sans direction facultative ; changement pendant une réponse retardée ; fermeture ; séparation recherche/suggestions |
| Identification | titre cité dans les captures ; champ prérempli comme indice ; panne puis nouvelle saisie ; absence de candidat ; candidat non confirmé automatiquement ; confirmation ; révocation ; re-confirmation ; arrêt |
| Découvertes | résultats graphiquement reliés ; huit poids ; diversité ; distances 3/6/9 ; réinitialisation des réglages ; pagination locale ; preuve repliable ; garder ; continuer ; retour ; reprise explicite |
| Directions | huit onglets sans appel réseau ; clavier Home ; mettre de côté/reprendre ; recherche explicite et arrêt |
| Suggestions | quatre présélections ; sept critères activés/désactivés ; hasard ; durée invalide/valide ; masquer les vues ; composer ; renouveler tout/une carte ; épingler ; marquer vue ; maintien du parcours actif |
| Carnet | note ; classement À écouter ; filtres texte et statut ; export ; suppression et annulation conservant la note ; persistance après rechargement |
| Présentation/sécurité | bureau et largeur 390 px ; débordement ; cibles de taille utilisable ; listes bornées ; preuve de hauteur bornée ; injection HTML/URL ; secrets dans sauvegarde ; anciens résultats hors contexte exclus sans effacement de l’historique |

L’inventaire des éléments visibles est enregistré avec le rapport du navigateur. Le nombre d’éléments observés n’est pas un nombre de fonctions testées : un même contrôle réapparaît dans plusieurs états. Les variantes de chaque valeur et chaque combinaison de direction ne sont pas exhaustives.

## Validation reproductible

Exécutions locales ; Node système 18.19.1 pour les tests, Node 24.19.0 et Playwright du runtime pour les navigateurs.

- `npm test` : 542/542.
- `npm run test:adversarial` : 51/51, inclus dans les 542 (ne pas additionner).
- `npm run check` et `npm run check:workflow` : succès.
- `git diff --check` : succès.
- `SCOUT_AUDIT_BROWSER=firefox npm run audit:workflow` : 46 contrôles, 129 actions explicitement enregistrées ; événements DOM complémentaires dans le rapport.
- `SCOUT_AUDIT_BROWSER=chromium npm run audit:workflow` : mêmes 46 contrôles.
- `SCOUT_AUDIT_BROWSER=firefox SCOUT_AUDIT_LIBRARY_SIZE=4249 npm run audit:browser` : 31/31. Il s’agit du volume chargé dans le navigateur, pas d’une preuve d’import réel de 4 249 vidéos via YouTube.
- `npm run audit:connections` : 12 scénarios Chromium, services simulés.

Dans cet environnement, préfixer les commandes navigateur par `SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs` et placer le dossier `dependencies/node/bin` du même runtime en tête de PATH. Les tests HTTP/navigateur nécessitent l’autorisation d’ouvrir des sockets locales.

Les scripts créent leur serveur, stockage et profil temporaires. Ils n’ouvrent pas le profil Firefox personnel. Les rapports JSON et captures sont annoncés à chaque exécution dans `/tmp/scout-workflow-ui-*`, `/tmp/scout-consolidation-ui-*` et `/tmp/scout-connection-audit-*`.

Derniers artefacts observés dans cet environnement :

- Firefox parcours : `/tmp/scout-workflow-ui-ZNUrvU/report.json` (46 contrôles, 129 actions enregistrées, 253 événements DOM complémentaires).
- Chromium parcours : `/tmp/scout-workflow-ui-6z8EZA/report.json` (46 contrôles).
- Volume Firefox : `/tmp/scout-consolidation-ui-KPzF0l` (31 contrôles).
- Connexions Chromium : `/tmp/scout-connection-audit-GTbUwU` (12 scénarios).

## Mise en service locale observée

Le processus écoutant sur 4181 a été identifié avec son dossier de travail, puis seul ce serveur a été arrêté et relancé. `GET /api/health` renvoie HTTP 200, `status: ok`, version `0.14.2`. Les octets servis pour `app.js`, `workspace.mjs`, `workspace.css`, `departure-workflow.mjs`, `scout-mixer-panel.mjs` et `scout-mixer-panel.css` correspondent aux fichiers locaux corrigés (comparaison SHA-256).

Le SHA-256 du fichier personnel `.data/scout-store.json` est inchangé avant/après ce redémarrage. Le profil Firefox personnel n’a pas été manipulé ; il faut recharger son onglet pour utiliser le nouveau JavaScript. Cette observation du serveur ne vaut pas validation des appels distants personnels.

## Limites de release

- Aucun appel réel MusicBrainz/Discogs autorisé et exécuté dans cet audit ; disponibilité, quotas et pertinence des réponses distantes non validés ici.
- Le consentement Google est simulé. Les sessions personnelles et la lecture audio YouTube ne sont pas testées.
- Spotify/Apple Music réels non configurés/testés ; seul leur formulaire et le retour non configuré sont exercés.
- Aucun test sur téléphone physique, ni audit exhaustif de lecteur d’écran.
- Ce n’est pas une certification « zéro bug » ni un bug bounty indépendant. Les tests adversariaux sont locaux et bornés.
- Modifications locales ; aucun commit, push ou publication de release.

Les compétences change-validation et protocol-robustness ont guidé la distinction entre correctif écrit, scénario navigateur observé et résultat externe non vérifié. La revue method-effect-audit a conduit à remplacer les seules assertions de texte par des vérifications d’effets utilisateur et d’absence d’effets de bord.
