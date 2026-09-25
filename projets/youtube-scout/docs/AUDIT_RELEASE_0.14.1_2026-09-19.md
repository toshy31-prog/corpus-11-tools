# Audit adversarial local — Scout 0.14.1

Date : 19 septembre 2026. Périmètre : stockage, caches, graphes, reprise de session, courses asynchrones, rendu de données et API HTTP locale.

## Conclusion

Les cas de contamination reproduits dans cet audit sont corrigés et couverts par des tests de non-régression. La version locale est **0.14.1**. Cela ne constitue ni une certification de sécurité, ni une garantie d’absence de tout défaut, ni une publication sur GitHub.

L’audit a suivi une méthode avant/après : nouveaux scénarios en échec sur le code antérieur, correction, rejeu ciblé puis suite complète et parcours navigateur. Les tests emploient des données fictives, des fournisseurs simulés, des fichiers temporaires et des profils navigateur jetables. Aucun jeton personnel, aucun appel aux API musicales réelles, aucun scan de service tiers. La lecture complémentaire du graphe personnel est restée non mutante et ne publie pas son contenu.

## Défauts reproduits et corrections

Les priorités ci-dessous sont des priorités de maintenance locales, pas un score CVSS ni une estimation chiffrée de risque.

| ID | Priorité | Reproduction / conséquence | Correction |
| --- | --- | --- | --- |
| D01 | Haute | Rechercher `C++`, puis `C`, pouvait rendre l’identité du premier ; les noms non latins partageaient aussi des clés serveur. Même problème dans la mémoire navigateur. | Clés de requête exactes, Unicode et ponctuation conservés ; séparation des confirmations et vérification du contexte de la copie de secours. |
| D02 | Haute | Un même pays faisait remonter des artistes provenant d’autres fouilles sans lien musical indépendant. | Un territoire complète maintenant un lien label/crédit/alias/chaîne ; une scène explicitement documentée reste une route possible. |
| D03 | Haute | Deux chaînes YouTube portant le même titre partageaient un nœud, même avec des identifiants distincts. | Identifiant YouTube exact exigé pour la route chaîne ; anciennes jonctions fondées sur le nom ignorées à la lecture. |
| D04 | Haute | Cinq identifiants distincts devenaient deux clés après remplacement de caractères ou troncature. | Identifiants exacts conservés, limites et clés réservées contrôlées sans transformation destructive. |
| D05 | Haute | Un lot avec une preuve malformée échouait après avoir déjà ajouté certaines entités en mémoire. | Copie et validation du lot entier avant mutation ; refus HTTP 400 sans insertion partielle. |
| D06 | Haute | `putEdge` pouvait réactiver une identité rejetée ; un autre identifiant d’arête pouvait contourner une décision ancienne. | Même protection pour l’écriture simple et les lots ; décisions reconnues par relation exacte, pas uniquement par clé historique. |
| D07 | Haute | Une réponse de graphe ancienne, reçue après une récente, écrasait les connaissances visibles. | Numéro de lecture et génération du parcours contrôlés avant application. |
| D08 | Haute | Un voisin ListenBrainz arrivé après un changement de départ était enregistré avec la nouvelle génération. | Génération capturée au départ et revérifiée après les attentes réseau/recherche. |
| D09 | Moyenne | Une clé logique de cache pouvait rendre une autre ressource ou les données d’un autre serveur fournisseur. | Cache lié à l’URL complète et à la clé logique ; réutilisation des anciennes entrées uniquement si leur URL est identique. |
| D10 | Moyenne | Une requête en file s’exécutait après désactivation de la source et pouvait rétablir son statut actif. | Révision de configuration vérifiée avant exécution, après réponse et après persistance. Une requête déjà partie n’est pas prétendue annulée chez le fournisseur. |
| D11 | Haute | Les GET de l’API acceptaient les requêtes intersites alors qu’ils peuvent lire l’état, consommer du quota ou enrichir le graphe. | Contrôle Origin/Fetch Metadata pour toute l’API, y compris GET et miniatures ; refus aussi pour une autre origine sur localhost. Pas de revendication d’exfiltration CORS démontrée. |
| D12 | Haute | Certains liens de catalogue interpolés dans le HTML acceptaient des attributs injectés ou un schéma `javascript:`. | Validation HTTP(S), exclusion des identifiants embarqués et échappement des attributs aux points de rendu concernés. Injection HTML reproduite ; exécution arbitraire malgré la CSP non établie. |
| D13 | Moyenne | Une sauvegarde/session pouvait associer un départ A à un front B. | Cohérence exigée à l’import, à l’enregistrement serveur et à la proposition de reprise navigateur. |
| D14 | Moyenne | Une copie périmée masquait un refus d’authentification 401/403 du fournisseur. | Pas de repli périmé après refus d’accès. Le repli explicite sur panne temporaire reste disponible. |
| D15 | Moyenne | Un Retry-After démesuré pouvait bloquer longtemps toute la file d’une source. | Au-delà de 60 secondes, pas de nouvelle tentative automatique pour cette réponse ; le délai du fournisseur n’est pas raccourci pour réessayer prématurément. |

