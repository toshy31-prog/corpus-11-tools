"""Banc d'épreuve conceptuel CCT-L50-001.

Les verdicts portent sur la complétude de la CCT v0.10 sur le papier. Ils ne
constituent ni une simulation empirique, ni une prédiction politique.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LimitCase:
    id: str
    family: str
    scene: str
    center: str
    observable: str
    failure: str
    verdict: str
    finding: str
    patch: str
    invariants: tuple[str, ...]


INVARIANTS = {
    "I01": "Les droits vitaux restent utilisables sans identité, réseau, langue ou guichet uniques.",
    "I02": "Plancher social et plafond écologique sont opposables ; leur incompatibilité physique déclenche une règle publique de pénurie juste.",
    "I03": "Nul ne contrôle simultanément règle, données, évaluation et sanction.",
    "I04": "Toute capacité exceptionnelle a un détenteur, une durée, un arrêt, une extinction et une preuve de restitution.",
    "I05": "Arrêter, relancer et certifier la récupération relèvent d'acteurs distincts.",
    "I06": "La complexité est absorbée par l'institution et plafonnée aussi lors d'activations simultanées.",
    "I07": "Toute montée d'échelle est motivée ; toute compétence transférée possède une voie praticable de redescente.",
    "I08": "Aucun indicateur conséquent n'est seul : mesure rivale, observation hors cible et recours subsistent.",
    "I09": "Toute fonction vitale dispose de voies réellement indépendantes, testées en mode dégradé.",
    "I10": "Une décision reste attribuable et contestable quand données, archives ou communications sont partielles.",
    "I11": "Réparer signifie rendre une capacité d'usage et réduire la répétition, pas seulement indemniser.",
    "I12": "La non-concentration suit bénéficiaires effectifs, dépendances, clés, agendas et capacités de réactivation.",
    "I13": "Une majorité peut changer les politiques, mais pas supprimer l'égale qualité de sujet, les droits vitaux, l'opposition ou le recours.",
    "I14": "Toute généralisation conserve un rival crédible, une condition de perte et la publication des résultats négatifs.",
    "I15": "La CCT doit survivre aux chocs composés sans sacrifier silencieusement droits, plafond, traçabilité ou retour au civil.",
}


def c(id_, family, scene, center, observable, failure, verdict, finding, patch, *invariants):
    return LimitCase(id_, family, scene, center, observable, failure, verdict, finding, patch, invariants)


CASES = (
    # A — droits et appartenance
    c("L01", "A. Droits", "Une personne sans papiers ni adresse demande eau et soins.", "registre d'identité",
      "accès effectif sans identifiant stable", "un besoin vital attend la régularisation", "partiel",
      "L'universalité est posée, mais le mode de preuve minimal n'est pas défini.", "Créer une preuve de présence non exclusive et un accès d'urgence sans dossier.", "I01"),
    c("L02", "A. Droits", "Une commune vote l'exclusion d'une minorité religieuse.", "majorité locale",
      "délai jusqu'à protection et maintien du droit de rester", "la seule protection réelle est l'exil", "robuste_sur_le_papier",
      "La saisine extérieure, la protection ciblée et le droit au retour répondent déjà au cas.", "Tester P-003 avec menace locale et confidentialité.", "I01", "I13"),
    c("L03", "A. Droits", "Une traduction change la portée d'une obligation pénale.", "chambre linguistique",
      "écarts entre versions et corrections avant sanction", "une version pivot prévaut de fait", "partiel",
      "Le recours existe, mais pas la règle conservatoire pendant le conflit de versions.", "Suspendre la charge irréversible et retenir provisoirement l'interprétation la moins privative.", "I10"),
    c("L04", "A. Droits", "Une personne quitte un commun qui contrôle logement et emploi.", "commun fonctionnel",
      "jours de logement et revenu conservés après sortie", "la sortie entraîne une perte matérielle", "partiel",
      "La portabilité est forte, mais les actifs liés à l'appartenance restent ambigus.", "Créer un paquet de sortie garantissant logement, revenu-pont, données et recours.", "I01", "I11"),
    c("L05", "A. Droits", "Une panne numérique efface temporairement identité et droits sociaux.", "opérateur d'identité",
      "services accessibles hors ligne pendant 14 jours", "un guichet refuse faute de vérification réseau", "rupture",
      "La CCT protège la portabilité numérique mais ne définit pas de constitution hors ligne.", "Imposer justificatifs locaux, registres répliqués et continuité papier/radio.", "I01", "I09"),

    # B — écologie, allocation et pénurie
    c("L06", "B. Écologie", "Une sécheresse rend simultanément impossible le plancher d'eau et le plafond de prélèvement.", "cellule d'allocation",
      "privation par groupe et état du bassin", "le conflit est tranché discrétionnairement", "rupture",
      "L'ordre des priorités ne suffit pas lorsque deux obligations constitutionnelles deviennent physiquement incompatibles.", "Ajouter un protocole de pénurie impossible : minimum biologique, tirage/triage public, égalité de sacrifice, révision quotidienne.", "I02", "I15"),
    c("L07", "B. Écologie", "La fourchette scientifique des limites varie de 40 % selon les modèles.", "autorité scientifique",
      "décisions sous chaque borne et coût de l'erreur", "la médiane devient vérité politique", "partiel",
      "La pluralité est prévue, mais pas la décision robuste à l'incertitude profonde.", "Employer scénarios minimax-regret et publier les pertes de chaque borne.", "I03", "I08"),
    c("L08", "B. Écologie", "Un territoire délocalise sa pollution dans ses importations.", "acheteur public",
      "empreinte incorporée vérifiée", "émissions territoriales baissent tandis que l'empreinte monte", "robuste_sur_le_papier",
      "La comptabilité importée et les audits hors cible couvrent explicitement le déplacement.", "Préspécifier les données minimales quand le fournisseur refuse l'audit.", "I08"),
    c("L09", "B. Écologie", "Des quotas personnels sont rachetés via prête-noms.", "intermédiaire de quotas",
      "concentration d'usage par bénéficiaire effectif", "10 % contrôlent plus de 40 % des quotas", "partiel",
      "La concentration est interdite en principe, mais les prête-noms ne sont pas traités.", "Relier quotas, bénéficiaires effectifs et audits de réseaux sans notation civique générale.", "I12"),
    c("L10", "B. Écologie", "Une technologie efficace provoque un fort effet rebond.", "planificateur sectoriel",
      "flux physiques absolus avant/après", "l'intensité baisse mais le plafond absolu est dépassé", "partiel",
      "Le plafond protège en théorie ; le corridor ne précise pas l'ajustement automatique au rebond.", "Réduire l'enveloppe ou relever le prix marginal dès divergence absolue préspécifiée.", "I02", "I08"),

    # C — échelles et décisions
    c("L11", "C. Échelles", "Trois niveaux se déclarent compétents pendant une crue.", "juge de compétence",
      "minutes jusqu'à mesure conservatoire", "le conflit retarde la protection vitale", "partiel",
      "La mesure conservatoire existe, mais pas le départage si plusieurs niveaux sont également capables.", "Donner la main au premier niveau sûr, avec journal et transfert obligatoire après revue rapide.", "I07", "I10"),
    c("L12", "C. Échelles", "Une petite île subit un dommage créé par une grande fédération.", "fédération émettrice",
      "accès de l'île au juge, suspension et réparation", "le poids démographique bloque le recours", "robuste_sur_le_papier",
      "Dommage exporté, droits universels et justice transfrontalière justifient déjà la montée d'échelle.", "Tester le délai et le financement autonome du requérant.", "I07", "I11"),
    c("L13", "C. Échelles", "Une compétence mondiale nécessaire devient inutile après innovation.", "secrétariat mondial",
      "délai et coût de restitution", "la compétence survit sans objet", "partiel",
      "Le réexamen est prévu, mais aucune preuve positive de redescente n'est exigée.", "Créer un test périodique de compétence nulle et une procédure de démontage.", "I04", "I07"),
    c("L14", "C. Échelles", "Une région riche quitte la péréquation la veille d'un transfert.", "trésor régional",
      "continuité des paiements et dette de sortie", "la sortie permet d'annuler des obligations acquises", "rupture",
      "Le refus est politiquement envisagé, mais le droit de sécession et ses dettes ne sont pas réglés.", "Définir sortie libre mais non instantanée : continuité, audit des attaches, dette bornée et arbitrage.", "I07", "I11"),
    c("L15", "C. Échelles", "Une métropole domine dix territoires dans un commun logistique.", "nœud logistique métropolitain",
      "veto effectif et dépendances contournables", "le vote formel masque le monopole matériel", "partiel",
      "La représentation existe, mais la puissance d'infrastructure peut annuler l'égalité de voix.", "Mesurer dépendance, financer des routes de secours et pondérer les obligations sans acheter des voix.", "I03", "I09", "I12"),

    # D — administration, information et techniques
    c("L16", "D. Information", "Les archives de décision sont chiffrées par une clé unique perdue.", "dépositaire de clé",
      "restauration depuis copies indépendantes", "aucune preuve de décision n'est récupérable", "rupture",
      "L'ouverture des archives n'assure pas leur récupération technique.", "Répliquer clés et preuves entre dépositaires hétérogènes, avec exercice annuel de restauration.", "I09", "I10"),
    c("L17", "D. Information", "Un système de recommandation public enterre légalement l'opposition.", "équipe de classement",
      "exposition réelle par source et accès à un ordre alternatif", "la pluralité de titres ne circule pas", "partiel",
      "La sélection est mesurée, mais aucun plancher de découvrabilité n'est fixé.", "Garantir accès chronologique, choix utilisateur et audit de distribution, sans imposer une audience.", "I03", "I08"),
    c("L18", "D. Information", "Un fournisseur unique maintient le logiciel ouvert mais incompréhensible.", "mainteneur technique",
      "temps de reprise par une équipe indépendante", "le code est ouvert mais non opérable", "partiel",
      "Ouverture et interopérabilité ne suffisent pas à transférer la capacité.", "Exiger documentation, builds reproductibles, escrow de compétences et exercices de reprise.", "I09", "I12"),
    c("L19", "D. Information", "Une agence fabrique un secret pour éviter le débat.", "classificateur du secret",
      "part de décisions secrètes confirmées extérieurement", "l'auteur du secret contrôle sa légalité", "robuste_sur_le_papier",
      "La séparation des clés, l'inspecteur et les preuves non opérationnelles répondent au centre probable.", "Ajouter une date d'expiration par pièce et sanction du surclassement.", "I03", "I04"),
    c("L20", "D. Information", "Une attaque injecte de fausses données cohérentes dans tous les tableaux.", "pipeline de données",
      "écart aux capteurs et témoignages indépendants", "une source commune contamine toutes les mesures", "partiel",
      "Les audits existent, mais l'indépendance des chaînes de données n'est pas garantie.", "Maintenir des capteurs, échantillons et canaux humains de familles réellement indépendantes.", "I08", "I10"),

    # E — adaptation stratégique et capture
    c("L21", "E. Adaptation", "Des entreprises apprennent exactement les seuils du régime renforcé.", "détenteur du seuil",
      "densité d'observations juste sous seuil", "les dommages restent durablement à seuil moins epsilon", "partiel",
      "P-002 voit la fraude de catégorie, pas l'évitement fin du déclencheur.", "Employer hystérésis, fenêtres multiples et audits hors seuil.", "I08"),
    c("L22", "E. Adaptation", "Auditeur et audité alternent leurs personnels.", "marché professionnel de l'audit",
      "réseau de carrières et taux de contradictions", "l'indépendance juridique cache une dépendance sociale", "partiel",
      "Rotation et incompatibilités existent, sans cartographie des réseaux de carrière.", "Publier passages, co-signatures et dépendances ; tirer une part des audits au sort.", "I03", "I12"),
    c("L23", "E. Adaptation", "Le guichet unique réduit le délai en rejetant plus tôt les cas difficiles.", "routeur de demandes",
      "délai jusqu'à usage, abandons et rejets par complexité", "le délai baisse mais l'accès réel se dégrade", "partiel",
      "P-003 distingue déjà décision et usage, mais pas le tri adverse en entrée.", "Auditer les dossiers manquants, réouvertures et cas sortis du dénominateur.", "I01", "I08"),
    c("L24", "E. Adaptation", "Un conglomérat se fragmente en cent coopératives coordonnées.", "chambre de coordination privée",
      "bénéficiaires, prix et décisions corrélées", "les seuils juridiques ne voient plus le monopole", "rupture",
      "La CCT suit la propriété, mais pas assez la coordination de fait entre unités séparées.", "Déclencher l'anticoncentration sur dépendance, conduite coordonnée et clés communes, pas la forme sociale.", "I12"),
    c("L25", "E. Adaptation", "Des groupes saturent l'agenda par milliers de saisines automatisées.", "filtre de recevabilité",
      "temps d'accès des personnes et motifs de filtrage", "la défense anti-spam devient censure discrétionnaire", "partiel",
      "L'initiative est garantie, mais la rareté de l'attention n'a pas de protocole adverse.", "Quota équitable remboursable, preuve de soutien progressive et appel humain du filtrage.", "I01", "I03", "I06"),

    # F — transition
    c("L26", "F. Transition", "Fuite des capitaux, stocks et cadres dans la même semaine.", "cellule de continuité",
      "besoins servis et pouvoirs accumulés", "la continuité exige un commandement sans extinction", "partiel",
      "P-001 teste ces chocs surtout séparément ; la composition peut changer le résultat.", "Créer P-005 sur chocs corrélés et budget global de pouvoirs temporaires.", "I04", "I15"),
    c("L27", "F. Transition", "Les travailleurs refusent une conversion écologique jugée injuste.", "fonds de conversion",
      "revenu, choix réel et délai de recours", "la garantie d'emploi devient affectation forcée", "partiel",
      "Le revenu et la formation sont prévus, mais le droit de refuser une reconversion ne l'est pas clairement.", "Garantir revenu-pont et plusieurs parcours sans perte punitive.", "I01", "I11"),
    c("L28", "F. Transition", "Un ancien propriétaire retire une licence critique.", "titulaire de licence",
      "temps de bascule vers solution de secours", "la licence donne un veto durable", "robuste_sur_le_papier",
      "La porte de capacité et la voie indépendante visent précisément cette dépendance.", "Rendre obligatoire un exercice de révocation surprise avant transfert.", "I09", "I14"),
    c("L29", "F. Transition", "La capacité alternative fonctionne mais double le travail invisible des aidantes.", "gestionnaire de continuité",
      "heures compensatoires par groupe", "les besoins sont servis par surcharge non reconnue", "partiel",
      "La charge totale est mesurée, sans seuil distributif de travail compensatoire.", "Interdire le passage de porte si un groupe absorbe une hausse non consentie et non compensée.", "I02", "I11"),
    c("L30", "F. Transition", "Deux transitions vitales partagent les mêmes experts et pièces de secours.", "bureau de portefeuille",
      "ressources critiques communes et temps de récupération", "chaque projet passe seul mais échoue simultanément", "rupture",
      "Le modèle teste la continuité par service, pas la contention entre transitions.", "Créer un registre de dépendances croisées et un test de portefeuille N-2.", "I09", "I15"),

    # G — urgence, défense et coercition
    c("L31", "G. Urgence", "Une pandémie exige décisions rapides pendant six mois.", "exécutif d'urgence",
      "renouvellements, droits maintenus et restitution", "l'urgence modifie la constitution", "robuste_sur_le_papier",
      "Durée, renouvellement pluraliste, juge et interdiction constituante sont explicites.", "Tester l'accès réel de l'opposition sous contraintes sanitaires.", "I04", "I13"),
    c("L32", "G. Urgence", "Une menace faible mais permanente justifie des renouvellements sans fin.", "producteur du renseignement",
      "variation de capacité malgré menace stable", "l'exception devient le régime ordinaire", "partiel",
      "L'expiration existe, mais la menace continue peut la réactiver indéfiniment.", "Plafond cumulé, majorité croissante et transfert vers une loi ordinaire contrôlée.", "I04", "I13"),
    c("L33", "G. Urgence", "Une cyberattaque coupe communications entre clés séparées.", "nœud de communication",
      "décisions valides hors ligne", "la séparation empêche toute action sûre", "partiel",
      "La séparation réduit l'abus mais crée une dépendance de disponibilité.", "Préautoriser des enveloppes locales bornées avec synchronisation et audit différés.", "I05", "I09", "I10"),
    c("L34", "G. Urgence", "Une force régionale refuse sa démobilisation.", "commandement régional",
      "capacité civile de couper paie, logistique et ordres", "la révocation est seulement juridique", "rupture",
      "Le retour au civil est exigé, mais les leviers matériels de désobéissance ne sont pas distribués.", "Séparer paie, munitions, communications et légitimité des ordres ; tester la coupure croisée.", "I04", "I05", "I12"),
    c("L35", "G. Urgence", "L'inspecteur chargé d'arrêter une opération est compromis.", "inspecteur unique",
      "arrêts initiés par voies indépendantes", "une personne bloque tout recours", "partiel",
      "L'inspecteur constitue lui-même un point terminal unique.", "Ajouter arrêt multi-origine, suppléance aléatoire et protection des lanceurs d'alerte.", "I03", "I05"),

    # H — justice et réparation
    c("L36", "H. Justice", "Un million de recours similaires arrive en un mois.", "greffe et moteur de tri",
      "délai par groupe et taux d'erreur", "la file rend le droit inutilisable", "partiel",
      "La porte unique ne garantit pas la capacité sous charge de masse.", "Créer recours collectif, décisions provisoires favorables et renfort automatique.", "I01", "I06"),
    c("L37", "H. Justice", "Le responsable d'un dommage massif est insolvable.", "fonds de réparation",
      "capacité rendue malgré insolvabilité", "l'absence de payeur annule la réparation", "rupture",
      "Le fonds mondial existe, sans garantie générale de réparation de dernier ressort.", "Créer assurance mutualisée puis récupération sur bénéficiaires et chaînes de contrôle.", "I11", "I12"),
    c("L38", "H. Justice", "Un écosystème détruit ne peut être restauré.", "juge de clôture",
      "reste irréparable nommé et capacités compensées", "une somme clôt silencieusement la dette", "partiel",
      "La CCT reconnaît le reste, mais la représentation intergénérationnelle de la clôture est faible.", "Exiger collège des porteurs de perte, gardiens écologiques et réexamen différé.", "I11"),
    c("L39", "H. Justice", "Un plaignant subit des représailles locales.", "autorité locale",
      "protection, revenu et logement disponibles en heures", "le recours accroît le danger", "robuste_sur_le_papier",
      "Assistance, relocalisation et défenseur extérieur sont explicitement prévus.", "Tester confidentialité et droit de rester dans P-003.", "I01", "I11"),
    c("L40", "H. Justice", "Deux juridictions supérieures rendent des ordres incompatibles.", "organe de conflit",
      "temps de règle conservatoire et perte évitée", "le service choisit son juge préféré", "partiel",
      "La médiation de compétence ne couvre pas complètement le conflit de décisions finales.", "Créer panel ad hoc tiré entre juridictions, avec mesure la moins irréversible.", "I07", "I10"),

    # I — infrastructures et modes dégradés
    c("L41", "I. Résilience", "Le réseau électrique et les paiements tombent ensemble.", "opérateur de reprise",
      "soins, eau et alimentation servis sans réseau", "les secours dépendent du même système", "rupture",
      "Les redondances sont listées par secteur, sans test d'indépendance intersectorielle.", "Cartographier dépendances communes et exercer un mode îloté multi-service.", "I09", "I15"),
    c("L42", "I. Résilience", "Une biorégion est isolée logistiquement pendant trente jours.", "réserve régionale",
      "jours d'autonomie par besoin vital", "les réserves existent seulement en comptabilité", "partiel",
      "La réserve est financée mais aucun niveau minimal d'autonomie n'est constitutionnalisé.", "Fixer fourchettes locales publiques et réaliser des tests de tirage réel.", "I02", "I09"),
    c("L43", "I. Résilience", "Une voie de secours appartient au même sous-traitant que la voie principale.", "bénéficiaire effectif du fournisseur",
      "indépendance technique, juridique et géographique", "la redondance partage une cause de panne", "partiel",
      "La voie indépendante est exigée sans critère d'indépendance totale.", "Qualifier l'indépendance sur propriété, personnel, énergie, logiciel, route et juridiction.", "I09", "I12"),
    c("L44", "I. Résilience", "Une crise climatique déplace 20 % d'une population en trois mois.", "autorité de résidence",
      "continuité des droits et capacité d'accueil", "les communes suspendent la résidence factuelle", "partiel",
      "Les droits suivent la personne, mais le financement automatique de la charge d'accueil est absent.", "Déclencher péréquation et droits politiques progressifs sur présence, sans délai discrétionnaire.", "I01", "I07"),
    c("L45", "I. Résilience", "Un service vital perd son équipe dirigeante entière.", "collège technique",
      "reprise par suppléants et documentation", "la continuité dépend de personnes irremplaçables", "robuste_sur_le_papier",
      "P-001 traite la perte d'un cadre et exige la cartographie des compétences.", "Étendre au scénario de perte d'équipe complète et transmission hors organisation.", "I09"),

    # J — maintenance constitutionnelle
    c("L46", "J. Constitution", "Une majorité élue veut abolir l'opposition et les recours.", "majorité constituante",
      "capacité à changer la politique sans abolir le sujet de droit", "une majorité ordinaire neutralise les contre-pouvoirs", "robuste_sur_le_papier",
      "Les droits, l'opposition et l'interdiction de révision d'urgence forment déjà un noyau.", "Clarifier les invariants non supprimables et la procédure constituante hors urgence.", "I13"),
    c("L47", "J. Constitution", "Le noyau non négociable empêche une réforme économique pourtant populaire.", "juge constitutionnel",
      "part des politiques réellement ouvertes", "le juge transforme l'orientation en dogme", "partiel",
      "La frontière entre droits invariants et instruments écosocialistes reste floue.", "Sanctuariser les capacités et limites, pas une forme unique de propriété ou d'allocation.", "I13", "I14"),
    c("L48", "J. Constitution", "Tous les modules de contrôle renforcé s'activent pendant une polycrise.", "orchestrateur des contrôles",
      "charge totale, files, droits et délai d'action", "les protections paralysent ou sont désactivées sans trace", "rupture",
      "Le budget de complexité est local aux procédures ; il manque une enveloppe de charge systémique.", "Créer budget de charge constitutionnelle, ordre de délestage et noyau minimal jamais suspendu.", "I06", "I15"),
    c("L49", "J. Constitution", "Le service contradicteur devient une caste qui fabrique des objections.", "administration contradictrice",
      "erreurs uniques détectées, décisions corrigées et coût", "la contradiction n'ajoute plus d'information", "partiel",
      "La réduction de périmètre est prévue, mais peut être contrôlée par les acteurs qu'il gêne.", "Évaluation croisée indépendante, tirage d'une part des enquêtes et condition de remplacement plutôt que suppression.", "I03", "I06"),
    c("L50", "J. Constitution", "La CCT réussit ses propres tests parce qu'elle en fixe les cas et seuils.", "laboratoire CCT",
      "résultats sur cas externes et rivaux symétriques", "aucun résultat admissible ne peut faire perdre la CCT", "partiel",
      "Les échecs de méthode sont publiés, mais la famille de tests reste conçue en interne.", "Ouvrir un registre de défis externes, geler les seuils avant test et financer des équipes adverses.", "I14"),
)


def validate() -> None:
    assert len(CASES) == 50
    assert len({case.id for case in CASES}) == 50
    families = {case.family for case in CASES}
    assert len(families) == 10
    assert all(sum(c.family == family for c in CASES) == 5 for family in families)
    assert {case.verdict for case in CASES} <= {"robuste_sur_le_papier", "partiel", "rupture"}
    assert all(case.invariants for case in CASES)
    assert all(inv in INVARIANTS for case in CASES for inv in case.invariants)


validate()
