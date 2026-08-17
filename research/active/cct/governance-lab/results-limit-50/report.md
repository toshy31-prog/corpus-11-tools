# CCT-L50-001 — cinquante tests-limites de la CCT v0.10

## Statut de l'épreuve

Cette épreuve est un audit conceptuel reproductible : elle vérifie si la version écrite contient une réponse, un observable et une voie de récupération. Elle ne simule ni comportements collectifs ni effets causaux. « Robuste sur le papier » signifie seulement qu'un mécanisme explicite couvre déjà le cas.

## Résultat brut

- 9 cas robustes sur le papier ;
- 31 réponses partielles ;
- 10 ruptures de spécification.

La conclusion forte est que la v0.10 couvre assez bien les attaques isolées contre les droits ou les organes formels, mais reste fragile devant les dépendances techniques cachées, les chocs composés et la saturation simultanée de ses contre-pouvoirs.

## Matrice par famille

| Famille | Robuste | Partiel | Rupture |
|---|---:|---:|---:|
| A. Droits | 1 | 3 | 1 |
| B. Écologie | 1 | 3 | 1 |
| C. Échelles | 1 | 3 | 1 |
| D. Information | 1 | 3 | 1 |
| E. Adaptation | 0 | 4 | 1 |
| F. Transition | 1 | 3 | 1 |
| G. Urgence | 1 | 3 | 1 |
| H. Justice | 1 | 3 | 1 |
| I. Résilience | 1 | 3 | 1 |
| J. Constitution | 1 | 3 | 1 |

## Les cinquante scènes

### A. Droits

#### L01 — PARTIEL

**Scène.** Une personne sans papiers ni adresse demande eau et soins.

**Centre probable.** registre d'identité.

**Observable.** accès effectif sans identifiant stable.

**Échec si.** un besoin vital attend la régularisation.

**Résultat.** L'universalité est posée, mais le mode de preuve minimal n'est pas défini.

**Correction.** Créer une preuve de présence non exclusive et un accès d'urgence sans dossier.

**Invariants concernés.** I01.

#### L02 — ROBUSTE/PAPIER

**Scène.** Une commune vote l'exclusion d'une minorité religieuse.

**Centre probable.** majorité locale.

**Observable.** délai jusqu'à protection et maintien du droit de rester.

**Échec si.** la seule protection réelle est l'exil.

**Résultat.** La saisine extérieure, la protection ciblée et le droit au retour répondent déjà au cas.

**Correction.** Tester P-003 avec menace locale et confidentialité.

**Invariants concernés.** I01, I13.

#### L03 — PARTIEL

**Scène.** Une traduction change la portée d'une obligation pénale.

**Centre probable.** chambre linguistique.

**Observable.** écarts entre versions et corrections avant sanction.

**Échec si.** une version pivot prévaut de fait.

**Résultat.** Le recours existe, mais pas la règle conservatoire pendant le conflit de versions.

**Correction.** Suspendre la charge irréversible et retenir provisoirement l'interprétation la moins privative.

**Invariants concernés.** I10.

#### L04 — PARTIEL

**Scène.** Une personne quitte un commun qui contrôle logement et emploi.

**Centre probable.** commun fonctionnel.

**Observable.** jours de logement et revenu conservés après sortie.

**Échec si.** la sortie entraîne une perte matérielle.

**Résultat.** La portabilité est forte, mais les actifs liés à l'appartenance restent ambigus.

**Correction.** Créer un paquet de sortie garantissant logement, revenu-pont, données et recours.

**Invariants concernés.** I01, I11.

#### L05 — RUPTURE

**Scène.** Une panne numérique efface temporairement identité et droits sociaux.

**Centre probable.** opérateur d'identité.

**Observable.** services accessibles hors ligne pendant 14 jours.

**Échec si.** un guichet refuse faute de vérification réseau.

**Résultat.** La CCT protège la portabilité numérique mais ne définit pas de constitution hors ligne.

**Correction.** Imposer justificatifs locaux, registres répliqués et continuité papier/radio.

**Invariants concernés.** I01, I09.

### B. Écologie

#### L06 — RUPTURE

**Scène.** Une sécheresse rend simultanément impossible le plancher d'eau et le plafond de prélèvement.

**Centre probable.** cellule d'allocation.

**Observable.** privation par groupe et état du bassin.

**Échec si.** le conflit est tranché discrétionnairement.

