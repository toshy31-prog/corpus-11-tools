# CCT-EXEC 10.16 — liaison probante adressée par contenu

## Lacune fermée

La couche 10.15 pouvait comparer des empreintes déclarées sans vérifier
qu’elles correspondaient aux contenus remis. Des identifiants cohérents mais
inventés, ou un échange d’artefacts entre sources, restaient possibles.

## Gain concret

La couche recalcule SHA-256 sur les contenus de données, cadre, générateur,
protocole et issue, ainsi que sur leur paquet canonique. Toute modification,
absence ou permutation après établissement du manifeste bloque l’admission.

Cette liaison établit l’intégrité relative contenu–manifeste, pas l’authenticité
de l’observation, l’identité du collecteur, la date réelle ni l’indépendance
matérielle. Les contenus de test sont explicitement synthétiques.

## Condition de retrait

Retirer cette couche si un contenu modifié, absent ou échangé conserve son
admission, ou si une correspondance cryptographique est assimilée à une preuve
d’origine réelle.
