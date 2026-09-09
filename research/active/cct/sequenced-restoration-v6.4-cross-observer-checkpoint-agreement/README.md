# CCT-EXEC 6.4 — accord inter-observateurs sur le checkpoint (candidate)

La mémoire monotone unique de 6.3 peut être isolée ou restaurée. Cette candidate exige avant décision deux observations signées du pin courant, issues d'identités, contrôleurs et domaines de panne distincts. Toute vue de taille ou racine divergente bloque l'action, même lorsque la preuve locale 6.3 reste valide.

Ce mécanisme détecte une divergence présentée ; il ne garantit ni visibilité complète des observateurs, ni résolution de partition, ni durabilité externe des pins. L'absence d'accord produit donc un refus, pas le choix arbitraire d'une branche.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