**Résultat.** L'ordre des priorités ne suffit pas lorsque deux obligations constitutionnelles deviennent physiquement incompatibles.

**Correction.** Ajouter un protocole de pénurie impossible : minimum biologique, tirage/triage public, égalité de sacrifice, révision quotidienne.

**Invariants concernés.** I02, I15.

#### L07 — PARTIEL

**Scène.** La fourchette scientifique des limites varie de 40 % selon les modèles.

**Centre probable.** autorité scientifique.

**Observable.** décisions sous chaque borne et coût de l'erreur.

**Échec si.** la médiane devient vérité politique.

**Résultat.** La pluralité est prévue, mais pas la décision robuste à l'incertitude profonde.

**Correction.** Employer scénarios minimax-regret et publier les pertes de chaque borne.

**Invariants concernés.** I03, I08.

#### L08 — ROBUSTE/PAPIER

**Scène.** Un territoire délocalise sa pollution dans ses importations.

**Centre probable.** acheteur public.

**Observable.** empreinte incorporée vérifiée.

**Échec si.** émissions territoriales baissent tandis que l'empreinte monte.

**Résultat.** La comptabilité importée et les audits hors cible couvrent explicitement le déplacement.

**Correction.** Préspécifier les données minimales quand le fournisseur refuse l'audit.

**Invariants concernés.** I08.

#### L09 — PARTIEL

**Scène.** Des quotas personnels sont rachetés via prête-noms.

**Centre probable.** intermédiaire de quotas.

**Observable.** concentration d'usage par bénéficiaire effectif.

**Échec si.** 10 % contrôlent plus de 40 % des quotas.

**Résultat.** La concentration est interdite en principe, mais les prête-noms ne sont pas traités.

**Correction.** Relier quotas, bénéficiaires effectifs et audits de réseaux sans notation civique générale.

**Invariants concernés.** I12.

#### L10 — PARTIEL

**Scène.** Une technologie efficace provoque un fort effet rebond.

**Centre probable.** planificateur sectoriel.

**Observable.** flux physiques absolus avant/après.

**Échec si.** l'intensité baisse mais le plafond absolu est dépassé.

**Résultat.** Le plafond protège en théorie ; le corridor ne précise pas l'ajustement automatique au rebond.

**Correction.** Réduire l'enveloppe ou relever le prix marginal dès divergence absolue préspécifiée.

**Invariants concernés.** I02, I08.

### C. Échelles

#### L11 — PARTIEL

**Scène.** Trois niveaux se déclarent compétents pendant une crue.

**Centre probable.** juge de compétence.

**Observable.** minutes jusqu'à mesure conservatoire.

**Échec si.** le conflit retarde la protection vitale.

**Résultat.** La mesure conservatoire existe, mais pas le départage si plusieurs niveaux sont également capables.

**Correction.** Donner la main au premier niveau sûr, avec journal et transfert obligatoire après revue rapide.

**Invariants concernés.** I07, I10.

#### L12 — ROBUSTE/PAPIER

**Scène.** Une petite île subit un dommage créé par une grande fédération.

**Centre probable.** fédération émettrice.

**Observable.** accès de l'île au juge, suspension et réparation.

**Échec si.** le poids démographique bloque le recours.

**Résultat.** Dommage exporté, droits universels et justice transfrontalière justifient déjà la montée d'échelle.

**Correction.** Tester le délai et le financement autonome du requérant.

**Invariants concernés.** I07, I11.

#### L13 — PARTIEL

**Scène.** Une compétence mondiale nécessaire devient inutile après innovation.

**Centre probable.** secrétariat mondial.

**Observable.** délai et coût de restitution.

**Échec si.** la compétence survit sans objet.

**Résultat.** Le réexamen est prévu, mais aucune preuve positive de redescente n'est exigée.

**Correction.** Créer un test périodique de compétence nulle et une procédure de démontage.

**Invariants concernés.** I04, I07.

#### L14 — RUPTURE

**Scène.** Une région riche quitte la péréquation la veille d'un transfert.

**Centre probable.** trésor régional.

**Observable.** continuité des paiements et dette de sortie.

**Échec si.** la sortie permet d'annuler des obligations acquises.

**Résultat.** Le refus est politiquement envisagé, mais le droit de sécession et ses dettes ne sont pas réglés.

**Correction.** Définir sortie libre mais non instantanée : continuité, audit des attaches, dette bornée et arbitrage.

