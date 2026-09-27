# Fiabilité produit W5 — 27 septembre 2026

## Défaut reproduit puis corrigé

`setConfigured` incrémentait une révision et empêchait l'utilisation des résultats tardifs, mais ne coupait pas le transport en cours ni l'attente. Avant modification, le nouveau test échoue explicitement : `transport.aborted` vaut false immédiatement après déconnexion. La simple invalidation logique n'était donc pas une annulation effective.

Patch borné `lib/source-runtime.mjs` : contrôleur d'annulation par révision de configuration, combiné aux signaux de session et d'appelant existants. Déconnexion/reconfiguration annule l'ancienne révision ; reconnexion crée un nouveau contrôleur et ne ressuscite pas la file ancienne. Le statut reconnecté n'affiche plus artificiellement running. Aucun changement du moteur identité/découverte.

Backup : `/tmp/scout-platform-w5-ZzECJn/source-runtime.mjs`.

## Preuves et commandes

- Avant patch, `node lib/source-runtime-config-abort.test.mjs` : code1, assertion annulation transport false au lieu de true.
- Après patch même commande : 3/3 PASS (transport+file+reconnexion/autre source ; intervalle ; backoff), code0.
- `node --test lib/source-runtime.test.mjs lib/source-runtime-abort.test.mjs lib/source-runtime-cooldown.test.mjs lib/source-runtime-config-abort.test.mjs lib/ephemeral-runtime-abort.test.mjs lib/release-adversarial.test.mjs` : six fichiers PASS, code0.

Fixtures exclusivement synthétiques, fetch injecté ; zéro requête réseau, installation, lecture de donnée personnelle ou redémarrage 4181. Les tests observent le signal reçu par le transport, l'absence de second appel après arrêt, le rejet des anciennes promesses, l'accès d'une autre source et la reprise après reconnexion. Annulation non comptée comme panne fournisseur.

## Référence et portée

[Documentation primaire Node18 AbortController/AbortSignal](https://nodejs.org/download/release/v18.19.0/docs/api/globals.html#class-abortcontroller), revérifiée le 27 septembre 2026 : API d'annulation et raison propagée, nettoyage des listeners réutilisé. Pas de comparaison de performance à un chercheur/industriel/OSS invoquée pour ce correctif ; pas de nouvelle prétention SOTA.

Limites : un transport injecté ignorant son signal peut continuer son travail physique même si le runtime cesse de l'attendre. Pas d'observation sur un véritable fournisseur ; les écritures de cache déjà engagées ne deviennent pas transactionnellement annulables. Les sessions et signaux explicites restent indépendants ; la configuration, elle, est volontairement globale à la source. Prochaine tâche : revue indépendante du diagnostic identité W5, puis validation globale stabilisée.
