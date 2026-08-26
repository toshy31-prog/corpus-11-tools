# Profil matériel — Pulse 15 / 8 Go de VRAM

## Cible locale

`TinyDoctrineEncoder v1` est un encodeur Transformer, pas un LLM généraliste :
6 couches, largeur 384, 6 têtes, FFN 1536, vocabulaire haché de 16 384 unités,
séquence 256. Il représente environ 29 M paramètres avec la tête MLM.

Ce format est volontairement très inférieur à un modèle conversationnel moderne.
Il peut apprendre une représentation de la doctrine et fournir une base pour
des tâches contrastives ; il ne peut pas acquérir une compétence générale sur
1,38 M tokens Corpus.

## Budget recommandé

| Ressource | Valeur |
| --- | ---: |
| VRAM visée | 8 Go |
| précision | FP16 / AMP CUDA |
| micro-batch | 4 × 256 tokens |
| accumulation | 8 pas |
| batch effectif | 32 séquences |
| checkpointing | non requis à cette taille ; non activé dans v1.3 |
| optimiseur | AdamW |

Le script vérifie CUDA avant tout entraînement. Le runtime de développement
actuel ne voit pas de pilote NVIDIA, donc l'entraînement GPU doit être lancé
depuis la session Linux/Windows du portable où `nvidia-smi` fonctionne.

La version `v1.1` initialise explicitement les embeddings et projections avec
un faible écart-type, utilise un taux d'apprentissage de `1e-4` et limite la
norme des gradients. Une perte MLM initiale très supérieure à `ln(16384) ≈ 9,7`
est un signal de santé négatif : arrêter et corriger avant de prolonger le run.

La version `v1.2` entraîne seulement les documents `train`, mesure la perte MLM
sur des documents `validation` séparés, et réserve le partition `test` sans le
charger. Une baisse de perte d'entraînement ne vaut pas généralisation sans ce
contrôle.

La v1.3 fixe avant exécution une courbe de 1 000 pas, avec lecture validation
tous les 200 pas. Le test reste réservé : il n'est ouvert que si la validation
continue de diminuer sans écart train/validation matériel.

## Installation locale, lorsque le pilote fonctionne

Créer un environnement dédié et installer une build PyTorch correspondant à la
version CUDA du pilote, selon les instructions officielles PyTorch. Ne pas
installer une build CUDA arbitraire dans le workspace ni lancer d'entraînement
avant d'avoir vérifié l'espace disque, le refroidissement et le manifest Corpus.
