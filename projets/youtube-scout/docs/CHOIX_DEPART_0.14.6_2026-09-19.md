# Choisir un départ — 0.14.6, 19 septembre 2026

## Périmètre

Cette étape traite la fenêtre de choix du départ, après connexion/import. Ce n’est ni une refonte de toute l’exploration, ni une validation de disponibilité des catalogues réels.

Le parcours visible est désormais : rechercher ou demander des suggestions → sélectionner un départ → **Explorer ce départ** → vérifier l’identité si nécessaire → régler les directions dans l’exploration.

## Changements

- Recherche locale unifiée : morceaux/vidéos, artistes, labels et playlists ; filtre de type facultatif. La portée locale est écrite sous le champ. La connexion ne vaut pas import : une bibliothèque vide explique quoi faire.
- Résultats contextualisés avec les informations disponibles : type, artiste renseigné ou crédit documenté, chaîne, playlist ou catalogue. Aucun artiste n’est confirmé à partir du seul titre et les homonymes ne sont pas fusionnés.
- Aucun choix implicite : cliquer ou utiliser Espace sur une ligne sélectionne uniquement. La sélection est marquée, récapitulée et validée par un bouton distinct. Changer la requête ou le filtre efface le choix précédent.
- Les suggestions utilisent la même sélection et le même bouton final. Leurs réglages facultatifs sont repliés et ne règlent pas les directions de l’exploration.
- Retrait des directions, de la profondeur et des compteurs techniques de cette fenêtre. Les anciennes liaisons internes restent cachées hors du dialogue, sans deuxième module visible.
- Un nouveau départ n’impose plus silencieusement « labels uniquement ». Les directions sont regroupées à l’étape suivante. Ouvrir un départ déjà identifié depuis cette fenêtre ne lance pas les recherches de branches.
- Un seul espace défilant ; en-tête et validation restent accessibles. Adaptation mobile, focus visible, fermeture par Échap, retour au déclencheur, garde contre le double lancement.
- Correction d’un état transitoire : les réglages de branches ne s’affichent plus avec le formulaire d’identification lorsqu’un morceau nécessite encore une identité.

## Validation exécutée

Node utilisé : `/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` (24.19.0).

```bash
PATH=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test
PATH=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run check
PATH=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run check:workflow
SCOUT_AUDIT_BROWSER=firefox SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/workflow-browser-audit.mjs
SCOUT_AUDIT_BROWSER=chromium SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/workflow-browser-audit.mjs
```

Résultats finaux :

| Vérification | Résultat |
| --- | --- |
| Suite automatisée | 561 tests réussis, 0 échec |
| Syntaxe et workflow | Réussis |
| Firefox | 107 assertions réussies, 218 interactions consignées |
| Chromium | 107 assertions réussies, 218 interactions consignées |
| Erreurs JavaScript non interceptées pendant les parcours | 0 dans les deux navigateurs |

Les scénarios couvrent notamment recherche multi-type, contexte, sélection clavier, modification du filtre, absence de requête avant validation, double lancement, suggestions, annulation sans modification de session, bibliothèque vide, mobile 390×844, fenêtre réduite 720×500, identification et non-régression des parcours existants.

Une première vérification d’annulation comparait la session pendant que la confirmation précédente enregistrait encore ses résultats. Le scénario final attend la fin effective d’une ouverture validée avant de prendre la référence, puis compare la session serveur avant/après annulation. L’attente globale `networkidle`, inadéquate ici, n’est plus utilisée.

Artefacts locaux des derniers passages :

- Firefox : `/tmp/scout-workflow-ui-SaCwoH/report.json` et captures du même dossier.
- Chromium : `/tmp/scout-workflow-ui-X2sDp2/report.json` et captures du même dossier.
- Journaux : `/tmp/scout-picker-tests-verified.log`, `/tmp/scout-picker-check-final.log`, `/tmp/scout-picker-firefox-release.log`, `/tmp/scout-picker-chromium-release.log`.

Les captures bureau, mobile et fenêtre réduite ont été inspectées visuellement. Les dossiers `/tmp` sont temporaires.

## Version locale effectivement servie

Le serveur Scout identifié sur `127.0.0.1:4181` a été redémarré de façon ciblée. Après redémarrage : `/api/health` annonce `0.14.6`, état `ok`. Les octets servis pour l’index, `workspace.mjs`, `workspace.css`, `app.js`, `seed-picker-model.mjs` et `departure-workflow.mjs` sont identiques aux fichiers locaux vérifiés.

Le fichier `.data/scout-store.json` conserve la même empreinte SHA-256 avant et après les essais et le redémarrage : `38d9c7e5f3f99a3b2e033450a4ba0c1865ad422a841c6763802bc5a8827181c7`. Aucune remise à zéro de la bibliothèque personnelle.

## Limites

Les tests de navigateur emploient un profil neuf, un stockage temporaire et des comptes/catalogues/playlists fictifs ; leurs requêtes externes sont interceptées ou bloquées. Le consentement Google réel, les quotas et la disponibilité des fournisseurs n’ont pas été testés. Le petit viewport vérifie la disposition, pas un zoom système réel ni un lecteur d’écran. L’inventaire des contrôles ne signifie pas que chaque contrôle dynamique de toute l’application a été exercé. Aucun commit ni publication externe.
