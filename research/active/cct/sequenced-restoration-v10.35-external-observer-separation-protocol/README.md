# CCT-EXEC 10.35 — protocole de séparation de l’observateur

Le composant et l’observateur doivent présenter clés, PID et identifiants d’instance distincts. Ces identifiants sont des valeurs opaques propres à l’invocation ; ils ne sont ni des boot-ID Linux ni des preuves d’hôtes distincts. Les deux rôles cosignent un nonce frais liant les hashes de l’accusé et de la tentative. Rejeu, identité runtime commune, clé commune ou artefact modifié bloquent l’admission.

Les paquets de test sont synthétiques : la couche rend une exécution externe vérifiable, mais n’établit ni séparation effective de processus, ni indépendance d’hôte, ni déploiement.

Le transport sans mémoire partagée est exécutable avec :

```bash
node emit-synthetic-packet.mjs | node verify-packet-stdin.mjs
```

Cette commande lance un émetteur et un vérificateur distincts ; elle n’établit
pas que le composant et l’observateur à l’origine du paquet étaient séparés.

## Exécution séparée locale réobservée

Les adaptateurs `observer-process.mjs`, `component-process.mjs` et
`verify-separated-run.mjs` réalisent maintenant l’échange par répertoire
intermédiaire. Lors de la réobservation locale du 9 septembre 2026, le composant
(`PID 5`) et l’observateur (`PID 4`) avaient des PID, identifiants d’instance et clés distincts ;
les deux signatures et les liaisons de contenu ont été vérifiées. Cette preuve
établit une séparation locale de processus pour cette exécution seulement. Elle
n’établit ni indépendance d’hôte, ni déploiement, ni persistance de la propriété.

`verify-separated-campaign.mjs` compare plusieurs exécutions simultanées et
refuse tout nonce, packet hash ou identifiant d’instance réutilisé, ainsi que tout PID commun
dans la fenêtre de campagne. Il transforme le contrôle anti-rejeu en propriété
inter-exécutions vérifiable.

Une campagne locale de deux exécutions simultanées a produit les couples de PID
`7/5` et `8/6` : nonces, hashes de paquet, identifiants d’instance et les quatre PID étaient
tous distincts, et chaque paquet était valide. Le remplacement contrôlé du
second paquet final par le premier a été refusé (statut `1`) parce que ces cinq
conditions d'unicité devenaient fausses ; le paquet original a ensuite été
restauré et la campagne de nouveau admise. Cela établit la détection du rejeu
dans une campagne explicitement fournie au vérificateur, pas entre campagnes
oubliées ni entre hôtes.

`verify-and-record-campaign.mjs` étend ce contrôle aux appels successifs avec un
registre local persistant. Il valide d'abord toute la campagne, prend ensuite un
verrou exclusif, refuse les nonces, hashes de paquet ou identifiants d’instance déjà enregistrés,
et ne remplace atomiquement le registre qu'après admission. Un registre verrouillé
ou dont le digest d'état ne correspond plus à son contenu échoue fermé. Ce digest
détecte une altération accidentelle, mais n'authentifie pas le registre contre un
acteur capable de réécrire à la fois son contenu et son digest, ni contre un
retour à une ancienne copie.

Réobservation locale : la première admission a créé la génération `1` avec deux
enregistrements. Une seconde admission des mêmes paquets a échoué avec
`historical_replay_detected` et n'a changé aucun octet du registre. La modification
isolée de sa génération a échoué avec `registry_integrity_invalid`, et la présence
du verrou a échoué avec `registry_locked`.

`checkpoint-registry.mjs` peut ensuite faire signer l'état admis par une clé
Ed25519 conservée séparément. Le checkpoint lie le digest d'état, la génération,
le nombre d'enregistrements et le digest du checkpoint précédent ; son remplacement
est atomique. `verify-registry-checkpoint.mjs` exige une clé publique de confiance
fournie hors du checkpoint et refuse toute divergence entre cet ancrage et le
registre courant. La conservation indépendante du dernier checkpoint et de la clé
publique reste une condition externe : leur rollback conjoint n'est pas détectable
par ces fichiers seuls.

Réobservation locale : deux campagnes fraîches ont porté le registre de la
génération `1` (deux entrées) à la génération `2` (quatre entrées). Le checkpoint
de génération `2` a validé les cinq liaisons attendues. La restauration du registre
de génération `1` face à ce checkpoint a ensuite été refusée : digest d'état,
génération et nombre d'entrées divergeaient. Le signataire comme le vérificateur
recalculent aussi le digest interne avant d'accepter l'état.

`anchor-checkpoint.mjs` fournit enfin le rôle exécutable d'un témoin monotone :
il vérifie la signature du checkpoint avec la clé publique du registre, conserve
un état séparé contenant son dernier accusé Ed25519, et refuse toute génération
inférieure ou égale. `verify-anchor-receipt.mjs` relie l'accusé, le checkpoint et
une clé publique d'ancrage obtenue séparément. Deux campagnes successives ont été
ancrées aux générations `1` puis `2`; une nouvelle présentation du checkpoint
de génération `1` a été refusée sans produire d'accusé. Une modification du
compteur du témoin a également été refusée par `anchor_state_integrity_invalid`.
L'exécution observée reste locale : la séparation en domaine de défaillance ne
sera établie que si le témoin, son état et sa clé sont effectivement hébergés et
administrés indépendamment.

`detect-anchor-equivocation.mjs` compare deux accusés sous une même clé publique.
Deux signatures valides portant la même génération mais des checkpoints, états
ou tailles divergents constituent une preuve positive d'équivoque et déclenchent
un statut non nul. Des générations différentes ou deux copies identiques ne sont
pas qualifiées d'équivoque ; une signature invalide rend la comparaison
inexploitable plutôt que disculpatoire. Cette preuve doit entraîner le retrait de
la confiance accordée à la clé d'ancrage concernée.

`reconcile-anchor-inventories.mjs` rend la rencontre hors ligne exploitable : il
vérifie tous les accusés présents dans au moins deux inventaires, signale ceux qui
ne sont détenus que par une partie, puis cherche les états divergents à génération
égale dans leur union dédupliquée. Une signature invalide rend la réconciliation
invalide ; une équivoque valide déclenche le retrait. L'outil ne prouve ni que les
inventaires sont exhaustifs, ni qu'ils appartiennent réellement à des domaines
indépendants : ces deux affirmations exigent encore des preuves de transport et
de garde.

`seal-custody-inventory.mjs` engage un détenteur sur la liste triée exacte des
digests qu'il conserve. `verify-custody-set.mjs` confronte au moins deux de ces
manifestes à un registre de détenteurs fourni séparément, aux répertoires réels
et à la clé publique d'ancrage. L'admission exige des signatures valides, une
égalité exacte manifeste-inventaire et des identités, contrôleurs et domaines de
défaillance tous distincts. Les métadonnées signées rendent une fausse différence
détectable par rapport au registre ; elles ne prouvent toutefois pas que les
contrôleurs déclarés sont matériellement indépendants.

`verify-custody-control.mjs` relie cette garde aux dimensions déjà définies par
les couches 10.19–10.20 : propriétaire effectif, opérateur de clés, financeur
décisif et détenteur de veto. Chaque valeur doit correspondre au profil, porter
au moins deux racines documentaires distinctes et ne faire l'objet d'aucune
contestation matérielle ouverte. Un contrôle partagé fusionne les détenteurs en
un seul centre effectif ; moins de deux centres bloque l'admission. Les racines
restent des références déclarées : leur authenticité et leur indépendance réelle
ne sont pas établies par le seul validateur.

`verify-control-evidence-roots.mjs` empêche que deux chaînes différentes soient
prises pour deux preuves : chaque racine doit être une attestation signée par une
source inscrite dans un registre de confiance, lier détenteur, dimension, valeur
et digest documentaire, puis correspondre exactement aux racines citées par la
corroboration. Deux racines ne comptent que si source, contrôleur et domaine de
défaillance diffèrent tous. Cela authentifie l'attribution et détecte une
dépendance déclarée ; l'authenticité du document sous-jacent et l'exhaustivité de
la lignée de réutilisation restent à établir.

La même attestation engage maintenant une liste triée et sans doublon de tous
les digests amont connus ainsi que `lineageComplete:true`. Pour chaque affirmation,
le validateur compare le document racine et toute sa lignée : une intersection
empêche les deux racines de compter comme indépendantes. Une lignée absente, non
canonique ou déclarée incomplète invalide la racine. Une omission mensongère reste
toutefois une contestation de provenance à instruire hors du paquet.

`verify-lineage-challenges.mjs` rend cette complétude contestable sans permettre
à une identité isolée de bloquer arbitrairement la chaîne. Une omission suspend
l'admission lorsque deux challengers enregistrés, de contrôleurs et domaines
distincts, signent le même digest omis avec deux artefacts de preuve distincts.
Une signature ou une cible invalide rend le dossier inexploitable ; un seul vote
valide reste une alerte sans suffire à qualifier l'omission. La résolution d'une
contestation n'est pas automatisée par cette couche.

