/* Generated from engine.js and game.js by build-browser.mjs. */
(() => {
"use strict";
const ACTIVE_CAMPAIGN = Object.freeze({
  "schemaVersion": 2,
  "stateVersion": 3,
  "id": "sereine-01",
  "title": "Ce qui reste possible",
  "collection": "Corpus",
  "subtitle": "Campagne 01 · Vallée de Sereine",
  "premise": "Vendredi à 07 h, la famille Neris doit être expulsée pour permettre le terrassement d'un barrage.",
  "start": {
    "weekday": "Mardi",
    "hour": 8
  },
  "deadline": 71,
  "initialPerspective": "ina",
  "actors": {
    "ina": {
      "name": "Ina Neris",
      "role": "habite la rive basse",
      "place": "Le hameau",
      "color": "#d07459",
      "scene": "La maison et la rive",
      "initialKnowledge": [
        "eviction",
        "home-world",
        "old-path"
      ]
    },
    "mara": {
      "name": "Mara Venn",
      "role": "instruit les sols",
      "place": "Le bureau 4B",
      "color": "#7b9d83",
      "scene": "Le bureau des sols",
      "initialKnowledge": [
        "eviction",
        "public-order",
        "current-register"
      ]
    },
    "nilo": {
      "name": "Nilo Aras",
      "role": "conduit les engins",
      "place": "Le dépôt d'Avel",
      "color": "#d7a83d",
      "scene": "Le dépôt d'Avel",
      "initialKnowledge": [
        "work-order",
        "six-drivers"
      ]
    },
    "sora": {
      "name": "Sora Emel",
      "role": "travaille à La Traverse",
      "place": "Le studio local",
      "color": "#7698ad",
      "scene": "Le studio de La Traverse",
      "initialKnowledge": [
        "press-release",
        "public-order"
      ]
    }
  },
  "knowledge": {
    "eviction": "L'expulsion est prévue vendredi à 07 h.",
    "home-world": "Trois maisons partagent un four, un véhicule, un troupeau et des soins.",
    "old-path": "Le chemin de rive relie le pâturage, l'école et le lieu de veillée.",
    "public-order": "L'arrêté annonce trois foyers déplacés et une compensation validée.",
    "current-register": "La fiche actuelle classe la maison d'Ina comme dépendance saisonnière.",
    "work-order": "Les machines doivent quitter le dépôt jeudi à 15 h.",
    "six-drivers": "Six personnes seulement peuvent conduire les engins lourds.",
    "press-release": "Onze médias citent le même communiqué de la compagnie.",
    "bills": "Douze années de factures situent la résidence d'Ina au hameau.",
    "discrepancy": "Deux fiches cadastrales incompatibles coexistent sans acte de modification.",
    "mandate": "La famille autorise l'usage des factures pour le recours, pas leur publication.",
    "tidal-route": "Un passage reste praticable à marée basse si son rythme est transmis.",
    "crew-mandate": "Quatre conducteurs mandatent Nilo pour une décision collective.",
    "freeze-sent": "Une suspension a été signée et transmise au registre provincial.",
    "freeze-received": "Le dépôt a reçu une suspension opposable du permis.",
    "interview-request": "La Traverse demande à Ina un témoignage enregistré.",
    "admin-request": "Mara demande une preuve de résidence utilisable pour le recours.",
    "protected-story": "Le témoignage d'Ina peut être diffusé sans adresse ni pièces brutes.",
    "source-loop": "Onze articles ne forment qu'une seule chaîne de reprise."
  },
  "worldFlags": [
    "mandateDefined",
    "harvestSaved",
    "routeTransmitted",
    "recordsCompared",
    "recordsDistributed",
    "crewOrganized",
    "individualRefusal",
    "freezeSent",
    "freezeReceived",
    "permitFrozen",
    "interviewRequested",
    "interviewDeclined",
    "protectedStory",
    "recordPublication",
    "storyPublication",
    "administrativePublication",
    "publicAssembly",
    "depotHold",
    "replacementContractor",
    "stakesPlaced",
    "roadClosed",
    "machinesArrived",
    "wetlandDamaged",
    "evictionAttempted",
    "forcedDisplacement",
    "niloLostWork"
  ],
  "timeline": [
    {
      "id": "stakes",
      "hour": 19,
      "label": "Piquets",
      "when": "Mercredi · 03 h",
      "irreversible": false,
      "grants": {
        "world": [
          "stakesPlaced"
        ]
      },
      "branches": [
        {
          "when": {
            "world": [
              "routeTransmitted"
            ]
          },
          "result": {
            "actor": "ina",
            "title": "Les piquets apparaissent sur la rive",
            "body": "Le bornage coupe le tracé, mais plusieurs personnes savent déjà refaire le passage.",
            "tone": "world"
          }
        },
        {
          "result": {
            "actor": "ina",
            "title": "Les piquets apparaissent sur la rive",
            "body": "Le bornage coupe un passage que le plan officiel ne représente pas.",
            "tone": "world"
          }
        }
      ]
    },
    {
      "id": "road",
      "hour": 43,
      "label": "Barrière",
      "when": "Jeudi · 03 h",
      "irreversible": false,
      "grants": {
        "world": [
          "roadClosed"
        ]
      },
      "branches": [
        {
          "when": {
            "world": [
              "routeTransmitted"
            ]
          },
          "result": {
            "actor": "ina",
            "title": "La barrière est abaissée",
            "body": "La route officielle ferme. Le gué transmis maintient un accès dépendant de la marée.",
            "tone": "world"
          }
        },
        {
          "result": {
            "actor": "ina",
            "title": "La barrière est abaissée",
            "body": "La route officielle ferme. Les bêtes ne passent pas par le détour carrossable.",
            "tone": "world"
          }
        }
      ]
    },
    {
      "id": "machines",
      "hour": 55,
      "label": "Machines",
      "when": "Jeudi · 15 h",
      "irreversible": true,
      "branches": [
        {
          "when": {
            "notWorld": [
              "permitFrozen",
              "depotHold"
            ]
          },
          "grants": {
            "world": [
              "machinesArrived",
              "wetlandDamaged"
            ]
          },
          "result": {
            "actor": "nilo",
            "title": "Les engins atteignent le carrefour",
            "body": "Le terrassement de la plateforme commence. Une suspension ultérieure n'enlèvera pas seule le remblai.",
            "tone": "loss"
          }
        },
        {
          "when": {
            "world": [
              "permitFrozen"
            ]
          },
          "result": {
            "actor": "nilo",
            "title": "Le carrefour reste vide",
            "body": "Le gel du permis est devenu un arrêt effectif au dépôt.",
            "tone": "care"
          }
        },
        {
          "result": {
            "actor": "nilo",
            "title": "Le carrefour reste vide",
            "body": "L'arrêt collectif retient les machines, tant qu'il ne peut pas être contourné.",
            "tone": "care"
          }
        }
      ]
    },
    {
      "id": "eviction",
      "hour": 71,
      "label": "Expulsion",
      "when": "Vendredi · 07 h",
      "irreversible": true,
      "grants": {
        "world": [
          "evictionAttempted"
        ]
      },
      "endCampaign": true,
      "branches": [
        {
          "when": {
            "notWorld": [
              "permitFrozen",
              "depotHold"
            ]
          },
          "grants": {
            "world": [
              "forcedDisplacement"
            ]
          },
          "result": {
            "actor": "ina",
            "title": "Vendredi, 07 h — l'ordre devient déplacement",
            "body": "La famille quitte les maisons sous contrainte. Les recours possibles devront désormais agir sur un monde déjà changé.",
            "tone": "loss"
          }
        },
        {
          "result": {
            "actor": "ina",
            "title": "Vendredi, 07 h — l'ordre ne devient pas effet",
            "body": "L'expulsion n'a pas lieu ce matin. La suspension ouvre du temps ; elle ne résout ni le fond, ni les pertes déjà réalisées.",
            "tone": "care"
          }
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "ina-mandate",
      "actor": "ina",
      "verb": "Se réunir",
      "title": "Définir ce qui peut être dit",
      "duration": 2,
      "description": "La famille fixe ensemble les usages permis de son histoire et de ses papiers.",
      "tension": "Protéger la parole prend du temps avant de produire un effet extérieur.",
      "grants": {
        "knowledge": [
          {
            "actor": "ina",
            "fact": "mandate"
          }
        ],
        "world": [
          "mandateDefined"
        ]
      },
      "creates": [
        {
          "id": "mandate",
          "holder": "ina",
          "permissions": [
            "recourse",
            "protected-interview"
          ]
        }
      ]
    },
    {
      "id": "ina-bills",
      "actor": "ina",
      "verb": "Chercher",
      "title": "Sortir la boîte de factures",
      "duration": 2,
      "description": "Retrouver ce qui relie administrativement Ina à la maison.",
      "tension": "La trace est utilisable seulement si elle atteint un lieu capable de la recevoir.",
      "grants": {
        "knowledge": [
          {
            "actor": "ina",
            "fact": "bills"
          }
        ]
      },
      "creates": [
        {
          "id": "bills",
          "holder": "ina",
          "permissions": []
        }
      ]
    },
    {
      "id": "ina-send-mara",
      "actor": "ina",
      "verb": "Transmettre",
      "title": "Confier les factures à Mara",
      "duration": 2,
      "description": "Envoyer les pièces au seul bureau qui peut les relier au permis.",
      "tension": "L'usage reste borné au recours ; la réception ne garantit pas l'action.",
      "requires": {
        "knowledge": [
          "bills"
        ],
        "world": [
          "mandateDefined"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "mara",
            "fact": "bills"
          },
          {
            "actor": "mara",
            "fact": "mandate"
          }
        ]
      },
      "relays": [
        {
          "to": "mara",
          "fact": "bills",
          "channel": "enveloppe portée",
          "purpose": "recours"
        },
        {
          "to": "mara",
          "fact": "mandate",
          "channel": "note signée",
          "purpose": "limiter l'usage"
        }
      ]
    },
    {
      "id": "ina-harvest",
      "actor": "ina",
      "verb": "Préserver",
      "title": "Récolter avant la barrière",
      "duration": 5,
      "durationVariants": [
        {
          "duration": 7,
          "whenWorld": [
            "roadClosed"
          ],
          "unlessWorld": [
            "routeTransmitted"
          ]
        }
      ],
      "description": "Sauver les pêches, les caisses et une saison de revenu.",
      "tension": "Protège les moyens de vivre sans modifier l'arrêté.",
      "grants": {
        "world": [
          "harvestSaved"
        ]
      }
    },
    {
      "id": "ina-path",
      "actor": "ina",
      "verb": "Transmettre",
      "title": "Marcher l'ancien passage",
      "duration": 4,
      "durationVariants": [
        {
          "duration": 6,
          "whenWorld": [
            "roadClosed"
          ]
        }
      ],
      "description": "Faire apprendre le rythme du gué à d'autres habitantes.",
      "tension": "Une route n'est pas son tracé : elle dépend de personnes capables de la refaire.",
      "grants": {
        "knowledge": [
          {
            "actor": "ina",
            "fact": "tidal-route"
          }
        ],
        "world": [
          "routeTransmitted"
        ]
      },
      "creates": [
        {
          "id": "tidal-route",
          "holder": "ina",
          "permissions": [
            "community-use"
          ]
        }
      ]
    },
    {
      "id": "ina-interview",
      "actor": "ina",
      "verb": "Témoigner",
      "title": "Parler sous protection",
      "duration": 3,
      "description": "Enregistrer un récit sans adresse, ni image, ni documents bruts.",
      "tension": "Le montage donnera à la rédaction un pouvoir sur l'ordre des paroles.",
      "requires": {
        "world": [
          "interviewRequested",
          "mandateDefined"
        ],
        "notWorld": [
          "interviewDeclined"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "sora",
            "fact": "protected-story"
          }
        ],
        "world": [
          "protectedStory"
        ]
      },
      "relays": [
        {
          "to": "sora",
          "fact": "protected-story",
          "trace": "protected-story",
          "channel": "entretien chiffré",
          "purpose": "publication protégée"
        }
      ],
      "creates": [
        {
          "id": "protected-story",
          "holder": "sora",
          "permissions": [
            "broadcast-without-identifiers"
          ]
        }
      ]
    },
    {
      "id": "ina-decline",
      "actor": "ina",
      "verb": "Refuser",
      "title": "Refuser l'entretien",
      "duration": 1,
      "description": "Ne pas devenir le visage public du conflit.",
      "tension": "La rédaction perd une voix ; la famille conserve son retrait.",
      "requires": {
        "world": [
          "interviewRequested"
        ],
        "notWorld": [
          "protectedStory"
        ]
      },
      "grants": {
        "world": [
          "interviewDeclined"
        ]
      }
    },
    {
      "id": "mara-compare",
      "actor": "mara",
      "verb": "Comparer",
      "title": "Ouvrir les deux registres",
      "duration": 3,
      "description": "Comparer la fiche papier de 2183 à l'annexe numérique du barrage.",
      "tension": "La comparaison laisse une trace nominative de consultation.",
      "grants": {
        "knowledge": [
          {
            "actor": "mara",
            "fact": "discrepancy"
          }
        ],
        "world": [
          "recordsCompared"
        ]
      },
      "creates": [
        {
          "id": "discrepancy",
          "holder": "mara",
          "permissions": [
            "internal-review",
            "redacted-disclosure"
          ]
        }
      ]
    },
    {
      "id": "mara-copy",
      "actor": "mara",
      "verb": "Distribuer",
      "title": "Créer deux copies expurgées",
      "duration": 3,
      "description": "Confier l'incohérence, sans données familiales, au dépôt et à La Traverse.",
      "tension": "La trace devient plus résistante, mais échappe aussi à un détenteur unique.",
      "requires": {
        "knowledge": [
          "discrepancy"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "nilo",
            "fact": "discrepancy"
          },
          {
            "actor": "sora",
            "fact": "discrepancy"
          }
        ],
        "world": [
          "recordsDistributed"
        ]
      },
      "relays": [
        {
          "to": "nilo",
          "fact": "discrepancy",
          "channel": "copie papier",
          "purpose": "sécurité du chantier"
        },
        {
          "to": "sora",
          "fact": "discrepancy",
          "channel": "copie papier",
          "purpose": "vérification journalistique"
        }
      ]
    },
    {
      "id": "mara-request",
      "actor": "mara",
      "verb": "Demander",
      "title": "Demander à Ina une preuve de résidence",
      "duration": 2,
      "description": "Ouvrir un canal vers la personne que la fiche a simplifiée.",
      "tension": "La charge de réparer le registre revient encore à la personne mal classée.",
      "requires": {
        "knowledge": [
          "discrepancy"
        ],
        "notKnowledge": [
          "bills"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "ina",
            "fact": "admin-request"
          }
        ]
      },
      "relays": [
        {
          "to": "ina",
          "fact": "admin-request",
          "channel": "appel",
          "purpose": "compléter le recours"
        }
      ]
    },
    {
      "id": "mara-freeze",
      "actor": "mara",
      "verb": "Suspendre",
      "title": "Signer le gel du permis",
      "duration": 3,
      "description": "Émettre une suspension provisoire vers le registre et le dépôt.",
      "tension": "Signer, transmettre, recevoir et appliquer resteront quatre états différents.",
      "requires": {
        "knowledge": [
          "discrepancy",
          "bills"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "mara",
            "fact": "freeze-sent"
          }
        ],
        "world": [
          "freezeSent"
        ]
      },
      "creates": [
        {
          "id": "freeze-order",
          "holder": "mara",
          "permissions": [
            "registry",
            "depot"
          ]
        }
      ],
      "scheduled": [
        {
          "after": 4,
          "when": {
            "notWorld": [
              "freezeReceived"
            ]
          },
          "grants": {
            "world": [
              "freezeReceived"
            ]
          },
          "relays": [
            {
              "from": "mara",
              "to": "nilo",
              "fact": "freeze-sent",
              "trace": "freeze-order",
              "channel": "registre provincial",
              "purpose": "suspension du permis"
            }
          ],
          "result": {
            "actor": "nilo",
            "title": "La suspension atteint le dépôt",
            "body": "Le message est reçu. Il doit encore être relié au planning, aux clés et aux personnes capables d'arrêter le départ.",
            "tone": "relay"
          }
        }
      ]
    },
    {
      "id": "nilo-crew",
      "actor": "nilo",
      "verb": "Réunir",
      "title": "Parler aux cinq autres conducteurs",
      "duration": 3,
      "description": "Faire du risque individuel une décision discutée collectivement.",
      "tension": "Le temps de se coordonner est pris sur des pauses non payées.",
      "grants": {
        "knowledge": [
          {
            "actor": "nilo",
            "fact": "crew-mandate"
          }
        ],
        "world": [
          "crewOrganized"
        ]
      },
      "creates": [
        {
          "id": "crew-mandate",
          "holder": "nilo",
          "permissions": [
            "collective-hold"
          ]
        }
      ]
    },
    {
      "id": "nilo-alone",
      "actor": "nilo",
      "verb": "Refuser",
      "title": "Refuser seul de démarrer",
      "duration": 1,
      "description": "Nilo rend sa propre machine indisponible immédiatement.",
      "tension": "Le contrat prévoit un remplacement ; la sanction, elle, reste personnelle.",
      "requires": {
        "notWorld": [
          "crewOrganized"
        ]
      },
      "grants": {
        "world": [
          "individualRefusal",
          "niloLostWork"
        ]
      },
      "scheduled": [
        {
          "after": 4,
          "result": {
            "actor": "nilo",
            "title": "Le planning absorbe le refus individuel",
            "body": "Un remplaçant accepte le créneau. Le refus de Nilo reste réel ; son effet sur la flotte s'éteint.",
            "tone": "cost"
          }
        }
      ]
    },
    {
      "id": "nilo-hold",
      "actor": "nilo",
      "verb": "Interrompre",
      "title": "Placer le dépôt en arrêt collectif",
      "duration": 3,
      "description": "Retenir les machines au nom du mandat des conducteurs et de l'anomalie reçue.",
      "tension": "Sans recours ou visibilité, la compagnie peut déplacer le contrat vers un autre dépôt.",
      "requires": {
        "world": [
          "crewOrganized"
        ],
        "anyKnowledge": [
          "discrepancy",
          "freeze-received"
        ]
      },
      "grants": {
        "world": [
          "depotHold"
        ]
      },
      "scheduled": [
        {
          "after": 18,
          "scheduleWhen": {
            "notWorld": [
              "permitFrozen"
            ]
          },
          "branches": [
            {
              "when": {
                "world": [
                  "depotHold"
                ],
                "notWorld": [
                  "permitFrozen"
                ],
                "anyWorld": [
                  "recordPublication",
                  "storyPublication",
                  "publicAssembly"
                ]
              },
              "result": {
                "actor": "nilo",
                "title": "Le déplacement du contrat devient trop visible",
                "body": "La compagnie ne trouve pas de second dépôt prêt à reprendre publiquement un chantier contesté.",
                "tone": "care"
              }
            },
            {
              "when": {
                "world": [
                  "depotHold"
                ],
                "notWorld": [
                  "permitFrozen",
                  "recordPublication",
                  "storyPublication",
                  "publicAssembly"
                ]
              },
              "grants": {
                "world": [
                  "replacementContractor"
                ]
              },
              "clears": {
                "world": [
                  "depotHold"
                ]
              },
              "result": {
                "actor": "nilo",
                "title": "Le contrat change de dépôt",
                "body": "L'arrêt collectif tient à Avel, mais un opérateur extérieur reprend les machines. Le veto local a été contourné.",
                "tone": "cost"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "nilo-acknowledge",
      "actor": "nilo",
      "verb": "Vérifier",
      "title": "Accuser réception de la suspension",
      "duration": 1,
      "description": "Relier l'ordre reçu aux clés, au planning et aux conducteurs.",
      "tension": "L'effet doit encore être observé au carrefour.",
      "requires": {
        "world": [
          "freezeReceived"
        ],
        "notWorld": [
          "permitFrozen"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "nilo",
            "fact": "freeze-received"
          }
        ],
        "world": [
          "permitFrozen"
        ]
      },
      "cancelsScheduledFrom": [
        "nilo-hold"
      ]
    },
    {
      "id": "sora-call-ina",
      "actor": "sora",
      "verb": "Demander",
      "title": "Proposer un entretien à Ina",
      "duration": 2,
      "description": "Ouvrir un canal sans présumer qu'Ina doit l'accepter.",
      "tension": "Une voix publique peut protéger, exposer ou simplement être refusée.",
      "requires": {
        "notWorld": [
          "interviewDeclined"
        ]
      },
      "grants": {
        "knowledge": [
          {
            "actor": "ina",
            "fact": "interview-request"
          }
        ],
        "world": [
          "interviewRequested"
        ]
      },
      "relays": [
        {
          "to": "ina",
          "fact": "interview-request",
          "channel": "appel",
          "purpose": "demander un entretien"
        }
      ]
    },
    {
      "id": "sora-trace-loop",
      "actor": "sora",
      "verb": "Retracer",
      "title": "Remonter les onze articles",
      "duration": 2,
      "description": "Vérifier si la pluralité apparente vient de sources réellement différentes.",
      "tension": "Cette vérification retire une certitude sans fournir encore un récit alternatif.",
      "grants": {
        "knowledge": [
          {
            "actor": "sora",
            "fact": "source-loop"
          }
        ]
      },
      "creates": [
        {
          "id": "source-loop",
          "holder": "sora",
          "permissions": [
            "editorial-use"
          ]
        }
      ]
    },
    {
      "id": "sora-relay-release",
      "actor": "sora",
      "verb": "Publier",
      "title": "Relayer le communiqué maintenant",
      "duration": 1,
      "description": "Publier la seule version immédiatement certifiable par la rédaction.",
      "tension": "La vitesse donne au cadrage administratif une longueur d'avance matérielle.",
      "requires": {
        "notWorld": [
          "recordPublication",
          "storyPublication",
          "administrativePublication"
        ]
      },
      "grants": {
        "world": [
          "administrativePublication"
        ]
      }
    },
    {
      "id": "sora-publish-record",
      "actor": "sora",
      "verb": "Publier",
      "title": "Rendre l'incohérence publique",
      "duration": 3,
      "description": "Expliquer les deux fiches sans identifier la famille ni diffuser les pièces.",
      "tension": "La compagnie apprendra quelle faille est utilisée et pourra adapter sa réponse.",
      "requires": {
        "knowledge": [
          "discrepancy"
        ]
      },
      "grants": {
        "world": [
          "recordPublication"
        ]
      }
    },
    {
      "id": "sora-publish-story",
      "actor": "sora",
      "verb": "Diffuser",
      "title": "Monter le témoignage protégé",
      "duration": 4,
      "description": "Faire entendre les relations au lieu sans rendre la source localisable.",
      "tension": "Le montage sélectionne encore l'ordre et la durée des paroles.",
      "requires": {
        "knowledge": [
          "protected-story"
        ]
      },
      "grants": {
        "world": [
          "storyPublication"
        ]
      }
    },
    {
      "id": "sora-assembly",
      "actor": "sora",
      "verb": "Relier",
      "title": "Convoquer une assemblée au carrefour",
      "duration": 4,
      "description": "Mettre en présence habitants, conducteurs, bureau des sols et juristes.",
      "tension": "Rendre la coordination visible peut accélérer la contre-stratégie de la compagnie.",
      "requires": {
        "anyKnowledge": [
          "discrepancy",
          "protected-story"
        ]
      },
      "grants": {
        "world": [
          "publicAssembly"
        ]
      },
      "conditionalGrants": [
        {
          "when": {
            "knowledge": [
              "discrepancy"
            ]
          },
          "relays": [
            {
              "from": "sora",
              "to": "ina",
              "fact": "discrepancy",
              "trace": "discrepancy",
              "channel": "assemblée du carrefour",
              "purpose": "contestation commune"
            }
          ]
        }
      ]
    }
  ],
  "outcomeDimensions": [
    "Sécurité immédiate",
    "Capacité de rester",
    "Recours",
    "Moyens de vivre",
    "Capacité collective",
    "Mémoire",
    "Parole d'Ina",
    "Coût du refus",
    "Rive humide"
  ]
});
const CAMPAIGN = ACTIVE_CAMPAIGN;
const DEADLINE_HOURS = CAMPAIGN.deadline;

const actorSeed = Object.fromEntries(Object.entries(CAMPAIGN.actors).map(([id, actor]) => [id, {
  name: actor.name,
  role: actor.role,
  place: actor.place,
  color: actor.color,
  knowledge: [...actor.initialKnowledge],
  inbox: [],
}]));

const ACTOR_ORDER = Object.freeze(Object.keys(CAMPAIGN.actors));
const KNOWLEDGE = Object.freeze({ ...CAMPAIGN.knowledge });
const ACTIONS = Object.freeze(CAMPAIGN.actions.map((action) => Object.freeze({ ...action })));

const clone = (value) => structuredClone(value);
const knows = (state, actor, fact) => Boolean(state.actors[actor]?.knowledge.includes(fact));

function learn(state, actor, fact, via = null) {
  if (!state.actors[actor]) return;
  if (!knows(state, actor, fact)) state.actors[actor].knowledge.push(fact);
  if (via && !state.actors[actor].inbox.includes(via)) state.actors[actor].inbox.push(via);
}

function addTrace(state, id, holder, permissions = []) {
  state.traces[id] = { id, holders: [holder], permissions: [...permissions], createdAt: state.elapsed };
}

function passTrace(state, id, from, to, channel, purpose) {
  const trace = state.traces[id];
  if (trace && !trace.holders.includes(to)) trace.holders.push(to);
  state.relays.unshift({ id: `${state.turn}-${id}-${to}`, trace: id, from, to, channel, purpose, hour: state.elapsed });
}

function addLog(state, actor, title, body, tone = "neutral") {
  state.log.unshift({ id: `${state.turn}-${state.elapsed}-${title}`, actor, title, body, tone, hour: state.elapsed });
}

function conditionsMet(state, requirements = {}, actor = state.perspective) {
  const hasKnowledge = (requirements.knowledge || []).every((fact) => knows(state, actor, fact));
  const lacksKnowledge = (requirements.notKnowledge || []).every((fact) => !knows(state, actor, fact));
  const hasAnyKnowledge = !(requirements.anyKnowledge || []).length
    || requirements.anyKnowledge.some((fact) => knows(state, actor, fact));
  const hasWorld = (requirements.world || []).every((flag) => state.world[flag]);
  const lacksWorld = (requirements.notWorld || []).every((flag) => !state.world[flag]);
  const hasAnyWorld = !(requirements.anyWorld || []).length
    || requirements.anyWorld.some((flag) => state.world[flag]);
  return hasKnowledge && lacksKnowledge && hasAnyKnowledge && hasWorld && lacksWorld && hasAnyWorld;
}

function applyConsequences(state, node, actor) {
  for (const flag of node.grants?.world || []) state.world[flag] = true;
  for (const flag of node.clears?.world || []) state.world[flag] = false;
  for (const grant of node.grants?.knowledge || []) learn(state, grant.actor, grant.fact, grant.via);
  for (const trace of node.creates || []) addTrace(state, trace.id, trace.holder || actor, trace.permissions);

  for (const relay of node.relays || []) {
    const from = relay.from || actor;
    learn(state, relay.to, relay.fact, `${relay.channel} · ${relay.purpose}`);
    passTrace(state, relay.trace || relay.fact, from, relay.to, relay.channel, relay.purpose);
  }

  for (const conditional of node.conditionalGrants || []) {
    if (conditionsMet(state, conditional.when, actor)) applyConsequences(state, conditional, actor);
  }

  if (node.cancelsScheduledFrom?.length) {
    state.scheduled = state.scheduled.filter((item) => !node.cancelsScheduledFrom.includes(item.sourceAction));
  }

  for (const scheduled of node.scheduled || []) {
    if (scheduled.scheduleWhen && !conditionsMet(state, scheduled.scheduleWhen, actor)) continue;
    state.scheduled.push({
      at: state.elapsed + scheduled.after,
      actor,
      sourceAction: node.id,
      spec: clone(scheduled),
    });
  }
}

function executeNode(state, node, actor) {
  if (node.when && !conditionsMet(state, node.when, actor)) return null;
  applyConsequences(state, node, actor);
  let result = node.result || null;
  if (node.branches) {
    const branch = node.branches.find((candidate) => !candidate.when || conditionsMet(state, candidate.when, actor));
    if (branch) result = executeNode(state, branch, actor) || result;
  }
  return result;
}

function applyDeclaredNode(inputState, node, actor = inputState.perspective) {
  const state = clone(inputState);
  executeNode(state, node, actor);
  return state;
}

function createInitialState() {
  return {
    version: CAMPAIGN.stateVersion,
    campaignId: CAMPAIGN.id,
    elapsed: 0,
    deadline: DEADLINE_HOURS,
    turn: 0,
    perspective: CAMPAIGN.initialPerspective || ACTOR_ORDER[0],
    ended: false,
    completed: [],
    actors: clone(actorSeed),
    traces: {},
    relays: [],
    scheduled: [],
    events: [],
    world: Object.fromEntries(CAMPAIGN.worldFlags.map((flag) => [flag, false])),
    lastBeat: {
      actor: "ina",
      title: "La lettre sur la table",
      body: "Ina relit l'heure, pas le motif. Vendredi, 07 h. Dehors, les pêches sont presque mûres et personne n'a encore déplacé les bêtes.",
      quote: "Ils ont compté trois maisons. Ils n'ont pas compté ce qui passe entre elles.",
      tone: "alert",
    },
    log: [{
      id: "opening",
      actor: "ina",
      hour: 0,
      title: "Une décision arrive avant ses conséquences",
      body: "L'arrêté est reçu mardi matin. Il ne produit encore ni départ, ni suspension, ni réparation.",
      tone: "alert",
    }],
  };
}

const actionBeats = {
  "ina-mandate": { title: "Une limite avant la preuve", body: "Les factures pourront aller au recours. Ni l'adresse, ni les enregistrements bruts ne devront être publiés.", quote: "Aidez-nous, oui. Parler à notre place, non.", tone: "care" },
  "ina-bills": { title: "Douze hivers dans une boîte", body: "Électricité, soins à domicile, réparations du toit : les pièces contredisent la catégorie « saisonnière » sans expliquer qui l'a changée.", quote: "Une maison saisonnière qui reçoit l'infirmière chaque janvier.", tone: "discovery" },
  "ina-send-mara": { title: "Reçu n'est pas encore agi", body: "Mara possède maintenant les pièces et leur mandat. Aucun permis n'est encore suspendu.", quote: "Je peux les recevoir. Je ne promets pas encore ce que le registre acceptera.", tone: "relay" },
  "ina-harvest": { title: "Ce qui peut encore être porté", body: "La récolte quitte la vallée. La terre, le four et la saison suivante restent sur place.", quote: "Ce n'est pas gagner. C'est ne pas tout devoir en plus.", tone: "care" },
  "ina-path": { title: "Le passage change de mémoire", body: "Quatre personnes apprennent à lire les pierres de marée. Si la route ferme, l'accès restera fragile mais praticable.", quote: "La carte dira où. Les pieds doivent encore savoir quand.", tone: "care" },
  "ina-interview": { title: "Une voix, pas une extraction", body: "Sora reçoit une version publiable. L'enregistrement brut reste sous le contrôle d'Ina.", quote: "Vous pouvez raconter la coupure. Pas donner notre porte en spectacle.", tone: "relay" },
  "ina-decline": { title: "Un non qui reste un non", body: "Sora note le refus sans l'expliquer par la peur, l'ignorance ou l'accord tacite.", quote: "Je ne vous dois pas ma voix pour mériter de rester.", tone: "refusal" },
  "mara-compare": { title: "Deux fiches, aucune transition", body: "« Habitation principale » devient « dépendance saisonnière ». Aucun acte n'autorise ce changement de catégorie.", quote: "Le système montre l'état final. Il a perdu le passage qui devait le rendre valable.", tone: "discovery" },
  "mara-copy": { title: "L'anomalie ne tient plus dans un tiroir", body: "Deux copies circulent sans les coordonnées d'Ina. La destruction d'un dossier ne suffirait plus à effacer la contradiction.", quote: "Je partage ce qu'ils doivent pouvoir contester, pas ce qu'ils n'ont pas à posséder.", tone: "relay" },
  "mara-request": { title: "La preuve demandée à celle qui supporte l'erreur", body: "Ina sait désormais exactement ce qui manque au bureau. L'appel ne lui rend ni temps, ni accès, ni présomption de résidence.", quote: "Je peux ouvrir la voie. Je ne peux pas produire votre vie à votre place.", tone: "cost" },
  "mara-freeze": { title: "La signature quitte le bureau", body: "La suspension est envoyée. Elle n'est pas encore reçue par le dépôt et le permis reste matériellement actif jusque-là.", quote: "À partir d'ici, le réseau peut encore échouer.", tone: "relay" },
  "nilo-crew": { title: "Six personnes deviennent un seuil", body: "Quatre conducteurs donnent mandat à Nilo pour refuser ensemble un départ juridiquement douteux. Deux ne se prononcent pas.", quote: "Seul, je suis remplaçable. Ensemble, pas aujourd'hui.", tone: "care" },
  "nilo-alone": { title: "Un refus réel, un arrêt très court", body: "Nilo est écarté du planning. Une agence cherche déjà un remplaçant. Son refus existe même s'il ne suffit pas à arrêter le chantier.", quote: "Ils peuvent prendre mon badge. Ils ne prendront pas mon oui.", tone: "refusal" },
  "nilo-hold": { title: "Le moteur reste froid", body: "Le planning indique toujours « départ confirmé ». Dans le dépôt, aucune clé ne tourne. La compagnie contacte déjà un autre opérateur.", quote: "Le tableau peut dire parti. L'engin est devant moi.", tone: "action" },
  "nilo-acknowledge": { title: "L'ordre devient capacité d'arrêt", body: "Nilo annule le départ dans le planning, retire les clés et fait contresigner les six conducteurs. Le gel devient opposable au dépôt.", quote: "Maintenant seulement, la signature agit ici.", tone: "action" },
  "sora-call-ina": { title: "La demande attend sa réponse", body: "Ina reçoit les conditions proposées. Le silence ou le refus ne seront pas publiés comme un aveu.", quote: "Je peux offrir un micro. Je ne peux pas réclamer une voix.", tone: "relay" },
  "sora-trace-loop": { title: "Onze titres, une seule origine", body: "Chaque article reprend la même dépêche, traduite deux fois puis raccourcie. Aucun journaliste n'a visité la vallée.", quote: "La répétition faisait foule. La chaîne tient dans une pièce.", tone: "discovery" },
  "sora-relay-release": { title: "La première version devient le décor", body: "Le projet circule comme une opération compensée. Les corrections futures devront désormais défaire ce point de départ.", quote: "C'était publiable. Ce n'était pas le monde entier.", tone: "cost" },
  "sora-publish-record": { title: "La contradiction entre dans l'espace public", body: "L'article décrit le changement de catégorie et son absence de trace. La compagnie annonce un audit sans suspendre le chantier.", quote: "Nous publions la faille, pas la famille.", tone: "action" },
  "sora-publish-story": { title: "Ce que « trois foyers » ne pouvait pas porter", body: "La diffusion fait entendre le four partagé, les soins et le troupeau. L'adresse et les documents bruts restent hors antenne.", quote: "Le lieu n'est pas devenu une preuve. Il est redevenu habité.", tone: "care" },
  "sora-assembly": { title: "La suite n'a plus un seul détenteur", body: "Trois groupes se donnent des tâches et des mandats distincts. Même si vous quittez une position, la coordination peut continuer.", quote: "Personne ne prend tout. C'est la condition pour que ça tienne.", tone: "care" },
};

function resolveDuration(action, state) {
  const variant = (action.durationVariants || []).find((candidate) => {
    const hasWorld = (candidate.whenWorld || []).every((flag) => state.world[flag]);
    const lacksWorld = (candidate.unlessWorld || []).every((flag) => !state.world[flag]);
    return hasWorld && lacksWorld;
  });
  return variant?.duration ?? action.duration;
}

function getAvailableActions(state, actor = state.perspective) {
  return ACTIONS.filter((action) => {
    if (action.actor !== actor || state.completed.includes(action.id) || state.ended) return false;
    return conditionsMet(state, action.requires, action.actor)
      && state.elapsed + resolveDuration(action, state) <= state.deadline;
  }).map((action) => ({ ...action, duration: resolveDuration(action, state) }));
}

function processScheduled(state, from, to) {
  const due = state.scheduled.filter((item) => from < item.at && item.at <= to).sort((a, b) => a.at - b.at);
  for (const item of due) {
    const result = executeNode(state, item.spec, item.actor);
    if (result) addLog(state, result.actor || item.actor, result.title, result.body, result.tone);
  }
  state.scheduled = state.scheduled.filter((item) => item.at > to);
}

function processWorldEvents(state, from, to) {
  const due = CAMPAIGN.timeline
    .filter((event) => from < event.hour && to >= event.hour && !state.events.includes(event.id))
    .sort((a, b) => a.hour - b.hour);
  for (const event of due) {
    state.events.push(event.id);
    const result = executeNode(state, event, event.result?.actor || CAMPAIGN.initialPerspective);
    if (result) addLog(state, result.actor || CAMPAIGN.initialPerspective, result.title, result.body, result.tone);
    if (event.endCampaign) state.ended = true;
  }
}

function moveTime(state, duration, beforeWorldEvents = null) {
  const from = state.elapsed;
  const to = Math.min(state.deadline, from + duration);
  const thresholds = [...CAMPAIGN.timeline.map((event) => event.hour), state.deadline];
  const points = [...new Set([
    ...state.scheduled.filter((item) => from < item.at && item.at <= to).map((item) => item.at),
    ...thresholds.filter((hour) => from < hour && hour <= to),
    to,
  ])].sort((a, b) => a - b);
  let cursor = from;
  for (const point of points) {
    state.elapsed = point;
    processScheduled(state, cursor, point);
    if (point === to && beforeWorldEvents) beforeWorldEvents();
    processWorldEvents(state, cursor, point);
    cursor = point;
  }
}

function performAction(inputState, actionId) {
  const state = clone(inputState);
  const action = getAvailableActions(state, state.perspective).find((item) => item.id === actionId);
  if (!action) throw new Error(`Action indisponible pour cette position: ${actionId}`);
  state.turn += 1;
  state.completed.push(action.id);
  let beat;
  moveTime(state, action.duration, () => {
    executeNode(state, action, action.actor);
    beat = action.result || actionBeats[action.id] || { title: action.title, body: action.description, tone: "neutral" };
  });
  state.lastBeat = { actor: action.actor, ...beat };
  addLog(state, action.actor, beat.title, beat.body, beat.tone);
  return state;
}

function changePerspective(inputState, actor) {
  if (!ACTOR_ORDER.includes(actor)) throw new Error(`Position inconnue: ${actor}`);
  const state = clone(inputState);
  state.perspective = actor;
  return state;
}

function advanceToDeadline(inputState) {
  const state = clone(inputState);
  if (state.ended) return state;
  state.turn += 1;
  moveTime(state, state.deadline - state.elapsed);
  return state;
}

function formatClock(elapsed) {
  const allWeekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const startIndex = Math.max(0, allWeekdays.indexOf(CAMPAIGN.start.weekday));
  const totalHours = CAMPAIGN.start.hour + elapsed;
  const day = allWeekdays[(startIndex + Math.floor(totalHours / 24)) % allWeekdays.length];
  const hours = String(totalHours % 24).padStart(2, "0");
  return `${day} · ${hours} h 00`;
}

function getActorKnowledge(state, actor = state.perspective) {
  return state.actors[actor].knowledge.map((id) => ({ id, text: KNOWLEDGE[id] || id }));
}

function getOutcome(state) {
  const stopped = state.world.permitFrozen || state.world.depotHold;
  let heading = "Le monde a changé avant le recours";
  let summary = "L'ordre a produit ses effets. Les voies encore ouvertes commencent désormais depuis un déplacement réalisé.";
  if (stopped) {
    heading = "Ce matin, personne ne part";
    summary = state.world.permitFrozen
      ? "La chaîne juridique a atteint les personnes capables d'arrêter les machines. Le fond reste à juger."
      : "Un veto collectif tient encore. Sa continuité dépend de celles et ceux qui peuvent le maintenir.";
  }
  return {
    heading,
    summary,
    dimensions: [
      { label: "Sécurité immédiate", state: stopped ? "préservée" : "perdue", detail: stopped ? "L'expulsion n'est pas exécutée à l'échéance." : "La famille est déplacée sous contrainte." },
      { label: "Capacité de rester", state: stopped ? (state.world.roadClosed ? "entravée" : "ouverte") : "fermée", detail: state.world.routeTransmitted ? "Le passage de marée maintient une relation fragile au lieu." : "La fermeture de la route coupe des usages absents du dossier." },
      { label: "Recours", state: state.world.permitFrozen ? "effectif" : state.world.freezeSent ? "émis, non effectif" : state.world.recordsCompared ? "possible" : "faible", detail: state.world.permitFrozen ? "La suspension est reçue, appliquée et observable au dépôt." : state.world.freezeSent ? "Une signature existe, sans capacité d'arrêt vérifiée." : "Aucune suspension opposable n'agit sur le chantier." },
      { label: "Moyens de vivre", state: state.world.harvestSaved ? "partiellement préservés" : "exposés", detail: state.world.harvestSaved ? "La récolte est sauvée ; la saison suivante ne l'est pas." : "Récolte, bêtes et revenus absorbent encore la perte." },
      { label: "Capacité collective", state: state.world.publicAssembly ? "distribuée" : state.world.crewOrganized ? "locale" : "dépendante", detail: state.world.publicAssembly ? "Plusieurs groupes disposent de tâches et de mandats distincts." : "La suite repose encore sur peu de personnes et de canaux." },
      { label: "Mémoire", state: state.world.recordsDistributed ? "répartie" : state.world.recordsCompared ? "centralisée" : "lacunaire", detail: state.world.recordsDistributed ? "Des copies expurgées survivent dans plusieurs milieux." : "La contradiction dépend encore d'un tiroir ou n'a pas été rendue visible." },
      { label: "Parole d'Ina", state: state.world.protectedStory ? "transmise sous mandat" : state.world.interviewDeclined ? "retirée" : state.world.mandateDefined ? "protégée" : "sans cadre", detail: state.world.protectedStory ? "Le récit circule sans pièces brutes ni adresse." : state.world.interviewDeclined ? "Le refus est conservé sans être transformé en aveu." : "Aucune permission de diffusion n'a été établie." },
      { label: "Coût du refus", state: state.world.niloLostWork ? "porté par Nilo" : state.world.crewOrganized ? "mutualisé" : "invisible", detail: state.world.niloLostWork ? "Le chantier a absorbé son refus ; Nilo en conserve la sanction." : "Le collectif réduit sans supprimer le risque individuel." },
      { label: "Rive humide", state: state.world.wetlandDamaged ? "endommagée" : "non terrassée", detail: state.world.wetlandDamaged ? "Le remblai demeure même si une décision ultérieure change." : "L'absence de terrassement ne garantit pas la protection future du milieu." },
    ],
  };
}

const STORAGE_KEY = `corpus-game:${CAMPAIGN.id}:state-${CAMPAIGN.stateVersion}`;
const LEGACY_STORAGE_KEY = "corpus-ce-qui-reste-possible-v2";
const $ = (selector) => document.querySelector(selector);

const actorMeta = Object.fromEntries(Object.entries(CAMPAIGN.actors).map(([id, actor]) => [id, {
  color: actor.color, label: actor.name.split(" ")[0], scene: actor.scene,
}]));

const toneColors = {
  alert: "#b84e42", care: "#668b72", relay: "#7698ad", discovery: "#d09238",
  refusal: "#8e6884", cost: "#ad674f", action: "#487f72", world: "#7a766c", loss: "#ad4139", neutral: "#7a766c",
};

function migrateLegacyState(parsed) {
  if (parsed?.version === CAMPAIGN.stateVersion && parsed.campaignId === CAMPAIGN.id) return parsed;
  if (parsed?.version !== 2) return null;
  const initial = createInitialState();
  const world = Object.fromEntries(Object.keys(initial.world).map((flag) => [flag, Boolean(parsed.world?.[flag])]));
  world.recordPublication = parsed.completed?.includes("sora-publish-record") || false;
  world.storyPublication = parsed.completed?.includes("sora-publish-story") || false;
  const legacySchedules = {
    "deliver-freeze": ["mara-freeze", "mara"],
    "individual-replacement": ["nilo-alone", "nilo"],
    "seek-replacement-contractor": ["nilo-hold", "nilo"],
  };
  const scheduled = (parsed.scheduled || []).flatMap((item) => {
    const mapping = legacySchedules[item.type];
    if (!mapping) return [];
    const [sourceAction, actor] = mapping;
    const spec = CAMPAIGN.actions.find((action) => action.id === sourceAction)?.scheduled?.[0];
    return spec ? [{ at: item.at, actor, sourceAction, spec: structuredClone(spec) }] : [];
  });
  const events = (parsed.events || []).map((event) => {
    if (typeof event === "string") return event;
    return CAMPAIGN.timeline.find((candidate) => candidate.hour === event)?.id;
  }).filter(Boolean);
  const { pressure: _pressure, ...legacy } = parsed;
  return { ...initial, ...legacy, version: CAMPAIGN.stateVersion, campaignId: CAMPAIGN.id, world, scheduled, events };
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const restored = migrateLegacyState(JSON.parse(raw));
    return restored || createInitialState();
  } catch {
    return createInitialState();
  }
}

let state = restoreState();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $("#save-state").textContent = "état conservé sur cet appareil";
}

function person(x, y, color, scale = 1) {
  return `<g class="scene-person" transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="0" cy="-22" r="8" fill="${color}"/><path d="M-10-11 Q0-18 10-11 L13 20 L-13 20Z" fill="${color}"/>
    <path d="M-7 20 L-9 44 M7 20 L9 44" stroke="#202621" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function inaScene() {
  const w = state.world;
  return `<svg viewBox="0 0 900 410" role="img" aria-label="La maison d'Ina, la rive, le chemin et la vallée">
    <defs><linearGradient id="inaSky" x2="0" y2="1"><stop stop-color="#b9c9c0"/><stop offset="1" stop-color="#d9c9a8"/></linearGradient></defs>
    <rect width="900" height="410" fill="url(#inaSky)"/>
    <path d="M0 180 Q150 79 290 163 T570 143 T900 126 V410 H0Z" fill="#708774"/>
    <path d="M0 250 Q160 196 350 244 T720 218 T900 224 V410 H0Z" fill="#a7ab77"/>
    <path d="M0 344 Q180 269 360 335 T710 302 T900 315 V410 H0Z" fill="#668f91" opacity=".9"/>
    <path d="M65 362 Q210 270 390 301 T742 253" fill="none" stroke="#dbcba8" stroke-width="12" stroke-dasharray="3 8"/>
    <g transform="translate(150 196)"><path d="M0 54 L57 12 L121 54V128H0Z" fill="#ded5c2"/><path d="M-8 57 L58 4 L129 57" fill="none" stroke="#7d5142" stroke-width="14"/><rect x="46" y="82" width="25" height="46" fill="#5b493e"/><rect x="84" y="69" width="20" height="21" fill="#8eabb1"/></g>
    <g fill="#526c4f">${[305,350,400].map((x) => `<circle cx="${x}" cy="248" r="24"/><rect x="${x-3}" y="244" width="6" height="43" fill="#574b35"/>`).join("")}</g>
    ${w.stakesPlaced ? `<g stroke="#c04637" stroke-width="5">${[480,550,620].map((x) => `<path d="M${x} 272v62m-9-49h18"/>`).join("")}</g>` : ""}
    ${w.roadClosed ? `<g transform="translate(600 258)"><rect width="164" height="13" fill="#d7a83d"/><path d="M18 13v52m127-52v52" stroke="#252b28" stroke-width="9"/><text x="82" y="-8" text-anchor="middle" font-family="DM Mono" font-size="12">ROUTE FERMÉE</text></g>` : ""}
    ${w.machinesArrived ? `<g class="machine-moving" transform="translate(692 257)"><rect width="90" height="42" rx="4" fill="#d7a83d"/><circle cx="18" cy="48" r="14" fill="#292d2a"/><circle cx="72" cy="48" r="14" fill="#292d2a"/><path d="M70 3l61-39 8 8-48 48" fill="none" stroke="#d7a83d" stroke-width="13"/><path d="M128-40h27v24h-27z" fill="#d7a83d"/></g>` : ""}
    ${person(250, 310, "#d07459", 1.06)}
  </svg><div class="scene-caption">${w.forcedDisplacement ? "Les maisons sont debout. La famille n'y est plus." : w.roadClosed ? "La route carrossable est fermée. Un tracé n'est pas encore un passage." : "Le four, le véhicule et le troupeau passent entre trois maisons que le dossier compte séparément."}</div>`;
}

function maraScene() {
  const w = state.world;
  const paper = w.recordsCompared ? "HABITATION / SAISONNIÈRE" : "PARCELLE 8—14";
  return `<svg viewBox="0 0 900 410" role="img" aria-label="Le bureau de Mara, ses registres et le terminal provincial">
    <rect width="900" height="410" fill="#aab8aa"/><rect x="0" y="0" width="900" height="70" fill="#7e9183"/>
    <rect x="54" y="55" width="252" height="274" fill="#46534c"/><g fill="#d6ceb9">${[0,1,2,3].map((i)=>`<rect x="72" y="${78+i*60}" width="216" height="42"/><circle cx="266" cy="${99+i*60}" r="4" fill="#6e675c"/>`).join("")}</g>
    <rect x="355" y="240" width="475" height="28" fill="#63584c"/><rect x="392" y="268" width="22" height="104" fill="#554a40"/><rect x="777" y="268" width="22" height="104" fill="#554a40"/>
    <g transform="translate(461 122) rotate(-3)"><rect width="188" height="126" fill="#f0eadb" stroke="#7c776d"/><text x="18" y="33" font-family="DM Mono" font-size="12" fill="#565b57">${paper}</text><path d="M18 51h150M18 70h115M18 89h144" stroke="#9b978e"/><circle cx="153" cy="105" r="12" fill="none" stroke="#b84e42" stroke-width="3"/></g>
    ${w.freezeSent ? `<g transform="translate(678 102)"><rect width="156" height="117" fill="#f6f1e5" stroke="#486a5a" stroke-width="4"/><text x="78" y="38" text-anchor="middle" font-family="DM Mono" font-size="11">SUSPENSION</text><path d="M28 59h100M28 76h84" stroke="#7f8b84"/><circle cx="119" cy="92" r="17" fill="none" stroke="#486a5a" stroke-width="3"/></g>` : ""}
    ${person(350, 265, "#456b56", 1.05)}
  </svg><div class="scene-caption">${w.freezeSent ? "La suspension est partie. Le papier n'a encore arrêté aucune machine." : w.recordsCompared ? "Deux catégories incompatibles occupent le même bureau." : "Le registre montre un état. Il ne montre pas le passage qui l'a produit."}</div>`;
}

function niloScene() {
  const w = state.world;
  const stopped = w.permitFrozen || w.depotHold;
  return `<svg viewBox="0 0 900 410" role="img" aria-label="Le dépôt, ses six conducteurs et les engins du chantier">
    <rect width="900" height="410" fill="#9ea69c"/><rect y="278" width="900" height="132" fill="#77766b"/><path d="M0 278H900" stroke="#d5c6a2" stroke-width="5"/>
    <path d="M85 263V89H409V263" fill="#4a554f"/><path d="M67 90L247 25 429 90" fill="#35413b"/>
    <g transform="translate(463 202)" class="${stopped ? "" : "machine-moving"}"><rect width="224" height="79" rx="5" fill="#d7a83d"/><rect x="35" y="-54" width="91" height="58" fill="#c79832"/><rect x="48" y="-43" width="61" height="37" fill="#718b8c"/><circle cx="43" cy="87" r="28" fill="#292d2a"/><circle cx="181" cy="87" r="28" fill="#292d2a"/><path d="M184-3l114-73 11 12-88 94" fill="none" stroke="#d7a83d" stroke-width="22"/><path d="M294-86h48v43h-48z" fill="#d7a83d"/></g>
    <g>${[0,1,2,3,4,5].map((i)=>person(125+i*43, 287, i < (w.crewOrganized ? 4 : 0) ? "#d7a83d" : "#c2c5be", .65)).join("")}</g>
    ${w.freezeReceived ? `<g transform="translate(712 87) rotate(4)"><rect width="122" height="95" fill="#f6f1e5" stroke="#486a5a" stroke-width="3"/><text x="61" y="29" text-anchor="middle" font-family="DM Mono" font-size="9">SUSPENSION REÇUE</text><path d="M17 46h87M17 61h70" stroke="#777"/></g>` : ""}
    ${stopped ? `<g transform="translate(535 166)"><rect width="89" height="34" rx="17" fill="#17201d"/><text x="44" y="22" text-anchor="middle" fill="#f6f1e5" font-family="DM Mono" font-size="12">À L'ARRÊT</text></g>` : ""}
  </svg><div class="scene-caption">${w.permitFrozen ? "Le planning, les clés et les personnes portent désormais le même arrêt." : w.depotHold ? "Le dépôt refuse le départ. Un autre dépôt peut encore être cherché." : w.individualRefusal ? "Une machine manque un conducteur. Le système cherche déjà un autre corps." : "Un planning ne conduit rien. Six personnes rendent son ordre exécutable."}</div>`;
}

function soraScene() {
  const w = state.world;
  return `<svg viewBox="0 0 900 410" role="img" aria-label="Le studio de Sora, le micro et les sources de la rédaction">
    <rect width="900" height="410" fill="#879da7"/><rect x="55" y="48" width="790" height="298" rx="7" fill="#26343a"/>
    <rect x="80" y="75" width="420" height="238" fill="#151e22"/>
    <path d="M100 200 ${[0,1,2,3,4,5,6,7,8,9,10].map((i)=>`L${112+i*34} ${200 + (i%3-1)*42}`).join(" ")}" fill="none" stroke="#7698ad" stroke-width="4"/>
    <g transform="translate(542 77)">${[0,1,2,3,4,5,6,7,8,9,10].map((i)=>`<rect x="${(i%3)*84}" y="${Math.floor(i/3)*53}" width="69" height="39" fill="#ebe8de" transform="rotate(${(i%4)-2})"/>`).join("")}</g>
    ${w.protectedStory ? `<g transform="translate(618 287)"><circle r="42" fill="#d07459"/><path d="M-11-17v34a11 11 0 0022 0v-34a11 11 0 00-22 0zm-12 34a23 23 0 0046 0M0 40v22" fill="none" stroke="#f6f1e5" stroke-width="5"/></g>` : ""}
    ${person(453, 298, "#7698ad", 1)}
    ${w.administrativePublication ? `<text x="287" y="286" text-anchor="middle" fill="#e7b357" font-family="DM Mono" font-size="12">COMMUNIQUÉ DIFFUSÉ</text>` : ""}
  </svg><div class="scene-caption">${w.protectedStory ? "Une voix est ici, mais son adresse et ses pièces brutes n'y sont pas." : w.administrativePublication ? "Le communiqué est devenu le premier récit public. La vitesse a déjà distribué le terrain." : "Onze articles sont ouverts. La quantité ne dit pas encore combien de sources existent."}</div>`;
}

function genericScene() {
  const actor = state.actors[state.perspective];
  return `<svg viewBox="0 0 900 410" role="img" aria-label="${actor.place}">
    <rect width="900" height="410" fill="#a7bbb1"/>
    <circle cx="450" cy="190" r="94" fill="${actor.color}" opacity=".24"/>
    ${person(450, 270, actor.color, 1.2)}
  </svg><div class="scene-caption">${actor.name} agit depuis ${actor.place}. Cette position utilise encore la scène générique du moteur.</div>`;
}

const scenes = { ina: inaScene, mara: maraScene, nilo: niloScene, sora: soraScene };

function renderActors() {
  $("#actor-list").innerHTML = ACTOR_ORDER.map((id) => {
    const actor = state.actors[id];
    const incoming = actor.inbox.length;
    return `<button class="actor-button ${id === state.perspective ? "is-current" : ""}" style="--actor:${actorMeta[id].color}" data-actor="${id}" aria-pressed="${id === state.perspective}">
      <strong>${actor.name}</strong><span>${actor.role}<br>${actor.place}</span>${incoming ? `<em title="${incoming} relais reçu(s)">${incoming}</em>` : ""}
    </button>`;
  }).join("");
  $("#actor-list").querySelectorAll("[data-actor]").forEach((button) => button.addEventListener("click", () => {
    state = changePerspective(state, button.dataset.actor);
    save(); render();
  }));
}

function renderScene() {
  const actor = state.actors[state.perspective];
  const meta = actorMeta[state.perspective];
  document.documentElement.style.setProperty("--actor", meta.color);
  $("#actor-role").textContent = actor.role;
  $("#scene-title").textContent = meta.scene;
  $("#place-label").textContent = actor.place;
  $("#scene").innerHTML = (scenes[state.perspective] || genericScene)();
  const beat = state.lastBeat;
  const beatColor = toneColors[beat.tone] || toneColors.neutral;
  $("#last-beat").style.setProperty("--beat", beatColor);
  $("#last-beat").innerHTML = `<h3>${beat.title}</h3><p>${beat.body}</p>${beat.quote ? `<blockquote>${beat.quote}</blockquote>` : ""}`;
}

function renderActions() {
  const actions = getAvailableActions(state);
  $("#action-count").textContent = state.ended ? "échéance atteinte" : `${actions.length} possibilité${actions.length === 1 ? "" : "s"}`;
  $("#action-list").innerHTML = actions.length ? actions.map((action) => `<button class="action-card" style="--actor:${actorMeta[action.actor].color}" data-action="${action.id}">
    <span class="verb">${action.verb}</span><span class="duration">${action.duration} h</span><h3>${action.title}</h3><p>${action.description}</p><small class="tension" title="${action.tension}">Tension · ${action.tension}</small>
  </button>`).join("") : `<p class="no-actions">${state.ended ? "L'échéance est passée. Le bilan ne referme pas ce qui reste à faire." : "Rien de plus n'est faisable depuis cette position avant vendredi. Habitez quelqu'un d'autre ou laissez le temps courir."}</p>`;
  $("#action-list").querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => doAction(button.dataset.action)));
}

function renderKnowledge() {
  const facts = getActorKnowledge(state);
  $("#knowledge-list").innerHTML = facts.map((fact) => `<article class="knowledge-card"><span>${fact.id.replaceAll("-", " ")}</span><p>${fact.text}</p></article>`).join("");
}

function renderRelays() {
  const relays = state.relays.filter((relay) => relay.from === state.perspective || relay.to === state.perspective).slice(0, 6);
  $("#relay-list").innerHTML = relays.length ? relays.map((relay) => {
    const incoming = relay.to === state.perspective;
    const other = state.actors[incoming ? relay.from : relay.to]?.name || (incoming ? relay.from : relay.to);
    return `<article class="relay-card"><strong>${incoming ? "Reçu de" : "Envoyé à"} ${other}</strong><p>${relay.purpose}</p><small>${formatClock(relay.hour)} · ${relay.channel}</small></article>`;
  }).join("") : `<p class="empty-relay">Aucun support n'est encore arrivé ici.<br />Le savoir du joueur ne remplit pas cette colonne.</p>`;
}

function renderTime() {
  $("#clock-label").textContent = formatClock(state.elapsed);
  const remaining = Math.max(0, state.deadline - state.elapsed);
  $("#countdown").textContent = state.ended ? "échéance atteinte" : `${remaining} h avant l'expulsion`;
  const progress = Math.min(100, (state.elapsed / state.deadline) * 100);
  $("#timeline-track").innerHTML = `<div id="timeline-fill" class="timeline-fill"></div><div class="timeline-now" id="timeline-now"><span>maintenant</span></div>${CAMPAIGN.timeline.map((event, index) => {
    const at = Math.min(100, event.hour / state.deadline * 100);
    return `<div class="milestone ${index === CAMPAIGN.timeline.length - 1 ? "end" : ""}" style="--at:${at}%"><i></i><span>${event.when}</span><strong>${event.label}</strong></div>`;
  }).join("")}`;
  $("#timeline-fill").style.width = `${progress}%`;
  $("#timeline-now").style.left = `${progress}%`;
  document.querySelectorAll(".milestone").forEach((node) => {
    const value = Number.parseFloat(node.style.getPropertyValue("--at"));
    node.classList.toggle("is-past", progress >= value);
  });
}

function renderJournal() {
  $("#journal-list").innerHTML = state.log.map((entry) => `<article class="journal-entry"><time>${formatClock(entry.hour)}<br>${state.actors[entry.actor]?.name || "Monde"}</time><div><h3>${entry.title}</h3><p>${entry.body}</p></div></article>`).join("");
}

function render() {
  $("#campaign-subtitle").textContent = CAMPAIGN.subtitle;
  $("#campaign-collection").textContent = CAMPAIGN.collection;
  $("#campaign-title").textContent = CAMPAIGN.title;
  $("#intro-premise").textContent = CAMPAIGN.premise;
  renderActors(); renderScene(); renderActions(); renderKnowledge(); renderRelays(); renderTime(); renderJournal();
}

function showBeat() {
  const beat = state.lastBeat;
  $("#beat-dialog").style.setProperty("--beat", toneColors[beat.tone] || toneColors.neutral);
  $("#beat-content").innerHTML = `<p class="overline">${formatClock(state.elapsed)} · ${state.actors[beat.actor].name}</p><h2>${beat.title}</h2><p>${beat.body}</p>${beat.quote ? `<blockquote>${beat.quote}</blockquote>` : ""}`;
  $("#beat-dialog").showModal();
}

function showOutcome() {
  const outcome = getOutcome(state);
  $("#outcome-content").innerHTML = `<p class="overline">Vendredi · 07 h 00 · Aucun score global</p><h2>${outcome.heading}</h2><p class="outcome-summary">${outcome.summary}</p><div class="outcome-grid">${outcome.dimensions.map((item) => `<article class="outcome-card"><span>${item.label}</span><strong>${item.state}</strong><p>${item.detail}</p></article>`).join("")}</div>`;
  $("#outcome-dialog").showModal();
}

function doAction(id) {
  try {
    state = performAction(state, id); save(); render(); showBeat();
  } catch (error) {
    $("#save-state").textContent = error.message;
  }
}

function restart() {
  state = createInitialState(); localStorage.removeItem(STORAGE_KEY); save(); render();
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
  $("#intro-dialog").showModal();
}

$("#continue-button").addEventListener("click", () => {
  $("#beat-dialog").close();
  if (state.ended) showOutcome();
});
$("#advance-button").addEventListener("click", () => {
  if (!state.ended) { state = advanceToDeadline(state); save(); render(); }
  showOutcome();
});
$("#journal-button").addEventListener("click", () => $("#journal-dialog").showModal());
$("[data-close='journal-dialog']").addEventListener("click", () => $("#journal-dialog").close());
$("#close-outcome").addEventListener("click", () => $("#outcome-dialog").close());
$("#restart-button").addEventListener("click", restart);
$("#outcome-restart").addEventListener("click", restart);
$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state, outcome: getOutcome(state) }, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "corpus-sereine-etat.json"; link.click(); URL.revokeObjectURL(link.href);
});

const hadSavedState = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
render();
if (!hadSavedState) $("#intro-dialog").showModal();

})();
