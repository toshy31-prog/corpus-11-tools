# Cycle synthétique initial — divulgation graduée et recours borné

## Construit et portée

Le construit est le respect de deux propriétés d'un **schéma de divulgation
synthétique** : minimiser les données par audience et conserver les éléments
nécessaires à un recours défini. Le statut est `pipeline_verified`; il vérifie
des vues structurées, pas la confidentialité effective d'un système ni les
droits d'une personne réelle.

## Définition opérationnelle

Trois audiences sont séparées : adjudication protégée, revue protégée et
publication agrégée. La protection échoue si une identité directe, un contact
ou le témoignage brut atteint une audience non autorisée. Le recours minimal
exige pour l'adjudication pseudonyme, témoignage, empreinte de preuve, remède et
jeton d'appel; la revue exige l'empreinte et le jeton sans identité directe.

## Générateur, paramètres et invariants

- Générateur : un dossier fictif et trois profils de divulgation (`full`,
  `minimal`, `graduated`) dans une fixture déterministe.
- Paramètres : champs par audience, finalité et rétention maximale déclarée.
- Invariants : finalité, audience, rétention, transformation et divulgation
  sont contrôlées séparément; aucune vue publique ne contient d'identité,
  contact, pseudonyme ou témoignage; un échec de protection ou de recours est
  visible dans la sortie.

## Contrôles et effet de méthode

Le profil complet est le contrôle de fuite; le minimal est le contrôle de
recours insuffisant; le gradué est le candidat qui satisfait les deux critères
du modèle. Le modèle traite une empreinte comme auditable et un jeton comme
utilisable, sans mesurer cryptographie, coercition, accès latéral, compréhension
humaine ou réparation effective.

## Résultat qui retirerait la conclusion

Le résultat est retiré si le profil gradué divulgue un champ interdit, si le
profil minimal est déclaré suffisant sans les éléments de recours, ou si les
conditions de rétention sont ignorées. Une conclusion de confidentialité ou de
recours réel exige une menace, un canal et une évaluation indépendante.
