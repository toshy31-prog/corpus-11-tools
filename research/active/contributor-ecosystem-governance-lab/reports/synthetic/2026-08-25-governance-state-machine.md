# Résultat — automate de gouvernance fictive

- Portée : `formal_exact`.
- Protocole fixé avant exécution : oui.
- Générateur et paramètres : table finie, quatre rôles, six états actifs, cycle
  d'appel et préfixes de veto horodatés.
- Invariants : temps croissant, droit exact par transition, clôture conditionnelle
  par veto ou retrait après recours.
- Cycle complet : accepté jusqu’au retrait après appel.
- Veto : 6/6 états actifs atteints puis retirés par le mainteneur.
- Mutations de rôle : 42/42 rejetées, dont 18 mutations du détenteur du veto.
- Fixture initiale : rejetée pour absence d’horodatages.
- Contrôles : veto, contestation, résolution, appel et retrait sont des
  transitions distinctes; un arrêt ordinaire incomplet reste rejeté.

Conclusion : l’ordre de six libellés ne suffisait pas à établir traçabilité ou
distribution d’autorité. Le veto auparavant déclaré mais inutilisable est
maintenant exercé sans le confondre avec un recours. Le résultat reste limité à
la table finie et ne prétend pas qu'un recours suit le veto.

- Effet possible du protocole : la table produit elle-même les droits observés.
- Condition de retrait : veto autorisé rejeté, acteur non autorisé accepté,
  horodatage invalide admis ou recours ordinaire incomplet déclaré complet.
