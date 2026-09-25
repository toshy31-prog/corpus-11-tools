# Contrat préalable — identité des contenus de sortie

Portée `pipeline_verified`, fixtures fictives, aucun journal privé ou externe.
L’ancien appariement par identifiants reste conservé pour montrer sa limite.

Ajouter aux événements des journaux existants un champ `content` textuel :
`shared-analysis` reçoit « Analyse fictive A. » et `decision-a` reçoit
« Retenir A. ». Le rival conserve identifiants, états et coûts mais remplace
le premier contenu par « Analyse fictive B. ». Prédiction : l’ancien contrôle
accepte l’appariement ; le contrôle des contenus doit renvoyer `unmatched_content`
sans classement des coûts.

Le contrôle encode chaque texte en UTF-8, sans normalisation, et compare les
empreintes SHA-256 associées à chaque identifiant. Un contenu absent, non textuel
ou plusieurs contenus différents pour un même identifiant dans un journal donnent
`content_unknown`. Un changement de question, états ou identifiants conserve
`unmatched`. Les contenus sont limités aux fixtures ; aucune collecte automatique.

Contrôles : copie identique, dominance historique, compromis coût/délai,
contenu manquant, contenu contradictoire et variante avec espace final.
L’espace final doit être distingué : ce contrôle porte sur les octets, pas sur
l’équivalence de sens. Retirer le résultat si un contenu inconnu ou différent
permet un classement comme si les sorties étaient identiques.

Une empreinte égale ne prouve ni qualité, ni vérité, ni indépendance des sources,
ni équivalence des effets d’usage. Arrêter cette série après ces cas ; toute
extension exige un besoin distinct ou des données réelles autorisées.
