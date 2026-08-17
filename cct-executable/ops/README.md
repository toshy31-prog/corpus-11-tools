# CCT Ops — prototype institutionnel local hors ligne

> **Statut : prototype exécutable, testé localement, non autorisé, non déployé et non réobservé.**
>
> Ce logiciel n'est ni une autorité publique, ni un système de vote sécurisé, ni
> une preuve qu'une institution réelle fonctionnerait. Il permet de tester des
> enchaînements, des séparations et des conditions d'extinction sur une machine.

CCT Ops transforme un petit noyau de la CCT en opérations vérifiables : proposer,
décider, mandater, contester, octroyer un pouvoir temporaire, l'exercer dans son
périmètre, l'éteindre, auditer les traces et reconstruire l'état après incident.
Il fonctionne avec Python 3 et sa bibliothèque standard, sans réseau, serveur ni
dépendance externe.

## Résultat disponible

Le prototype fournit :

- une CLI dont les entrées et sorties sont en JSON ;
- un état matérialisé dans `state.json` ;
- un journal `events.jsonl` append-only au niveau applicatif ;
- une chaîne SHA-256 reliant chaque trace à la précédente ;
- un instantané et son hachage dans chaque événement pour la récupération ;
- des propositions et décisions motivées ;
- des autorisations structurées par type, titulaire, périmètre et date butoir ;
- des mandats obligatoirement bornés dans le temps ;
- des recours, éventuellement suspensifs, résolus par un acteur distinct ;
- des pouvoirs temporaires bornés à 168 heures et non réactivables ;
- une extinction évaluée avant chaque opération ;
- un audit de l'intégrité, des séparations et des fonctions non pourvues ;
- un export autonome contenant état, traces et verdict d'audit.

## Démarrage rapide

Depuis ce dossier :

```bash
python3 cct.py --data-dir ./data init \
  --bootstrap-id registry \
  --bootstrap-name "Registre local"

python3 cct.py --data-dir ./data actor-add \
  --by registry --id alice --name Alice --roles proposer appellant

python3 cct.py --data-dir ./data status
python3 cct.py --data-dir ./data audit
python3 cct.py --data-dir ./data trace --limit 10
python3 cct.py --data-dir ./data export --output ./export.json
```

Toutes les réponses normales sont écrites en JSON sur la sortie standard. Un
refus institutionnel produit un JSON sur la sortie d'erreur et le code de sortie
`2`. L'aide complète est accessible avec :

```bash
python3 cct.py --help
```

## Démonstration complète

La démonstration crée un dépôt temporaire, sept fonctions séparées, une
proposition, une décision, un mandat, un pouvoir temporaire, un recours, une
tentative après échéance, un audit et un export :

```bash
python3 examples/demo_offline.py
```

Le chemin du dépôt temporaire est affiché. La tentative après échéance doit
retourner `pouvoir éteint: expired` et `audit_ok` doit valoir `true`.

## Commandes

| Commande | Effet | Autorité requise |
|---|---|---|
| `init` | Crée le dépôt et l'acteur bootstrap | aucune, dépôt absent |
| `actor-add` | Déclare un acteur et ses rôles | `registrar` |
| `proposal-create` | Soumet une proposition | `proposer` |
| `decision-record` | Décide avec motifs | `decision_maker` distinct de l'auteur |
| `mandate-grant` | Crée un mandat borné | `mandate_granter`, titulaire distinct |
| `mandate-exercise` | Trace une action dans le mandat | titulaire `mandate_holder` |
| `mandate-revoke` | Éteint avant terme | octroyant ou `auditor` |
| `appeal-open` | Ouvre un recours | `appellant` |
| `appeal-resolve` | Confirme, renvoie ou annule | `appeal_reviewer` indépendant |
| `power-grant` | Crée un pouvoir ≤ 168 h | `emergency_granter`, titulaire distinct |
| `power-exercise` | Trace une capacité autorisée | titulaire `emergency_holder` |
| `power-revoke` | Éteint avant terme | octroyant ou `auditor` |
| `tick` | Matérialise les échéances dues | horloge applicative |
| `status` | Compte les objets et capacités actives | lecture locale |
| `show` | Affiche une entité par identifiant | lecture locale |
| `trace` | Affiche les traces sans les instantanés | lecture locale |
| `audit` | Vérifie dépôt et séparations | lecture locale |
| `export` | Produit un paquet JSON autonome | dépôt valide |
| `recover` | Reconstruit l'état depuis le journal | `auditor` journalisé |