`verify-lineage-resolution.mjs` n'admet une résolution que si la source signe une
nouvelle racine incorporant le digest omis, si la corroboration remplace réellement
l'ancienne racine, et si deux adjudicateurs de contrôleurs et domaines distincts
signent le même remplacement avec deux artefacts distincts. Une simple clôture de
statut ou une correction non utilisée par la décision ne rétablit donc pas la
racine.

Les adjudications signent aussi l'ouverture de la contestation, la résolution et
son entrée en vigueur. Le registre de décisions demeure invalide pour toute
décision utilisant l'ancienne racine dès l'ouverture, ou la nouvelle avant sa
date d'effet. Une résolution ultérieure ne répare donc pas rétroactivement une
décision prise pendant la suspension ; son identifiant reste exposé.

Une décision historiquement invalide n'est jamais effacée. Sa réparation exige
deux autorités enregistrées, de contrôleurs et domaines distincts, signant la
même annulation ou réévaluation après l'entrée en vigueur de la nouvelle racine,
avec digests d'évaluation des conséquences, de notification aux parties affectées
et deux artefacts de preuve distincts. Une réévaluation doit désigner une nouvelle
décision réellement présente dans le registre au bon moment. La sortie conserve
`historicalInvalidDecisionIds` même lorsque `repairComplete` devient vrai.

`verify-repair-effect.mjs` sépare enfin la réparation écrite de son effet
opérationnel. Il lie les reçus au digest exact du quorum de réparation et exige :
notification livrée puis accessible, changement d'état avant/après par un
exécuteur, délai de recours encore utilisable et deux observateurs d'effet de
contrôleurs et domaines distincts. Même en cas d'admission, la sortie maintient
`subjectiveSufficiencyEstablished:false` : accès et changement d'état ne prouvent
ni satisfaction, ni compensation suffisante, ni absence de perte résiduelle.

`assess-repair-sufficiency.mjs` maintient cette distinction en recueillant, pour
toutes les parties enregistrées comme affectées, une évaluation signée de cinq
dimensions : accès, compensation de la charge, recours, non-répétition et
autonomie, plus une liste explicite des pertes résiduelles. Une réparation n'est
rapportée suffisante que si toutes les dimensions sont positives, toutes les
parties couvertes, aucune perte restante et tous les rapports concordants. Un
éventuel `waiverGranted` est signé mais toujours ignoré comme preuve de suffisance.
La sortie conserve `objectiveSufficiencyEstablished:false` : elle établit un
rapport attribuable, pas une vérité objective ni un consentement à publication.

`verify-assessment-freedom.mjs` empêche qu'un rapport signé suffise à lui seul :
deux défenseurs enregistrés, de contrôleurs et domaines distincts devaient avoir
observé un canal privé, l'absence du décideur, la possibilité de retrait,
l'absence de conditionnement du bénéfice et une voie contre les représailles.
Leurs reçus signés lient le digest exact de l'évaluation. L'absence de réponse
n'est jamais convertie en satisfaction. Même avec quorum, la sortie conserve
`coercionAbsenceEstablished:false` : les garanties observées réduisent le risque,
elles ne prouvent pas l'absence de coercition invisible.

`verify-assessment-safeguard-adaptation.mjs` compare des évaluations annoncées à
des évaluations dont l'affectation était engagée par digest puis révélée seulement
après la campagne. Deux observateurs indépendants doivent signer exactement les
mêmes comptes. Toute défaillance dans le bras aveugle, ou tout taux supérieur au
bras annoncé, qualifie une adaptation au protocole et bloque la conclusion. Cette
couche teste la persistance des garanties sous variation d'observabilité ; elle
ne rend pas l'affectation aléatoire ni les observations réelles par elle-même.

`verify-blind-assignment-entropy.mjs` compile l'affectation depuis au moins deux
secrets engagés avant la campagne et révélés après sa fin par des gardiens de
contrôleurs et domaines distincts. Les engagements et révélations sont signés ;
le calendrier attendu est dérivé du seed combiné et doit correspondre exactement
au calendrier observé, avec les deux bras présents. Cela rend la sélection
reproductible après coup et empêche un gardien unique de la choisir seul. Le
protocole ne prouve pas qu'un gardien n'a pas divulgué son secret hors canal avant
la fin ; cette absence de fuite reste une hypothèse externe.

`verify-entropy-leakage-monitor.mjs` borne cette hypothèse : un plan préétabli
énumère engagements, fenêtre et canaux observables, puis deux moniteurs de
contrôleurs et domaines distincts signent leur couverture et tout signal
d'exposition. Une correspondance positive accompagnée d'un digest de preuve
annule immédiatement l'aveuglement. Une non-détection ne vaut que pour les canaux
et la fenêtre affichés ; `globalLeakageAbsenceEstablished` reste toujours faux.

`verify-leakage-detectability.mjs` injecte dans chaque canal planifié un canari
engagé avant observation. Chaque canal ne compte comme détectable que si deux
moniteurs indépendants retrouvent le bon digest dans la latence préétablie. Une
détection tardive, absente ou limitée à un moniteur invalide donc l'argument tiré
d'une non-détection de fuite. `transportEquivalenceEstablished:false` rappelle
qu'un canari visible peut encore ne pas emprunter le même chemin qu'une fuite réelle.

`verify-leakage-transport-equivalence.mjs` compare le canari à un probe de fuite
simulée dont les étiquettes ne sont révélées qu'après campagne. Deux observateurs
indépendants doivent rapporter exactement la même paire ; sauts, transformations,
destination, classe de taille et latence doivent être appariés. Un écart empêche
le canari de soutenir la détectabilité de ce probe. La sortie distingue
`shadowProbeTransportEquivalent` de `realLeakageTransportEquivalent:false` : une
simulation appariée ne démontre toujours pas le trajet de toute fuite réelle.

`verify-leakage-transport-matrix.mjs` retire le choix opportuniste d'un unique
probe : un registre préétabli doit contenir au moins trois classes et les reçus
des deux observateurs doivent couvrir exactement, dans le même ordre, chacune
d'elles. L'équivalence est recalculée classe par classe ; un seul échec bloque la
matrice entière. Même une matrice admise conserve
`universalTransportEquivalenceEstablished:false`, car les classes enregistrées
ne garantissent pas l'exhaustivité de toutes les fuites possibles.

`verify-leakage-class-coverage.mjs` remplace un nombre minimal arbitraire par une
couverture constructive : le registre de classes doit être exactement le produit
cartésien des axes ouverts `sourceInterface`, `encoding`, `sizeClass`, `timing`
et `route`. Identifiants de classe dérivés du contenu, doublons, classes absentes
ou inattendues sont vérifiés. Cette exhaustivité reste relative aux valeurs
d'axes déclarées ; `openWorldCoverageEstablished:false` interdit de la présenter
comme couverture de mécanismes encore inconnus ou omis des axes.

`verify-leakage-axis-challenges.mjs` ouvre ce périmètre à deux formes de
contestation signée : valeur omise dans un axe existant ou axe entièrement omis
avec valeurs initiales. Deux challengers de contrôleurs et domaines distincts
doivent soutenir exactement la même proposition avec deux artefacts distincts.
Un quorum suspend la couverture mais ne modifie jamais rétroactivement le
registre (`registryAutomaticallyAmended:false`) ; l'amendement doit être décidé
et testé prospectivement.

`verify-prospective-axis-amendment.mjs` exige que l'ancien registre devienne
exactement le nouveau par la seule proposition soutenue, que toute la matrice de
classes soit régénérée, et que deux adjudicateurs indépendants signent le même
amendement avec deux preuves distinctes. La campagne d'effet doit être strictement
postérieure à la campagne courante. Ainsi, l'ajout ne peut ni modifier d'autres
axes en passant, ni sauver rétroactivement une couverture déjà suspendue.

`verify-prospective-class-observations.mjs` calcule ensuite le différentiel entre
anciens et nouveaux registres. Chaque classe ajoutée doit disposer, dans une
campagne au moins égale à la prise d'effet, d'artefacts de probe et d'observation
distincts et d'une équivalence complète cosignée par deux observateurs
indépendants. Une classe non observée, une campagne antérieure ou un digest
réutilisé dans le lot empêche le rétablissement de la couverture. L'absence de
réutilisation depuis une campagne plus ancienne reste explicitement non établie
sans registre historique externe des artefacts.

`record-class-artifact-history.mjs` fournit ce registre : il revérifie le quorum
signé et son accord exact, puis inscrit durablement chaque digest de probe et
d'observation avec classe et campagne. Une réutilisation ultérieure est refusée
sans mutation de l'historique. Le registre possède un digest d'état et un verrou,
mais hérite des limites de rollback local déjà traitées par les checkpoints et
l'ancrage monotone lorsqu'ils sont effectivement déployés autour de lui.

`checkpoint-artifact-history.mjs` et
`verify-artifact-history-checkpoint.mjs` appliquent désormais la même chaîne au
registre d'artefacts avec un schéma distinct. Le témoin monotone accepte ce type
de checkpoint après vérification de sa signature. Digest d'état, génération et
taille empêchent ainsi le rollback isolé de l'historique face à son dernier
checkpoint ; l'ancrage reste nécessaire contre leur rollback conjoint.

