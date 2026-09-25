> **DOCUMENT HISTORIQUE** — les nombres de tests, statuts et étapes ci-dessous décrivent le moment de leur rédaction. Pour l’état courant, voir `README.md`.

# État actuel

## Validé avant ce pack

- 303/303 tests verts.
- Shadow audit corpus : 3881 entrées.
- `preferredSetDivergences = 0`.
- `variantRelationDivergences = 0`.
- Architecture v16 : READY.
- Algèbre de relation, support et décision centralisée.
- Smoke test Bibliothèque & sources : fonctionnel.
- Restauration backup : fonctionnelle.
- Sélection/désélection playlists : fonctionnelle.
- Import playlists : fonctionnel.
- Diagnostic : fonctionnel.
- Explorer : techniquement fonctionnel mais restaure un départ Kosh inattendu.

## Anomalie prioritaire

Le problème n'est pas "Kosh" en soi. Le problème est la frontière d'état entre :

- état persistant technique,
- état de session,
- état courant visible,
- mémoire volontaire utilisateur.

Le comportement cible n'est donc pas de "supprimer Kosh", mais de supprimer la possibilité qu'un vieux seed/front devienne automatiquement l'intention active.
