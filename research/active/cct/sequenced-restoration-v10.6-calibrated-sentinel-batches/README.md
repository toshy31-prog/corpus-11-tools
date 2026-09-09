# CCT-EXEC 10.6 — calibration et lots sentinelles

Cette candidate remplace le seuil nu de 10.5 par une convention préengagée : modèle nul Bernoulli(1/2), 32 bits, seuil 28, quatre lots, deux artefacts et correction de Bonferroni sur huit comparaisons. La queue binomiale exacte vaut `41449 / 4294967296`; la borne familiale vaut `331592 / 4294967296`, donc reste inférieure à l’alpha préengagé de `1/1000` sous ce modèle nul.

Deux auditeurs indépendants doivent signer les quatre résumés concordants. Les identifiants, digests d’entrées et digests de défis doivent être uniques ; un lot répété ne compte pas comme réplication et tout franchissement du seuil retire la conclusion.

Cette probabilité est conditionnelle, pas une confiance générale dans le CCT : elle suppose des bits équitables et des lots statistiquement indépendants, que l’unicité cryptographique ne suffit pas à établir. Elle ne mesure pas non plus la puissance contre une adaptation partielle ou sur cible proxy.
