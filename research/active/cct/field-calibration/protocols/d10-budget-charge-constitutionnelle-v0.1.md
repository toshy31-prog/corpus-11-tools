# CCT-SC-D10-001 — campagne fictive appariée

## Mécanisme retenu

Le premier mécanisme CCT retenu pour la campagne fictive est **D10 — Budget global
de charge constitutionnelle**. Il est plus précis qu'une « CCT entière » :
lorsque des contrôles sont en contention, il impose de préserver séparément
besoin vital, plafond critique, droit, trace minimale et restitution, puis de
suspendre seulement des formalités réversibles et de les rétablir
explicitement.

Ce choix s'appuie sur deux faits internes, et uniquement eux :

- D10 est une décision nommée, avec déclencheur, trace, recours, arrêt et
  restitution dans la constitution exécutable ;
- P005-DT-002 et son audit de robustesse mettent précisément à l'épreuve la
  charge commune et le noyau frugal, sans établir d'effet territorial.

## Comparaison fictive préparée

La candidate sera comparée à un routage fictif plus simple. Les deux parcours
reçoivent le même monde initial généré, la même fenêtre, les mêmes contraintes
déclarées et les mêmes canaux simulés. L'exercice ne peut modifier ni service
réel, ni droit, ni allocation, ni priorisation.

Les observations générées ne seront jamais réduites à un score global. Elles suivent
séparément :

- les cinq portes effectivement maintenues, dégradées ou perdues ;
- la charge administrative visible et cachée ;
- la possibilité réelle de contester une trace sous charge ;
- la restitution d'usage après la contention.

Le schéma lisible par machine et son validateur sont
[`d10-budget-charge-constitutionnelle-v0.1.json`](d10-budget-charge-constitutionnelle-v0.1.json)
et [`validate_d10_protocol.py`](validate_d10_protocol.py).

## Validité et détectabilité

« Préserver les protections » n'est pas directement mesuré par le fait
d'avoir un tableau de bord. Le protocole distingue donc le construit, son
opérationnalisation, les traces obtenues, le processus de mesure et le
construit rival le plus proche. Une trace complète mais sans recours, ou une
charge faible obtenue en transférant le travail hors champ, ne constitue pas
un succès.

Les abandons, le travail invisible, les décisions hors registre et les effets
sur les personnes qui ne saisissent pas de recours restent des angles morts.
L'absence de ces traces ne peut pas être lue comme l'absence du phénomène.

## Limite de portée

Le protocole est prêt à être exécuté dans une famille de mondes fictifs. Il
peut conclure sur le modèle, son générateur et les variations déclarées, jamais
sur une institution réelle. Sans calibration et test indépendant externes,
aucun chiffre ou verdict externe ne sera produit.
