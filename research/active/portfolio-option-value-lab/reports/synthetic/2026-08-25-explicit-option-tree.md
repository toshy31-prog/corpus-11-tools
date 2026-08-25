# Résultat — arbre explicite de valeur d’option

- Portée : `model_internal`.
- Protocole fixé avant exécution : oui.
- Générateur et paramètres : deux distributions jointes exactes, deux politiques
  et quatre taux de conversion utilitaire.
- Invariants : probabilités unitaires, unités brutes séparées, covariance exacte
  et agrégation seulement après conversion explicite.
- Monde corrélé/redondant : option `143/200`, uniforme `3/5`; option +`23/200`.
- Monde indépendant/non redondant : uniforme `7/10`, option `17/40`;
  uniforme +`11/40`.
- Les quatre quantités brutes sont calculées séparément. Leur seul agrégat est
  un net en `synthetic_decision_utility` sous le ledger explicite `(+1, -1/5,
  -1/5, +1/20)`.
- Le délai est facturé pour chaque lancement séquentiel de B après échec de A,
  y compris lorsque B échoue; l'ancienne condition `b==1` est retirée.

Conclusion : aucune politique ne domine dans les deux mondes. L’ancien delta
fixe était produit par les valeurs d’information fournies et ne discriminait
pas un mécanisme d’allocation. Le classement courant dépend de la base
utilitaire fictive déclarée et ne rend pas commensurables ces unités hors modèle.

- Effet possible du protocole : mondes et taux produisent le classement.
- Condition de retrait : addition directe d'unités, taux post-hoc ou politique
  incapable de perdre un monde rival.
