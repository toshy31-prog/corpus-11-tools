# Audit debug — MUBI Film Scout 0.16.1

Date : 13 septembre 2026. Audit du code présent, pas d’une release Git propre.

## Verdict

**La recherche courante fonctionne ; les fonctions avancées ne sont pas encore
suffisamment fiables.** Les 73 tests existants réussissent, mais le contrôle
complémentaire reproduit **11 catégories d’anomalies**, dont trois prioritaires.
Il ne faut pas confondre « les tests passent » avec « toutes les fonctions sont
validées ».

Cet audit n’a corrigé aucun fichier applicatif. Il ajoute ce rapport, le
[harnais relançable](./harness.mjs) et les [résultats bruts](./results.json).
Les tests destructifs et les clés fictives sont confinés à un autre serveur,
un coffre temporaire et un profil Firefox isolé. Le coffre réel n’a été ni lu
en clair, ni modifié. Les appels réels ont seulement actualisé les diagnostics
et les caches habituels de l’application.

## Résultats observés

| Contrôle | Résultat | Portée |
| --- | --- | --- |
| `npm run check` | Réussi | Syntaxe des modules listés par le projet |
| `npm test` | 73/73 | Tests unitaires et API avec services simulés |
| `npm run benchmark` | 792 combinaisons, 474 programmes distincts | Catalogue synthétique ; ne mesure pas le goût réel |
| Harnais complémentaire | 78 assertions : 63 réussites, 15 échecs, 0 erreur de harnais | Navigateur Firefox isolé, API locale, injections de pannes et tests de concurrence |
| `npm run doctor:live` | TMDB, Guardian, NYT, OMDb opérationnels | Diagnostic réel ponctuel à 05:41, heure de Paris |
| `node scripts/launch.mjs --no-open` | Instance 0.16.1 reconnue | Réutilisation du serveur existant ; pas un redémarrage machine |
| Coffre/cache réels | Permissions `0600` | Contrôle des permissions, sans impression de secrets |

Les 15 assertions en échec ne sont pas 15 bugs indépendants : l’effacement a
deux reproductions, l’import a deux symptômes et la concurrence du coffre a
été répétée trois fois. Après regroupement : 11 catégories ci-dessous.

Recherche réelle supplémentaire : suspense, pépite cachée, 1990–2026, deux
heures, pas de côté. HTTP 200, 583 ms lors de ce passage avec cache disponible ;
75 titres explorés, 27 fiches dans la réserve, quatre propositions : Night Call,
Dream Work, Sang et or, Portraits Fantômes (explicitement hors envie).
Enrichissement de Night Call : OMDb 1/1 ; Guardian et NYT 0/1, sans erreur.
Une connexion qui répond n’implique pas qu’une critique correspondante existe.

## Anomalies reproduites et ordre de correction

P1 : risque de corruption, blocage persistant ou rupture d’une promesse centrale.
P2 : fonction incorrecte dans un parcours accessible. P3 : défaut de retour UI.

### D01 — P1 — Écritures concurrentes du coffre non protégées

- **Reproduction :** deux `save()` simultanés sur un coffre temporaire, l’un
  ajoutant Guardian, l’autre NYT. Trois répétitions : aucune ne conserve les
  deux ajouts avec deux succès. Deux répétitions finissent avec un JSON illisible ;
  l’autre perd une des clés. Erreur `ENOENT` également observée.
- **Cause :** lecture-modification-écriture non sérialisée et même nom `.tmp`
  partagé par les appels. `lib/connections.mjs:38` et `:60`.
- **Impact :** deux onglets ou requêtes concurrentes peuvent faire perdre les
  accès enregistrés ou rendre le centre des sources inutilisable. Ce n’est pas
  un constat de corruption du coffre réel de l’utilisateur.
- **Correction :** file de transactions couvrant lecture, fusion et écriture ;
  temporaire unique ; protection contre la concurrence entre processus si elle
  est autorisée. Test concurrent sauvegarde/sauvegarde et sauvegarde/effacement.

### D02 — P1 — Import non typé, persistant avant validation complète

