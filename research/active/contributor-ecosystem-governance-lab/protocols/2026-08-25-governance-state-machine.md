# Protocole fixé avant exécution — automate de gouvernance

## Portée et générateur

`formal_exact` sur une table finie de transitions. Le générateur est
`tests/test_governance_state_machine.py`.

## Paramètres, invariants et contrôles

Quatre rôles, huit actions ordonnées et des temps strictement croissants. Le
chemin ordinaire de recours exige contestation, résolution, appel puis retrait.
Le veto du mainteneur est une clôture distincte, autorisée depuis chacun des six
états actifs sans fabriquer rétrospectivement un recours. Les six préfixes
atteignables sont exercés avec veto; chaque veto est aussi muté vers les trois
autres rôles. Les huit acteurs du cycle complet sont mutés de même : 42 contrôles
négatifs au total.

## Effet et retrait

La table définit elle-même les droits ; elle vérifie cohérence et séparation
dans cet automate, pas une autorité externe. Le protocole ne dit pas qu'un veto
offre un recours : il vérifie seulement que le droit déclaré est exécutable et
reste distinct du chemin d'appel. Retirer le verdict si un veto autorisé échoue,
si une mutation non autorisée passe, si un temps décroît sans rejet ou si le
recours devient facultatif dans un cycle déclaré complet.
