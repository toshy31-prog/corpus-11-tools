# CCT-EXEC 6.0 — accord inter-témoins du journal (candidate)

La signature du journal ajoutée en 5.9 n'empêchait pas son opérateur de signer deux racines différentes de même taille et de montrer une vue à chaque lecteur. Cette couche exige deux témoins à clés épinglées, contrôleurs et domaines de défaillance distincts du journal, des gardiens et l'un de l'autre. Ils doivent signer exactement le même identifiant de journal, la même taille et la même racine, entre l'intégration et l'accès aux résultats.

La confrontation tenue à l'écart fournit au second témoin une autre racine, elle aussi correctement signée par ce témoin. L'inclusion locale 5.9 reste valide, mais l'accord 6.0 échoue : le contrôle discrimine donc une vue locale valide d'une tête effectivement corroborée.

Les témoins, clés, données et ticks sont **synthétiques**. Ce mécanisme borné n'établit ni réseau externe, ni gossip, ni cohérence entre tailles successives, ni résistance globale à une partition où chaque vue disposerait de son propre quorum, ni autorisation, déploiement ou robustesse externe.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
