# Réemploi UX — vague 2, 27 septembre 2026

## Mécanisme repris et sources

[Microsoft Research HAI](https://www.microsoft.com/en-us/research/project/guidelines-for-human-ai-interaction/) : traiter les erreurs et permettre la correction. [W3C APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) : après une action explicite qui change d'étape, placer le focus au début de cette étape peut être approprié. Sources officielles relues pendant cette vague ; aucune copie de code tiers.

## Changement utile

Avant : le rack signale des directions en attente mais laisse l'utilisateur chercher les fiches plus bas dans une page longue. Après : bouton « Choisir ou rechercher une fiche artiste » près du lancement de recherche lorsque des directions attendent une identité.

Le clic rejoint une proposition disponible, sinon la saisie de recherche. Il ouvre les détails parents et place le focus. Il ne choisit aucune fiche, ne modifie aucun filtre et ne lance aucune requête. Il refuse les panneaux cachés ou associés à un ancien départ. Aucun déplacement de focus automatique pendant la réception de résultats.

## Critères et validation

- Proposition disponible : focus sur le menu, aucune sélection.
- Aucune proposition : focus sur la recherche plutôt qu'un menu vide.
- Ancien départ / panneau caché : aucune navigation.
- Contrôles indisponibles : aucune navigation et message de récupération.

`node --test public/identity-recovery-action.test.mjs public/route-selection-intent.test.mjs public/scout-mixer-v21-contract.test.mjs` réussit (3 fichiers agrégés, code 0). La nouvelle suite utilise des doubles DOM ; ce n'est pas une session navigateur ni un audit lecteur d'écran. Sauvegarde préalable : `/tmp/scout-ux-w2-S7gEjI/scout-mixer-panel.mjs`.

Palier atteint : comportement de navigation explicitement testé. Palier non établi : réduction du temps de récupération en usage réel, conformité WCAG complète ou supériorité sur une interface comparative. Le score global précédent n'est pas augmenté pour compter ce nouveau test comme une preuve utilisateur indépendante.