`admit-artifact-history-state.mjs` devient la porte de lecture combinée : il
refuse d'admettre l'historique sans vérifier simultanément son intégrité, son
checkpoint signé, le dernier état autoritatif du témoin, l'accusé inclus et toutes
les liaisons digest-génération-taille. Restaurer ensemble historique et checkpoint
ne passe donc plus face à un état d'ancrage plus récent. La confiance se déplace
explicitement vers la copie d'état du témoin fournie au lecteur ; restaurer aussi
cette copie demeure indétectable sans détenteur externe réellement indépendant.

`serve-anchor-state.mjs` et `verify-remote-anchor-fetch.mjs` remplacent la lecture
muette par un défi-réponse frais : le détenteur signe nonce, digest exact de
l'état, génération et instant de service. Le lecteur exige une génération
minimale, une fenêtre non expirée et un contrôleur ainsi qu'un domaine déclarés
distincts du demandeur. Un ancien fichier de réponse ne peut donc pas répondre à
un nouveau nonce. `remoteHostingEstablished:false` demeure explicite tant que le
service n'a pas été réobservé sur une infrastructure effectivement distincte.

Les variantes `serve-anchor-state-tcp.mjs`, `fetch-anchor-state-tcp.mjs` et
`verify-anchor-tcp-fetch.mjs` rendent ce transport réellement exécutable sur TCP.
Le client crée et signe lui-même un défi frais portant son identité, son PID et son
boot-ID ; le serveur vérifie cette signature puis signe le digest du défi avec son
propre PID et boot-ID. Le transcript conserve les adresses observées. Le contrôle
établit l'authentification mutuelle des clés et deux revendications de PID distinctes,
pas l'identité matérielle des processus : les PID restent déclarés dans les messages.
Il conserve donc `distinctProcessesEstablished:false` et, sur boucle locale,
`distinctHostEstablished:false`. Ces conclusions exigent une preuve externe du
processus ou de l'hôte, pas seulement un échange TCP valide.

Le serveur inscrit désormais chaque nonce et digest de défi dans un registre
monotone durable avant d'émettre l'état. Une seconde présentation du même défi est
refusée, y compris par un nouveau processus serveur. Le verrou exclut deux admissions
concurrentes ; une intégrité de registre invalide bloque le service au lieu de
réinitialiser silencieusement l'historique.

Les deux processus acceptent aussi un fichier de libération optionnel qui les garde
vivants après l'échange. `attest-live-tcp-processes.mjs` profite de cette barrière
pour lire simultanément leurs identités noyau (`PID`, instant de démarrage et digest
de commande) dans `/proc`, les signer depuis un troisième processus, puis les
libérer. `verify-live-tcp-process-attestation.mjs` vérifie cette preuve et les
programmes attendus. Cela établit l'observation signée de deux processus Linux
vivants ; cela ne prouve ni l'indépendance de l'observateur ni deux hôtes distincts,
qui restent explicitement faux.

Deux observateurs peuvent maintenant signer la même paire de processus avant la
libération, puis `verify-dual-live-process-attestations.mjs` impose des processus
d'observation et racines cryptographiques distincts, une cible identique et une
fenêtre commune. Les contrôleurs et domaines de défaillance distincts restent des
déclarations, non des faits attestés. Puisque les deux témoins partagent ici hôte,
`/proc` et code, le verdict demeure `partially_dependent`, même avec deux signatures.

Le vérificateur sépare désormais explicitement validité des deux artefacts et
admissibilité comme preuves indépendantes. Deux signatures correctes peuvent donner
`artifactPairValid:true`, mais jamais `independentEvidenceAdmissible:true` tant que
les autorités de contrôle, domaines de défaillance et canaux de mesure ne sont pas
corroborés. Les chaînes de caractères déclarant contrôleur et domaine ne comptent
plus comme des contrôles d'indépendance réussis.

`create-observer-authority-credential.mjs` peut préparer un justificatif signé qui
lie une clé d'observateur, son contrôleur, son domaine et une fenêtre de validité.
Le contrôle dual exige désormais deux justificatifs valides, liés aux attestations,
avec autorités, contrôleurs et domaines distincts. Il établit ainsi une séparation
de contrôle *credentialed* au niveau des artefacts. La création locale de clés ne
prouve toutefois ni mandat ni autorisation externe :
`authorityRootsExternallyAuthorized:false`, et le canal `/proc` partagé maintient
`independentEvidenceAdmissible:false`.

Les justificatifs ne sont plus acceptés sans état d'autorité courant.
`create-authority-status.mjs` produit une liste de révocation signée et bornée dans
le temps ; le contrôle dual exige une génération positive, une signature valide,
la correspondance de l'émetteur et l'absence du digest exact du justificatif à la
date d'évaluation fournie. Une révocation bloque donc l'artefact même si toutes ses
signatures historiques restent cryptographiquement valides. Ce contrôle seul ne
garantit pas la monotonie ; les paragraphes suivants décrivent le checkpoint et
l'ancrage local qui la rendent exécutable, puis leur limite hors hôte.

`checkpoint-authority-status.mjs` transforme maintenant chaque état d'autorité
signé en checkpoint chaînable, puis `anchor-checkpoint.mjs` accepte explicitement
ce schéma. L'état d'ancrage refuse toute génération inférieure ou égale à la
dernière ancrée : présenter un ancien état de révocation valide ne suffit donc plus
à faire reculer l'autorité locale. Cette protection dépend encore de la conservation
de l'état d'ancrage et ne vaut pas publication externe de celui-ci.

L'ancrage ne se contente plus d'une génération croissante : hors genèse, le digest
`previousCheckpointDigest` entrant doit être exactement le dernier checkpoint
ancré ; à la genèse il doit être nul. Une branche parallèle correctement signée et
numérotée plus haut est donc refusée au lieu d'effacer silencieusement la filiation.

L'admission duale exige maintenant, pour chaque autorité, l'état de révocation exact,
son checkpoint, le reçu d'ancrage, l'état courant de l'ancre et les deux clés de
vérification. `authority-anchor-binding.mjs` contrôle toutes les liaisons de digest,
génération, cardinalité et signatures. Un état valide mais différent de celui que
l'ancre locale désigne comme courant ne peut donc plus autoriser l'attestation.

`acknowledge-fetched-anchor-state.mjs` permet à un détenteur de miroir de vérifier
la réponse TCP source et ses liaisons avant de signer un reçu durable de l'état
exact reçu. Deux reçus peuvent être rapprochés par
`verify-anchor-mirror-receipts.mjs`, qui exige clés et identités de miroir distinctes.
Le rapprochement exige maintenant deux digests de réponse source distincts : deux
copies signées de la même réponse sont refusées comme faux cumul. Deux défis et
réponses TCP séparés pour le même état établissent deux transports observés, mais
restent `partially_dependent` puisqu'ils partagent état et détenteur source. Ils ne
rendent ni l'hébergement distant ni les domaines de défaillance établis.

Chaque reçu de miroir lie maintenant aussi le transcript TCP exact, ses adresses et
ses ports, après contrôle des PID client et serveur contre le défi et la réponse.
Le rapprochement exige deux digests de transcript distincts. Cette trace rend les
deux transports auditables, mais elle reste enregistrée par le client : elle ne
constitue pas une attestation indépendante de l'origine réseau, donc
`networkOriginsEstablished:false`.

Une barrière optionnelle peut maintenant maintenir la socket ouverte avant l'envoi
du défi. `attest-live-tcp-connection.mjs` lit alors `/proc/net/tcp`, retrouve les
deux sens de la connexion `ESTABLISHED`, vérifie que chaque inode appartient au PID
client ou serveur attendu, puis signe cette observation depuis un troisième
processus. Le vérificateur lie cette attestation au fichier de préparation exact.
Cela établit une connexion TCP vivante observée dans le noyau local, mais ni un hôte
distant ni l'indépendance du témoin.

La création d'un reçu de miroir exige désormais aussi cette attestation noyau, sa
clé publique et le fichier de préparation correspondant. Elle vérifie signature,
digest, PID et ports avant de signer le reçu, qui lie le digest de l'attestation et
l'identité du témoin réseau. Le rapprochement exige deux attestations et identités
de témoins distinctes ; leur partage du même noyau reste une dépendance déclarée.

Le témoin calcule aussi un HMAC de l'identifiant machine avec un sel de comparaison
fourni pour la campagne. Les reçus lient ce pseudonyme et le rapprochement expose
`distinctWitnessHostScopes`. Le même sel permet de détecter deux témoins sur le même
hôte sans publier l'identifiant brut ; un digest différent reste une revendication
signée de portée hôte, pas une attestation matérielle ou organisationnelle autonome.
Le digest du contexte de comparaison est lui aussi signé : deux pseudonymes ne sont
comparés que sous le même contexte. Deux sels différents sur un même hôte ne peuvent
donc pas fabriquer une séparation positive.

