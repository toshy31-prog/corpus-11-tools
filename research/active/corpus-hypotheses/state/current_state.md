# État courant de la recherche

Dernière mise à jour : 2026-08-25 — audit formel autonome

## Discipline

Observation, attribution, inférence, hypothèse et démonstration restent séparées. Les sorties finies et logicielles ne sont pas des observations physiques. `core/` et `sources/` restent gelés.

## État des branches

### Récupération contre désinscription — active, arrêt logiciel local

La séparation opérationnelle est reproduite dans le modèle exact, transportée vers `asyncio`, puis vers cinq processus OS persistants. Aucun mismatch modèle/runtime conditionné par l'ordre observé.

Résultats principaux :

- famille n=6 : `32768` architectures brutes, `9765` atteignables, `176` strates appariées séparant `C_erase_1` ;
- identité exacte sans exception : `C_erase_1 = 1 + tau(G_int)` ;
- asyncio : A `360/360`, B `180/360`, zéro mismatch ;
- cinq processus : A `240/240`, B `120/240`, zéro mismatch ; 16 réordonnancements runtime sans rupture du modèle.

Conclusion : récupération, effacement à convergence et effacement sous deadline sont des axes opérationnels distincts, mais la nouvelle coordonnée reste absorbée par un invariant standard. **Ne plus prolonger ce mécanisme en logiciel local.** Réouverture empirique seulement avec plusieurs machines, réseau externe ou matériel réel.

### Frustration temporelle — weakened, condition de requalification atteinte

`F_T` reste le minimum exact d'arêtes de retour et un descripteur mathématique valide. Sa lecture comme prédicteur autonome ou indice d'émergence temporelle est retirée dans le programme actuel.

Bornes successives :

- succès historique avec ordre latent commun : avantage `913` violations face à un ordre aléatoire ;
- ablation : avantage face à l'aléatoire `983` avec ordre commun contre `39` sans ordre commun, soit `3,97 %` conservé ;
- test concurrent exhaustif du 2026-08-18 : `32768` tournois, `2932` strates de vecteur de degrés étiqueté dont `2212` non triviales, `1 343 184` couples train/test distincts sans ordre latent généré ;
- `Delta_total = L_Borda-L_FT = -472112`, moyenne `-0,351487` violation par test ;
- F_T meilleur/égal/pire : `301248 / 370240 / 671696` ;
- **avantage moyen F_T négatif dans `2212/2212` strates non triviales** ;
- classification fixée avant exécution : **`borda_better`**.

Conclusion : la condition de requalification de la fiche est satisfaite. Ne pas concevoir un nouveau protocole pour sauver adaptativement `F_T`. Réouverture seulement sur prédiction indépendante avec concurrent standard fixé avant exécution.

### Invariants de factorisation — active mais bornée

Le reste triple est robuste dans deux familles : catalogue signé dimension 3 (`0/1`) et permutation naturelle `S4` (`1/2`, `transported_remainder`). Mais H4 sous ajout d'une quatrième factorisation est `not_supported` : contrastes appariés `+1,0,0,0`, médiane `0`, avec explication par la droite fixe commune `span((1,1,1,1))`.

L'audit quotienté exact du 2026-08-25 retire cette droite de tous les espaces fixes : la clé devient `(2,2,2)/(1,1,1)`, avec `Dq3=0/1` pour `16/4` triplets. Dans les trois strates appariées d'ajouts non identitaires, `Dq4=0` pour les deux groupes, `Delta=0` partout et médiane `0`. La même famille `S4`, même quotientée, ne fournit donc plus de test local discriminant de survie.

Réouverture seulement avec une famille de transports justifiée indépendamment, sans plancher fixe commun, et une règle de construction déclarée avant le calcul. Ne pas chercher adaptativement un nouveau catalogue favorable.

### Orientation compositionnelle — weakened, voie P1/P2 close

P1 `too_common`; P2 `not_transported` / `no_predictive_transport`; H3 `standard_absorption`; `I2+A2` suffit à déterminer P1/P2 à l'ordre 3. Aucun P3 adaptatif.

### Complexe de distinctions compatibles — suspended

Les modèles finis exécutés suivent directement les entrées et n'ont pas produit de relation exclusive face aux contrôles. Maintenir la suspension.

### Holonomie S3 — weakened/arrêt du fil P_I

Les contrôles abéliens et d'incidence expliquent les effets étudiés ; ne rouvrir qu'avec observable indépendant et prédiction spécifique.

## Décisions de fin de journée

1. **F_T est requalifié** comme score descriptif/optimiseur standard dans le programme actuel après `borda_better`.
2. **Récupération/désinscription** conserve une distinction opérationnelle robuste mais atteint sa condition d'arrêt logicielle locale.
3. **Factorisation** conserve un phénomène mathématique d'ordre trois, mais aucune stabilité prospective non triviale n'est établie ; l'audit quotienté de `S4` ne lève pas cette borne.
4. **Orientation compositionnelle** reste close pour P1/P2.
5. Aucun résultat du jour n'établit temps émergent, objet physique nouveau ou nouvelle loi fondamentale.

## Prochaine action à la reprise

Ne pas reprendre automatiquement la piste la plus récente. Refaire une allocation par valeur d'information parmi :

- banc distribué/matériel récupération-désinscription si un vrai dispositif devient accessible ;
- famille de factorisations indépendante sans sous-espace fixe commun, uniquement si sa règle de construction est justifiée avant le calcul ;
- complexe de distinctions compatibles uniquement si une relation non injectée et un contrôle apparié peuvent être spécifiés avant calcul.

Éviter toute nouvelle sonde destinée à sauver chiralité ou `F_T` après leurs conditions d'arrêt respectives.
