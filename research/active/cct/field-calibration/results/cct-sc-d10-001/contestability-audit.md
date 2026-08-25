# Audit exact du seuil de contestabilité D10

## Conclusion

La valeur `24/32` est exactement produite par 3/4 cellules fonctionnelles canal–perturbation sous le seuil. Distribution des multiplicités : `8` pour 4 cellules; elles proviennent des axes inactifs pour ce proxy (load, rhythm, environment). Ce décompte ne constitue pas autant de preuves indépendantes, ni une observation de trace inutilisable.

Portées : carte du seuil `formal_exact`, reconstruction `pipeline_verified`, trace et recours `unknown`.

## Équation et cellules

`margin = contestability - 9/25*channel - 6/25*perturbation - 1/2` avec contestabilité configurée `3/5`.

| Canal | Perturbation | Seuil exact | Marge exacte | Proxy passe | Multiplicité |
|---:|---:|---:|---:|---|---:|
| 1/10 | 1/10 | 14/25 | 1/25 | oui | 8 |
| 1/10 | 1/2 | 82/125 | -7/125 | non | 8 |
| 9/20 | 1/10 | 343/500 | -43/500 | non | 8 |
| 9/20 | 1/2 | 391/500 | -91/500 | non | 8 |

## Paire de représentations

La représentation continue conserve la marge et la représentation binaire applique `indicator(marge >= 0)`. Elles ne discriminent pas deux modèles : le bit est une transformation déterministe qui perd la distance au seuil. Le gain d'évidence indépendante est nul.

La marge relative D10–témoin vaut `3/25` dans toutes les lignes de la variation. Le proxy absolu peut néanmoins passer sous zéro.

## Validité du construit

Verdict : `proxy_substitution`. Aucun journal O3, motif, ressource saturée, voie de recours, correction, restitution ou contre-récit n'est généré. Le test porte sur un score configuré, non sur l'utilisabilité d'une trace.

Condition de retrait : Withdraw the map if any campaign row depends on an inactive axis, an inclusive threshold is implemented differently, or the reconstructed cells no longer match the recorded classifier.