**Invariants concernés.** I07, I11.

#### L15 — PARTIEL

**Scène.** Une métropole domine dix territoires dans un commun logistique.

**Centre probable.** nœud logistique métropolitain.

**Observable.** veto effectif et dépendances contournables.

**Échec si.** le vote formel masque le monopole matériel.

**Résultat.** La représentation existe, mais la puissance d'infrastructure peut annuler l'égalité de voix.

**Correction.** Mesurer dépendance, financer des routes de secours et pondérer les obligations sans acheter des voix.

**Invariants concernés.** I03, I09, I12.

### D. Information

#### L16 — RUPTURE

**Scène.** Les archives de décision sont chiffrées par une clé unique perdue.

**Centre probable.** dépositaire de clé.

**Observable.** restauration depuis copies indépendantes.

**Échec si.** aucune preuve de décision n'est récupérable.

**Résultat.** L'ouverture des archives n'assure pas leur récupération technique.

**Correction.** Répliquer clés et preuves entre dépositaires hétérogènes, avec exercice annuel de restauration.

**Invariants concernés.** I09, I10.

#### L17 — PARTIEL

**Scène.** Un système de recommandation public enterre légalement l'opposition.

**Centre probable.** équipe de classement.

**Observable.** exposition réelle par source et accès à un ordre alternatif.

**Échec si.** la pluralité de titres ne circule pas.

**Résultat.** La sélection est mesurée, mais aucun plancher de découvrabilité n'est fixé.

**Correction.** Garantir accès chronologique, choix utilisateur et audit de distribution, sans imposer une audience.

**Invariants concernés.** I03, I08.

#### L18 — PARTIEL

**Scène.** Un fournisseur unique maintient le logiciel ouvert mais incompréhensible.

**Centre probable.** mainteneur technique.

**Observable.** temps de reprise par une équipe indépendante.

**Échec si.** le code est ouvert mais non opérable.

**Résultat.** Ouverture et interopérabilité ne suffisent pas à transférer la capacité.

**Correction.** Exiger documentation, builds reproductibles, escrow de compétences et exercices de reprise.

**Invariants concernés.** I09, I12.

#### L19 — ROBUSTE/PAPIER

**Scène.** Une agence fabrique un secret pour éviter le débat.

**Centre probable.** classificateur du secret.

**Observable.** part de décisions secrètes confirmées extérieurement.

**Échec si.** l'auteur du secret contrôle sa légalité.

**Résultat.** La séparation des clés, l'inspecteur et les preuves non opérationnelles répondent au centre probable.

**Correction.** Ajouter une date d'expiration par pièce et sanction du surclassement.

**Invariants concernés.** I03, I04.

#### L20 — PARTIEL

**Scène.** Une attaque injecte de fausses données cohérentes dans tous les tableaux.

**Centre probable.** pipeline de données.

**Observable.** écart aux capteurs et témoignages indépendants.

**Échec si.** une source commune contamine toutes les mesures.

**Résultat.** Les audits existent, mais l'indépendance des chaînes de données n'est pas garantie.

**Correction.** Maintenir des capteurs, échantillons et canaux humains de familles réellement indépendantes.

**Invariants concernés.** I08, I10.

### E. Adaptation

#### L21 — PARTIEL

**Scène.** Des entreprises apprennent exactement les seuils du régime renforcé.

**Centre probable.** détenteur du seuil.

**Observable.** densité d'observations juste sous seuil.

**Échec si.** les dommages restent durablement à seuil moins epsilon.

**Résultat.** P-002 voit la fraude de catégorie, pas l'évitement fin du déclencheur.

**Correction.** Employer hystérésis, fenêtres multiples et audits hors seuil.

**Invariants concernés.** I08.

#### L22 — PARTIEL

**Scène.** Auditeur et audité alternent leurs personnels.

**Centre probable.** marché professionnel de l'audit.

**Observable.** réseau de carrières et taux de contradictions.

**Échec si.** l'indépendance juridique cache une dépendance sociale.

**Résultat.** Rotation et incompatibilités existent, sans cartographie des réseaux de carrière.

**Correction.** Publier passages, co-signatures et dépendances ; tirer une part des audits au sort.

**Invariants concernés.** I03, I12.

#### L23 — PARTIEL

**Scène.** Le guichet unique réduit le délai en rejetant plus tôt les cas difficiles.

**Centre probable.** routeur de demandes.

