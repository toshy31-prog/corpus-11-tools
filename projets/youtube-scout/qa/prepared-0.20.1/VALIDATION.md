# Validation du paquet préparé

- Node 18.19.1 : `node --test --test-reporter=tap server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs` — 724/724 réussis.
- Node 24.19.0 : même commande avec le runtime fourni — 724/724 réussis.
- `npm run check` — code de sortie 0.
- Application du patch sur une nouvelle copie isolée : les 15 empreintes finales correspondent au manifeste.
- Navigateur réel, page synthétique isolée : 37 vidéos inconnues masquées puis réaffichées, bouton sans nouvelle recherche, options de collaboration indépendantes, pagination préservée, compteur limité à YouTube, options cachées lorsque le filtre strict est désactivé.
- La page et le serveur temporaires de test ont été fermés. Aucun rechargement de la page utilisateur ni redémarrage de Scout 4181.

Les essais ne constituent pas une validation musicale réelle. Le manifeste et le patch décrivent le paquet initial préparé.

## Activation autorisée le 22 septembre 2026

- Seul l'ancien serveur Scout sur 4181 a été arrêté ; redémarrage avec le même exécutable et le même environnement, conservé en mémoire sans exporter de secrets.
- Sauvegarde des deux fichiers de données et des fichiers de code remplacés : chemin dans ACTIVATION.json.
- Empreintes initiales du patch et des fichiers vérifiées avant application ; 15 empreintes finales conformes.
- Version active 0.20.1 et cinq modules front servis vérifiés par HTTP.
- `npm run check` sur les fichiers installés : réussi.
- Suite complète sur les fichiers installés, Node 18.19.1 : 724/724 réussis (activation-test-results.tap).
- Après la suite : version toujours 0.20.1 et données identiques à leurs empreintes sauvegardées.
- L'onglet utilisateur n'a pas été rechargé ; aucun parcours musical réel ni connexion Google lancé.
