# Documents libres locaux — 23 septembre 2026

Moteurs : Pandoc 3.1.3 (GPL) et LibreOffice 24.2.7.2 (MPL/LGPL). Sources : https://pandoc.org/MANUAL.html et https://books.libreoffice.org/en/GS252/GS25210-FileFormatsSecurityExporting.html. Ils produisent les fichiers à partir du contenu fourni par Qwen ; un nouveau modèle de langage n’est pas nécessaire.

Formats produits réellement : TXT, Markdown, HTML, ODT, DOCX, RTF, PDF, EPUB, PPTX, ODP, CSV, TSV, ODS et XLSX. Calc utilise ODS ; « calc » n’est pas une extension. Les composants Calc/Impress/Draw manquants ont été extraits des paquets officiels Ubuntu dans `.dev-local/corpus-office`, sans modification système. Empreintes des paquets : OFFICE_PACKAGES_LOCK.json.

Accès : + → Créer un document ou tableau. Contenu Markdown pour documents et présentations, lignes JSON de nombres/textes pour tableaux. Travaux persistants, conversion asynchrone, téléchargement et lien au brouillon. Outils MCP document_create, document_result, document_formats raccordés au modèle local. Les fichiers vivent physiquement sous `CORPUS_DATA_ROOT/corpus-documents/<id>`; `.dev-local/corpus-documents` reste un alias de compatibilité.

Isolation Bubblewrap sans réseau, sans accès au domicile ; seuls le travail, les programmes et les ressources système sont accessibles. Pas de macros fournies ni exécutées. Les cellules ODS/XLSX sont typées texte/nombre ; les préfixes de formules CSV/TSV sont neutralisés. Un travail interrompu par redémarrage est marqué en échec et doit être relancé explicitement.

Limites : génération depuis contenu structuré, pas éditeur bureautique complet ni conversion arbitraire de fichiers déposés. Une feuille, pas de formules/graphiques/styles de cellules, 15 000 caractères par création. Les conversions de mise en page complexes ne sont pas garanties. « Tous types » n’est pas une couverture de toute extension existante.

Validation : les 14 formats ont produit des fichiers non vides ; texte français/accentué du PDF extrait correctement. PDF créé depuis le studio déployé, état terminé et lien observés. 82 tests Python passent. Appel spontané de document_create par Qwen pas encore évalué. Aucun ajout, commit ou push Git.

## File des messages

Menu compact à trois entrées conforme au contenu des captures : Modifier le message, Ouvrir dans un chat latéral, Désactiver la mise en file d’attente. Ligne avec texte tronqué, Orienter, corbeille et points de suspension. Menu arrondi ancré, navigation clavier et fermeture par Échap/clic extérieur. Orienter transmet via prompt_async sans appel à abort. Test JavaScript vérifie l’absence d’interruption et la conservation des autres messages. Le chat latéral reçoit le texte comme brouillon ; les pièces jointes restent explicitement dans le message principal. Désactiver la mise en file affecte les prochains messages et conserve la file existante.

Une correction du relais HTTP empêche une connexion réutilisée de contourner les routes Corpus et de retourner du HTML aux API. Les connexions WebSocket 101 restent préservées.

ODT créé via MCP : `4be9eda64add4877892d69263d8dd7ba`, terminé. Le test navigateur a transmis une consigne via Orienter pendant une réponse sans réinitialiser sa durée. La prise en compte sémantique par le modèle n’est pas mesurée.
