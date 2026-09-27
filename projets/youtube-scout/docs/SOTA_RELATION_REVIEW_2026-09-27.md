# Revue sémantique de la direction remix — 27 septembre 2026

## Verdict

L'inclusion de `produced_by` dans la direction interne `remix` est **un contrat existant explicitement testé**, pas une conversion de crédit producteur en crédit remixeur. Supprimer cette relation du moteur sur la seule base du nom de direction serait une régression.

Le problème est de présentation : une direction publiquement intitulée « Remixeurs » peut également proposer les catalogues de producteurs. Le coordinateur a pris en charge le libellé « Remixeurs et producteurs » et l'aide distinguant les rôles, avec clé interne `remix` inchangée. Aucun fichier UI modifié par cette revue ; les tests ci-dessous portent sur le contrat métier, pas sur le rendu UI.

## Preuves locales

- `lib/catalogue.mjs` classe séparément les rôles Discogs et MusicBrainz en `remixed_by` ou `produced_by`.
- `lib/catalogue-graph.mjs:48` conserve les labels orientés « Remixé par / Remixe » et « Produit par / Produit ».
- `lib/catalogue-graph.mjs:108` et `:114` autorisent les deux motifs dans cette voie, sans les fusionner.
- `lib/catalogue-graph.mjs:159` à `:163` choisit l'explication selon la relation réelle et le sens de parcours.
- `lib/catalogue-progression.test.mjs:251` contient déjà le cas « producer credits remain distinct from remixer credits in the explanation », avec assertion « Par ce producteur : Artist 20 ».
- Le test précédent, à `:236`, vérifie également qu'une traversée inversée ne désigne pas l'artiste original comme remixeur.

## Validation contre l'existant

Aucun patch métier effectué ; l'existant est donc la baseline conservée. Exécution locale autorisée, sans requête externe ni serveur personnel :

```sh
node --test lib/catalogue.test.mjs lib/catalogue-progression.test.mjs
```

Résultat le 27 septembre 2026 : **2 fichiers passés, 0 échec**, code de sortie 0. Le runner disponible agrège ici par fichier. Cela vérifie les contrats simulés, pas l'exactitude de tous les crédits des fournisseurs en conditions réelles.

Il reste pertinent d'auditer séparément les rôles Discogs inconnus ou techniques avant qu'ils alimentent les collaborations : cette revue bornée ne conclut rien sur leur validité générale. Aucun nouveau test tautologique ni changement de moteur ajouté pour augmenter artificiellement la preuve.