`--at HORODATAGE` existe pour les tests et la démonstration déterministe. Une
éventuelle version déployable devrait supprimer cette faculté, utiliser une
horloge fiable et consigner sa provenance. Sans `--at`, l'heure UTC du système
est utilisée.

## Séparation des fonctions

Les rôles incompatibles globalement sont refusés dès l'enregistrement :

- `decision_maker` avec `appeal_reviewer` ;
- `mandate_granter` avec `mandate_holder` ;
- `emergency_granter` avec `emergency_holder`.

Des contrôles contextuels s'ajoutent :

- un auteur ne décide jamais sa propre proposition ;
- l'octroyant et le titulaire d'un mandat sont distincts ;
- l'octroyant et le titulaire d'un pouvoir temporaire sont distincts ;
- le réviseur d'un recours n'est ni le requérant, ni l'auteur de la décision ;
- un mandat ou pouvoir ne peut être utilisé que par son titulaire ;
- une capacité hors du périmètre déclaré est refusée.

La polyvalence reste permise quand elle ne couple pas ces fonctions. C'est un
choix adapté aux petites collectivités, mais l'audit signale une concentration
supérieure à trois rôles.

## Chaîne d'autorisation exécutable

Une approbation générique de type `policy` ne peut autoriser ni mandat, ni pouvoir
temporaire. La proposition doit annoncer l'une des natures suivantes :

- `mandate_authorization` ;
- `temporary_power_authorization`.

Elle doit aussi fixer `--requested-holder`, `--authorized-scopes` et
`--not-after`. Après approbation, l'octroi vérifie que le titulaire est identique,
que le périmètre demandé est inclus et que l'échéance ne dépasse pas la date
butoir. Une décision portant sur un autre objet est refusée comme source
d'autorité.

Exemple minimal :

```bash
python3 cct.py --data-dir ./data proposal-create \
  --by alice \
  --title "Autorisation de réserve" \
  --body "Ouvrir la réserve A pendant une panne." \
  --kind temporary_power_authorization \
  --requested-holder crisis-team \
  --authorized-scopes open_reserve \
  --not-after 2030-01-02T00:00:00Z
```

## Cycle des pouvoirs temporaires

Un pouvoir temporaire exige :

1. une décision dont l'issue effective est `approve` ;
2. un octroyant doté du rôle `emergency_granter` ;
3. un titulaire distinct doté du rôle `emergency_holder` ;
4. une liste fermée de capacités ;
5. une échéance future, au plus 168 heures après l'octroi.

Chaque exercice vérifie à nouveau titulaire, rôle, état, échéance et périmètre.
À l'échéance, `expire_due` produit une trace `temporary_power_expired`, passe
l'état à `expired` et conserve `reactivable: false`. Aucune commande de
réactivation ou de prolongation n'existe : un nouvel octroi requiert une nouvelle
capacité et une nouvelle trace. Une révocation anticipée est distincte de
l'expiration.

Un recours suspensif gèle également les mandats et pouvoirs qui dépendent de la
décision contestée. Une confirmation les réactive seulement s'ils ne sont pas
arrivés à échéance. Un renvoi ou une annulation les éteint sous un état distinct,
`revoked_by_appeal`. Une décision ne peut pas recevoir un second recours dans ce
prototype, afin d'empêcher qu'une confirmation ultérieure ressuscite une décision
déjà annulée.

