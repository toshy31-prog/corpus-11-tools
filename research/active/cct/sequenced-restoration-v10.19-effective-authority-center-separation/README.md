# CCT-EXEC 10.19 — séparation des centres effectifs d’autorité

## Lacune fermée

Deux domaines d’autorité pouvaient rester sous un même propriétaire, opérateur
de clés, financeur décisif ou détenteur de veto.

## Gain concret

La couche compile quatre racines de contrôle par domaine. Tout identifiant
partagé relie les domaines dans une même composante ; le quorum est rejeté s’il
reste moins de deux centres effectifs. Une lignée inconnue ne vaut jamais
indépendance.

Les profils de test sont déclaratifs et synthétiques. La barrière détecte une
contradiction dans un dossier fourni ; elle ne prouve ni la propriété effective
réelle ni l’absence de coordination informelle.

## Condition de retrait

Retirer cette couche si deux domaines partageant propriétaire, opérateur,
financeur décisif ou veto continuent de compter comme deux centres, ou si un
champ inconnu est assimilé à une séparation.