`freeze-host-comparison-context.mjs` fait maintenant cosigner avant mesure
l'identifiant de campagne, le digest du contexte et sa fenêtre de validité par deux
identités et clés distinctes. Le témoin refuse une clé commune, une cosignature
invalide, un sel non lié ou une mesure hors fenêtre, puis propage le digest du gel
jusqu'au reçu. Deux reçus ne sont rapprochables que sous le même gel cosigné.

Le gel est désormais enregistré sous verrou dans un registre intègre qui n'accepte
qu'un contexte par `campaignId`. Une seconde cosignature portant un autre sel pour
la même campagne est refusée : plusieurs gels valides ne peuvent plus être produits
localement puis sélectionnés après observation. Le registre reste lui-même soumis à
la limite de rollback local tant qu'il n'est pas ancré hors hôte.

`checkpoint-host-comparison-freeze-registry.mjs` signe maintenant le digest interne,
la génération, le cardinal et le prédécesseur de ce registre. Le témoin monotone
accepte ce nouveau schéma : restaurer localement un checkpoint antérieur ou ouvrir
une branche parallèle devient détectable. La conservation réellement hors hôte du
témoin et de son dernier reçu reste une condition externe.

L'ancre lie désormais aussi, dans son état et dans chaque reçu signé `v2`, le schéma
du checkpoint et le digest SPKI de la clé qui l'a signé. Après la genèse, un
checkpoint de génération supérieure signé par une autre clé — même correctement
chaîné au checkpoint précédent — échoue avec `anchor_authority_substitution`.
Cette contrainte ferme une substitution d'autorité auparavant possible en changeant
simplement l'argument de clé publique de l'ancre. Les anciens reçus `v1` ne sont pas
implicitement promus en `v2`.

`create-registry-authority-transition.mjs` fournit le chemin de rotation explicite :
l'ancienne et la nouvelle autorités cosignent le schéma conservé, leurs deux digests
de clé, le dernier reçu, le dernier checkpoint et la génération exacte d'effet.
L'ancre revérifie les deux signatures et toutes ces liaisons avant d'accepter la
nouvelle clé, puis inclut le digest de la transition dans son reçu. Une autorité
ancienne déjà compromise peut encore autoriser une rotation avec une nouvelle clé
qu'elle contrôle ; cette couche garantit la continuité consentie par les deux clés,
pas la légitimité organisationnelle de leurs détenteurs.

Pour la perte ou la compromission de l'ancienne clé,
`create-registry-recovery-policy.mjs` peut engager dès la genèse trois clés de
récupération et un seuil de deux. Le digest immuable de cette politique traverse
ensuite chaque état et reçu signé. `create-emergency-registry-authority-transition.mjs`
permet une rotation sans signature de l'ancienne autorité seulement si deux membres
préengagés et la nouvelle clé cosignent le dernier reçu, le dernier checkpoint, la
génération d'effet et le digest d'une preuve positive. Cette preuve, compilée par
`compile-registry-key-equivocation-evidence.mjs`, contient deux checkpoints différents
signés par l'ancienne clé pour les mêmes schéma, génération et prédécesseur. L'ancre
revérifie elle-même les deux signatures et la divergence : un simple digest opaque ou
un seul checkpoint ne suffit plus. Sans politique antérieure, quorum ou équivoque
cryptographique, la rotation est refusée. L'équivoque établit un comportement de clé
incompatible avec une chaîne unique ; elle ne distingue pas vol de clé, défaillance du
détenteur légitime ou signature volontairement fautive.

Le quorum de récupération ne peut plus transformer seul cette équivoque en rotation.
La politique préengage aussi deux clés de ratification, cryptographiquement distinctes
des trois clés de récupération. `ratify-emergency-registry-authority-transition.mjs`
leur fait cosigner le digest exact de la transition, de la preuve, du dernier reçu et
de la nouvelle clé ; l'ancre exige les deux signatures et conserve le digest de cette
ratification dans son reçu. Cela ajoute un veto indépendant au niveau des clés contre
la collusion du seul quorum 2-sur-3. L'indépendance organisationnelle réelle des cinq
détenteurs reste non établie par leurs seules clés.

`compile-recovery-control-registry.mjs` ajoute une barrière de contrôle avant la
genèse : les trois récupérateurs et les deux ratificateurs doivent déclarer cinq
contrôleurs et cinq domaines distincts, chacun corroboré par au moins deux racines
documentaires provenant de sources, contrôleurs et domaines différents. Aucun digest
documentaire ne peut être réutilisé entre profils. Le registre intègre est incorporé
à la politique et revérifié par l'ancre ; partager ensuite un contrôleur invalide donc
la politique au lieu de laisser cinq clés simuler cinq centres. Ces racines demeurent
des références déclarées : leur authenticité, leur exhaustivité et l'indépendance
matérielle des organisations ne sont pas établies par ce contrôle local.

Les racines ne sont plus de simples digests libres. Un registre de sources compilé
par `compile-control-evidence-source-registry.mjs` lie chaque source à une clé, un
contrôleur et un domaine. Chaque racine est une attestation signée produite par
`create-recovery-control-evidence-attestation.mjs`, liant le profil contrôlé, le
digest documentaire et une lignée amont déclarée complète. Le compilateur et l'ancre
revérifient signatures, correspondances de source et absence d'intersection entre
tous les digests documentaires et amont. Une signature altérée ou une dépendance
amont commune ne peut donc plus compter comme corroboration indépendante. Le registre
de sources reste préengagé localement : il authentifie les attestations relativement
aux clés inscrites, mais ne prouve pas que ces sources existent ou sont indépendantes
dans le monde.

Une épreuve de présence rend désormais cette limite directement testable.
`create-control-source-presence-challenge.mjs` engage un nonce frais, le registre de
sources et un contexte de comparaison ; chaque source répond avec sa propre clé via
`attest-control-evidence-source-presence.mjs` et un pseudonyme HMAC de son hôte.
`verify-control-evidence-source-presence.mjs` exige l'ensemble exact des sources, des
signatures et fenêtres valides, puis des portées d'hôte toutes distinctes. Dix clés
répondant depuis la même machine sont donc refusées au lieu d'être prises pour dix
présences. Un pseudonyme distinct prouve seulement une portée machine distincte sous
le contexte partagé : hébergement distant et indépendance organisationnelle restent
explicitement faux. Lorsqu'elle réussit, l'épreuve produit désormais un paquet
autonome contenant défi et attestations. `create-registry-recovery-policy.mjs`
refuse de produire la politique sans ce paquet, en revérifie l'ensemble exact, les
signatures, la fraîcheur au moment de la compilation et les portées distinctes, puis
l'incorpore par contenu et digest. L'ancre répète les contrôles cryptographiques à la
genèse : le résultat ne peut plus être omis ou remplacé après compilation sans
invalider la politique. La fraîcheur devient historique après l'ancrage ; elle atteste
une présence pendant la fenêtre du défi, pas une présence permanente.

`record-control-source-presence-evidence.mjs` transforme les réobservations en une
histoire monotone liée au registre de sources. Il revérifie chaque paquet, refuse un
digest ou nonce déjà vu et exige une date de défi strictement croissante avant le
remplacement atomique. `assess-control-source-presence-current.mjs` ne rapporte la
présence courante qu'après au moins deux fenêtres admises, avec toutes les portées
d'hôte et un âge maximal fourni par l'appelant. Même alors,
`continuousPresenceEstablished:false` reste explicite : deux observations fraîches
ne couvrent pas leurs intervalles. Le rollback conjoint de l'histoire locale et de
son consommateur reste encore possible sans checkpoint ancré.

`checkpoint-control-source-presence-history.mjs` applique maintenant à cet historique
un checkpoint signé et chaîné, admis par le témoin monotone sous un schéma propre.
`admit-control-source-presence-history.mjs` refuse de lire l'historique sans vérifier
ensemble son intégrité, le checkpoint, l'état courant de l'ancre et son reçu v2.
Restaurer l'historique de génération 1 face au checkpoint et à l'ancre de génération 2
échoue donc même si l'ancienne copie reste intrinsèquement valide. Cette résistance
reste locale tant que l'état de l'ancre n'est pas conservé et réobservé hors du même
domaine de défaillance (`offHostRetentionEstablished:false`).

La porte de lecture exige désormais aussi deux reçus de miroir signés portant sur
l'état d'ancre exact. Les réponses source, transcripts et attestations réseau doivent
être distincts ; identités, contrôleurs et domaines déclarés doivent différer ; les
deux témoins réseau doivent enfin présenter des pseudonymes d'hôte distincts sous le
même contexte et le même gel. Deux clés de miroir conservées sur la même machine ne
peuvent donc plus satisfaire l'admission. Même après succès,
`offHostRetentionEstablished:false` et `organizationalIndependenceEstablished:false`
demeurent : les pseudonymes et métadonnées signés sont des observables de protocole,
pas une preuve externe de propriété ou d'administration indépendante.

