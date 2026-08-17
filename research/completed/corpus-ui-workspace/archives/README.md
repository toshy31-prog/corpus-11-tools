# Archive du prototype Corpus Workspace

`corpus-ui-workspace.bundle` est une sauvegarde Git complète du dépôt local du prototype lors de sa clôture.

Elle contient la branche `main`, l’historique de conception et d’implémentation, le compagnon local et le rapport de clôture. Elle n’inclut pas `node_modules`, les caches, les secrets ni les sorties de construction.

## Vérifier

```sh
sha256sum -c corpus-ui-workspace.bundle.sha256
git bundle verify corpus-ui-workspace.bundle
```

## Restaurer

```sh
git clone corpus-ui-workspace.bundle corpus-ui-workspace
```

Cette archive conserve une trace récupérable. Elle ne réactive pas le projet et n’établit ni qualité UX, ni adoption, ni robustesse opérationnelle.
