# Audit exact de confluence d’ordre

- Portée : `formal_exact`.
- Générateur : énumération déterministe `27 × 3 × 2 × 2`.
- Résultat : 324 exécutions ; 12 couples état–source–politique dépendent de
  l’ordre ; 12 exécutions divergent de l’oracle simultané.
- Contrôle : zéro dépendance d’ordre sous `payload_wins` ; les 12 cas sont sous
  `tombstone_wins`.
- Effet de méthode : une cible traitée avant un tombstone peut garder un
  payload lorsque la source est mutée plus tard dans la boucle.

Avec `E=empty`, `P=payload`, `T=tombstone`, les douze couples sont :

```text
(E,P,T), source B : A,C->{A} ; C,A->vide
(E,T,P), source C : A,B->{A} ; B,A->vide
(P,E,T), source A : B,C->{B} ; C,B->vide
(P,P,T), source A : B,C->{B} ; C,B->vide
(P,P,T), source B : A,C->{A} ; C,A->vide
(P,T,E), source A : B,C->vide ; C,B->{C}
(P,T,P), source A : B,C->vide ; C,B->{C}
(P,T,P), source C : A,B->{A} ; B,A->vide
(T,E,P), source C : A,B->vide ; B,A->{B}
(T,P,E), source B : A,C->vide ; C,A->{C}
(T,P,P), source B : A,C->vide ; C,A->{C}
(T,P,P), source C : A,B->vide ; B,A->{B}
```

Conclusion : la propriété générale « `tombstone_wins` empêche la réactivation »
est affaiblie. Seules les séquences explicitement exécutées restent établies,
et `payload_present_nodes` ne mesure qu’une présence logique.

Retrait : toute modification de l’espace d’états, de l’ordre d’itération ou de
la sémantique de synchronisation impose une nouvelle énumération complète.
