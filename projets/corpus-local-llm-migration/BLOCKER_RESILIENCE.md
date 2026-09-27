# Reprise intelligente des blocages Corpus

Ce contrat s'applique à toute tâche Corpus. Un obstacle ne doit pas provoquer
automatiquement un abandon, un copier-coller demandé à l'utilisateur, un nouveau
run dupliqué ou une suppression.

## Boucle universelle

1. Préserver le dernier état vérifié, les modifications locales, les preuves et
   les travaux concurrents.
2. Distinguer échec de tâche, transport, timeout, ressource insuffisante, état
   dérivé périmé, refus, dépendance externe, concurrence et runtime dégradé.
3. Inspecter avant de rejouer : verrou, PID, run, rapport, Git, ressource et
   service selon le cas.
4. Réduire au plus petit échec reproductible et réparer la cause racine.
5. Valider le correctif ciblé, puis le contrôle global.
6. Reprendre depuis la dernière étape vérifiée, pas depuis le début.
7. Si le même obstacle réapparaît, transformer sa résolution en test, garde,
   automatisation ou documentation canonique.

## Invariants

- Un timeout ne prouve pas l'échec du job.
- Un message ChatGPT stream recovery polling timed out ne prouve ni l'échec de
  Corpus local ni celui du job MCP.
- Une coupure du transport MCP ne prouve pas l'échec du travail local.
- Aucun run à état d'achèvement inconnu ne doit être lancé une seconde fois.
- Après reconnexion, inspecter d'abord le runner et les preuves du run précédent.
- Une attestation dérivée n'est régénérée qu'après revue du changement source.
- Un manque d'espace commence par une mesure de la surface réellement pertinente.
- Données primaires, configurations, preuves irremplaçables et travaux concurrents
  ne sont jamais supprimés implicitement.
- Un refus de permission n'est jamais contourné par un autre canal.
- Une réparation réversible couverte par le mandat peut être appliquée et testée.
- Une décision irréversible, une perte potentielle ou une extension d'autorité
  requiert l'arbitrage approprié.

## Promotion des obstacles récurrents

À la seconde occurrence d'une même classe de blocage, sa résolution doit aussi
réduire la dette d'infrastructure : test de régression, garde déterministe,
reprise automatique, job borné réutilisable ou documentation canonique selon le
cas. Répéter manuellement la même procédure n'est pas une résolution durable.

Le classifieur blocker_resilience.py est sans effet de bord. Il ne redémarre,
ne supprime et n'autorise rien ; il rend le chemin de reprise testable.

## Rechargement automatique du pont

corpus-gpt-source-watch.path surveille les sources du MCP, du moteur asynchrone,
du classifieur de blocage et du garde de reload. Le service associé compare un
hash de contenu au dernier hash chargé avant de redémarrer le tunnel. Un échec
de restart ne marque jamais le nouveau hash comme chargé.

Ainsi, une modification future de ces sources ne doit plus nécessiter de rappeler
manuellement la règle « redémarrer le tunnel après édition du MCP ».
