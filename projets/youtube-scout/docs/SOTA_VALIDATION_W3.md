# Validation vague 3 — 27 septembre 2026

## Protocole isolé

Copie liste blanche package.json/server.mjs/server.test.mjs/lib/public/scripts/tests/patch vers `/tmp/scout-validation-w3-ikMU90`, aucune donnée personnelle/configuration/jeton. TMPDIR séparé `/tmp/scout-testdata-w3-h3PtaG`. Node18.19.1, aucun paquet installé. Garde fetch/http/https/dns loopback seulement, port4181 interdit, environnement vidé et garde héritée par enfants. Cette garde JavaScript ne constitue pas un sandbox réseau natif. Fixtures HTTP exclusivement locales ; aucun serveur utilisateur redémarré.

Commandes dans la copie :

```
env -i PATH=/usr/bin:/bin TMPDIR=/tmp/scout-testdata-w3-h3PtaG NODE_OPTIONS=--require=/tmp/scout-validation-w3-ikMU90/network-guard.cjs npm test
env -i PATH=/usr/bin:/bin npm run check
```

## Snapshot initial

780/780 tests PASS ; zéro échec/skip/annulation, 17,534 s. Check code0. Logs test-output.txt/check-output.txt dans copie. Snapshot final à compléter après stabilisation du banc identité ; ce résultat initial ne valide pas les éditions ultérieures.

Deuxième snapshot après stabilisation identité : 782/782 PASS, 16,253 s, check0. **Ce n'est pas le snapshot final** : une revue exploratoire indépendante a ensuite identifié une perte de route remix liée à l'ordre des arêtes dans `catalogue-graph`. Cette découverte malgré une suite verte illustre la limite de couverture ; correction et revalidation supplémentaires nécessaires.

## Snapshot final n°3

Dernier snapshot inclut correction motif catalogue, test de permutations, oracle indépendant, index identité figé, métriques aveugles et intégration DOM. Logs `final3-test-output.txt` / `final3-check-output.txt` dans copie ; `npm run check` code0. Empreintes ci-dessous comparées aux fichiers actuels identiques après exécution.

**787/787 tests PASS**, zéro échec/skip/annulation, durée 15,764 s. Le défaut découvert après le deuxième snapshot est corrigé et ses nouveaux tests sont inclus dans cette exécution.

Addendum après ce run : un cinquième cas du seul fichier `catalogue-motif-order.test.mjs` vérifie retour au seed et motif au-delà de deux sauts. Recopié puis exécuté isolément (`node lib/catalogue-motif-order.test.mjs`) : 5/5 PASS, code0. Nouvelle empreinte de ce test : `7e6ed7aebfa1b130fe602166c8205f05a13fbdddd5b3e483561928ed326dece3`. Aucun changement production ; ne pas additionner les 5 cas aux 787 comme s'ils étaient tous nouveaux.

```
257ec3518b4217ac10fec2e4392b0602b0ba3a990f24c22c33e2222d9e24a01e lib/catalogue-graph.mjs
abb4eb90d46716b4f46049716d269e24f1cfaad1f199171b09c040cc8446a5c6 lib/catalogue-motif-order.test.mjs
841bf394af02bd3c8787209cd055e33f778d269fa367d04eacadb8ebceaaea67 lib/catalogue-motif-oracle.test.mjs
ac2b20a0b01ca658f8ca95f513b3c7c3850625ec8b0a8ac5405a6c90df1349ef lib/identity-candidate-index.mjs
c28f49ff45a9ae8f5215a9b581f1c5e228d9230812d86639dfa1cbf300678c23 public/discovery-frontier.mjs
506276c2ec0982532164224fd1a44d943a4820bb6ca577077dcee0aeceda6320 scripts/blinded-discovery-evaluation.mjs
```

## Consolidation finale unique (snapshot n°4)

**788/788 tests PASS**, zéro échec/skip/annulation, durée 15,017 s ; `npm run check` code0. Ce run inclut le dernier cas anti-boucle et remplace les comptes provisoires pour la synthèse finale. Logs `final4-test-output.txt` / `final4-check-output.txt` dans `/tmp/scout-validation-w3-ikMU90`. Empreintes du catalogue, de son test final (`7e6ed7ae…dece3`), de l'index identité, du frontier et du test DOM comparées à nouveau : copie et sources actuelles identiques. Aucune modification production pendant cette consolidation.

## Revue et portée détaillées

- UX : trois scénarios utilisant le vrai panneau monté et ses handlers ; DOM synthétique structurel, pas navigateur/layout/Tab ni lecteur d'écran. Confirmation après récupération simulée au niveau modèle. Annulationtransport/session prouvée séparément par tests W2, pas par callback UX seul.
- Découverte : clé de chemin désormais tuple JSON, évitant ambiguïté de délimiteurs ; preuve bornée à la fidélité des chemins, non à pertinence musicale.
- Banc aveugle : paquet juge ne contient ni nom de méthode ni rang ; clé coordinatrice séparée. Cela réduit les indices de présentation, sans garantir indépendance des juges ni fournir leurs notes.
- Banc identité : corpus et références hors application, absent/present déterminés séparément des résultats ; pas preuve API réelle ni généralisation à un second corpus.

Toutes les assertions de résultat restent liées au snapshot, aux fixtures et au protocole ; pas de parité globale SOTA ni effet observé sur la session utilisateur.
