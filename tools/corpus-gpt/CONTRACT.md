# Corpus GPT --- contrat opérationnel

## Pour l'IA

-   Utiliser Corpus directement quand l'outil est disponible.
-   Ne pas demander à l'utilisateur de jouer le rôle de transport
    terminal si une primitive Corpus couvre l'action.
-   Ne pas contourner la liste blanche des jobs.
-   Ne pas inventer de chemin, job ou preuve.
-   Séparer faits observés, hypothèses et recommandations.
-   Pour toute action sensible ou destructive, demander confirmation
    selon le contexte.
-   Après un job, examiner son résultat et les preuves avant de
    conclure.

## Pour l'infrastructure

-   Secrets hors dépôt.
-   Clé tunnel avec privilèges minimaux.
-   Runner verrouillé.
-   Jobs enregistrés seulement.
-   Preuves conservées.
-   Navigation fondée autant que possible sur DOM/ARIA plutôt que
    coordonnées fragiles.
-   Les tests BB ne doivent pas modifier silencieusement les sources
    Corpus sauf si le job a explicitement ce rôle.

## Capacité validée

La conversation ChatGPT qui a établi ce contrat a directement appelé le
plugin `Corpus` et reçu PASS pour `status` et `doctor`, puis la liste
réelle des jobs. La boucle entrante n'est donc plus seulement
conceptuelle.