Les identités de miroir ne reposent plus uniquement sur les champs de leurs reçus.
La porte exige pour chacune un justificatif d'autorité signé, lié à sa clé, son
contrôleur, son domaine et sa fenêtre, ainsi qu'un état courant signé par l'émetteur.
Deux émetteurs et deux clés d'émission distincts sont requis ; une expiration ou la
présence du digest du justificatif dans la liste de révocation bloque immédiatement
l'admission. Cela rend les revendications attribuables et révocables au niveau des
artefacts. Une autorité d'émission peut encore certifier mensongèrement un contrôleur
ou domaine ; la couche suivante impose donc une seconde autorité par miroir.

`compile-mirror-authority-corroboration.mjs` exige maintenant deux justificatifs par
miroir, émis sous deux identités et clés d'autorité distinctes, chacun accompagné de
son état de révocation courant. Le paquet lie les deux validations au même identifiant,
à la même clé de miroir, au même contrôleur et au même domaine ; la porte de lecture
revérifie le paquet et exige en outre quatre émetteurs disjoints pour les deux miroirs.
Dupliquer un émetteur pour créer un faux quorum, ou révoquer l'un des deux justificatifs,
fait échouer l'admission. Cela corrobore les qualifications relativement aux quatre
autorités inscrites, sans établir leur indépendance organisationnelle réelle.

La disjonction inter-miroirs porte maintenant aussi sur les quatre digests SPKI des
émetteurs, pas seulement sur leurs identifiants textuels. Réutiliser la même clé sous
deux noms d'autorité différents ne peut donc plus satisfaire le quorum global. Ce
correctif ferme une identité cryptographique commune ; il ne suffit toujours pas à
séparer deux clés distinctes détenues par la même organisation.

`verify-mirror-issuer-control.mjs` et la porte de lecture évaluent donc aussi les
quatre émetteurs sur propriétaire effectif, opérateur de clé, financeur décisif et
détenteur de veto. Chaque dimension doit correspondre à deux racines de corroboration
et ne porter aucune contestation ouverte. Le partage d'une seule dimension fusionne
les profils concernés ; l'admission exige exactement quatre centres effectifs. Une
simulation avec quatre clés mais un propriétaire commun tombe ainsi de quatre à trois
centres et est refusée. Les racines sont désormais des attestations signées par des
sources inscrites au registre : elles lient l'émetteur, la dimension, la valeur, le
document et sa lignée complète. La porte revérifie aussi le digest SPKI de chaque clé
de source et refuse tout digest documentaire ou amont partagé. Le registre et ces
documents restent toutefois des artefacts locaux : `realWorldIndependenceEstablished:false`
reste la conclusion obligatoire tant que leur origine externe n'est pas démontrée.

Le registre de ces sources est maintenant assorti d'un historique de statuts signé.
Chaque génération lie le digest exact du registre et le statut précédent ; l'ensemble
des clés révoquées ne peut que croître. Une racine pourtant correctement signée est
donc refusée dès que sa clé apparaît dans le dernier statut. Cette chaîne empêche le
retrait silencieux d'une révocation dans l'artefact, sans établir que l'autorité de
statut a reçu une autorisation externe réelle.

Le digest SPKI de cette autorité est désormais figé dans le registre de sources et
participe à son `stateDigest`. Le producteur comme le vérificateur refusent une clé de
statut différente : remplacer simultanément la clé et reconstruire l'historique ne
suffit plus sans remplacer aussi le registre déjà lié aux attestations et checkpoints.

Une rotation ordinaire peut maintenant préserver ce point d'ancrage : une transition
lie le registre, les digests des deux clés et sa génération d'effet, puis exige les
signatures de l'ancienne et de la nouvelle autorité. L'historique choisit la clé selon
la génération et refuse une transition unilatérale ou appliquée au mauvais seuil.

`detect-source-status-authority-equivocation.mjs` compare deux transitions cosignées
issues du même registre, de la même ancienne clé et de la même génération. Si elles
désignent deux successeurs différents, il produit les digests des deux preuves et
qualifie l'équivocation ; deux rotations à des seuils différents ne sont pas confondues
avec cette branche concurrente.

La vérification accepte maintenant une chaîne ordonnée de transitions et un trousseau
de successeurs correspondant. Chaque maillon doit partir de la clé obtenue au maillon
précédent et prendre effet à une génération strictement croissante ; les statuts sont
ensuite vérifiés avec la clé effectivement active à leur génération. Supprimer,
permuter ou greffer un maillon rompt donc la continuité cryptographique.

La porte d'admission consomme désormais aussi un inventaire de paires concurrentes.
Elle revérifie les transitions et leurs clés, suspend automatiquement l'autorité dès
qu'une équivocation est établie, expose les deux digests probants et refuse alors les
racines concernées même si leur statut et leur signature resteraient valides isolément.

Les digests des transitions équivoques font maintenant partie du statut signé et sont
monotones comme les révocations. Une génération ultérieure ne peut donc ni les omettre
ni lever implicitement la suspension ; la porte exige aussi que chaque équivocation
présentée figure dans cet inventaire durable. La reprise nécessite ainsi un artefact
de résolution distinct, encore à définir, plutôt qu'un simple statut « propre ».

`verify-source-status-authority-resolution.mjs` définit maintenant cet artefact de
résolution : il doit couvrir exactement tous les digests d'incident encore connus,
désigner une nouvelle clé et une génération future, réunir le seuil de récupération
précommis ainsi que tous les ratificateurs, et porter leurs signatures sur un contenu
identique. L'artefact est vérifiable mais ne lève pas encore seul la porte : ce choix
évite de confondre une résolution valide avec son application effective.

Le vérificateur ne prend plus le quorum de récupération au mot : il recalcule l'état
du registre de contrôle, exige son lien au registre de sources exact, vérifie le digest
du policy, les cinq clés SPKI, leurs rôles et leur présence dans les profils de contrôle.
Un attaquant ne peut donc plus joindre une politique ad hoc et la faire signer par ses
propres clés pour fabriquer une résolution apparemment conforme.

`verify-recovery-policy-transition.mjs` rend remplaçable une clé de récupération
compromise sans autoriser une réécriture globale du quorum. Il exige exactement un
acteur remplacé à rôle constant, conserve les quatre autres clés, lie une preuve de
compromission et une génération d'effet, puis requiert l'ancien seuil, tous les
ratificateurs et une preuve de possession de la nouvelle clé sur le même contenu.

`select-active-recovery-policy.mjs` compile ces remplacements en une histoire ordonnée
et choisit la politique applicable à la génération du dernier statut suspendu. Chaque
maillon est revérifié contre la politique précédente ; un saut, un ordre inversé ou
une politique future utilisée trop tôt invalide la sélection. La porte de reprise
emploie cette politique calculée plutôt que celle simplement jointe au paquet.

`detect-recovery-policy-equivocation.mjs` traite le cas de deux remplacements valides
du même membre, issus de la même politique et au même seuil, mais menant à deux clés
ou politiques différentes. La porte revérifie ces branches, expose leurs digests et
interdit leur emploi pour une reprise tant que la concurrence subsiste.

Ces deux digests de branche sont désormais inscrits dans un inventaire séparé du
statut de sources, signé et monotone. Toute équivocation présentée doit y figurer et
toute équivocation déjà inscrite maintient la suspension ; un statut ultérieur ne peut
donc effacer l'incident ni le faire passer pour une simple absence de paquet concurrent.

`verify-recovery-policy-equivocation-resolution.mjs` permet de trancher sans effacer
les branches : la résolution couvre l'inventaire complet, choisit explicitement l'un
des deux digests et sa politique, puis exige le seuil des membres non contestés, tous
les ratificateurs et la preuve de possession du successeur retenu. Le membre remplacé
ne peut donc participer à la décision sur sa propre branche concurrente.

La porte de reprise applique maintenant cette résolution sans supprimer le paquet
concurrent : elle revérifie les deux branches et la décision, prend la politique
sélectionnée comme nouvelle racine, puis n'accepte que les transitions ultérieures
chaînées depuis celle-ci. Les digests d'incident restent dans le statut ; seule leur
résolution prouvée cesse de bloquer l'usage de la politique retenue.

Le digest de cette résolution doit apparaître pour la première fois dans le premier
statut de reprise, puis rester dans l'historique monotone. S'il figurait déjà dans le
dernier statut suspendu, la porte le classe comme rejeu et ne l'applique pas à une
seconde reprise ou à une autre génération.

Chaque application inscrit en plus un enregistrement qui lie le digest de résolution,
le digest de l'ensemble d'incidents, la politique retenue et la génération unique.
Deux résolutions différentes visant le même ensemble d'incidents, ou la même résolution
réannoncée à une autre génération, entrent ainsi en collision et restent bloquées.

La porte exige maintenant un effet observable de la politique retenue : le premier
statut doit être postérieur au seuil de résolution, coïncider avec la génération de
récupération, et la résolution d'autorité doit référencer exactement le digest de la
politique sélectionnée. Une décision enregistrée sans statut produit sous son autorité
reste donc suspendue.

