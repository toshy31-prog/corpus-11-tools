# Transfert accepté — harnais de réplication indépendante locale

- **Sources adoptantes** : FOE-001 (quatre adaptateurs et seconde
  implémentation locale) ; `provenance-interoperability-lab` (noyau,
  collision, extension localisée, quinze mutations et seconde implémentation
  utilisant deux autres représentations).
- **Destination** :
  `corpus-11-tools/labs/python/corpus_labs/independent_replication.py`.
- **Mécanisme extrait** : paquet gelé empreinté, liste blanche d’entrées,
  attestations d’environnement/dépendances/sortie, projection locale d’une
  soumission séparée, comparaison déclarative, différences et dépendances
  communes visibles.
- **Retiré** : règles, fixtures, profils, mutations, verdicts scientifiques et
  noms de domaine des deux recherches adoptantes.
- **Vérification produit** : treize contrôles génériques passent et couvrent
  empreinte, entrée non autorisée, dépendance non déclarée, sortie divergente,
  sortie incomplète, code de référence projeté, commande Bubblewrap fermée,
  réseau désactivé, référence non montée, backend absent ou refusé, interdiction
  du fallback et maintien de `independence_unknown`. Les 15 tests génériques
  passent depuis le Terminal Ubuntu normal, y compris le test Bubblewrap réel.
  Le module n’importe pas `research/`.
- **Vérification des adoptions** : les suites FOE-001 et provenance, y compris
  leurs réplications séparées, passent. La réobservation distincte est
  consignée dans
  `research/INDEPENDENT_REPLICATION_HARNESS_REOBSERVATION_2026-09-05.md`.
- **Limite maintenue** : le mécanisme rend compte d’une projection locale et
  retourne `independence_unknown`. Il ne prouve ni isolement de processus,
  d’auteur ou d’environnement, ni indépendance externe ; les dépendances et
  traces d’accès restent déclaratives.
- **Extension optionnelle (écrite et testée par contrat)** :
  `run_isolated_submission` ajoute une voie Bubblewrap séparée, sans modifier
  `run_projected_submission`. Elle désactive le réseau, ne monte que les
  inputs et la soumission projetés en lecture seule, la sortie temporaire en
  écriture et les runtimes explicitement déclarés en lecture seule. Les
  répertoires utilisateur, dépôt, paquet, sources et référence sont refusés.
  Bubblewrap absent ou les namespaces refusés retournent
  `isolation_unavailable`, sans fallback vers la projection. Une réussite ne
  retourne jamais `independent` : le verdict demeure `independence_unknown`.
- **État d'exécution de l'extension** : « isolation de processus exercée sur cet hôte »
  Ubuntu précis, depuis son Terminal normal (Bubblewrap 0.9.0,
  noyau `7.0.0-30-generic`). FOE-001 a produit
  `process_isolation_exercised`, avec réseau désactivé, référence absente,
  sorties concordantes et `independence_unknown`. La trace, les empreintes et
  l'incident initial de consignation sont dans
  `research/INDEPENDENT_REPLICATION_BUBBLEWRAP_REOBSERVATION_2026-09-05.md`.
  Cela ne généralise ni à d'autres hôtes ni au sandbox Codex, et ne vaut pas
  indépendance externe.
- **Condition de retrait** : retirer ou réduire le harnais s’il importe une
  recherche, impose une sémantique scientifique, masque une dépendance ou un
  écart, transforme la projection ou une isolation de processus en prétention
  d’indépendance, ou si les adoptions futures exigent une branche de domaine.
