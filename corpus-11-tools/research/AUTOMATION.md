# Research automation policy

Un run automatique ne mérite une notification utilisateur que si au moins un des éléments suivants change :

- une observation nouvelle est établie ;
- une hypothèse change de statut ;
- une contradiction est détectée ;
- un test discriminant produit un résultat ;
- une condition de renversement est atteinte ou approchée ;
- une priorité de recherche change ;
- un blocage est levé ;
- un nouveau blocage important apparaît ;
- un commit est publié.

Les événements suivants sont silencieux :

- relecture sans changement ;
- validation répétée identique ;
- reformulation sans gain discriminant ;
- absence de résultat avec détectabilité inchangée ;
- changement stylistique ;
- rapport identique au précédent.

Aucune source sous research/sources/ ne doit être modifiée automatiquement.

Le cycle automatique local canonique est `scripts/run_research_cycle.sh`. Après
un postflight `CHANGES_READY`, il crée un unique commit sur une branche locale
`autoresearch/<horodatage>`, mémorise la branche et le hash, puis revient sur
`main`. Il ne pousse jamais. Il exige un index initial vide, limite l'indexation
à l'allowlist de recherche et refuse toute modification, suppression, création,
renommage ou remplacement sous `research/sources/`.

Le PDF canonique est
`research/sources/Trace_complete_hypothese_temps_recherche.pdf`. La copie de
compatibilité située directement sous `research/` est conservée tant que son
hash reste identique ; l'automatisation ne supprime aucune des deux copies.