La politique précommet aussi deux bornes temporelles : une heure au plus pour activer
la résolution et cinq minutes supplémentaires pour produire le premier statut. Ces
échéances et l'instant de résolution sont couverts par le quorum ; le reçu doit tomber
dans la première fenêtre et le statut dans la seconde. Une autorisation expirée ne
peut donc pas être réanimée tardivement comme si la reprise avait été continue.

Les deux ratificateurs fournissent désormais aussi des observations temporelles
signées, liées à la résolution et au premier statut. Les deux mesures doivent tomber
dans les fenêtres précommises et diverger de moins de trente secondes. La porte ne se
fie donc plus à la seule horloge déclarée par l'autorité récupérée ; cela reste une
indépendance organisationnelle alléguée tant que les témoins ne sont pas externes.

Ces témoins temporels ne sont plus les ratificateurs. La politique en choisit deux
parmi les sources enregistrées et rejette tout chevauchement de contrôleur ou domaine
avec les cinq acteurs de récupération, ainsi que tout chevauchement entre témoins.
Une même organisation ne peut donc plus autoriser la reprise et fournir ses deux
preuves de ponctualité dans le modèle admis.

Les observations temporelles doivent maintenant référencer un paquet de présence
récent des mêmes deux sources. La porte revérifie le challenge, le registre exact,
les signatures, la fenêtre et deux pseudonymes d'hôte distincts ; l'instant
d'activation doit encore tomber avant l'expiration du challenge. Une ancienne clé
disponible hors ligne ne suffit donc plus à fabriquer rétrospectivement la ponctualité.

Le registre précommet désormais, pour chaque source, un identifiant d'opérateur réseau
et un domaine de défaillance réseau. Ces deux attributs sont inclus dans l'attestation
de présence signée, et les témoins temporels doivent différer sur les deux axes. Deux
hôtes distincts derrière le même opérateur déclaré ne satisfont donc plus la porte.
Cette barrière ne prouve toutefois ni l'ASN observé ni l'indépendance réelle : les
attributs restent des déclarations enregistrées jusqu'à corroboration topologique externe.

`verify-network-separation-evidence.mjs` fournit maintenant ce discriminant sans
interroger lui-même le réseau : pour chacune des deux sources, il exige deux observations
d'origine ASN signées, fraîches et concordantes, produites par des observateurs épinglés
dont les contrôleurs sont tous distincts. La paire est refusée si les ASN observés
coïncident, même lorsque les étiquettes déclarées diffèrent. Les empreintes de route sont
conservées comme traces, mais l'ASN distinct ne suffit toujours pas à établir des
opérateurs économiques indépendants. Cet artefact est vérifiable séparément ; son
admission est maintenant obligatoire dans la porte temporelle. La politique de
récupération épingle le registre des observateurs et son digest ; substituer des
observateurs après coup ou omettre les quatre observations maintient la suspension.
À la création puis à la résolution, chaque clé publique est parsée et comparée à son
digest épinglé. Identifiants, clés, contrôleurs et domaines de défaillance doivent être
uniques, et aucun contrôleur ou domaine ne peut recouper ceux des cinq acteurs de
récupération ni des deux témoins temporels.
Le registre épingle également l'opérateur réseau et le domaine de défaillance réseau
de chaque observateur. Ces deux ensembles doivent être sans doublon : multiplier les
clés ou les organisations sur une même infrastructure amont déclarée ne produit plus
de corroboration admissible. Comme pour les sources, ces attributs restent déclaratifs
et ne prouvent pas à eux seuls la topologie réelle.
Les observations signent désormais la séquence d'ASN et son empreinte recalculée.
La politique initiale fixe `maxSharedTransitAsns` à zéro : tout ASN de transit vu sur
les chemins des deux sources est exposé dans `sharedTransitAsns` et bloque la reprise.
Ce seuil strict privilégie la détection d'une dépendance commune ; il peut produire un
refus conservateur lorsque l'Internet observable impose légitimement un transit partagé.
Un hop n'est désormais qualifié de transit commun que s'il apparaît dans les deux vues
signées de chaque source. Les hops vus par un seul observateur sont publiés par source
dans `disputedTransitAsnsBySource`, avec une concordance en points de base. La politique
préengage un minimum de 5 000 points : une petite divergence de mesure reste visible
sans créer seule un faux transit commun, mais des vues trop incompatibles bloquent la
reprise comme preuve indéterminée.
Une seule fenêtre ne suffit plus : les deux observateurs doivent couvrir chaque source
dans deux rondes distinctes, soit huit observations signées, séparées d'au moins une
minute. Un transit n'est confirmé que s'il persiste dans les quatre vues de sa source.
Une seconde ronde trop proche, absente ou incomplète invalide donc la preuve au lieu
d'étendre indûment une photographie ponctuelle dans le temps.
Chaque ronde doit maintenant porter un digest de nonce de déclenchement commun à ses
quatre observations et différent de l'autre ronde. Chaque observateur emploie en outre
une session longue distincte par ronde, commune seulement aux deux sources mesurées dans
cette ronde. Les huit signatures couvrent ces identifiants : renommer ou recopier une
même session sous deux rondes invalide donc la preuve.
Le registre épingle maintenant une autorité de déclenchement dont clé, contrôleur et
domaine sont disjoints des observateurs, témoins et acteurs de récupération. Pour chaque
ronde, elle signe avant mesure le digest du nonce, la fenêtre, le registre et le défi.
Toutes les observations de la ronde doivent tomber dans cette fenêtre et reprendre ce
digest : un nonce choisi ou signé après les mesures n'est plus admissible.
`test-network-separation-evidence.mjs` réobserve ce point : un paquet complet valide
est admis, tandis qu'une signature empruntée à l'autre ronde et un déclenchement daté
après sa première observation rendent `priorSignedRoundTriggers` faux.
L'autorité ne choisit plus seule le nonce. Avant chaque déclenchement, les deux
observateurs révèlent chacun 256 bits signés et liés au défi, au registre et à la ronde.
Le nonce est le digest canonique des deux contributions triées ; la porte le recalcule
et exige que les révélations précèdent le déclenchement. Un observateur honnête suffit
donc à empêcher l'autorité seule de préfabriquer le nonce, sans prétendre résister à la
collusion des trois acteurs.
Les contributions suivent maintenant un engagement-révélation. Chaque observateur signe
d'abord le digest de son secret ; les deux engagements doivent exister avant la première
révélation. Celle-ci référence l'enregistrement signé exact et doit ouvrir son digest.
Un observateur ne peut donc plus choisir sa contribution après avoir vu celle de l'autre,
sauf collusion ou rupture des primitives cryptographiques admises.
`record-network-separation-evidence.mjs` maintient désormais un historique monotone lié
au registre. Avant admission, il refuse tout digest de défi, engagement signé ou secret
déjà présent dans une génération antérieure, puis scelle les quatre catégories de clés
de rejeu avec le digest du paquet. Une preuve valide isolément ne peut donc plus être
recyclée dans une récupération ultérieure enregistrée par cette porte.
La porte temporelle exige maintenant cet historique dans le paquet de preuve. Elle
revérifie son digest d'état, l'égalité génération-nombre d'enregistrements, l'unicité
globale des défis, engagements et secrets, puis impose que le dernier enregistrement
désigne exactement la preuve réseau courante. Un historique omis, ancien ou réécrit
maintient donc la suspension finale.
La génération courante doit en outre être cosignée par les deux témoins temporels via
`sign-network-separation-history-anchor.mjs`. Chaque signature lie le digest du fichier
d'historique, sa génération, le paquet réseau, le défi et un instant compris entre
l'admission locale et l'expiration du défi. La porte finale refuse une ancienne copie
qui ne possède pas les deux ancrages correspondant exactement à son dernier état.
`record-network-history-anchors.mjs` inscrit ces signatures dans un registre monotone.
Pour un même témoin et une même génération d'historique, un second digest constitue une
équivocation et est refusé. La porte finale exige que ses deux ancrages soient présents
dans un registre intègre et sans paire conflictuelle ; deux branches cosignées ne peuvent
donc plus être traitées silencieusement comme une reprise unique.
Enfin, les deux témoins doivent signer le même digest et la même génération du registre
d'ancrages avec `sign-network-history-anchor-ledger.mjs`. La porte exige les deux reçus
et revérifie leurs clés : une branche locale visible à un seul témoin ne converge plus.
Cette corroboration déplace la résistance à une bifurcation vers la non-collusion des
deux témoins ; elle ne constitue pas un consensus public ou byzantin général.
La politique borne maintenant à trente secondes le délai entre le dernier ancrage
d'historique et le dernier reçu de convergence, et réutilise la borne de désaccord des
horloges entre reçus. Des reçus antérieurs aux ancrages, trop tardifs ou temporellement
incompatibles ne peuvent plus accompagner une récupération différée.
Chaque observation temporelle d'activation lie désormais le digest et l'horodatage du
reçu de convergence émis par le même témoin. L'activation observée doit lui être
postérieure de moins de trente secondes. La ponctualité du reçu n'est donc plus une
déclaration isolée : elle appartient au même objet signé que la mesure d'activation.
`attest-recovery-time-observation.mjs` produit maintenant cet objet canonique depuis la
résolution, le premier statut, la présence et le reçu exacts. Il refuse avant signature
un reçu d'un autre témoin, des temps non entiers, une activation antérieure au reçu ou
hors fenêtre de résolution, et un premier statut antérieur à l'activation ou hors délai.
Il charge aussi la politique et compare le digest de la clé publique dérivée de la clé
privée au `keyDigest` du témoin : une clé valide mais non épinglée est refusée avant
production de l'artefact.
Le reçu est lui-même revérifié avant usage avec la clé publique épinglée du témoin et le
corps canonique de `cct-network-history-anchor-ledger-receipt/v1`. Un simple identifiant
de témoin accompagné d'un horodatage fabriqué ne peut donc plus être ressigné comme une
observation temporelle apparemment cohérente.
Le producteur charge aussi le registre d'ancrages : il revérifie son digest d'état et
sa génération, puis exige que le reçu lie exactement ce fichier, cette génération et
le `sourceRegistryDigest` engagé par la politique. Un reçu authentique visant un autre
état ou une autre lignée ne peut plus servir de base à l'observation.
Le fichier de politique est désormais lié à la résolution : le producteur recalcule son
digest textuel exact et exige `resolution.recoveryPolicyDigest`. Une ancienne politique,
même munie de la même clé de témoin et encore valide cryptographiquement, est refusée si
elle n'est pas celle sélectionnée par cette résolution.
La résolution signe maintenant aussi `previousStatusDigest`. Le producteur exige le
fichier de statut suspendu et compare son digest exact avant toute mesure. Une ancienne
résolution cohérente avec une ancienne politique ne peut donc pas être réutilisée contre
un statut suspendu plus récent sans faire échouer cette liaison.
`previous-status-chain.mjs` vérifie maintenant que ce statut est exactement le dernier
maillon d'une chaîne signée valide, après les rotations d'autorité fournies, et que son
registre est celui engagé par la politique. Il exige aussi au moins un incident non
résolu. Cela établit un état terminal authentique justifiant la suspension logique, pas
encore l'effet matériel d'une commande de suspension.
`previous-status-suspension-effect.mjs` relie maintenant ce statut à la porte 10.24 :
la chaîne ordonnée autorisation–réception–désactivation–tentative bloquée doit être
établie, puis chaque chemin de l'inventaire gelé doit disposer d'une sonde bloquée liée
à sa trace. La conclusion reste bornée aux chemins inventoriés ; l'exhaustivité de tous
les chemins possibles demeure explicitement non établie.
Cette liaison consomme maintenant aussi les couches 10.25 et 10.26 : l'inventaire doit
être identique aux découvertes issues du graphe de configuration et du balayage runtime,
avec racines distinctes, puis ces deux canaux doivent avoir détecté des chemins sentinelles
injectés à l'aveugle avant le gel. Un chemin découvert par un canal mais omis de
l'inventaire invalide la suspension, sans prétendre que deux canaux couvrent tout chemin
inconnu possible.
Deux nouveaux rapports doivent maintenant être produits après la dernière sonde de
blocage, par des racines distinctes entre elles et distinctes des scanners pré-gel.
Ils doivent retrouver exactement l'inventaire gelé dans les deux canaux. Un chemin créé
ou rendu visible tardivement bloque donc le producteur. Cette réobservation reste bornée
aux deux méthodes déclarées et ne prouve pas l'absence absolue de voie cachée.
Les rapports post-gel sont désormais signés par les clés du registre d'observateurs
réseau déjà épinglé dans la politique. Chaque signature couvre le canal, le scanner,
le statut précédent, l'empreinte de l'inventaire, les chemins et l'instant. Modifier
une liste ou fabriquer un scanner hors politique invalide donc la réobservation.
Les scanners disposent maintenant d'un registre distinct de celui des observateurs
réseau. À la création de politique, leurs clés, contrôleurs et domaines doivent être
distincts entre eux et ne recouper ni observateurs, ni témoins, ni acteurs de récupération.
La preuve topologique et la découverte des chemins ne reposent donc plus par construction
sur les mêmes clés ou centres déclarés.
Le registre exige aussi des opérateurs réseau et fournisseurs d'hébergement distincts
pour les deux scanners, sans recoupement avec ceux des observateurs réseau. Une séparation
de clés et de contrôleurs ne masque donc plus, dans le modèle déclaré, une infrastructure
amont commune. Ces identités restent à corroborer extérieurement.
La suite exécute maintenant réellement ce producteur avec des fichiers temporaires :
elle revérifie la signature de la sortie puis exige l'échec avec un autre témoin et avec
une activation antérieure au reçu.

