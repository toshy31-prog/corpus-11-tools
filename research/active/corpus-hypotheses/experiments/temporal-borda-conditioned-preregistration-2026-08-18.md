# Préenregistrement — F_T contre Borda sans ordre latent commun

Date de gel : 2026-08-18

Statut : **confirmatoire pré-calcul**.

## Question

L'ordre minimisant exactement `F_T` apporte-t-il une information prédictive hors ajustement au-delà du simple score de degré/Borda lorsque train et test ne partagent **aucun ordre latent générateur** et que toute information partagée est limitée au vecteur de degrés sortants étiqueté ?

## Population gelée

Utiliser la population complète des `2^15 = 32768` tournois étiquetés sur six sommets.

Regrouper les tournois par **vecteur étiqueté exact de degrés sortants** `(d_0,...,d_5)`.

Pour chaque strate contenant au moins deux tournois distincts, considérer tous les couples ordonnés `(train,test)` avec `train != test` dans la même strate.

Ainsi train et test partagent exactement leur vecteur de degrés étiqueté, mais aucun ordre latent, bruit latent ou permutation génératrice n'est introduit. Le test est une population finie exhaustive, non un échantillon.

## Prédicteurs gelés

### F_T

Pour chaque tournoi train, énumérer les `6! = 720` ordres. Compter les arêtes de retour de chaque ordre. `F_T` est le minimum divisé par 15.

S'il existe plusieurs ordres minimaux, **ne pas choisir adaptativement un seul ordre** : la perte `F_T` sur le test est la moyenne exacte du nombre de violations test sur tous les ordres minimisant le train.

### Borda/degré

Le score Borda d'un sommet est son degré sortant dans le train.

Comme le vecteur de degrés est identique dans toute strate, Borda ne reçoit aucune information du test au-delà de la variable de conditionnement.

Pour éviter un tie-break de labels arbitraire, la perte Borda sur le test est la moyenne exacte sur tous les ordres compatibles avec le tri décroissant des degrés, en permutant uniformément les ex aequo.

### Baseline aléatoire

Pour un tournoi complet à six sommets, l'espérance exacte des violations d'un ordre uniformément aléatoire est `15/2 = 7.5`.

## Métrique principale

Pour chaque couple `(train,test)` :

- `L_FT` = violations test moyennes sur les minimiseurs F_T du train ;
- `L_Borda` = violations test moyennes sur les ordres Borda admissibles ;
- `delta = L_Borda - L_FT`.

Agrégats sur tous les couples ordonnés :

- `Delta_total = sum delta` ;
- `Delta_mean = mean delta` ;
- nombres de couples où F_T est meilleur, égal ou pire que Borda.

Les fractions sont exactes.

## H1 confirmatoire

Pour conserver une prétention de pouvoir prédictif propre dans cette famille sans ordre latent commun, F_T doit satisfaire simultanément :

1. `Delta_total > 0` ;
2. strictement plus de couples `L_FT < L_Borda` que de couples `L_FT > L_Borda` ;
3. l'avantage doit être positif dans au moins deux tiers des strates de degrés non triviales, où l'avantage d'une strate est la moyenne de `delta` sur ses couples.

Sinon classification `no_incremental_value`.

Si `Delta_total < 0` et les défaites sont plus nombreuses que les victoires, classification `borda_better`.

## Contrôles

- exactement 32768 tournois ;
- exactement 720 ordres ;
- train et test distincts mais de même vecteur étiqueté de degrés ;
- aucune variable latente autre que la condition de degré ;
- moyenne sur tous les minimiseurs F_T et tous les tie-breaks Borda ;
- arithmétique rationnelle exacte ;
- inversion globale et renommage ne doivent pas modifier les agrégats populationnels.

## Interprétation gelée

`incremental_value` montrerait seulement que la structure globale du tournoi train contient, sous ce conditionnement fini, une information sur un tournoi test distinct qui n'est pas contenue dans Borda. Il ne démontrerait ni temps émergent ni causalité.

`no_incremental_value` satisfait la condition de requalification inscrite dans la fiche : dans cette famille, F_T doit être traité comme score descriptif/optimiseur standard sans pouvoir prédictif propre établi au-delà des degrés.

`borda_better` renforcerait encore cette requalification.