- **Reproduction :** importer une shortlist avec `releaseDate: 2020` (nombre).
  Après rechargement, les groupes de genres ne s’initialisent plus ; le site
  affiche « Impossible de joindre le serveur local » alors que celui-ci répond.
  Un champ `runtime` contenant une balise `<strong>` crée aussi cette balise
  dans la bibliothèque au lieu de l’afficher comme texte.
- **Cause :** `sanitizePreferences` conserve les champs arbitraires via `...m`
  (`public/discovery.mjs:25`). L’import sauvegarde avant de tenter le rendu
  (`public/app.js:934`). Des métadonnées sont injectées directement en HTML.
- **Impact :** import malformé persistant, démarrage partiellement bloqué,
  diagnostic trompeur et injection de présentation. L’exécution de script ou
  l’exfiltration ne sont **pas** démontrées ; la CSP limite ces risques.
- **Correction :** schéma fermé pour chaque film, dates/valeurs numériques
  normalisées, texte échappé partout, taille d’import bornée ; validation
  complète avant remplacement atomique des préférences ; restauration en cas
  d’échec. Ne pas écraser l’ancien état avant validation.

### D03 — P1 — Disponibilité invalidée sans retrait du programme

- **Reproduction :** après une recherche valide, simuler une actualisation
  `/api/enrich` qui retourne `verified:false` et `available:false`. Les quatre
  films restent dans la sélection proposée.
- **Cause :** fusion dans `currentProgramme` sans réévaluation d’éligibilité
  (`public/app.js:1072`).
- **Correction :** invalider la carte, afficher la raison et recomposer avec
  les candidats encore disponibles ; un verrou ne doit pas prouver une offre.
  Test identique pour l’actualisation d’une fiche et les erreurs partielles.

### D04 — P2 — Effacement incomplet de l’état actif

- **Reproductions :** après « Tout effacer localement », le bouton renouveler
  reste actif et ramène les quatre anciens films. Une réponse d’enrichissement
  retardée de 1,2 seconde les fait également réapparaître sans nouvelle action.
- **Cause :** les préférences sont vidées, mais `currentProgramme`, le catalogue,
  la réserve, les verrous et la génération asynchrone de l’atelier ne le sont
  pas (`public/app.js:1051`, `public/studio.mjs:134`).
- **Limite du constat :** retour des cartes de la session, pas restauration
  démontrée des avis ou des clés effacés.
- **Correction :** point unique de remise à zéro couvrant données, interface,
  états de session et invalidation de toutes les réponses tardives.

### D05 — P2 — Remplacer une carte déplace les autres

- **Reproduction :** `[A,B,C,D]`, remplacer A → `[B,C,D,E]` au lieu de `[E,B,C,D]`.
- **Cause :** les autres cartes deviennent une liste de verrous placés en tête,
  puis le moteur complète la fin (`public/studio.mjs:119`,
  `public/discovery.mjs:79`).
- **Correction :** remplacement par emplacement ; conserver identités et
  positions des autres cartes ; recalculer uniquement les explications affectées.

### D06 — P2 — Une page en panne est déclarée déjà chargée

- **Reproduction :** faire échouer la page 2 pendant l’exploration de quatre
  pages. L’avertissement apparaît, mais `exploredPages` vaut encore `[1,2,3,4]`.
  Le navigateur considère ces quatre pages chargées et ne propose pas de reprise.
- **Cause :** liste des pages tentées renvoyée comme liste des pages chargées
  (`server.mjs:403`, `public/app.js:496`).
- **Correction :** séparer pages demandées/réussies/échouées ; permettre de
  relancer les pages en échec sans recommencer toute l’exploration.

### D07 — P2 — Collections longues tronquées sans suite accessible

- **Reproduction :** importer 30 films puis vérifier le premier lot : 20
  consultés, seulement 24 cartes accessibles ; les six dernières ne sont
  proposées nulle part dans ce parcours.
- **Cause :** `renderMini` tronque toutes les listes à 24 et le bouton de
  vérification repart toujours des 20 premiers (`public/studio.mjs:190`, `:242`).
- **Correction :** pagination de collection, bouton de lot suivant et compteur
  consultés/restants. Aucun plafond silencieux pour une collection importée.

