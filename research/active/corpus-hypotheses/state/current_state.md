# État courant de la recherche

Dernière mise à jour : 2026-08-18

## Question centrale

Quelles structures minimales permettent de distinguer récupération et désinscription puis, éventuellement, de faire émerger orientation temporelle et invariants objectaux sans les injecter dans les définitions ?

## Discipline épistémique

- **Observation** : contenu directement constaté dans les fichiers ou sortie reproductible.
- **Attribution** : proposition rapportée à la source, sans adoption automatique.
- **Inférence** : conséquence argumentée mais non démontrée.
- **Hypothèse** : mécanisme réfutable à tester contre des concurrentes.
- **Démonstration** : conséquence formelle de définitions explicites, dont la portée reste celle du modèle.

Corpus 11 Tools sert de jeu d'audit et de discrimination. Il ne fournit ni données physiques ni validation d'une nouvelle physique.

## Hypothèses actives

1. **Récupération contre désinscription** : séparation opérationnelle désormais reproduite sous plusieurs régimes, dont une réplication prospective asynchrone multi-port `n=6`. `C_info=1` et `C_erase_inf=1` peuvent rester identiques alors que `C_erase_1` diffère dans 176 strates appariées. Mais chaque coordonnée connue reste absorbée par un invariant standard ; dans le nouveau test, `C_erase_1 = 1 + tau(G_int)` exactement. Priorité : transport vers un système avec latences/ordres mesurés, pas extension combinatoire brute.
2. **Frustration temporelle** : `F_T` sépare certains tournois localement appariés, mais l'ablation prospective montre que `96,03 %` de l'avantage prédictif disparaît sans ordre latent commun. Toute lecture d'émergence est retirée ; comparaison à des estimateurs standards encore requise.
3. **Invariants de factorisation** : le reste d'intersection d'ordre trois est robuste dans deux familles finies distinctes, mais H4 à quatre factorisations dans `S4` est `not_supported`. Le plancher fixe commun `span((1,1,1,1))` explique la survie brute. La lecture objectale reste spéculative.

## Hypothèses affaiblies

### Orientation compositionnelle

Statut : **weakened — voie P1/P2 close à l'ordre 3**.

- H1 : `too_common` — `1690/3192 = 52,94 %` de classes chirales fortes dans P1 ;
- H2 : `not_transported` / `no_predictive_transport` ;
- H3 : `standard_absorption` ;
- autopsie : `I2 + A2` suffit à rendre P1/P2/joint constants sur les cellules statiques ; aucun P3 adaptatif.

### Autres formulations affaiblies

- « Les traces font le temps » : trop proche de cadres connus et insuffisamment discriminant.
- Profondeur d'inscription comme horloge : non monotone en général.
- Premier couplage direct temps–objet : risque de programmer la co-émergence.
- Attribution de la co-augmentation qualitative du jouet `S3` à la non-commutativité : contrôle abélien `C6` apparié positif.
- Co-émergence par holonomie `S3` : illustration de l'incidence des sous-espaces fixes, sans mécanisme propre à `S3` établi.

## Hypothèses suspendues

Le complexe de distinctions compatibles reste spéculatif et suspendu. Un premier modèle fini complet est exécuté, mais ses différences suivent directement les entrées et ne sont pas exclusives face aux contrôles concurrents.

## Observations établies principales

### Récupération / désinscription

- circuits appariés : même `C_info=1`, désinscriptions `1` et `N`, différence réductible à Hamming ;
- à Hamming fixé : profondeur d'effacement `2/3`, réductible à l'excentricité ;
- à excentricité fixée : charge résiduelle `9/5` vs `10/5`, réductible au profil de coupes ;
- aucun reste à deux pertes à profil d'une perte fixé jusqu'à huit sommets ;
- **réplication prospective asynchrone multi-port `n=6`** : `32768` architectures brutes, `9765` atteignables, `685` strates de contrôle, **176 strates séparant `C_erase_1`** alors que `C_info=C_erase_inf=1` et les contrôles gelés sont identiques ;
- distribution `C_erase_1` : `1:1`, `2:276`, `3:4824`, `4:4648`, `5:16` ;
- zéro violation de `C_erase_1 = 1 + couverture_minimale_de_sommets` ; classification `standard_profile_separation`.

### Factorisation

- catalogue signé dimension 3 : profils `(2,2,2)/(1,1,1)` compatibles avec intersections triples `0/1` ;
- test prospectif `S4` : clé `(3,3,3)/(2,2,2)` avec dimension triple `1` pour 16 triplets et `2` pour 4 ; `transported_remainder` ;
- H4 : 420 extensions par une quatrième matrice, quatre strates appariées, contrastes `+1,0,0,0`, médiane `0`, décision `not_supported` ;
- la droite constante commune explique le plancher de survie.

### Frustration temporelle

- paire appariée `F_T=1/15` vs `2/15` ;
- avantage prospectif initial `913` violations face à ordre aléatoire ;
- ablation ordre latent : `983` vs `39`, soit `3,97 %` de l'avantage conservé ; aucune émergence établie.

### Orientation compositionnelle

- `3330` classes d'isomorphisme d'ordre 3, `3192` chirales ;
- P1 trop commun, P1 ne transporte pas sa partition vers P2 ;
- `I2+A2` produit zéro résidu P1/P2/joint ; voie P1/P2 close.

## Tests discriminants prioritaires

1. **Récupération/désinscription — priorité A** : transporter le profil `(C_info,C_erase_inf,C_erase_deadline)` vers un banc avec latences, pertes et ordres de mise à jour réellement observés. Geler ports, deadline, règle de convergence, coût et détectabilité avant acquisition.
2. **Factorisation — priorité B conditionnelle** : reprise uniquement avec quotient explicite du sous-espace fixe commun ou famille sans plancher commun préenregistrée.
3. **Frustration — priorité B** : comparer `F_T` à des estimateurs standards dans une famille sans ordre latent commun.
4. **Distinctions compatibles — priorité conditionnelle** : maintenir la suspension sans relation non injectée discriminante.
5. **Orientation compositionnelle** : aucune nouvelle sonde P3 ; réouverture seulement sur prédiction indépendante.
6. **Holonomie S3** : ne rouvrir qu'avec observable indépendant de `P_I`.

## Blocages

Aucune mesure matérielle n'existe encore pour récupération/désinscription. Les sorties actuelles sont algébriques ou simulées. Les profils de désinscription connus sont des compilations d'invariants standards. `F_T` dépend principalement d'un ordre injecté dans le modèle testé. Le reste factoriel n'a pas montré de stabilité prospective non triviale sous H4. Le complexe compatible reste non discriminant. La voie chiralité P1/P2 est statiquement absorbée à l'ordre 3.

## Prochaine action

**Construire un banc quasi-matériel de récupération/désinscription asynchrone**, reproductible et versionné, avec nœuds/processus séparés, délais mesurés, ordre effectif des mises à jour, pertes contrôlées et plusieurs ports de reset. Avant toute acquisition, fixer :

- topologies A/B ;
- ports de lecture/reset ;
- `C_info` ;
- critère d'effacement à convergence ;
- deadline ou nombre maximal de passes ;
- taux de trace résiduelle ;
- coûts messages/opérations/temps ;
- condition de renversement.

Ne pas présenter l'émulation comme matériel réel. Si un dispositif réel est ensuite disponible, réutiliser le même contrat sans réajuster les critères.

Garder `core/`, `sources/` et la gouvernance gelés.
