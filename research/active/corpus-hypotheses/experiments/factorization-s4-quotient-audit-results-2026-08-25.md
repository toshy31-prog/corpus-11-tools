# Audit quotienté exact — `S4` et reste de factorisation

Date : 2026-08-25

Script : `run_factorization_s4_quotient_audit.py`

## Question bornée

Après retrait exact de la droite constante commune
`span((1,1,1,1))`, le contraste d'intersection triple déjà observé dans la
représentation de permutation de `S4` conserve-t-il une information de survie
non triviale lors de l'ajout d'une quatrième factorisation ?

Cet audit est exploratoire et formel. Il ne reclassifie pas rétroactivement le
test antérieur ; il vérifie si son plancher fixe commun en expliquait seul
l'échec.

## Construction exacte

Chaque matrice de permutation fixe la droite constante. Pour tout ensemble de
transports `T`, la dimension quotientée est donc calculée exactement par

`Dq(T) = dim(intersection Fix(U) pour U dans T) - 1`.

Il ne s'agit pas d'une projection numérique ni d'un choix de base. Les rangs
restent rationnels exacts. La quatrième matrice identité est conservée comme
contrôle algébrique, mais exclue du verdict de survie : elle n'ajoute aucune
contrainte et ne peut constituer une factorisation prospective non triviale.

## Résultat

- `24` matrices de permutation et `2024` triplets ont été audités ;
- la clé quotientée `(2,2,2)/(1,1,1)` comporte `20` triplets : `16` avec
  `Dq3=0` et `4` avec `Dq3=1` ;
- les `400` ajouts non identitaires produisent trois strates appariées ;
- dans chaque strate, la moyenne de `Dq4` vaut `0` pour les deux groupes et
  `Delta_Dq4 = 0` ; la médiane exacte des contrastes est `0`.

Classification formelle : **`not_supported`**.

## Conclusion autorisée

Le retrait du sous-espace fixe commun supprime bien le plancher trivial, mais
ne restaure aucune survie prospective du reste quotienté dans cette
représentation `S4`. Le précédent résultat négatif n'est donc pas seulement un
artefact de l'usage de `D4 > 0` : dans les trois strates non triviales, le
reste `Dq3=1` s'effondre aussi à `Dq4=0`.

Cela établit uniquement une propriété de cette algèbre linéaire finie. Il ne
permet aucune conclusion sur un objet physique, une dynamique, le temps ou une
famille de transports différente.

## Condition qui renverserait cette lecture locale

Une famille de transports justifiée indépendamment, sans sous-espace fixe
commun, pourrait produire un contraste apparié non nul sous ajout prospectif.
Une telle observation ne peut pas être déduite de cette représentation et
exigerait une règle de construction explicitement liée au mécanisme étudié,
plutôt qu'une nouvelle recherche adaptative de catalogues favorables.