**Observable.** délai jusqu'à usage, abandons et rejets par complexité.

**Échec si.** le délai baisse mais l'accès réel se dégrade.

**Résultat.** P-003 distingue déjà décision et usage, mais pas le tri adverse en entrée.

**Correction.** Auditer les dossiers manquants, réouvertures et cas sortis du dénominateur.

**Invariants concernés.** I01, I08.

#### L24 — RUPTURE

**Scène.** Un conglomérat se fragmente en cent coopératives coordonnées.

**Centre probable.** chambre de coordination privée.

**Observable.** bénéficiaires, prix et décisions corrélées.

**Échec si.** les seuils juridiques ne voient plus le monopole.

**Résultat.** La CCT suit la propriété, mais pas assez la coordination de fait entre unités séparées.

**Correction.** Déclencher l'anticoncentration sur dépendance, conduite coordonnée et clés communes, pas la forme sociale.

**Invariants concernés.** I12.

#### L25 — PARTIEL

**Scène.** Des groupes saturent l'agenda par milliers de saisines automatisées.

**Centre probable.** filtre de recevabilité.

**Observable.** temps d'accès des personnes et motifs de filtrage.

**Échec si.** la défense anti-spam devient censure discrétionnaire.

**Résultat.** L'initiative est garantie, mais la rareté de l'attention n'a pas de protocole adverse.

**Correction.** Quota équitable remboursable, preuve de soutien progressive et appel humain du filtrage.

**Invariants concernés.** I01, I03, I06.

### F. Transition

#### L26 — PARTIEL

**Scène.** Fuite des capitaux, stocks et cadres dans la même semaine.

**Centre probable.** cellule de continuité.

**Observable.** besoins servis et pouvoirs accumulés.

**Échec si.** la continuité exige un commandement sans extinction.

**Résultat.** P-001 teste ces chocs surtout séparément ; la composition peut changer le résultat.

**Correction.** Créer P-005 sur chocs corrélés et budget global de pouvoirs temporaires.

**Invariants concernés.** I04, I15.

#### L27 — PARTIEL

**Scène.** Les travailleurs refusent une conversion écologique jugée injuste.

**Centre probable.** fonds de conversion.

**Observable.** revenu, choix réel et délai de recours.

**Échec si.** la garantie d'emploi devient affectation forcée.

**Résultat.** Le revenu et la formation sont prévus, mais le droit de refuser une reconversion ne l'est pas clairement.

**Correction.** Garantir revenu-pont et plusieurs parcours sans perte punitive.

**Invariants concernés.** I01, I11.

#### L28 — ROBUSTE/PAPIER

**Scène.** Un ancien propriétaire retire une licence critique.

**Centre probable.** titulaire de licence.

**Observable.** temps de bascule vers solution de secours.

**Échec si.** la licence donne un veto durable.

**Résultat.** La porte de capacité et la voie indépendante visent précisément cette dépendance.

**Correction.** Rendre obligatoire un exercice de révocation surprise avant transfert.

**Invariants concernés.** I09, I14.

#### L29 — PARTIEL

**Scène.** La capacité alternative fonctionne mais double le travail invisible des aidantes.

**Centre probable.** gestionnaire de continuité.

**Observable.** heures compensatoires par groupe.

**Échec si.** les besoins sont servis par surcharge non reconnue.

**Résultat.** La charge totale est mesurée, sans seuil distributif de travail compensatoire.

**Correction.** Interdire le passage de porte si un groupe absorbe une hausse non consentie et non compensée.

**Invariants concernés.** I02, I11.

#### L30 — RUPTURE

**Scène.** Deux transitions vitales partagent les mêmes experts et pièces de secours.

**Centre probable.** bureau de portefeuille.

**Observable.** ressources critiques communes et temps de récupération.

**Échec si.** chaque projet passe seul mais échoue simultanément.

**Résultat.** Le modèle teste la continuité par service, pas la contention entre transitions.

**Correction.** Créer un registre de dépendances croisées et un test de portefeuille N-2.

**Invariants concernés.** I09, I15.

### G. Urgence

#### L31 — ROBUSTE/PAPIER

**Scène.** Une pandémie exige décisions rapides pendant six mois.

**Centre probable.** exécutif d'urgence.

**Observable.** renouvellements, droits maintenus et restitution.

**Échec si.** l'urgence modifie la constitution.

