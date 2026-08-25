# État courant de la recherche

Dernière mise à jour : 2026-08-25 — audit formel autonome

## Discipline

Observation, attribution, inférence, hypothèse et démonstration restent séparées. Les sorties finies et logicielles ne sont pas des observations physiques. `core/` et `sources/` restent gelés.

## État des branches

### Récupération contre désinscription — weakened, profil opérationnel standard

La séparation opérationnelle est reproduite dans le modèle exact, transportée vers `asyncio`, puis vers cinq processus OS persistants. Aucun mismatch modèle/runtime conditionné par l'ordre observé.

Résultats principaux :

- famille n=6 : `32768` architectures brutes, `9765` atteignables, `176` strates appariées séparant `C_erase_1` ;
- identité exacte sans exception : `C_erase_1 = 1 + tau(G_int)` ;
- asyncio : A `360/360`, B `180/360`, zéro mismatch ;
- cinq processus : A `240/240`, B `120/240`, zéro mismatch ; 16 réordonnancements runtime sans rupture du modèle.

Le substitut fictif distribué demandé a maintenant été construit et exécuté :

- quatre réplicas, versions `A/B/AB`, horloges vectorielles, quatre partitions,
  crash de `R2/R3`, modes durable/volatile et les `120` horaires exacts ;
- `7680` cellules, quotientées en `2160` signatures de multiplicité totale
  `7680`; distribution `C_erase_deadline` :
  `1:3420`, `2:4020`, `3:240` ;
- non-vacuité : `1380` strates discriminées par versions, `15` scénarios par
  ordre et `900` paires par mode de récupération ;
- `graph_only` exact `2040/7680`, `schedule_artifact` `4820/7680`,
  `causal_frontier` `7680/7680` ;
- zéro mismatch entre les deux implémentations endogènes du générateur, pour
  les ensembles robustes tous horaires, le descendant `AB`, le contrôle
  négatif `B` et les positions de coupure `2/3/4`.

Conclusion : récupération, effacement à convergence et effacement sous deadline sont des axes opérationnels distincts, mais chaque coordonnée interne testée reste absorbée par la signature déclarée. Le verdict distribué v0.2 est **`endogenous_causal_signature_identity`**, borné à `formal_exact` et `pipeline_verified`. Il ne s'agit ni d'un oracle indépendant ni d'une mesure de `C_info`; `graph_only`, `schedule_artifact` et `causal_frontier` sont des ablations à budgets d'information imbriqués. Le statut « protocole fixé avant exécution » est auto-déclaré dans la configuration sans verrou temporel indépendant. La lecture forte passe à `weakened`; l'énoncé faible demeure reproduit. **Ne plus prolonger cette famille locale.** Une reprise exige une faille interne distincte capable de produire un mismatch entre énumération et signature; aucun réseau, matériel ou terrain n'est une prochaine étape ou un blocage.

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

### Invariants de factorisation — weakened, voie locale close

Le reste triple est robuste dans deux familles : catalogue signé dimension 3 (`0/1`) et permutation naturelle `S4` (`1/2`, `transported_remainder`). Mais H4 sous ajout d'une quatrième factorisation est `not_supported` : contrastes appariés `+1,0,0,0`, médiane `0`, avec explication par la droite fixe commune `span((1,1,1,1))`.

L'audit quotienté exact du 2026-08-25 retire cette droite de tous les espaces fixes : la clé devient `(2,2,2)/(1,1,1)`, avec `Dq3=0/1` pour `16/4` triplets. Dans les trois strates appariées d'ajouts non identitaires, `Dq4=0` pour les deux groupes, `Delta=0` partout et médiane `0`. La même famille `S4`, même quotientée, ne fournit donc plus de test local discriminant de survie.

Le catalogue signé `B3`, distinct de `S4` et sans plancher fixe commun forcé, réalise à son tour le contraste d’ordre trois (`68` triplets à dimension `0`, `16` à dimension `1`), mais H5 sous ajout d’une quatrième matrice est `not_supported` : deux des cinq strates appariées ont un contraste positif et la médiane exacte est `0`.

La condition annoncée de requalification est atteinte. Le reste triple demeure un fait mathématique, mais la lecture objectale prospective devient `weakened` et la voie locale est close. Ne pas chercher adaptativement un autre catalogue de factorisations; réouverture seulement avec une prédiction ou un observable réellement distinct, fixé avant calcul.

### Orientation compositionnelle — weakened, voie P1/P2 close

P1 `too_common`; P2 `not_transported` / `no_predictive_transport`; H3 `standard_absorption`; `I2+A2` suffit à déterminer P1/P2 à l'ordre 3. Aucun P3 adaptatif.

### Complexe de distinctions compatibles — suspended

Les modèles finis exécutés suivent directement les entrées et n'ont pas produit de relation exclusive face aux contrôles. Maintenir la suspension.

### Holonomie S3 — weakened/arrêt du fil P_I

Les contrôles abéliens et d'incidence expliquent les effets étudiés ; ne rouvrir qu'avec observable indépendant et prédiction spécifique.

## Décisions de fin de journée

1. **F_T est requalifié** comme score descriptif/optimiseur standard dans le programme actuel après `borda_better`.
2. **Récupération/désinscription** conserve une distinction opérationnelle robuste, mais l'univers distribué fictif satisfait une identité causale endogène exacte; la lecture forte est requalifiée `weakened` et la voie interne est close.
3. **Factorisation** conserve un phénomène mathématique d'ordre trois, mais H4 et H5 ne soutiennent aucune stabilité prospective non triviale; la lecture objectale locale est requalifiée `weakened` et la piste est close.
4. **Orientation compositionnelle** reste close pour P1/P2.
5. Aucun résultat du jour n'établit temps émergent, objet physique nouveau ou nouvelle loi fondamentale.

## Prochaine action à la reprise

Ne pas reprendre automatiquement la piste la plus récente. Les voies locales
`F_T`, factorisation et mécanisme logiciel récupération/désinscription ont
atteint leurs conditions d’arrêt. Une reprise autonome doit partir d’une
prédiction ou d’un observable interne réellement distinct, fixé avant calcul,
avec modèle rival et condition de renversement; l’absence de terrain ou de
matériel appelle un meilleur substitut fictif et ne constitue pas un blocage.

Pour récupération/désinscription, le substitut versions/horloges/partitions/
crash existe désormais et a lui aussi atteint l'arrêt. Ne pas le grossir sans
une condition de mismatch causal nommée.

Éviter toute nouvelle sonde destinée à sauver chiralité, `F_T` ou stabilité
objectale par sélection adaptative de cas favorables.
