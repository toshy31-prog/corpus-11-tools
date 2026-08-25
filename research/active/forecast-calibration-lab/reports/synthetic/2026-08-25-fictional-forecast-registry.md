# Résultat — registre fictif daté

- Portée : `formal_exact`.
- Protocole fixé avant exécution : oui.
- Générateur et paramètres : calendrier co-conçu de vingt issues, deux strates,
  horizon de trente jours et trois règles rivales.
- Invariants : émission antérieure à l'issue, dix cas par strate et identité
  exacte de la décomposition de Brier.
- Registre : 20 cas, 10 par strate, horizon de 30 jours.
- Stratifié : Brier `4/25`, fiabilité `0`, résolution `9/100`,
  incertitude `1/4`.
- Surconfiant : Brier `73/400`.
- Base : Brier `1/4`.
- Ordre : stratifié < surconfiant < base.
- Dépendance de méthode : le générateur ne lit pas les tables rivales à
  l'exécution, mais leurs fréquences et le calendrier d'issues ont été co-conçus
  dans le même artefact. Il ne s'agit pas d'un générateur indépendant.

Conclusion : le registre discrimine trois règles à information appariée. Il ne
transforme pas le score initial de quatre lignes en revendication générale et
n'ajoute aucune réplication indépendante.

- Effet possible du protocole : fréquences et rivaux ont été choisis ensemble.
- Condition de retrait : accès d'un rival aux issues pendant le calcul, strates
  post-hoc ou décomposition ne reconstruisant plus le score.