**Résultat.** Durée, renouvellement pluraliste, juge et interdiction constituante sont explicites.

**Correction.** Tester l'accès réel de l'opposition sous contraintes sanitaires.

**Invariants concernés.** I04, I13.

#### L32 — PARTIEL

**Scène.** Une menace faible mais permanente justifie des renouvellements sans fin.

**Centre probable.** producteur du renseignement.

**Observable.** variation de capacité malgré menace stable.

**Échec si.** l'exception devient le régime ordinaire.

**Résultat.** L'expiration existe, mais la menace continue peut la réactiver indéfiniment.

**Correction.** Plafond cumulé, majorité croissante et transfert vers une loi ordinaire contrôlée.

**Invariants concernés.** I04, I13.

#### L33 — PARTIEL

**Scène.** Une cyberattaque coupe communications entre clés séparées.

**Centre probable.** nœud de communication.

**Observable.** décisions valides hors ligne.

**Échec si.** la séparation empêche toute action sûre.

**Résultat.** La séparation réduit l'abus mais crée une dépendance de disponibilité.

**Correction.** Préautoriser des enveloppes locales bornées avec synchronisation et audit différés.

**Invariants concernés.** I05, I09, I10.

#### L34 — RUPTURE

**Scène.** Une force régionale refuse sa démobilisation.

**Centre probable.** commandement régional.

**Observable.** capacité civile de couper paie, logistique et ordres.

**Échec si.** la révocation est seulement juridique.

**Résultat.** Le retour au civil est exigé, mais les leviers matériels de désobéissance ne sont pas distribués.

**Correction.** Séparer paie, munitions, communications et légitimité des ordres ; tester la coupure croisée.

**Invariants concernés.** I04, I05, I12.

#### L35 — PARTIEL

**Scène.** L'inspecteur chargé d'arrêter une opération est compromis.

**Centre probable.** inspecteur unique.

**Observable.** arrêts initiés par voies indépendantes.

**Échec si.** une personne bloque tout recours.

**Résultat.** L'inspecteur constitue lui-même un point terminal unique.

**Correction.** Ajouter arrêt multi-origine, suppléance aléatoire et protection des lanceurs d'alerte.

**Invariants concernés.** I03, I05.

### H. Justice

#### L36 — PARTIEL

**Scène.** Un million de recours similaires arrive en un mois.

**Centre probable.** greffe et moteur de tri.

**Observable.** délai par groupe et taux d'erreur.

**Échec si.** la file rend le droit inutilisable.

**Résultat.** La porte unique ne garantit pas la capacité sous charge de masse.

**Correction.** Créer recours collectif, décisions provisoires favorables et renfort automatique.

**Invariants concernés.** I01, I06.

#### L37 — RUPTURE

**Scène.** Le responsable d'un dommage massif est insolvable.

**Centre probable.** fonds de réparation.

**Observable.** capacité rendue malgré insolvabilité.

**Échec si.** l'absence de payeur annule la réparation.

**Résultat.** Le fonds mondial existe, sans garantie générale de réparation de dernier ressort.

**Correction.** Créer assurance mutualisée puis récupération sur bénéficiaires et chaînes de contrôle.

**Invariants concernés.** I11, I12.

#### L38 — PARTIEL

**Scène.** Un écosystème détruit ne peut être restauré.

**Centre probable.** juge de clôture.

**Observable.** reste irréparable nommé et capacités compensées.

**Échec si.** une somme clôt silencieusement la dette.

**Résultat.** La CCT reconnaît le reste, mais la représentation intergénérationnelle de la clôture est faible.

**Correction.** Exiger collège des porteurs de perte, gardiens écologiques et réexamen différé.

**Invariants concernés.** I11.

#### L39 — ROBUSTE/PAPIER

**Scène.** Un plaignant subit des représailles locales.

**Centre probable.** autorité locale.

**Observable.** protection, revenu et logement disponibles en heures.

**Échec si.** le recours accroît le danger.

**Résultat.** Assistance, relocalisation et défenseur extérieur sont explicitement prévus.

**Correction.** Tester confidentialité et droit de rester dans P-003.

**Invariants concernés.** I01, I11.

#### L40 — PARTIEL

**Scène.** Deux juridictions supérieures rendent des ordres incompatibles.

**Centre probable.** organe de conflit.

**Observable.** temps de règle conservatoire et perte évitée.

**Échec si.** le service choisit son juge préféré.