### D08 — P2 — L’atelier annonce des films qu’il n’utilise pas

- **Reproduction :** importer un film vérifié en bibliothèque, recharger puis
  ouvrir À deux. Indication « 1 films vérifiés disponibles », bouton actif,
  mais aucun résultat.
- **Cause :** l’indicateur compte `allMovies()`, alors que duo et double séance
  utilisent seulement `pool`, vide après rechargement (`public/studio.mjs:284`).
- **Correction :** même ensemble admissible pour compteur, activation du bouton
  et algorithme ; expliciter quand une actualisation des offres est nécessaire.

### D09 — P2 — Budget invalide traité comme absence de limite

- **Reproduction :** saisir 0 dans la durée du choix à deux puis cliquer
  « Trouver un accord » : des films de 85, 95 ou 115 minutes sont retournés.
- **Cause :** contrôles hors formulaire validé et test `!filters.maxRuntime`
  qui traite 0 comme aucune contrainte (`public/discovery.mjs:67`, `:163`).
  Sonde directe complémentaire : `doubleFeature(pool, NaN)` accepte une paire.
- **Correction :** validation explicite dans l’UI et les fonctions : nombre
  fini, bornes applicables, aucune conversion d’une saisie invalide en illimité.

### D10 — P2 — Faux positifs du repli anti-série

- **Reproduction synthétique :** deux films sans collection, titres « American
  Alpha » / « American Beta », genre partagé : `tooSimilar` renvoie vrai.
- **Cause :** le premier mot significatif commun suffit (`public/discovery.mjs:113`).
- **Correction :** réserver l’exclusion dure aux parentés documentées ; un
  simple indice lexical peut diminuer la priorité sans interdire une proposition.

### D11 — P3 — Recherche vide dans la bibliothèque sans explication

- **Reproduction :** garder deux films, chercher une chaîne absente : zone vide,
  aucun message. Le message d’absence ne concerne que la bibliothèque vide
  avant filtrage (`public/app.js:745`).
- **Correction :** « Aucun film ne correspond » et action pour effacer les filtres.

## Couverture fonctionnelle

| Famille | Exercée pendant cet audit | Limites |
| --- | --- | --- |
| Démarrage/lanceur | Initialisation Firefox, statut, reprise de l’instance réelle | Pas de reboot machine ni installation neuve |
| Sources | Sauvegarde/effacement fictifs, diagnostic réel des 4 fournisseurs | Pas de nouvel abonnement ou compte ; vrais secrets inchangés |
| Recherche | Programme, filtres, six effets via le banc, seuils, limite de 2 angles | Matrice synthétique, pas chaque combinaison sur MUBI réel |
| Préréglages/texte | Oblique, surprise, annulation, décodage puis application | Pas de compréhension générale ; LLM réel absent |
| Catalogue | Accès direct, pagination 20→40, tris, recherche vide, filtre vérifiés, angle | Vérification des tris ici limitée au fonctionnement du parcours, pas preuve exhaustive de chaque ordre |
| Programme | Verrou, renouvellement, remplacement unitaire, vus | Bugs D03–D05 ; changements rapides multiples non exhaustifs |
| Fiches | Ouverture/fermeture, disponibilité, avis, liste ; 5 axes de rapprochement | Pas de lancement de lecture chez le fournisseur |
| Bibliothèque | Garder, filtre de liste, comparaison 2 films, import/export | Retrait individuel relu mais non cliqué dans le relevé final ; pas de volume massif |
| Préférences | Avis, profil, veto, désactivation/réinitialisation | Hypothèses après 3 avis : test unitaire existant, pas parcours humain complet |
| Atelier | Double séance, écho, duo, parcours ordonné, panneaux/prérequis | Bugs D07–D09 |
| Collections | Import 30, collection fournie, consultation, suppression | Pas d’import de 5 000 films réels |
| Données locales | Export, import valide, persistance, import malformé, HTML, effacement | Export testé en capturant le contenu Blob ; pas restauration d’une sauvegarde utilisateur réelle |
| Pannes | Page API échouée, enrichissement tardif, disponibilité retirée, JSON invalide | Latences longues réelles et perte de réseau système non exhaustives |
| Sécurité | Origin/Host rejetés, 400/413/428, coffre hors HTTP, permissions | Audit ciblé, pas un pentest complet ; pas de test d’exfiltration |
| Affichage/accessibilité | Absence de débordement à 1440, 768, 500 px ; Échap ferme la fiche | Firefox impose ici 500 px minimum ; 390 px, lecteur d’écran et parcours clavier complet non validés |

