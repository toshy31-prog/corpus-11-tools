# Corpus GPT --- contrat opérationnel

## Pour l'IA

-   Utiliser Corpus directement quand l'outil est disponible.
-   Ne pas demander à l'utilisateur de jouer le rôle de transport
    terminal si une primitive Corpus couvre l'action.
-   Ne pas contourner la liste blanche des jobs.
-   Quand une nouvelle action bornée est nécessaire, utiliser
    `install_managed_job` : nom strict, registre imposé, backup et
    validation syntaxique ; ne jamais écrire directement dans le registre.
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

## Reprise universelle

Le pont GPT applique le même contrat de reprise que Corpus local. Une erreur du
transport MCP, un timeout du client ou une session terminée ne prouvent pas l'échec
du job local. Avant tout nouveau lancement, vérifier le runner, le verrou, le run et
ses preuves. Si le run est terminé, récupérer son résultat ; s'il est encore actif,
ne pas le dupliquer.

Toute cause répétitive doit être remontée vers une automatisation bornée ou un test
de régression. Le pont ne contourne jamais un refus de permission et ne transforme
jamais une pression disque en suppression implicite de données.

### Outils de reprise

Pour un obstacle observé, assess_blocker donne le chemin de reprise sans effet de
bord. Pour un job long, start_job puis job_status remplacent le retry synchrone
aveugle ; async_jobs permet de retrouver un token après coupure du tunnel.
