# Résultat — migrations fictives appariées

- Portée : `model_internal`.
- Générateur : deux graphes déterministes, sans donnée extérieure.
- Résultat : 2/2 pertes discriminées et 2/2 réactivations exactes.
- Perte d’index : objet présent, accès retiré, refus conservé.
- Perte de contexte : objet accessible, réutilisabilité retirée, refus conservé.
- Contrôles : objets, besoin, permission, coût et compétence identiques.
- Rivaux : permission refusée et coût élevé reproduisent une perte d’accès ;
  compétence ou demande absente reproduisent une perte de réutilisabilité.

La porte initiale n’était pas une mesure de perte ; ce proxy est remplacé par
un contraste relationnel interne. Les quatre rivaux montrent pourquoi cette
attribution exige l’appariement. Retirer le résultat si une autre variable que
l’arête annoncée diffère entre migration et contrôle.