Si le programme ne tourne pas à l'heure exacte, il n'existe aucune possibilité
d'action logicielle pendant son sommeil. Au prochain appel, l'expiration est
matérialisée avant la commande demandée, qui est ensuite refusée.

## Stockage et récupération

```text
data/
├── state.json    # vue matérialisée courante
└── events.jsonl  # source de vérité, une trace JSON par ligne
```

Chaque événement contient : numéro de séquence, heure, acteur, action, objet,
détails, hachage précédent, hachage de l'état, instantané complet et hachage de
l'événement. L'ordre d'écriture est :

1. ajouter et synchroniser la trace ;
2. remplacer atomiquement `state.json`.

Une panne entre les deux laisse le journal en avance. `audit` détecte l'écart et
`recover --by AUDITEUR --apply` restaure l'état depuis le dernier instantané si,
et seulement si, toute la chaîne du journal est valide. L'essai sans `--apply`
ne modifie rien.

Le stockage d'instantanés complets augmente fortement le volume et réplique les
données dans le journal. C'est acceptable pour ce prototype de laboratoire, pas
pour des données personnelles réelles.

## Vérification

```bash
python3 -m unittest -v
```

La suite couvre notamment :

- auto-décision refusée ;
- combinaisons de rôles incompatibles refusées ;
- décision non motivée refusée ;
- mandat exerçable avant, mais pas après échéance ;
- plafond de durée d'un mandat ;
- recours suspensif et résolution indépendante ;
- auto-résolution d'un recours refusée ;
- capacité d'urgence hors périmètre refusée ;
- pouvoir inexerçable après extinction ;
- plafond de 168 heures ;
- décision non approbative incapable d'autoriser un pouvoir ;
- approbation générique incapable d'autoriser un pouvoir ;
- titulaire, périmètre et date butoir approuvés non dépassables ;
- gel des capacités dépendantes pendant un recours suspensif ;
- extinction des dépendances après annulation et impossibilité de rejouer le recours ;
- activation d'un mandat programmé seulement à sa date de début ;
- altération du journal détectée ;
- état récupéré depuis un journal valide ;
- export vérifiable ;
- audit de séparation ;
- invocation réelle de la CLI.

## Menaces et limites ouvertes

Le niveau effectivement vérifié est **empaqueté, accessible, exécutable et testé
localement**. Ne sont pas établis : autorisation par une collectivité, déploiement,
usage sous charge, sécurité hostile, accessibilité publique, efficacité politique
ou réobservation indépendante.

Limites bloquant tout déploiement :

- aucune authentification : les identités sont déclaratives ;
- aucune signature cryptographique ni gestion de clés ;
- un administrateur du disque peut réécrire état et journal ensemble ;
- aucun verrouillage multi-processus ni traitement des écritures concurrentes ;
- l'heure système est une dépendance commune et `--at` est un outil de test ;
- aucune confidentialité, minimisation ou politique de rétention ;
- les instantanés dupliquent toutes les données à chaque événement ;
- aucune traduction, accessibilité, interface papier ou réconciliation hors CLI ;
- aucune règle de quorum, tirage au sort ou preuve de composition des collèges ;
- le bootstrap `registrar` reste un centre d'attribution des rôles ;
- l'audit interne n'est pas une contre-expertise indépendante ;
- la récupération restaure des octets cohérents, pas les relations, pertes ou
  capacités humaines détruites par un incident.

La prochaine validation technique pertinente serait un protocole concurrent et
signé sur plusieurs supports hétérogènes. La prochaine validation institutionnelle
pertinente serait un exercice de table joué par des personnes qui n'ont pas conçu
le logiciel, avec des refus, pannes d'horloge, conflits de rôles et voies papier.

## Arborescence du prototype

```text
ops/
├── cct.py
├── cct_ops/
│   ├── __init__.py
│   ├── cli.py
│   ├── core.py
│   └── store.py
├── examples/
│   └── demo_offline.py
├── tests/
│   └── test_ops.py
├── VALIDATION.md
└── README.md
```
