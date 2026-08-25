# Résultat — graphe de provenance et pannes

- Portée : `model_internal`.
- Générateur : quatre voies et vingt dépendances déclarées.
- Résultat : trois grappes `{A,B}`, `{C}`, `{D}`.
- Pannes communes : générateur et hypothèse atteignent A et B simultanément
  malgré leurs sources disjointes.
- Contrôle : même conclusion pour C et D sans dépendance commune.

Conclusion : l’intersection de noms de sources était un proxy incomplet. La
nouvelle classification vaut uniquement pour le graphe et les pannes déclarés.
