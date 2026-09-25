# Scout 0.20.0 — corrections préparées

Statut : activées le 22 septembre 2026 après accord explicite. Scout 0.20.0 répond sur 4181 ; la version, les huit modules modifiés servis et les empreintes des deux fichiers de données ont été vérifiés. Voir ACTIVATION.json pour le constat et le chemin de sauvegarde. Le manifeste conserve les empreintes du paquet préparé.

717 tests automatisés passants sur le code final, vérifications de syntaxe et contrôles dans le navigateur sur données fictives. Détails dans VALIDATION.md et test-results.tap.

Le patch cible uniquement les fichiers du manifeste. Vérifier leurs empreintes initiales avant application. Sauvegarder les données et obtenir l’accord de redémarrage avant toute activation. Ne pas appliquer sur un serveur actif : les fichiers front-end sont servis directement.

Aucune donnée personnelle ni secret dans ce paquet. Les tests musicaux finaux restent à effectuer par l’utilisateur après activation.

## Vérification après activation

- `npm run check` : réussi.
- Suite complète avec Node 24.19.0 : 717 tests, 717 réussites (activation-node24-test-results.tap).
- Suite complète avec Node 18.19.1, runtime du serveur : 717 tests, 717 réussites (activation-node18-test-results.tap).
- Recontrôle après les deux suites : Scout répond toujours en 0.20.0 et les deux fichiers de données conservent leurs empreintes sauvegardées.
- Le premier essai dans le bac à sable a échoué sur six fichiers de tests HTTP : ouverture des ports locaux interdite (`listen EPERM`, reproduit directement sur multi-participant-http.test.mjs). Ce résultat est conservé dans activation-test-results.tap ; il ne constitue pas un résultat passant. La suite Node 24 a ensuite été rejouée avec permission d’ouvrir les serveurs temporaires.
- Aucun parcours musical réel ni connexion Google n’a été lancé pendant l’activation.
