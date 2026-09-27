# Fiabilité des tours agentiques

## Mesure locale

**Paramètres → Statistiques → Fiabilité agent** lit la base OpenCode locale en
lecture seule. Pour chaque demande ayant reçu une ou plusieurs réponses
assistant, Corpus retient le dernier état connu : terminé normalement,
interrompu ou en erreur, ou encore incomplet. Les valeurs sont affichées par
jour sur 7 ou 30 jours.

Pour les états non normaux, le panneau rassemble aussi le type technique
déclaré par le runtime : nom d’erreur, fin anormale ou absence de fin. Aucun
message d’erreur ni contenu de conversation n’est conservé dans cet agrégat.

Le calcul ne conserve ni le texte des messages ni leurs identifiants dans le
résultat renvoyé au portail. Il n’enregistre rien, ne réveille aucun modèle et
ne modifie aucune conversation.

## Limites

Un état normal prouve seulement qu’une réponse assistant s’est terminée sans
erreur déclarée. Il ne prouve ni la pertinence de la réponse, ni la réussite
d’une modification de fichier, ni une action externe. Les vérifications de
travail spécifiques restent disponibles dans le menu `…` du chat.

Cette mesure donne à Corpus une base de suivi pour réduire les reprises et
échecs réels avant d’automatiser davantage.
