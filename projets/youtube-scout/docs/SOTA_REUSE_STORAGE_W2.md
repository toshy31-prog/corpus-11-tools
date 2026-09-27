# Stockage : synchronisation explicite — vague 2, 27 septembre 2026

## Fait et changement

Avant : `PersistentStore.persist` écrivait un temporaire puis le renommait, sans demande explicite de synchronisation disque. Maintenant : permissions du temporaire resserrées à 0600 par handle (même temporaire préexistant) → écriture → `FileHandle.sync()` → fermeture → renommage → synchronisation du répertoire parent → fermeture. Même JSON, aucun changement de schéma, migration ou dépendance. Sauvegarde préalable : `/tmp/scout-storage-w2-ZRndXo/persistent-store.mjs`.

L'ancien fichier reste inchangé pour les erreurs injectées avant renommage. Après renommage, un échec de synchronisation du répertoire est différent : le nouveau fichier est déjà visible, sa durabilité reste incertaine. Le code rejette avec `STORE_DURABILITY_UNCERTAIN`, `storePublished: true`; les décisions personnelles et corrections ne font alors pas de rollback mémoire mensonger. Il ne s'agit pas d'une confirmation de sauvegarde durable et l'erreur reste remontée.

## Source primaire et réutilisation

[SQLite, Atomic Commit](https://www.sqlite.org/atomiccommit.html) explique le rôle des flush/fsync et leurs hypothèses matérielles, mais utilise aussi verrous et journal : **Scout ne devient pas SQLite** par cet ajout. [Node, FileHandle.sync](https://nodejs.org/api/fs.html#filehandlesync) fournit l'opération native employée. Réutilisation du mécanisme de synchronisation, pas copie de code tiers ni nouvelle licence.

## Tests actuels

Nouveau `lib/persistent-store-durability.test.mjs` : trois cas, dont boucles d'injection sur chmod, écriture, sync fichier, fermeture, rename, ouverture/sync répertoire. Fichiers synthétiques sous répertoires temporaires isolés uniquement; nettoyage de ces fixtures après test. Ordre exact des opérations, octets anciens avant publication, nouveaux après publication incertaine, reprise après échec, mode 0600 POSIX même avec temporaire préexistant 0666 et cohérence mémoire de décision personnelle vérifiés.

```sh
node --test lib/persistent-store-durability.test.mjs lib/persistent-store.test.mjs lib/multi-participant-quality.test.mjs lib/ephemeral-exploration.test.mjs lib/v27r3-regression.test.mjs
```

Code 0, cinq fichiers TAP réussis après dernier changement. Aucun accès à `.data`, aucun serveur redémarré.

## Limites importantes

- Aucune coupure électrique, défaillance matérielle ou crash système réellement provoqué : pas de garantie power-loss prouvée.
- Cible vérifiée Linux local. Les systèmes ne supportant pas le fsync de répertoire remontent une erreur de durabilité, sans fallback silencieux. Portabilité Windows et filesystems réseau non établie.
- La création récursive d'une arborescence de stockage nouvelle ne synchronise pas chacun de ses ancêtres. Répertoire déjà installé et stable attendu pour une garantie renforcée.
- Sérialisation par instance existante conservée, pas verrou interprocessus. Deux instances écrivant le même chemin ne deviennent pas sûres; temporaire fixe historique conservé.
- Pas de journal, récupération automatique, checksum, sauvegarde historisée ou protection contre disque menteur. Certaines autres méthodes mutent la mémoire avant persistance; cette vague ne les transforme pas toutes en transactions.
- Coût supplémentaire de deux synchronisations par sauvegarde; pas de benchmark de latence sur les données personnelles. Le correctif est écrit et testé localement, non activé/reobservé en service.

Palier acquis : protocole local de flush explicite et échecs distingués. Équivalence de durabilité avec une base transactionnelle éprouvée : **non démontrée**.