`verify-source-status-authority-recovery-activation.mjs` sépare maintenant trois
états : résolution valide, activation signée par la clé sélectionnée, puis premier
statut post-récupération signé à la génération prévue. Ce premier statut doit chaîner
le dernier statut suspendu et conserver révocations et incidents ; une résolution
seule, un reçu sans statut, ou un statut qui réécrit le passé ne rétablit donc rien.

Les portes principales consomment maintenant cet artefact d'activation. Elles ne
relèvent la suspension que si un unique paquet de récupération est valide et si son
premier statut est exactement le statut courant de la chaîne. Réutiliser un ancien
paquet après avancement ou présenter deux récupérations concurrentes maintient la
suspension ; la reprise vérifiée est donc distincte d'une simple résolution signée.

Après cette première observation, la porte accepte maintenant les statuts ultérieurs
signés par la clé récupérée. Elle retrouve le statut d'activation dans l'historique,
revérifie que son prédécesseur est exactement le dernier état suspendu, puis contrôle
chaque maillon postérieur et la croissance monotone des incidents et révocations.
L'ancien paquet n'est donc ni rejoué sur une autre branche ni limité au seul instant
de reprise.

La continuation post-récupération accepte aussi des rotations ordinaires explicitement
enracinées dans la clé sélectionnée par la résolution. Chaque transition est cosignée,
strictement postérieure à l'activation et chaînée au successeur précédent ; une rotation
qui repart de l'ancienne branche compromise ou anticipe la reprise est refusée.

Réobservation locale : deux racines signées avec documents et lignées disjoints
ont été admises. En conservant sources, contrôleurs, domaines et signatures
distincts mais en faisant référencer le même digest amont, l'admission a été
refusée et le digest commun a été exposé dans `sharedLineageDigests`.

Réobservation locale : deux profils complets, chacun corroboré sur les quatre
dimensions, ont produit deux centres effectifs et ont été admis. Le partage du
seul `effectiveOwnerId`, tout en maintenant toutes les corroborations valides,
a fusionné les deux profils en un centre et bloqué l'admission. Le discriminant
porte donc sur le contrôle effectif décrit, pas sur le nombre de clés.

Réobservation locale : deux détenteurs enregistrés avec clés, contrôleurs et
domaines distincts ont été admis. L'ajout d'un reçu après scellement a rendu
`exactInventory` faux. Deux clés et identités distinctes déclarées sous le même
contrôleur et le même domaine ont été refusées malgré des signatures et contenus
valides (`distinctControllers:false`, `distinctFailureDomains:false`).

Comme l'état monotone est rendu autoritatif avant l'export de l'accusé, une panne
entre ces deux remplacements peut laisser un ancrage avancé sans fichier d'accusé.
`recover-anchor-receipt.mjs` reconstruit cet export depuis l'accusé inclus dans
l'état, mais seulement après vérification de ses liaisons, de son digest et de sa
signature avec la clé publique d'ancrage. Un état altéré ne peut donc pas servir
de source de récupération.

Les remplacements du registre, du checkpoint, de l'état d'ancrage et des accusés
passent par `atomic-replace.mjs` : fichier temporaire à nom non réutilisable,
écriture et `fsync`, renommage atomique, puis `fsync` du répertoire. La garantie
vise la visibilité et la durabilité sur un système de fichiers local compatible ;
elle ne prouve pas les mêmes propriétés sur NFS, stockage objet ou matériel qui
n'honore pas effectivement `fsync`.

Les deux écritures verrouillées inscrivent désormais dans le verrou le PID, le
boot-ID Linux et l'instant de démarrage du processus. `recover-stale-lock.mjs`
ne retire un verrou abandonné que sur le même démarrage d'hôte et après avoir
exclu un processus vivant portant le même PID et le même instant de démarrage.
Il refuse les anciens verrous sans identité vérifiable et les verrous d'un autre
boot, qui exigent une décision externe plutôt qu'une suppression conjecturale.

Retirer la couche si un nonce rejoué, une identité commune, une signature invalide ou un contenu altéré est accepté.

Les observateurs réseau et les scanners post-gel doivent aussi déclarer des
opérateurs réseau et fournisseurs d'hébergement distincts entre pairs. Les
scanners sont refusés si l'une de ces identités recoupe celle d'un observateur
réseau. Ce contrôle ferme une colocalisation déclarée qui pouvait laisser une
panne ou une administration d'infrastructure unique fabriquer simultanément la
preuve de séparation et la preuve de suspension. Ces identités restent toutefois
des déclarations épinglées : elles ne constituent pas une preuve externe de la
topologie, de la propriété effective ou de l'absence de sous-traitant commun.

