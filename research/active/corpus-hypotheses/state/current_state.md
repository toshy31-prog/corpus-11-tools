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

1. **Récupération contre désinscription** : séparation opérationnelle reproduite sous plusieurs régimes et transportée jusqu'à une event loop réelle horodatée. Une réplication prospective `n=6` donne 176 strates où `C_info=C_erase_inf=1` mais `C_erase_1` diffère ; un banc `asyncio` sur deux architectures appariées donne A `360/360` effacements et B `180/360`, avec zéro divergence par rapport au modèle discret. Le profil reste toutefois entièrement expliqué par des invariants standards ; `C_erase_1 = 1 + tau(G_int)` exactement dans la famille finie. Aucune donnée matérielle.
2. **Frustration temporelle** : `F_T` sépare certains tournois localement appariés, mais l'ablation prospective montre que `96,03 %` de l'avantage prédictif disparaît sans ordre latent commun. Toute lecture d'émergence est retirée ; comparaison à des estimateurs standards encore requise.
3. **Invariants de factorisation** : reste triple robuste dans deux familles, mais H4 à quatre factorisations est `not_supported`; le plancher `span((1,1,1,1))` explique la survie brute dans `S4`.

## Hypothèses affaiblies

### Orientation compositionnelle

Statut : **weakened — voie P1/P2 close à l'ordre 3**.

P1 `too_common`; P2 `not_transported` / `no_predictive_transport`; H3 `standard_absorption`; `I2+A2` suffit à annuler les résidus P1/P2/joint. Aucun P3 adaptatif.

### Autres formulations affaiblies

- « Les traces font le temps » : insuffisamment discriminant.
- Profondeur d'inscription comme horloge : non monotone en général.
- Premier couplage direct temps–objet : risque de programmer la co-émergence.
- Attribution de la co-augmentation `S3` à la non-commutativité : contrôle abélien positif.
- Co-émergence par holonomie `S3` : aucun mécanisme propre à `S3` établi.

## Hypothèses suspendues

Le complexe de distinctions compatibles reste suspendu : les modèles finis exécutés suivent directement les entrées et ne fournissent pas encore de relation exclusive face aux contrôles.

## Observations établies principales

### Récupération / désinscription

- copies terminales : même `C_info=1`, effacement `1` vs `N`, réductible à Hamming ;
- à Hamming fixé : profondeur `2/3`, réductible à l'excentricité ;
- à excentricité fixée : résidu `9/5` vs `10/5`, réductible au profil de coupes ;
- aucun reste à deux pertes jusqu'à huit sommets sous le contrôle préenregistré ;
- **réplication n=6** : `32768` architectures brutes, `9765` atteignables, `685` strates, `176` strates séparant `C_erase_1`, zéro violation de `C_erase_1=1+tau` ; classification `standard_profile_separation` ;
- **transport runtime** : 720 runs `asyncio`, 120 ordres réalisés par architecture ; A `360/360` effacements, B `180/360`, zéro mismatch modèle/runtime ; classification `runtime_transport` ;
- le runtime confirme la robustesse logicielle du profil mais n'ajoute pas de mécanisme au modèle discret.

### Factorisation

- catalogue signé : reste triple `0/1` à données d'ordre 1/2 appariées ;
- `S4` : reste triple `1/2` pour clé `(3,3,3)/(2,2,2)`, `transported_remainder` ;
- H4 : quatre strates appariées, contrastes `+1,0,0,0`, médiane `0`, `not_supported`; droite constante commune comme explication géométrique.

### Frustration temporelle

- paire `F_T=1/15` vs `2/15` ;
- avantage prospectif initial `913` violations face à ordre aléatoire ;
- ablation : `983` vs `39`, soit `3,97 %` conservé ; aucune émergence établie.

### Orientation compositionnelle

- `3330` classes d'isomorphisme d'ordre 3, `3192` chirales ;
- P1 trop commun ; partition non transportée vers P2 ;
- `I2+A2` rend les deux profils statiquement déterminés sur la population ; voie close.

## Tests discriminants prioritaires

1. **Récupération/désinscription — priorité A conditionnelle au banc** : prochain transport uniquement vers processus/conteneurs/machines/composants réellement séparés. Geler avant acquisition ports, deadline, règle de convergence, pertes, détectabilité, coût messages/opérations/temps et condition de renversement.
2. **Frustration — priorité A si aucun banc distribué n'est disponible** : comparer prospectivement `F_T` à un estimateur standard de degrés puis à une famille sans ordre générateur.
3. **Factorisation — priorité B conditionnelle** : reprise uniquement avec quotient du sous-espace fixe commun ou famille sans plancher commun préenregistrée.
4. **Distinctions compatibles** : maintenir la suspension sans relation non injectée discriminante.
5. **Orientation compositionnelle** : aucune nouvelle sonde P3 ; réouverture seulement sur prédiction indépendante.
6. **Holonomie S3** : ne rouvrir qu'avec observable indépendant de `P_I`.

## Blocages

Aucune mesure matérielle n'existe encore. Le banc runtime actuel utilise une seule event loop locale. Les profils de désinscription connus sont toujours des compilations d'invariants standards. `F_T` dépend principalement d'un ordre injecté. Factorisation n'a pas montré de stabilité prospective non triviale sous H4. Le complexe compatible reste non discriminant.

## Prochaine action

**Si un banc distribué local est techniquement disponible, construire deux topologies avec processus ou conteneurs séparés et réutiliser sans modification le contrat de récupération/désinscription.** Ne pas appeler ce banc « matériel » s'il reste sur une seule machine.

Sinon, arrêter ici la montée empirique de cette branche et affecter le prochain test à la comparaison standard de `F_T`.

Garder `core/`, `sources/` et la gouvernance gelés.
