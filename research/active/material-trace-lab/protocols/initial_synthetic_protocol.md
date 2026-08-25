# Cycle synthétique initial — réplication et effacement

## Construit et portée

Le construit est la **présence de payload dans un modèle discret de trois
nœuds**, après écriture, réplication, suppression, partition et resynchronisation.
La conclusion a le statut `model_internal` : elle décrit exactement le modèle
déclaré dans `fixtures/initial_cases.json`, et ne décrit pas un stockage réel.

## Définition opérationnelle

Chaque nœud porte soit une charge (`payload`), soit un tombstone. Une trace est
« réactivée » lorsqu'une resynchronisation fait réapparaître une charge après
qu'un tombstone a existé sur un autre nœud. Les observables sont les états de
nœuds finaux, l'accessibilité depuis un nœud non partitionné, les canaux de
réactivation et le nombre de synchronisations réparatrices.

## Générateur, paramètres et invariants

- Générateur déterministe : `tests/test_initial_protocol.py` ; aucune graine
  aléatoire ni donnée extérieure.
- Paramètres : trois nœuds nommés, ordre exact des opérations et politique de
  synchronisation (`payload_wins` ou `tombstone_wins`).
- Invariants : un nœud ne porte jamais simultanément charge et tombstone ; une
  synchronisation ne crée pas de quatrième nœud ; chaque résultat est comparé
  à l'oracle déclaré de sa fixture.

## Contrôles et effet de méthode

Les contrôles appariés sont l'effacement de tous les nœuds et la propagation de
tombstone. Le protocole **produit** les états observés : il ne détecte ni
latence, ni cache, ni comportement d'un système distribué réel. Une absence de
réactivation dans ce modèle ne serait donc pas une absence de trace dans un
dispositif matériel.

## Résultat qui retirerait la conclusion

Le résultat doit être retiré si l'oracle et le simulateur divergent, si un
invariant est violé, ou si une opération non déclarée est nécessaire pour
obtenir la différence rapportée. Il ne doit pas être promu au-delà du modèle.
