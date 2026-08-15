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
