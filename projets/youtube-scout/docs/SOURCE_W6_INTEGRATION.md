# Sources et identités — intégration W6, 27 septembre 2026

## Changements bornés

- Proposition de variante avec/sans article initial « The », uniquement à partir de fiches déjà retournées ; aucune confirmation automatique d'identité.
- Contrat d'admission opt-in du registre : capacités, portée, provenance de revue et conservation déclarée. Compatibilité legacy conservée ; ce contrat ne vaut ni licence ni frontière de sécurité.
- Adaptateur Mixcloud isolé : émissions, auteurs de publication et tags, sans morceaux ou collaborations déduits. Non enregistré dans le moteur.
- Script `scripts/probe-mixcloud.mjs` : expérience publique explicite, une page de cinq émissions, cinq secondes, aucun accès à la bibliothèque ni aux identifiants Google. Sortie limitée aux compteurs et au statut, aucun audio.

## Confrontation réelle

Commande : `node scripts/probe-mixcloud.mjs --public-network spartacus`.

Le 27 septembre 2026 à 04:08:12 UTC, le premier essai en environnement restreint échoue au transport (`fetch failed`). L'essai réseau autorisé à 04:08:25 UTC échoue après 265 ms avec `Mixcloud JSON required` : une réponse est reçue mais ne satisfait pas le contrat JSON. Aucune métadonnée exploitable validée, aucune activation. Cela ne démontre pas une panne générale de Mixcloud ; aucune tentative de contournement ou extraction HTML.

La revue croisée du registre a reproduit puis fait corriger une mutation de l'enveloppe permettant de remplacer son admission. Les enveloppes opt-in sont désormais gelées ; les entrées legacy restent compatibles avec les anciens usages.

## Limites de livraison

Les tests synthétiques ne prouvent ni une meilleure découverte musicale réelle, ni le niveau état de l'art. La nouvelle tolérance de nom ne résout pas l'absence de réponse fournisseur. Aucun redémarrage ni rechargement forcé de la session Google dans ce lot. Les nouveaux modules serveur nécessitent une activation contrôlée pour affecter le processus déjà lancé ; Mixcloud doit rester expérimental.
