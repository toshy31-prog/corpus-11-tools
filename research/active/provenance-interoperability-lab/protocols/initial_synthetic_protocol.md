# Cycle synthétique initial — reçu de conclusion et deux profils d'échange

## Construit et portée

Le construit est la conservation d'un **noyau sémantique de reçu de conclusion**
à travers deux adaptateurs déclarés : un profil inspiré de PROV et un profil
en graphe inspiré de RO-Crate. Le statut est `pipeline_verified` : les champs
déclarés sont vérifiés dans ces adaptateurs locaux, non dans les formats ou
outils externes réels.

## Définition opérationnelle

Le noyau comprend l'identifiant et le texte de la conclusion, sa portée, les
identifiants et empreintes de sources, les transformations et la condition de
retrait. Une note d'affichage est intentionnellement hors noyau : sa perte doit
être détectée, non masquée comme une conservation complète.

## Générateur, paramètres et invariants

- Générateur : fixture JSON synthétique et adaptateurs purs dans
  `tests/test_initial_protocol.py`.
- Paramètres : un reçu, deux profils, ordre d'encodage/décodage déclaré.
- Invariants : même noyau canonique avant/après; aucune source ou transformation
  nouvelle; portée et condition de retrait identiques; perte explicite de la
  note hors noyau.

## Contrôles et effet de méthode

Les deux profils sont appariés au même reçu. Le test contrôle la conservation
de champs structurés, mais son propre schéma peut masquer ce que ces champs ne
représentent pas (autorité, sémantique d'un outil externe, sérialisation ou
interprétation humaine). Les adaptateurs sont écrits dans le même dépôt et ne
sont donc pas indépendants.

## Résultat qui retirerait la conclusion

Un seul écart de noyau, une création/suppression silencieuse de provenance ou
une note hors noyau présentée comme conservée retire le verdict. L'équivalence
avec PROV ou RO-Crate réels requiert ensuite des validateurs et adaptateurs
externes indépendants.
