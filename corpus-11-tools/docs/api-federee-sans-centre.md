# API fédérée Corpus — contrat sans centre

Statut : **documentation d'architecture candidate**. Ce document décrit les
interfaces déjà présentes dans Corpus 11 Tools et propose leur composition. Il
ne prétend pas qu'un service HTTP, un registre global ou une orchestration
distribuée sont déjà déployés.

## Conclusion

L'API naturelle de Corpus n'est pas une API REST centrale. C'est une API de
protocoles : une demande peut entrer par la conversation, un skill, un outil ou
un laboratoire ; elle est traitée par le plus petit ensemble de ports pertinent ;
chaque sortie porte son statut, ses traces et ses limites. Aucun nœud n'est à la
fois annuaire obligatoire, autorité de vérité, exécuteur et propriétaire des
données.

« Sans centre » ne signifie donc ni absence de structure ni égalité fictive des
pouvoirs. Les dépendances, droits de refus, capacités d'exécution et points de
veto doivent rester observables.

## Surfaces existantes

| Surface | Entrée | Sortie | État réel |
|---|---|---|---|
| Conversation | question en langage ordinaire | réponse et méthode pertinente | active via les skills Codex |
| Routage | scène, tension, changement matériel possible | sous-ensemble minimal de skills | actif, sans garantie universelle |
| Capability | conditions et observations propres au skill | conclusion bornée, inconnue ou test proposé | 49 wrappers candidats |
| Provenance | identifiant d'objet 11.x | chaîne de backlinks 10.x | outil local déterministe |
| Validation | paquet, graphe, docs, frontières | diagnostics et code de sortie | outils locaux déterministes |
| Experiment Lab | plugin, configuration, observateur, étapes, contrôles, seed | état, journal, empreintes, classification | moteur JavaScript testé |
| Arena | scénario gelé, méthodes rivales, seed | résultats vectoriels et traces aveugles | procédure expérimentale testée |
| Simulation campaign | budgets et vecteurs comparables | dominance/frontière de Pareto, sensibilités | primitives Python testées |
| Yield gate | fiche JSON de cycle de vie | verdict sans score agrégé | outil local déterministe |
| Transfert | mécanisme extrait d'une recherche | candidat, acceptation ou rejet documenté | registre de gouvernance |

La présence d'une surface ne prouve ni son accessibilité dans tout contexte, ni
son exécution, ni sa robustesse. Produit, recherches, archives et prototypes
restent des régimes distincts.

## Enveloppe commune candidate

Cette enveloppe est un langage d'interopérabilité proposé. Elle n'est pas encore
implémentée comme schéma canonique.

```json
{
  "contract": "corpus-envelope/v0",
  "requestId": "req-local-001",
  "intent": "analyze",
  "scene": {
    "question": "La transformation produit-elle un gain autonome ?",
    "termsToPreserve": ["gain autonome"],
    "unresolvedChoices": []
  },
  "constraints": {
    "allowedActions": ["read", "analyze"],
    "forbiddenActions": ["publish", "deploy"],
    "dataBoundary": "local"
  },
  "routing": {
    "requestedPorts": [],
    "selectedPorts": ["autonomous-capacity-gain"],
    "selectionReason": "peut changer l'attribution du gain"
  },
  "evidence": [],
  "response": {
    "status": "unknown",
    "claims": [],
    "artifacts": [],
    "traces": [],
    "limits": [],
    "reversalConditions": []
  }
}
```

### Champs obligatoires au passage d'un port

- `requestId` : corrélation locale ; il ne crée pas d'identité globale.
- `intent` : `analyze`, `audit`, `experiment`, `validate`, `trace` ou `transfer`.
- `scene.question` : formulation utilisateur conservée sans la remplacer par la
  taxonomie Corpus.
- `constraints` : actions permises, refusées et frontière des données.
- `routing.selectionReason` : ce que le port sélectionné peut matériellement
  changer.
- `response.status` : statut explicite, jamais déduit du seul fait qu'un artefact
  existe.
