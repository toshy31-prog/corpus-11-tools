# État courant

Le score initial `0,1` reste exact pour ses quatre lignes mais ne suffisait pas
à identifier une calibration. Dans le registre fictif daté de vingt lignes, la
règle stratifiée obtient `4/25`, la surconfiance `73/400` et la base `1/4` ; la
décomposition exacte explique l’ordre. Portée `formal_exact`.

La description « générateur indépendant » est `weakened` : la fonction ne lit
pas les probabilités rivales à l'exécution, mais les issues et les rivaux sont
co-conçus dans le même fichier. Le résultat établit une séparation de code, pas
une indépendance d'évidence.

## Prochaine action interne utile

Introduire une dérive fictive fixée avant exécution et vérifier si le classement
survit à des fenêtres temporelles appariées et à une autre règle propre.
