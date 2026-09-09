# CCT-EXEC 10.7 — aléa sentinelle conjoint

Cette candidate remplace le générateur unique implicite par une cérémonie engagement–révélation. Deux contributeurs de domaines distincts engagent leurs graines avant les prédictions, les révèlent après leur engagement, puis les bits-cibles sont dérivés par XOR avant le défi. Une révélation précoce, une graine ne correspondant pas à son engagement, un quorum insuffisant ou des cibles non dérivables retire la conclusion.

Le gain est conditionnel : si au moins une contribution demeure imprévisible jusqu’à sa révélation, aucun contributeur isolé ne choisit les bits finaux. Le protocole synthétique ne prouve toutefois ni l’entropie des graines, ni l’honnêteté d’un contributeur, ni l’indépendance entre les quatre lots de 10.6. Il ne transforme donc pas la borne statistique conditionnelle en confiance générale.