**Résultat.** La médiation de compétence ne couvre pas complètement le conflit de décisions finales.

**Correction.** Créer panel ad hoc tiré entre juridictions, avec mesure la moins irréversible.

**Invariants concernés.** I07, I10.

### I. Résilience

#### L41 — RUPTURE

**Scène.** Le réseau électrique et les paiements tombent ensemble.

**Centre probable.** opérateur de reprise.

**Observable.** soins, eau et alimentation servis sans réseau.

**Échec si.** les secours dépendent du même système.

**Résultat.** Les redondances sont listées par secteur, sans test d'indépendance intersectorielle.

**Correction.** Cartographier dépendances communes et exercer un mode îloté multi-service.

**Invariants concernés.** I09, I15.

#### L42 — PARTIEL

**Scène.** Une biorégion est isolée logistiquement pendant trente jours.

**Centre probable.** réserve régionale.

**Observable.** jours d'autonomie par besoin vital.

**Échec si.** les réserves existent seulement en comptabilité.

**Résultat.** La réserve est financée mais aucun niveau minimal d'autonomie n'est constitutionnalisé.

**Correction.** Fixer fourchettes locales publiques et réaliser des tests de tirage réel.

**Invariants concernés.** I02, I09.

#### L43 — PARTIEL

**Scène.** Une voie de secours appartient au même sous-traitant que la voie principale.

**Centre probable.** bénéficiaire effectif du fournisseur.

**Observable.** indépendance technique, juridique et géographique.

**Échec si.** la redondance partage une cause de panne.

**Résultat.** La voie indépendante est exigée sans critère d'indépendance totale.

**Correction.** Qualifier l'indépendance sur propriété, personnel, énergie, logiciel, route et juridiction.

**Invariants concernés.** I09, I12.

#### L44 — PARTIEL

**Scène.** Une crise climatique déplace 20 % d'une population en trois mois.

**Centre probable.** autorité de résidence.

**Observable.** continuité des droits et capacité d'accueil.

**Échec si.** les communes suspendent la résidence factuelle.

**Résultat.** Les droits suivent la personne, mais le financement automatique de la charge d'accueil est absent.

**Correction.** Déclencher péréquation et droits politiques progressifs sur présence, sans délai discrétionnaire.

**Invariants concernés.** I01, I07.

#### L45 — ROBUSTE/PAPIER

**Scène.** Un service vital perd son équipe dirigeante entière.

**Centre probable.** collège technique.

**Observable.** reprise par suppléants et documentation.

**Échec si.** la continuité dépend de personnes irremplaçables.

**Résultat.** P-001 traite la perte d'un cadre et exige la cartographie des compétences.

**Correction.** Étendre au scénario de perte d'équipe complète et transmission hors organisation.

**Invariants concernés.** I09.

### J. Constitution

#### L46 — ROBUSTE/PAPIER

**Scène.** Une majorité élue veut abolir l'opposition et les recours.

**Centre probable.** majorité constituante.

**Observable.** capacité à changer la politique sans abolir le sujet de droit.

**Échec si.** une majorité ordinaire neutralise les contre-pouvoirs.

**Résultat.** Les droits, l'opposition et l'interdiction de révision d'urgence forment déjà un noyau.

**Correction.** Clarifier les invariants non supprimables et la procédure constituante hors urgence.

**Invariants concernés.** I13.

#### L47 — PARTIEL

**Scène.** Le noyau non négociable empêche une réforme économique pourtant populaire.

**Centre probable.** juge constitutionnel.

**Observable.** part des politiques réellement ouvertes.

**Échec si.** le juge transforme l'orientation en dogme.

**Résultat.** La frontière entre droits invariants et instruments écosocialistes reste floue.

**Correction.** Sanctuariser les capacités et limites, pas une forme unique de propriété ou d'allocation.

**Invariants concernés.** I13, I14.

#### L48 — RUPTURE

**Scène.** Tous les modules de contrôle renforcé s'activent pendant une polycrise.

**Centre probable.** orchestrateur des contrôles.

**Observable.** charge totale, files, droits et délai d'action.

**Échec si.** les protections paralysent ou sont désactivées sans trace.

**Résultat.** Le budget de complexité est local aux procédures ; il manque une enveloppe de charge systémique.

**Correction.** Créer budget de charge constitutionnelle, ordre de délestage et noyau minimal jamais suspendu.

**Invariants concernés.** I06, I15.

