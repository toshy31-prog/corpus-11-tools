# Validation indépendante — vague 2, 27 septembre 2026

## Protocole

Copie sur liste blanche de package.json, server.mjs, server.test.mjs, lib, public, scripts, tests et patch dans `/tmp/scout-validation-w2-1xozQn`. Pas de `.data`, `.env`, vendor, tokens ni données personnelles. Fixtures synthétiques dans `/tmp/scout-testdata-w2-oOJsT2`, distinct de la racine web. Node 18.19.1 ; aucun paquet installé ni service existant redémarré.

Même garde réseau que la première vague, préchargée dans les processus enfants : fetch/http/https/dns limités à loopback, port 4181 refusé. Ce garde-fou JavaScript n'est pas un sandbox réseau natif ; les tests sont inspectés et n'utilisent pas de transport brut alternatif. L'environnement est vidé avec `env -i`, aucune variable de jeton héritée. L'exécution hors restriction listen du sandbox sert seulement les fixtures locales éphémères.

Commandes :

```
env -i PATH=/usr/bin:/bin TMPDIR=/tmp/scout-testdata-w2-oOJsT2 NODE_OPTIONS=--require=/tmp/scout-validation-w2-1xozQn/network-guard.cjs npm test
env -i PATH=/usr/bin:/bin npm run check
```

## Premier snapshot

768 tests PASS, zéro échec/skip/annulation, durée 14,970 s. `npm run check` code 0. Logs conservés dans la copie : `test-output.txt`, `check-output.txt`. Ce premier snapshot précède le dernier renfort de permissions du fichier temporaire et le banc identité : ne pas le présenter comme validation finale de ces ajouts.

## Snapshot final n°2

768/768 tests PASS, zéro échec/skip/annulation, durée 15,924 s ; `npm run check` code 0. Logs `final-test-output.txt` et `final-check-output.txt`. Inclut le chmod du temporaire existant et le script de banc identité (ce dernier n'est pas exécuté par npm test ; ses résultats externes font l'objet du rapport identité). Pas d'échec de produit constaté entre les deux snapshots.

Empreintes SHA-256 du snapshot :

```
940626aa0b2ded6cb07bb3a00fc2f8345da0bc11b4fed2ac7e9cb51e9d626259 lib/source-runtime.mjs
d2da67d83e040a11a0d488411c952da3ed25c773ea0908134853eb4c36a09ae8 lib/ephemeral-exploration.mjs
595d2df7dac644f7e981e189e6ae80cb52aafa74f03d74568abbcfccfd0e09a2 lib/persistent-store.mjs
9becdef3c5f73ec90fb186e323048e67dbb77631f538b36efacafe469dc79e13 lib/track-candidate-score.mjs
804c9ab81dee63db0b3ffa6aaa4b0863cebdac7705c4e52622ad39232952a86b public/scout-mixer-panel.mjs
db04f95a5810e53dd69d11e94e73c33e6ed31b9728bd59ba18f7f2b13f93fab5 scripts/evaluate-external-musicbrainz.mjs
```

## Revue indépendante détaillée

- Stockage : ordre écriture → fsync fichier → fermeture → rename → fsync répertoire correct. Erreur après publication explicitement distinguée d'un rollback ; état des décisions personnelles aligné avec publication quand la durabilité reste incertaine. Injection avant publication et après rename vérifiée. Point signalé à l'auteur : mode 0600 fourni à open ne resserre pas un temporaire existant ; corrigé par chmod explicite et test d'un temporaire 0666, inclus au snapshot final.
- UX : `revealIdentityChoice` vise les véritables panneaux du départ courant, exclut les panneaux cachés et ouvre les détails avant focus. Aucun choix d'identité ni appel catalogue implicite ajouté. Tests synthétiques, pas rendu navigateur observé.
- Session/runtime : tests de fermeture/expiration déclenchée, composition signal appelant, annulation de file et transport, isolation d'une deuxième session, statut idle et absence de panne artificielle. L'expiration reste paresseuse, sans minuteur global.

## Portée

Ces résultats prouvent la non-régression de ce snapshot et les contrats synthétiques testés. Ils ne prouvent ni récupération après coupure réelle, ni qualité musicale indépendante, ni parité avec les moteurs industriels, ni effet sur la session utilisateur ouverte.
