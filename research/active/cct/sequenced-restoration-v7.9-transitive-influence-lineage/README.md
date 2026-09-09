# CCT-EXEC 7.9 — lignée transitive des influences (candidate)

La 7.8 ne détectait que les influences directement communes. La 7.9 ajoute un graphe orienté d'influences en amont dont chaque arête exige deux témoins indépendants et deux artefacts distincts. Une recherche bornée à quatre niveaux calcule la fermeture de chaque profil : si les lignées convergent, le quorum de contestation perd son veto, même lorsque ses financeurs immédiats diffèrent.

La confrontation tenue à l'écart relie deux financeurs directs distincts à une même source en amont. Les fixtures éprouvent la transitivité et sa borne ; elles ne prouvent ni l'exhaustivité du graphe ni les relations au-delà de quatre niveaux.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
