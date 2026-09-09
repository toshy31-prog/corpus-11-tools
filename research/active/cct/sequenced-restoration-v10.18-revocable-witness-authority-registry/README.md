# CCT-EXEC 10.18 — registre révocable des autorités témoins

## Lacune fermée

Deux identifiants de témoins et deux clés valides ne garantissaient ni leur
inscription préalable, ni leur statut au moment de signer, ni deux domaines
d’autorité distincts.

## Gain concret

La clé de chaque témoin est liée à une empreinte enregistrée, une fenêtre de
validité, une date d’inscription, un domaine d’autorité et un historique de
révocation. Le registre doit être gelé avant le registre d’effets. Une clé
inscrite après coup, expirée ou déjà révoquée invalide ses attestations ; deux
domaines valides doivent subsister.

Le mécanisme n’établit pas la légitimité des autorités ni l’indépendance réelle
de l’opérateur du registre. Les autorités et révocations de test sont
synthétiques.

## Condition de retrait

Retirer cette couche si une clé non inscrite, révoquée, hors période ou
enregistrée après sa signature conserve son statut, ou si un domaine unique
suffit au quorum.
