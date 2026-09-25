# Scout 0.17.0 — identité du départ et maîtrise du parcours

## Périmètre

Évolution de l’existant 0.16.0 et des travaux locaux déjà présents, sans reconstruction, suppression de bibliothèque ni fusion par nom. Les tris aléatoires, départs typés, mémoire des suggestions, accès Google renouvelable optionnel et protections de restauration restent en place.

Les captures et le graphe local ont montré deux erreurs différentes : une identité catalogue prise pour l’interprète du morceau (MALO, Release), et des contrôles de diversité contournés par le tri chronologique (co-crédits EDGE). Une chaîne de relations affichée n’est pas une preuve si son premier lien est faux.

## Changements

- Chaque nouveau départ vidéo attend désormais une validation du titre/artiste. Aucun enrichissement distant ne part avant ce geste. La saisie conserve ses nœuds DOM, sa sélection et son texte pendant les autres rendus.
- « Corriger le titre ou l’artiste » dans la fiche du départ rouvre les valeurs enregistrées. La validation conserve le titre original, annote ce morceau, invalide ses anciennes découvertes et relance le digger. Une annotation textuelle n’est pas une fusion ni un identifiant catalogue.
- Chaque correction reçoit une révision. L’API refuse avec HTTP 409 une réponse d’identification calculée avant cette révision, ainsi qu’une correction concurrente obsolète. En cas d’échec disque, la correction ne reste pas silencieusement dans l’état mémoire.
- Une correspondance entre catalogues ne suffit plus à promouvoir `video → probable_artist`. Une concordance d’identifiant avec les crédits d’un enregistrement résolu, ou un choix explicite, est nécessaire. Le bon enregistrement reste utilisable même si la recherche d’artiste par nom renvoie un homonyme.
- Les anciens liens non étayés sont rétrogradés dans une projection de lecture, sans effacer les preuves sources. Les anciennes révisions ne routent plus ; les anciens curseurs de catalogue sont recalculés. Une reprise de session d’ancienne version demande de revoir le départ vidéo.
- Les noms locaux ne servent plus de pont automatique entre identifiants catalogue homonymes. Le résolveur utilise le parseur de métadonnées commun, notamment son exclusion des chaînes génériques comme « Release - Topic ».
- Le filtre des autres artistes prend aussi en compte les crédits des enregistrements `resolved`. La diversité compte les co-artistes individuellement et s’applique aux pages triées par date/titre. À diversité zéro, l’ordre reste strict. Aucune piste n’est supprimée du vivier.
- Les directions partielles exposent leur motif disponible : limite de lecture par recherche, identité à préciser, source non configurée/indisponible ou liens documentés parcourus.

## Épreuves

Commande de suite complète, sans identifiants Google hérités :

```sh
SCOUT_GOOGLE_CLIENT_ID='' SCOUT_GOOGLE_CLIENT_SECRET='' node --test server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs
```

Audit navigateur isolé : `scripts/evolution-browser-audit.mjs`, dans Firefox puis Chromium, avec le runtime Node 24 et Playwright embarqués. Les serveurs, bibliothèque et identités sont synthétiques ; les fournisseurs sont simulés et les sorties externes du navigateur interceptées. Le scénario vérifie notamment l’absence de requête avant validation, la persistance de la correction, le rejet d’une ancienne réponse, la réédition depuis l’historique, le changement de type après une saisie non enregistrée et la conservation des labels utiles aux autres morceaux. Captures à 1440, 820 et 390 pixels.

Relecture hors réseau du graphe personnel : 6 785 entités, 19 782 relations ; 27 relations d’artiste automatiques non étayées écartées du routage, sources intactes. Les chemins erronés partant de MALO et Release ne produisent plus de candidats label. Cette épreuve établit une exclusion de fausses routes, pas la découverte de nouveaux morceaux réels.

Les tests de logique ajoutent des homonymes synthétiques, un crédit exact positif, une ancienne révision, un choix utilisateur, un échec de stockage et plusieurs collaborations partageant le même artiste. Les tests anciens de confirmation automatique ont été précisés : un accord entre catalogues doit désormais être accompagné d’un crédit exact pour confirmer ce morceau.

Les skills Corpus de validation du changement, d’effet de l’interface et de robustesse ont guidé la séparation entre données conservées, liens admissibles, geste utilisateur, tests simulés et activation réelle.

## Limites et coûts

- Le routage est plus conservateur : un départ ancien peut demander une confirmation et présenter moins de résultats. Aucun artiste n’est inventé pour remplir une page.
- Les noms saisis aident la recherche mais ne garantissent pas qu’un enregistrement figure dans MusicBrainz/Discogs. Les appels réels aux fournisseurs n’ont pas été rejoués pour certifier la pertinence musicale.
- Une recherche peut rester partielle pour une limite de requêtes, une source indisponible ou des données absentes. Ces situations ne sont pas masquées par un statut de réussite.
- Google conserve ses règles d’expiration/révocation. Le renouvellement serveur de 0.16 exige toujours une configuration et un consentement explicites ; aucun secret n’a été créé, déplacé ou activé pour cette livraison.
- Pas de modification des playlists YouTube, de publication, de push ou de commit automatique. Les autres modifications locales antérieures sont conservées.

## Activation

Le redémarrage local a été explicitement autorisé par l’utilisateur après les tests. Activation effectuée le 22 septembre 2026 à 00:59 (Europe/Paris, 21 septembre 22:59 UTC).

- Suite complète finale : **662 tests réussis, zéro échec** ; journal `/tmp/scout-017-tests-verified.log`.
- Firefox : **26 contrôles réussis**, rapport `/tmp/scout-evolution-ui-J1UQdX/report.json`.
- Chromium : **26 contrôles réussis**, rapport `/tmp/scout-evolution-ui-S8CRaO/report.json` ; capture mobile du formulaire revue visuellement.
- Vérifications syntaxiques de `public/app.js`, `server.mjs`, `public/scout-mix-session.mjs` et `git diff --check` réussies.
- Seul le serveur Scout identifié sur 4181 a été redémarré (ancien PID 10597, nouveau PID 48907), avec le même exécutable, répertoire et environnement, sans exposition de secrets.
- `/api/health` répond **0.17.0** ; `/app.js` contient `CLIENT_VERSION = '0.17.0'` ; `/departure-integrity.mjs` est servi.
- Sauvegarde privée vérifiée : `.data/backups/pre-0.17.0-2026-09-21T22-59-28.285Z.json` (permissions 600).
- Le SHA-256 du stockage avant arrêt, après arrêt et après activation est identique : `a6ccad66247aa18bde7b3b7d06057f7131fdb6391ebf331cd1b2bd223bfcc11d`. Les compteurs restent identiques : 6 785 entités, 567 claims, 19 782 relations, 0 observations, 13 événements, 1 759 entrées de cache et 2 périmètres de synchronisation.

Cette activation vérifie le service local et la continuité de son stockage. Elle ne constitue ni un essai réel des catalogues externes, ni une certification exhaustive des recommandations musicales. Le navigateur personnel n’a pas été rechargé automatiquement : recharger la page pour utiliser le nouveau client.