Les 19 nouveaux tests incluent les cas ci-dessus, des variantes aux frontières HTTP et un contrôle positif : les vraies scènes et les chaînes à identifiant commun restent utilisables. Ils complètent les 518 tests de la consolidation précédente.

## Validation

| Vérification | Résultat |
| --- | --- |
| `npm run check` | Succès |
| `npm test` — Node 18.19.1 | **537/537**, aucune omission |
| `node --test server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs` — Node 24.19.0 | **537/537**, aucune omission |
| Audit navigateur Firefox, 4 229 vidéos fictives | **31/31** |
| Même audit Chromium | **31/31** |
| `git diff --check` | Succès |

Commandes navigateur utilisées :

```sh
SCOUT_AUDIT_BROWSER=firefox SCOUT_AUDIT_LIBRARY_SIZE=4229 \
SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/consolidation-browser-audit.mjs

SCOUT_AUDIT_BROWSER=chromium SCOUT_AUDIT_LIBRARY_SIZE=4229 \
SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/consolidation-browser-audit.mjs
```

Contrôles navigateur : choix souris/clavier, modal, absence de direction cochée, départ changé pendant un chargement, pagination locale, commandes sans requête fournisseur, carnet et notes, rechargement/reprise explicite, résultats obsolètes conservés hors sélection, continuer/revenir, mobile sans débordement, données HTML piégées, liens dangereux, sauvegardes incohérentes et exclusion des secrets imbriqués.

Le test d’en-tête Host emploie `http.get` : le client `fetch` réécrivait cet en-tête et produisait initialement un faux résultat de test. Avec la requête HTTP réellement forgée, le serveur refuse l’hôte non autorisé.

Artefacts temporaires, non destinés à Git :

- Firefox : `/tmp/scout-consolidation-ui-IEfjgU/` (rapport et captures).
- Chromium : `/tmp/scout-consolidation-ui-v6JtpV/`.
- Suites : `/tmp/scout-release-tests.log`, `/tmp/scout-release-node24.log`.
- Syntaxe : `/tmp/scout-release-check.log`.

Pour rejouer la sélection ciblée : `npm run test:adversarial`. Pour valider une release, garder la suite complète et les deux navigateurs. Les scripts « live » restent hors de ce protocole ; ne pas ajouter `--allow-network`.

## Données existantes et activation locale

Lecture seule du graphe disponible : **4 142 entités / 15 054 relations**. Depuis le cas utilisateur « Ant People », après projection de sécurité : 9 candidats label, 1 alias, 2 territoire, 7 période ; les autres routes ne donnent pas de candidat dans cet instantané. **Aucun résultat KAS:ST ou 808NOCHE** dans ces huit routes. Les compteurs désignent des objets de catalogue, pas nécessairement des œuvres uniques.

- Aucune purge de bibliothèque, de graphe ou de carnet.
- Les anciennes copies de cache restent conservées ; une copie incompatible n’est plus sélectionnée.
- Les résultats de session invalidés restent dans l’historique de retrait, hors sélection active.
- Les confirmations nom-seul ambiguës restent sauvegardées/exportables. L’interface demande une nouvelle vérification avant leur réutilisation ; les liens déjà confirmés dans le graphe ne sont pas effacés.
- Les informations déjà perdues par une ancienne collision de clé ne sont pas magiquement reconstruites.
- Versions application, interface et paquet alignées sur **0.14.1**. Ancien serveur du projet vérifié puis relancé proprement sur **4181** ; santé et fichiers servis contrôlés après relance.
- Aucun commit, push, publication ou modification de compte externe.

## Limites restantes

Ce test « bug bounty » est une campagne adversariale locale, pas un programme public de divulgation. Il ne valide pas les comptes OAuth personnels, les quotas réels, les résultats musicaux de tous les fournisseurs, tous les appareils ni une charge réseau hostile prolongée. Le serveur reste un outil de confiance sur loopback : les contrôles navigateur ne remplacent pas une authentification contre un autre processus local ou un système compromis. La quantité d’historique conservé n’est pas ici soumise à une nouvelle politique de purge.

Les contrôles de validation et de robustesse ont imposé les contre-exemples avant/après et la séparation entre tests simulés, observation locale et publication. Aucun résultat n’est annoncé comme vérifié sur un service tiers.
