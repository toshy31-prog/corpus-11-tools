# CCT-EXEC 10.34 — accusé de lecture et effet du gate

## Lacune fermée

10.33 prouvait que le harnais recevait une configuration valide, sans montrer
qu’un composant à état l’avait chargée ni que chaque lecture produisait l’effet
correspondant.

## Gain concret

Un composant local conserve son état, accuse le hash chargé et expose l’état
avant/après. Après chaque transition, une tentative est observée par un acteur
déclaré distinct. Les hashes du contenu, de l’accusé, de la tentative et de
l’observation doivent coïncider.

La distinction d’acteurs reste déclarative et dans le même processus : aucune
identité de composant de production ni isolation n’est établie.

## Condition de retrait

Retirer cette couche si une configuration ignorée, un accusé périmé ou un effet
contraire à l’état chargé conserve l’admission.