- `response.traces` et `response.limits` : éléments vérifiables et bornes de la
  conclusion.

Les statuts minimaux proposés sont : `proposed`, `available`, `executed`,
`tested`, `authorized`, `deployed`, `reobserved`, `unsupported`, `unknown`,
`refused` et `unavailable`. Ils ne forment pas tous une progression linéaire :
une analyse peut être `executed` sans déploiement, et un refus peut être une
sortie terminale valide.

## Ports

Un port est un contrat local adressable par nom et version. Un annuaire peut
faciliter sa découverte, mais il ne doit pas être requis pour utiliser un port
déjà connu.

### Port conversationnel

```text
submit(scene, constraints?) -> response
inspect(requestId) -> routing + provenance + traces
resume(requestId, delta) -> response
refuse(requestId, scope) -> refusal trace
```

La conversation libre reste l'entrée canonique candidate. `inspect` rend la
compilation Corpus visible sans obliger l'utilisateur à connaître les skills.
`resume` ajoute un delta : il ne réécrit pas silencieusement la scène initiale.

### Port de skill

```text
invoke(skillName, scene, evidence, constraints) -> bounded assessment
```

Le routeur choisit seulement les skills pouvant changer conclusion, attribution,
confiance, protection, recours, forme, trajectoire ou condition de renversement.
Un skill déclaré est invocable dans le paquet ; cela n'établit pas la capability
comme robuste ou universelle.

### Port Experiment Lab — existant

Le contrat JavaScript `corpus-experiment-plugin/v1` exige :

```js
{
  manifest: { id, version, title, observer, reversalConditions },
  createState(configuration),
  operations: {}, observers: {}, perturbations: {},
  criteria: {}, controls: {}, classifiers: {}
}
```

Fonctions publiques observées :

```text
createEngine(plugin, configuration) -> ExperimentEngine
engine.operate | perturb | observe | evaluate (id, input) -> result
engine.run(steps) -> result[]
engine.snapshot() -> state + journal + hashes
runControl(s) / classify
```

Seules les opérations et perturbations reçoivent l'état vivant. Observateurs et
critères travaillent sur une copie. Chaque invocation journalise les empreintes
avant/après.

Le schéma déclaratif existant `experiment.schema.json` exige `plugin`,
`configuration`, `observer`, `steps`, `controls`, `reversalConditions` et `seed`.

### Port Arena — existant

```text
runBlindArena({arenaId, scenario, contenders, seed, blindKey, claimExternal})
  -> {report, sealedIdentityMap}
```

Un scénario fournit `createTrial`, `project`, `admissibleActions`, `act`,
`observe`, `scorePredictions` et `close`. Chaque contender fournit `decide` et
ses prédictions avant action. Les mondes initiaux et aléas sont appariés. La
sortie est vectorielle : `winner` et `aggregateScore` sont interdits.

### Port de campagne Python — existant

```text
common_random(seed, *coordinates) -> Random
validate_budget(budget, expected=1.0, tolerance=1e-9)
pareto_dominates(left, right, orientations) -> bool
pareto_frontier(outcomes, orientations) -> (frontier, dominated_by)
apply_bounded_changes(base, changes, low=0.0, high=1.0) -> mapping
```

Ces primitives rendent les comparaisons appariées possibles sans fabriquer de
score global.

### Port de transfert

```text
propose(source, mechanism, removedContext, dependencies, withdrawalCondition)
review(candidate, corpusOnlyTests) -> candidate | accepted | rejected
```

La seule direction autorisée est `recherche → proposition → transfert contrôlé
→ produit`. Un port produit ne peut pas importer paramètres, résultats ou
conclusions propres à une recherche.

## Topologie sans centre

```text
conversation ─┬─> skill ───────────────> réponse bornée
              ├─> provenance ──────────> backlinks
              ├─> validation ──────────> diagnostics
              └─> laboratoire ─┬───────> traces + empreintes
                               ├─ arena -> vecteurs appariés
                               └─ campagne -> frontière de Pareto

recherche ──> transfert contrôlé ──> nouveau port produit éventuel
```