#### L49 — PARTIEL

**Scène.** Le service contradicteur devient une caste qui fabrique des objections.

**Centre probable.** administration contradictrice.

**Observable.** erreurs uniques détectées, décisions corrigées et coût.

**Échec si.** la contradiction n'ajoute plus d'information.

**Résultat.** La réduction de périmètre est prévue, mais peut être contrôlée par les acteurs qu'il gêne.

**Correction.** Évaluation croisée indépendante, tirage d'une part des enquêtes et condition de remplacement plutôt que suppression.

**Invariants concernés.** I03, I06.

#### L50 — PARTIEL

**Scène.** La CCT réussit ses propres tests parce qu'elle en fixe les cas et seuils.

**Centre probable.** laboratoire CCT.

**Observable.** résultats sur cas externes et rivaux symétriques.

**Échec si.** aucun résultat admissible ne peut faire perdre la CCT.

**Résultat.** Les échecs de méthode sont publiés, mais la famille de tests reste conçue en interne.

**Correction.** Ouvrir un registre de défis externes, geler les seuils avant test et financer des équipes adverses.

**Invariants concernés.** I14.

## Invariants candidats v0.11

- **I01** — Les droits vitaux restent utilisables sans identité, réseau, langue ou guichet uniques.
- **I02** — Plancher social et plafond écologique sont opposables ; leur incompatibilité physique déclenche une règle publique de pénurie juste.
- **I03** — Nul ne contrôle simultanément règle, données, évaluation et sanction.
- **I04** — Toute capacité exceptionnelle a un détenteur, une durée, un arrêt, une extinction et une preuve de restitution.
- **I05** — Arrêter, relancer et certifier la récupération relèvent d'acteurs distincts.
- **I06** — La complexité est absorbée par l'institution et plafonnée aussi lors d'activations simultanées.
- **I07** — Toute montée d'échelle est motivée ; toute compétence transférée possède une voie praticable de redescente.
- **I08** — Aucun indicateur conséquent n'est seul : mesure rivale, observation hors cible et recours subsistent.
- **I09** — Toute fonction vitale dispose de voies réellement indépendantes, testées en mode dégradé.
- **I10** — Une décision reste attribuable et contestable quand données, archives ou communications sont partielles.
- **I11** — Réparer signifie rendre une capacité d'usage et réduire la répétition, pas seulement indemniser.
- **I12** — La non-concentration suit bénéficiaires effectifs, dépendances, clés, agendas et capacités de réactivation.
- **I13** — Une majorité peut changer les politiques, mais pas supprimer l'égale qualité de sujet, les droits vitaux, l'opposition ou le recours.
- **I14** — Toute généralisation conserve un rival crédible, une condition de perte et la publication des résultats négatifs.
- **I15** — La CCT doit survivre aux chocs composés sans sacrifier silencieusement droits, plafond, traçabilité ou retour au civil.

## Dix ruptures nettes

1. absence de constitution hors ligne pour les droits vitaux ;
2. absence de règle de pénurie quand plancher et plafond sont physiquement incompatibles ;
3. absence de droit de sortie territoriale avec dette et continuité bornées ;
4. archives ouvertes mais non récupérables si une clé technique unique disparaît ;
5. anticoncentration contournable par fragmentation coordonnée ;
6. transitions testées séparément mais pas en contention sur les mêmes ressources ;
7. retour au civil sans leviers matériels suffisants contre une force désobéissante ;
8. réparation de dernier ressort non garantie en cas d'insolvabilité ;
9. redondances sectorielles partageant potentiellement une même cause de panne ;
10. absence de budget global lorsque tous les contrôles renforcés s'activent ensemble.

## Paquet de reconstruction v0.11

La prochaine version doit ajouter six mécanismes : mode constitutionnel dégradé hors ligne ; protocole de pénurie impossible ; registre des clés et dépendances effectives ; budget de charge constitutionnelle avec ordre de délestage ; extinction atomique des pouvoirs temporaires ; laboratoire adverse externe avec seuils gelés.

## Condition de renversement

Ce diagnostic serait affaibli si une lecture indépendante montrait que ces dix mécanismes sont déjà exécutables, attribués et testables dans la v0.10, ou si des scénarios externes à information comparable ne reproduisaient pas la fragilité aux chocs composés. Il serait renforcé par un échec de P-005, notamment si les protections se neutralisent mutuellement sous charge.