L'admission de la preuve réseau exige maintenant, pour chaque observateur, deux
attestations fraîches et signées de son opérateur réseau et de son hébergeur.
Les deux attesteurs ont des clés, contrôleurs et domaines distincts entre eux et
des observateurs ; toute divergence avec le registre ou substitution de contenu
invalide `infrastructureCorroboration`. Cela fournit une corroboration tierce
contestable, mais pas encore une preuve matérielle : l'autorité réelle des
attesteurs et l'exhaustivité des dépendances amont restent à établir hors du corpus.

La même barrière couvre désormais les scanners post-gel : chacun doit être
corroboré par deux attesteurs d'infrastructure distincts, séparés des scanners,
sur l'opérateur, l'hébergeur et le statut antérieur précis. Une attestation
altérée bloque la preuve d'effet de suspension. L'autorité réelle des attesteurs
demeure explicitement non établie.

Les registres d'attesteurs portent aussi un `effectiveOwnerId`. Deux attesteurs
ayant le même propriétaire effectif, ou un propriétaire commun avec l'acteur
qu'ils corroborent, ne comptent plus comme deux racines indépendantes. Cette
barrière traite le contrôle indirect déclaré ; elle ne transforme pas la
déclaration de propriété en fait établi.

Cette contrainte vaut aussi pour les acteurs corroborés eux-mêmes : observateurs
et scanners sans propriétaire effectif explicite, avec propriétaire dupliqué
entre pairs, ou partagé entre ces deux fonctions sont refusés dès la construction
de politique ou la vérification de preuve.

Pour les scanners et leurs attesteurs, chaque propriétaire effectif doit en plus
signer un mandat liant l'acteur, sa clé et une fenêtre de validité. Un mandat
expiré, révoqué, altéré ou signé par une autre clé bloque désormais la preuve
d'effet, même après recalcul du digest du registre. La signature authentifie la
déclaration du propriétaire enregistré, pas son identité juridique réelle.

Les observateurs réseau et leurs attesteurs sont maintenant soumis au même
mandat signé, temporel et révocable. Leur preuve topologique n'est donc plus
admissible avec une simple chaîne `effectiveOwnerId`, et la révocation d'un seul
mandat suffit à fermer la porte concernée.

Les révocations de propriété réseau sont désormais une histoire ordonnée à état
haché : générations contiguës, lien au digest précédent et ensemble révoqué
seulement croissant. Le défi signé indirectement par les déclencheurs de mesure
épingle le digest courant ; rejouer une histoire antérieure ou ajouter une
révocation sans renouveler le défi invalide `currentOwnershipRevocations`.

Pour les scanners, le digest de cette histoire est maintenant inclus dans le
statut antérieur signé. Une politique présentant une génération de révocation
plus récente que celle épinglée par ce statut est refusée, même si sa propre
structure et son digest ont été recalculés. Le changement exige donc un nouveau
statut authentique plutôt qu'une substitution locale de registre.

L'histoire distingue maintenant les acteurs historiques connus des acteurs
actuellement admis. Un acteur révoqué reste dans `knownActorIds` et dans la chaîne,
mais ne peut plus réapparaître comme acteur courant ; son remplaçant doit être
connu, non révoqué et satisfaire à nouveau toutes les preuves de clé, propriété
et infrastructure. Cela rend le remplacement possible sans effacer la révocation.

L'inventaire des acteurs connus appartient désormais à chaque état haché de la
chaîne, et ne peut que croître. L'ajout d'un remplaçant modifie donc le digest
épinglé par le défi réseau ou le statut antérieur signé ; modifier seulement le
champ terminal `knownActorIds` n'autorise plus silencieusement un nouvel acteur.
Après la genèse, tout nouvel identifiant d'acteur doit recevoir deux
autorisations signées liées au digest exact de sa génération d'entrée. Les
autorités doivent avoir clés, contrôleurs, domaines et propriétaires effectifs
distincts ; le nouveau propriétaire ne peut donc pas s'inscrire seul.

Les autorités d'entrée doivent également être disjointes des acteurs courants
par clé, contrôleur, domaine de défaillance et propriétaire effectif. Un quorum
formel dont une branche est contrôlée par le remplaçant ne satisfait donc plus
la transition, même avec deux signatures cryptographiquement valides.

Le quorum d'entrée doit désormais exister dès la genèse, avec ses clés et
séparations déjà incluses dans l'histoire épinglée. Il n'est plus possible de
laisser ce rôle vide puis de choisir librement les premières autorités au moment
d'ajouter un acteur. La rotation reste volontairement fermée tant qu'une
transition cosignée entre ancien et nouveau quorum n'est pas définie.

Un vérificateur de rotation est maintenant disponible : il exige les deux
signatures de l'ancien quorum et les deux du nouveau, lie les deux digests de
jeu, l'état historique précédent et la génération effective suivante, et impose
quatre racines séparées. Une rotation unilatérale ou rejouée à une génération
ultérieure est refusée. Son insertion atomique dans l'histoire reste à relier.

Le cas de capture est vérifié après reconstruction complète de la chaîne : les
digests des deux générations et les deux autorisations sont recalculés et
resignés avec les clés valides, puis l'admission reste refusée à cause du seul
propriétaire effectif partagé. Le refus n'est donc pas un artefact d'une signature
périmée ou d'un digest incohérent.
La rotation cosignée est désormais consommée par la chaîne : les générations
antérieures engagent l'ancien quorum, celles à partir de l'effet engagent le
nouveau, et l'état historique précédent doit correspondre exactement au digest
cosigné. Sans transition valide, l'invariance du quorum reste la règle.
Un vérificateur de séquence couvre maintenant plusieurs rotations : les jeux
d'autorités doivent former une chaîne adjacente, les générations effectives être
strictement croissantes, chaque transition viser son état antérieur annoncé et
aucun artefact de transition ne peut être réutilisé. L'histoire principale ne
consomme encore qu'une transition et constitue la prochaine intégration.
L'histoire autoritative accepte maintenant `entryAuthoritySets` et
`entryAuthorityRotations` : elle valide la séquence complète puis sélectionne le
jeu actif pour chaque génération, y compris pour signer les admissions d'acteurs.
Les champs d'une rotation unique restent compatibles, mais ne contournent pas
les contrôles de continuité et d'état causal.
La frontière d'effet est maintenant exercée avec de vraies admissions : un
acteur ajouté exactement à la génération de rotation doit être signé par le
nouveau quorum. Deux signatures encore valides de l'ancien quorum sont refusées,
même si elles visent le bon acteur, la bonne génération et le bon état.
Chaque rotation révoque désormais explicitement les deux membres sortants dans
un ensemble monotone distinct. Le jeu entrant doit rester non révoqué. Un quorum
ne peut donc pas cosigner sa succession puis redevenir actif dans une rotation
ultérieure, et la révocation fait partie de l'état haché de la génération.
Le retrait monotone est maintenant exercé contre une réactivation complète :
une troisième transition C→A portant les quatre bonnes signatures et la bonne
génération est valide isolément, mais la chaîne la refuse parce que A figure déjà
parmi les autorités révoquées. La non-réactivation est donc un discriminant de
l'histoire, pas une conséquence accidentelle de la cryptographie de transition.
Toutes les autorités historiques, et pas seulement le quorum courant, sont
maintenant comparées aux acteurs admis. Une ancienne autorité partageant le
propriétaire, le contrôleur, le domaine ou la clé d'un acteur courant invalide
donc l'histoire entière, même après une rotation correctement cosignée.
En l'absence de rotation, l'histoire doit maintenant contenir exactement un seul
jeu d'autorités, identique à `entryAuthorities`. Un second jeu « fantôme » ne
peut plus influencer la sélection générationnelle ou diverger silencieusement
du quorum courant sans transition cosignée correspondante.

## Consolidation fermée contre CCT-EXEC 1.4

La consolidation du 9 septembre 2026 conserve les douze invariants exécutables
et structurels inventoriés dans `migration.json`. Aucun invariant 1.4 n'est
remplacé ou retiré. La validation cumulative relance les dix tests 1.4, sa
recherche finie, son vérificateur de gel, les tests principaux et réseau 10.35,
ainsi que la confrontation adverse déjà disponible.

Le gel 10.35 engage exhaustivement les fichiers de ce dossier, le gel 1.4 et un
digest arborescent des 716 fichiers des candidates intermédiaires. Le rapport
cumulatif lie les résultats aux empreintes exactes de la référence 1.4, du
paquet 10.35 testé et de cette lignée intermédiaire.

Le verdict `promotion_candidate` signifie seulement que ce paquet local fermé
peut être soumis à une décision de promotion distincte. Il ne vaut ni promotion,
ni autorisation, ni déploiement, ni séparation d'hôte, ni indépendance externe.
Le statut d'indépendance demeure `independence_unknown`.