Il n'y a pas de base globale obligatoire, de score souverain ou d'exécuteur
unique. La cohérence vient de contrats versionnés, d'empreintes, de statuts et de
frontières vérifiables. Un routeur est un médiateur remplaçable, pas une autorité
sur le vrai.

## Règles de composition

1. Préserver la scène avant de sélectionner un port.
2. Générer des candidats indépendants avant audit lorsque le cadrage risque de
   supprimer une alternative réelle.
3. Ne transmettre que les données nécessaires au port destinataire.
4. Ne jamais convertir automatiquement `written → tested → authorized →
   deployed → reobserved`.
5. Conserver séparément proposition, exécution, effet observé et conclusion.
6. Propager les conditions de renversement avec la conclusion.
7. Refuser toute promotion recherche→produit hors du registre de transfert.
8. Préserver les résultats vectoriels ; toute agrégation doit être déclarée et
   contestable.
9. Rendre visibles l'auteur de l'action, le propriétaire de l'arrêt et le porteur
   des coûts quand ils diffèrent.
10. Arrêter le routage quand un port supplémentaire ne peut plus changer un
    élément matériel de la réponse.

## Erreurs communes

Format candidat :

```json
{
  "status": "unavailable",
  "code": "PORT_NOT_REACHABLE",
  "message": "Le port est décrit mais non accessible dans ce contexte.",
  "retryable": false,
  "trace": [],
  "alternatives": []
}
```

Codes minimaux : `INVALID_ENVELOPE`, `PORT_NOT_FOUND`, `PORT_NOT_REACHABLE`,
`ACTION_NOT_AUTHORIZED`, `DATA_BOUNDARY_VIOLATION`, `PROTOCOL_NOT_FROZEN`,
`EVIDENCE_INSUFFICIENT`, `STATUS_PROMOTION_UNSUPPORTED`, `TRANSFER_REQUIRED` et
`REFUSED`.

## Ce qui manque pour en faire une API distribuée réelle

- un schéma JSON versionné pour l'enveloppe commune ;
- une découverte locale ou fédérée des ports, sans annuaire obligatoire ;
- un modèle d'autorisation et de consentement par capacité ;
- des signatures de traces et une stratégie de révocation ;
- des adaptateurs entre skills, outils Python, modules JavaScript et éventuel
  transport HTTP ou pair-à-pair ;
- des tests de reprise, partitions, versions incompatibles, refus et suppression ;
- des observations multi-utilisateurs de la surface conversationnelle ;
- une revue de menace portant sur corrélation d'identité, fuite de provenance,
  rejeu, capture du routeur et concentration des veto.

Une spécification OpenAPI serait prématurée : elle documenterait un transport
HTTP qui n'existe pas et risquerait de transformer la passerelle en centre. Elle
deviendra utile seulement comme adaptateur optionnel d'un contrat indépendant du
transport.

## Sources canoniques dans le dépôt

- manifeste : `../.codex-plugin/plugin.json` ;
- inventaire : `inventory.json` ;
- routage : `../skills/corpus-11-routing/SKILL.md` ;
- index des capabilities :
  `../skills/corpus-11-routing/references/capability-index.md` ;
- schémas d'expérience : `../labs/experiment-lab/schemas/` et
  `../labs/experiment-lab/governance/` ;
- contrats exécutables : `../labs/experiment-lab/core/` et
  `../labs/experiment-lab/arena/` ;
- primitives Python : `../labs/python/corpus_labs/simulation_campaign.py` ;
- registre de transfert : `../../transfers/`.

## Condition de révision

Cette architecture doit être révisée si un usage réel exige une coordination
globale pour produire un résultat correct, si la fédération empêche un recours
ou une suppression nécessaires, ou si un médiateur acquiert de fait un pouvoir
de veto, d'orchestration ou d'accès qui en fait un centre malgré le vocabulaire.
