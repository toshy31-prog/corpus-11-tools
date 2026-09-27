# Contrat de mémoire locale

Corpus distingue quatre usages de mémoire. Ce contrat décrit une organisation et ne
classe rien automatiquement.

| Niveau | Rôle | Transmission au modèle |
| --- | --- | --- |
| Noyau | décisions et contraintes durables, compactes | uniquement après sélection explicite dans une reprise |
| Rappel | notes de travail et contexte à retrouver | recherche ou sélection à la demande |
| Archive | historique et anciens états | consultation explicite uniquement |
| Procédural | méthodes, contrats et guides | sélection explicite pour la procédure concernée |

Dans **Paramètres → Reprise de projet**, « Diagnostiquer les notes » parcourt au
plus 500 fichiers `.md`/`.txt` réguliers du dossier choisi, sans retourner leur
contenu. Il propose un niveau à partir du chemin, signale les empreintes identiques
et le volume de noyau qui dépasse 2 200 caractères. Les propositions doivent être
revues : le diagnostic ne modifie ni fichier, ni index de retrieval, ni point de
reprise, ni configuration.

Les notes restent incluses dans un paquet de reprise seulement après leur choix
explicite. Les plages de lignes et les empreintes déjà vérifiées par
`project_resume.py` restent les mécanismes de transmission.

Limites : la détection ne comprend pas le contenu des notes ; ses classifications
sont des candidats déterministes. Les fichiers au-delà de 1 Mio ne reçoivent pas
d’empreinte, et les répertoires cachés, liens symboliques, caches et dépendances
sont ignorés.

## Notes importées

Les notes importées passent d’abord par le [contrat de quarantaine](MEMORY_QUARANTINE.md).
Leur provenance et leur revue restent séparées du noyau, du rappel et de l’index.
