# Résultat — tâches modales fonctionnelles

- Portée : `pipeline_verified`.
- Protocole fixé avant exécution : oui.
- Générateur et paramètres : trois canaux, cinq opérations, pertes, budgets,
  charge, raccourci et identifiants exacts d'action, preuve et recours.
- Invariants : objectif identique, seuils fixes et succès seulement si les cinq
  opérations passent.
- Égalité structurelle : 3/3 canaux ont les mêmes identifiants.
- Exécution de base : 1/3 succès.
- Voix : preuve perdue par transformation.
- Canal contraint : budget d’étapes dépassé.
- Réparations fictives : 2/2 restaurent preuve et recours.
- Mutations des identifiants exécutables : 4/4 rejetées; une action interdite,
  une preuve vide ou un recours vide ne peuvent plus produire un succès.

Conclusion : l’alignement déclaratif ne vaut pas équivalence fonctionnelle.
L'ancien succès fondé seulement sur l'absence de motifs est retiré; le verdict
requiert maintenant les cinq opérations. Les résultats restent ceux des
opérations et seuils générés.

- Effet possible du protocole : coûts, pertes et réparations sont définis par le
  simulateur fictif.
- Condition de retrait : mutation d'exigence acceptée, seuil changé après
  exécution ou réparation sans action, preuve et recours restaurés.