L’interface a été testée par événements DOM scriptés dans un vrai Firefox
headless ; cela valide des enchaînements fonctionnels, pas la cliquabilité
physique de chaque contrôle à toutes les tailles. La capture de l’accueil à
500 px a également été inspectée visuellement. Aucun « tout est testé » absolu
ne serait justifié : entrées libres, tailles de bibliothèque et timings ont un
nombre de combinaisons non borné.

## Plan de correction recommandé

1. D01 et D02 : intégrité du coffre et des imports, avant d’ajouter des fonctions.
2. D03 et D04 : éligibilité après actualisation et remise à zéro asynchrone.
3. D05 et D06 : stabilité des cartes et reprise des pages en erreur.
4. D07–D10 : collections complètes, réserve de l’atelier, budgets et anti-série.
5. D11 et accessibilité mobile/clavier ; rejouer le harnais puis un parcours réel.

Pour chaque correction, transformer le cas en régression qui échoue avant
patch et réussit après. Certains tests de `lib/search.test.mjs` exercent encore
l’ancien `buildProgramme`, tandis que le serveur utilise `buildExpandedProgramme` :
la couverture doit être rattachée au moteur réellement appelé.

## Rejouer l’audit

Prérequis existants : Node ≥ 18, Firefox et Geckodriver. Rien n’est installé
par le harnais. Dans un premier terminal, sur un port libre :

```bash
geckodriver --port 4451 --host 127.0.0.1
```

Dans le projet, dans un autre terminal :

```bash
node audits/2026-09-13/harness.mjs
```

Le harnais lance une instance de l’application et une fausse source sur des
ports libres, utilise des clés fictives, crée un profil Firefox neuf, écrit
les résultats dans un nouveau `/tmp/mubi-audit-*`, puis ferme les processus
qu’il a lancés. Il ne vise jamais le serveur réel sur 4180.
`SCOUT_WEBDRIVER_URL` permet d’utiliser une autre adresse locale de Geckodriver.
Le JSON PASS/FAIL est le verdict : le code de sortie du script seul n’est pas
un indicateur de réussite de toutes les assertions.

La version conservée du harnais force les téléchargements de test vers son
dossier temporaire. Cette précision de rangement est postérieure au relevé
des 78 assertions et ne modifie pas les scénarios testés.

Rangement après audit : les quatre exports fictifs produits lors des passages
successifs ont été identifiés par leur contenu puis déplacés de Téléchargements
vers `/tmp/mubi-audit-7LcFyi/exports/` ; ils restent récupérables. Le Firefox de
test a été fermé. La tentative d’arrêt du pilote Geckodriver (PID 182459,
port local 4451) a été refusée par l’environnement ; il peut rester en écoute,
sans session de navigateur. Le serveur utilisateur 4180 est resté actif.

## État du code audité

Empreintes SHA-256 de six fichiers centraux (pas une empreinte de tout le dépôt) :

```text
debadd0a02966cf885898eb026776eabb1d864991340a400b9ae92b4ad267899  package.json
fac050dd7dac67303284e3e30b9bb95ec90e6a1e4c2051341f2dd75bc832d07b  server.mjs
a708c841d734e5092f548c025a7f4a47ad838403c44da5f00f0c75c98f5e610a  public/app.js
0e9913cdf5ccb600bd64bdc3abf2b7333115160199940e4975b78a33897205aa  public/studio.mjs
6044e53419801c4c538a60bf39f95ab32af4b9fa203bd74464623571e62061f0  public/discovery.mjs
0c5f32a7924e8a4d566c4e264799e505c8ff9fcc5ae33b7f9f5b09224be51ad6  lib/connections.mjs
```
