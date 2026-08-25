# Recherche sur les hypothèses Corpus

Ce projet étudie plusieurs hypothèses mathématiques et temporelles à l’aide des laboratoires génériques de Corpus. Ses sources, hypothèses, expériences et rapports sont des objets de recherche ; ils ne sont pas chargés comme skills et leurs résultats ne deviennent pas automatiquement des règles de Corpus.

Le moteur réutilisable a été séparé dans [`../../../corpus-11-tools/labs/experiment-lab/`](../../../corpus-11-tools/labs/experiment-lab/). Ce dossier conserve les questions scientifiques, les scripts de domaine, les protocoles fixés avant exécution, les résultats et les conditions de renversement.

Les adaptateurs de récupération/effacement, temporalité, factorisation et contraintes compatibles se trouvent dans [`lab-adapters/`](lab-adapters/). Ils dépendent du moteur Corpus sans être chargés par lui.

## État interne courant

Les voies locales `F_T`, factorisation et récupération/désinscription ont
atteint leur condition d'arrêt. Pour la récupération, le substitut distribué
fictif exact à quatre réplicas compare désormais versions, horloges,
partitions, crash et messages sur `7680` cellules exactes. Son verdict
`endogenous_causal_signature_identity` est un théorème `formal_exact` du
générateur, pas une confirmation indépendante. Les cellules sont quotientées
en `2160` signatures de multiplicité totale `7680`; `C_info` non mesuré est
retiré et les trois comparaisons sont qualifiées d'ablations à budgets
d'information imbriqués. Voir le
[`protocole v0.2`](experiments/recovery-distributed-fictional-v0.2.md) et le
[`rapport`](reports/recovery-distributed-fictional-v0.2/report.md). La v0.1
reste conservée avec sa qualification historique corrigée.
