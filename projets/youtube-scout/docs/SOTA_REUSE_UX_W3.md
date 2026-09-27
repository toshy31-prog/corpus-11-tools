# Parcours UX — vague 3, 27 septembre 2026

## Ce qui est réellement exercé

`public/ux-journey-integration.test.mjs` monte le véritable `mountScoutMixerPanel` et ses cadrans dans un DOM structurel minimal entièrement synthétique. Les handlers du produit sont importés sans extraction ni réécriture. Trois scénarios passent avec `node public/ux-journey-integration.test.mjs` :

1. Départ sans fiche : recherche désactivée, action de récupération visible ; son clic ouvre les détails et focalise le sélecteur, sans sélectionner ni appeler le catalogue. Après injection du résultat d'une confirmation explicite dans le modèle, la recherche devient disponible ; son handler lance une seule action et révèle l'arrêt.
2. Zéro piste à cause du filtre : compte et bouton de récupération visibles ; le clic change seulement `scope.unknownArtists`, sans requête catalogue. Compteur marqué `role=status`.
3. Arrêt puis nouveau départ : callback d'arrêt appelé une fois, état d'attente retiré, ancien sélecteur non focalisé pour le nouveau départ et message de récupération explicite.

La première exécution a échoué sur une fixture ne renseignant pas `busy:false`, donnant `undefined` à une propriété booléenne du DOM simplifié. Fixture corrigée ; aucun défaut de production imputé à ce faux négatif. Aucun fichier runtime modifié dans cette voie.

## Références et réemploi

[W3C WCAG 2.2, ordre du focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) : préserver le sens et l'opérabilité de la navigation. Réemploi sous forme de contrat : la récupération rejoint le contrôle pertinent du départ courant et ouvre ses détails, sans déplacement vers un ancien départ.

[Microsoft Research, Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/) : cadre primaire pour rendre les capacités et limites perceptibles et faciliter les corrections. Réemploi borné : action explicite de correction, aucune confirmation silencieuse, distinction attente/activité/arrêt. Sources consultées le 27 septembre 2026 ; pas de bibliothèque ni dépendance installée.

## Limites de preuve

Ce n'est pas un test navigateur, pas une certification WCAG, pas un parcours complet de confirmation HTTP. Le DOM ne simule ni layout, ni séquence native Tab, ni lecteur d'écran ; le modèle après confirmation est injecté. Les tests runtime W2 prouvent séparément l'annulation transport/session ; ce scénario UX ne prouve que l'appel du handler d'arrêt. Aucun profil navigateur personnel, port 4181, fichier privé ou réseau externe utilisé. Prochaine preuve utile : même parcours dans une instance navigateur neuve et serveur synthétique avec confirmation API réelle, puis audit clavier/lecteur d'écran.
