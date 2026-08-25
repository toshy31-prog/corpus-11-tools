# Cycle synthétique initial — pluralité compatible et erreur contradictoire

## Construit et portée

Le construit est la séparation, dans un monde fini explicitement défini, entre
des conclusions rivales **compatibles avec les preuves** et une conclusion
contredite. Le statut est `formal_exact` : il porte sur l'espace de mondes et
les règles de compatibilité de la fixture, pas sur un désaccord humain réel.

## Définition opérationnelle

Une conclusion est `compatible_not_established` lorsqu'au moins un monde encore
possible la rend vraie; elle est `contradicted` lorsqu'aucun monde possible ne
la rend vraie. Une pluralité est retenue seulement si au moins deux conclusions
distinctes restent compatibles. La condition de révision indique quelle trace
supplémentaire réduirait l'espace de mondes.

## Générateur, paramètres et invariants

- Générateur : deux cas finis, mondes possibles et ensembles de mondes associés
  à chaque conclusion.
- Paramètres : espace de mondes, conclusions et trace discriminante annoncée.
- Invariants : aucun monde absent de la preuve ne revient par inférence; une
  conclusion contradictoire n'est pas requalifiée en pluralité; les conclusions
  rivales restent visibles dans la sortie.

## Contrôles et effet de méthode

Le premier cas contrôle la préservation d'une pluralité sous-déterminée; le
second contrôle le rejet d'une contradiction. Le protocole définit lui-même les
mondes possibles : il ne mesure ni interprétation humaine, ni légitimité
politique, ni qualité d'une preuve réelle.

## Résultat qui retirerait la conclusion

Le résultat doit être retiré si le cas contradictoire est retenu ou si deux
survivants compatibles sont réduits à un gagnant sans trace discriminante. Une
conclusion sur une controverse réelle exige des sources, acteurs et règles de
révision propres au cas.
