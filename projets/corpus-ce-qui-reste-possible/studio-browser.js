/* Generated builder bundle. */
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
const issue = (level, code, path, message) => ({ level, code, path, message });

function duplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

function walkKeys(value, visit, path = "campaign") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, `${path}.${key}`);
    walkKeys(child, visit, `${path}.${key}`);
  }
}

function analyzeReachability(campaign) {
  const actorIds = Object.keys(campaign.actors || {});
  const actions = campaign.actions || [];
  const limit = 100000;
  const initial = {
    elapsed: 0,
    ended: false,
    world: new Set(),
    known: Object.fromEntries(actorIds.map((id) => [id, new Set(campaign.actors[id].initialKnowledge || [])])),
    completed: new Set(),
    scheduled: [],
    events: new Set(),
  };

  const copy = (state) => ({
    elapsed: state.elapsed,
    ended: state.ended,
    world: new Set(state.world),
    known: Object.fromEntries(actorIds.map((id) => [id, new Set(state.known[id])])),
    completed: new Set(state.completed),
    scheduled: state.scheduled.map((item) => ({ ...item })),
    events: new Set(state.events),
  });
  const conditionsHold = (state, requirements = {}, actor) => (
    (requirements.knowledge || []).every((fact) => state.known[actor]?.has(fact))
    && (requirements.notKnowledge || []).every((fact) => !state.known[actor]?.has(fact))
    && (!(requirements.anyKnowledge || []).length || requirements.anyKnowledge.some((fact) => state.known[actor]?.has(fact)))
    && (requirements.world || []).every((flag) => state.world.has(flag))
    && (requirements.notWorld || []).every((flag) => !state.world.has(flag))
    && (!(requirements.anyWorld || []).length || requirements.anyWorld.some((flag) => state.world.has(flag)))
  );
  const duration = (action, state) => {
    const variant = (action.durationVariants || []).find((candidate) => (
      (candidate.whenWorld || []).every((flag) => state.world.has(flag))
      && (candidate.unlessWorld || []).every((flag) => !state.world.has(flag))
    ));
    return variant?.duration ?? action.duration;
  };
  const applyConsequences = (state, node, actor) => {
    for (const flag of node.grants?.world || []) state.world.add(flag);
    for (const flag of node.clears?.world || []) state.world.delete(flag);
    for (const grant of node.grants?.knowledge || []) state.known[grant.actor]?.add(grant.fact);
    for (const relay of node.relays || []) state.known[relay.to]?.add(relay.fact);
    for (const conditional of node.conditionalGrants || []) {
      if (conditionsHold(state, conditional.when, actor)) executeNode(state, conditional, actor);
    }
    if (node.cancelsScheduledFrom?.length) {
      state.scheduled = state.scheduled.filter((item) => !node.cancelsScheduledFrom.includes(item.sourceAction));
    }
    for (const [index, scheduled] of (node.scheduled || []).entries()) {
      if (scheduled.scheduleWhen && !conditionsHold(state, scheduled.scheduleWhen, actor)) continue;
      state.scheduled.push({ at: state.elapsed + scheduled.after, actor, sourceAction: node.id, index, spec: scheduled });
    }
  };
  const executeNode = (state, node, actor) => {
    if (node.when && !conditionsHold(state, node.when, actor)) return;
    applyConsequences(state, node, actor);
    const branch = (node.branches || []).find((candidate) => !candidate.when || conditionsHold(state, candidate.when, actor));
    if (branch) executeNode(state, branch, actor);
  };
  const advance = (state, amount, completedAction = null) => {
    const from = state.elapsed;
    const to = Math.min(campaign.deadline, from + amount);
    const points = [...new Set([
      ...state.scheduled.filter((item) => from < item.at && item.at <= to).map((item) => item.at),
      ...(campaign.timeline || []).filter((event) => from < event.hour && event.hour <= to).map((event) => event.hour),
      to,
    ])].sort((a, b) => a - b);
    let cursor = from;
    for (const point of points) {
      state.elapsed = point;
      for (const item of state.scheduled.filter((candidate) => cursor < candidate.at && candidate.at <= point).sort((a, b) => a.at - b.at)) {
        executeNode(state, item.spec, item.actor);
      }
      state.scheduled = state.scheduled.filter((item) => item.at > point);
      if (point === to && completedAction) executeNode(state, completedAction, completedAction.actor);
      for (const event of (campaign.timeline || []).filter((candidate) => cursor < candidate.hour && candidate.hour <= point && !state.events.has(candidate.id))) {
        state.events.add(event.id);
        executeNode(state, event, campaign.initialPerspective);
        if (event.endCampaign) state.ended = true;
      }
      cursor = point;
    }
  };
  const keyOf = (state) => JSON.stringify([
    state.elapsed,
    state.ended,
    [...state.world].sort(),
    actorIds.map((id) => [id, [...state.known[id]].sort()]),
    [...state.completed].sort(),
    state.scheduled.map((item) => [item.at, item.sourceAction, item.index]).sort(),
    [...state.events].sort(),
  ]);

  const reached = new Set();
  const queue = [initial];
  const visited = new Set([keyOf(initial)]);
  let truncated = false;
  while (queue.length) {
    const state = queue.shift();
    const available = actions.filter((action) => (
      !state.ended
      && !state.completed.has(action.id)
      && conditionsHold(state, action.requires, action.actor)
      && state.elapsed + duration(action, state) <= campaign.deadline
    ));
    for (const action of available) reached.add(action.id);
    if (reached.size === actions.length) break;
    for (const action of available) {
      const next = copy(state);
      next.completed.add(action.id);
      advance(next, duration(action, next), action);
      const key = keyOf(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
      if (visited.size >= limit) {
        truncated = true;
        queue.length = 0;
        break;
      }
    }
  }
  return {
    reached,
    unreachable: truncated ? [] : actions.filter((action) => !reached.has(action.id)).map((action) => action.id),
    unresolved: truncated ? actions.filter((action) => !reached.has(action.id)).map((action) => action.id) : [],
    exploredStates: visited.size,
    truncated,
    method: "bounded branch-and-time exploration",
  };
}

function validateCampaign(campaign) {
  const issues = [];
  if (!campaign || typeof campaign !== "object") {
    return [issue("error", "CAMPAIGN_TYPE", "campaign", "La campagne doit être un objet JSON.")];
  }
  if (campaign.schemaVersion !== 2) issues.push(issue("error", "SCHEMA_VERSION", "campaign.schemaVersion", "Version de schéma attendue : 2."));
  if (!Number.isInteger(campaign.stateVersion) || campaign.stateVersion < 1) issues.push(issue("error", "STATE_VERSION", "campaign.stateVersion", "Une version d'état entière et positive est obligatoire."));
  if (!campaign.id) issues.push(issue("error", "CAMPAIGN_ID", "campaign.id", "Identifiant de campagne manquant."));
  if (!Number.isFinite(campaign.deadline) || campaign.deadline <= 0) issues.push(issue("error", "DEADLINE", "campaign.deadline", "L'échéance doit être un nombre positif."));

  const actors = campaign.actors || {};
  const actorIds = new Set(Object.keys(actors));
  const knowledgeIds = new Set(Object.keys(campaign.knowledge || {}));
  const worldFlags = new Set(campaign.worldFlags || []);
  const actions = campaign.actions || [];
  const actionIds = new Set(actions.map((action) => action.id));

  if (actorIds.size < 2) issues.push(issue("warning", "ACTOR_PLURALITY", "campaign.actors", "Moins de deux positions : le changement de perspective ne sera pas jouable."));
  if (!actorIds.has(campaign.initialPerspective)) issues.push(issue("error", "INITIAL_PERSPECTIVE", "campaign.initialPerspective", "La position initiale doit référencer un acteur déclaré."));

  for (const [actorId, actor] of Object.entries(actors)) {
    if (!actor.name || !actor.role || !actor.place) issues.push(issue("error", "ACTOR_FIELDS", `campaign.actors.${actorId}`, "Nom, rôle et lieu sont obligatoires."));
    for (const fact of actor.initialKnowledge || []) {
      if (!knowledgeIds.has(fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", `campaign.actors.${actorId}.initialKnowledge`, `Savoir inconnu : ${fact}.`));
    }
  }

  function validateRequirements(requirements = {}, path) {
    for (const fact of [...(requirements.knowledge || []), ...(requirements.notKnowledge || []), ...(requirements.anyKnowledge || [])]) {
      if (!knowledgeIds.has(fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", path, `Savoir inconnu : ${fact}.`));
    }
    for (const flag of [...(requirements.world || []), ...(requirements.notWorld || []), ...(requirements.anyWorld || [])]) {
      if (!worldFlags.has(flag)) issues.push(issue("error", "UNKNOWN_WORLD_FLAG", path, `État du monde inconnu : ${flag}.`));
    }
  }

  function validateNode(node, path, sourceActor) {
    validateRequirements(node.when, `${path}.when`);
    validateRequirements(node.scheduleWhen, `${path}.scheduleWhen`);
    for (const flag of node.grants?.world || []) {
      if (!worldFlags.has(flag)) issues.push(issue("error", "UNKNOWN_WORLD_FLAG", `${path}.grants.world`, `État inconnu : ${flag}.`));
    }
    for (const flag of node.clears?.world || []) {
      if (!worldFlags.has(flag)) issues.push(issue("error", "UNKNOWN_WORLD_FLAG", `${path}.clears.world`, `État inconnu : ${flag}.`));
    }
    for (const grant of node.grants?.knowledge || []) {
      if (!actorIds.has(grant.actor)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.grants.knowledge`, `Destinataire inconnu : ${grant.actor}.`));
      if (!knowledgeIds.has(grant.fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", `${path}.grants.knowledge`, `Savoir inconnu : ${grant.fact}.`));
      if (sourceActor && grant.actor !== sourceActor) {
        const relayed = (node.relays || []).some((relay) => relay.to === grant.actor && relay.fact === grant.fact);
        if (!relayed) issues.push(issue("error", "KNOWLEDGE_LEAK", `${path}.grants.knowledge`, `${grant.actor} apprend « ${grant.fact} » sans relais déclaré.`));
      }
    }
    for (const relay of node.relays || []) {
      if (relay.from && !actorIds.has(relay.from)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.relays`, `Émetteur inconnu : ${relay.from}.`));
      if (!actorIds.has(relay.to)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.relays`, `Destinataire inconnu : ${relay.to}.`));
      if (!knowledgeIds.has(relay.fact)) issues.push(issue("error", "UNKNOWN_KNOWLEDGE", `${path}.relays`, `Savoir inconnu : ${relay.fact}.`));
      if (!relay.channel || !relay.purpose) issues.push(issue("error", "INCOMPLETE_RELAY", `${path}.relays`, "Un relais exige un canal et une finalité."));
    }
    for (const trace of node.creates || []) {
      if (!trace.id || !actorIds.has(trace.holder || sourceActor)) issues.push(issue("error", "INVALID_TRACE", `${path}.creates`, "Une trace exige un identifiant et un détenteur déclaré."));
    }
    for (const source of node.cancelsScheduledFrom || []) {
      if (!actionIds.has(source)) issues.push(issue("error", "UNKNOWN_ACTION", `${path}.cancelsScheduledFrom`, `Action source inconnue : ${source}.`));
    }
    if (node.result) {
      if (!node.result.title || !node.result.body) issues.push(issue("error", "RESULT_FIELDS", `${path}.result`, "Un résultat exige un titre et un corps."));
      if (node.result.actor && !actorIds.has(node.result.actor)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.result.actor`, `Acteur de résultat inconnu : ${node.result.actor}.`));
    }
    for (const [index, conditional] of (node.conditionalGrants || []).entries()) validateNode(conditional, `${path}.conditionalGrants.${index}`, sourceActor);
    for (const [index, scheduled] of (node.scheduled || []).entries()) {
      if (!Number.isFinite(scheduled.after) || scheduled.after < 0) issues.push(issue("error", "SCHEDULE_DELAY", `${path}.scheduled.${index}`, "Un effet différé exige un délai positif ou nul."));
      validateNode(scheduled, `${path}.scheduled.${index}`, sourceActor);
    }
    for (const [index, branch] of (node.branches || []).entries()) validateNode(branch, `${path}.branches.${index}`, sourceActor);
  }

  for (const id of duplicates(actions.map((action) => action.id))) issues.push(issue("error", "DUPLICATE_ACTION", "campaign.actions", `Action dupliquée : ${id}.`));
  for (const action of actions) {
    const path = `campaign.actions.${action.id || "?"}`;
    if (!actorIds.has(action.actor)) issues.push(issue("error", "UNKNOWN_ACTOR", `${path}.actor`, `Position inconnue : ${action.actor}.`));
    if (!action.title || !action.verb || !action.description) issues.push(issue("error", "ACTION_FIELDS", path, "Verbe, titre et description sont obligatoires."));
    if (!Number.isFinite(action.duration) || action.duration <= 0) issues.push(issue("error", "ACTION_DURATION", `${path}.duration`, "La durée doit être strictement positive."));
    if (action.duration > campaign.deadline) issues.push(issue("warning", "ACTION_AFTER_DEADLINE", `${path}.duration`, "Cette action ne peut jamais tenir dans la campagne."));
    validateRequirements(action.requires, `${path}.requires`);
    for (const [index, variant] of (action.durationVariants || []).entries()) {
      if (!Number.isFinite(variant.duration) || variant.duration <= 0) issues.push(issue("error", "ACTION_DURATION", `${path}.durationVariants.${index}`, "La durée variante doit être strictement positive."));
      validateRequirements({ world: variant.whenWorld, notWorld: variant.unlessWorld }, `${path}.durationVariants.${index}`);
    }
    validateNode(action, path, action.actor);
  }

  const timeline = campaign.timeline || [];
  for (const id of duplicates(timeline.map((event) => event.id))) issues.push(issue("error", "DUPLICATE_EVENT", "campaign.timeline", `Événement dupliqué : ${id}.`));
  let previousHour = -Infinity;
  for (const event of timeline) {
    if (!Number.isFinite(event.hour) || event.hour < 0 || event.hour > campaign.deadline) issues.push(issue("error", "EVENT_HOUR", `campaign.timeline.${event.id}`, "L'événement doit se trouver entre le début et l'échéance."));
    if (event.hour < previousHour) issues.push(issue("warning", "EVENT_ORDER", `campaign.timeline.${event.id}`, "Les événements ne sont pas ordonnés chronologiquement."));
    previousHour = event.hour;
    validateNode(event, `campaign.timeline.${event.id}`, null);
  }
  if (!timeline.some((event) => event.hour === campaign.deadline && event.endCampaign)) issues.push(issue("warning", "NO_DEADLINE_EVENT", "campaign.timeline", "Aucun événement terminal ne matérialise l'échéance."));

  const forbidden = new Set(["score", "totalScore", "justiceScore", "moralityScore", "pressure"]);
  walkKeys(campaign, (key, path) => {
    if (forbidden.has(key)) issues.push(issue("error", "GLOBAL_SCORE", path, "Le format ne doit pas réintroduire un score global."));
  });

  if (issues.some((item) => item.level === "error")) return issues;
  const reachability = analyzeReachability(campaign);
  if (reachability.truncated) {
    issues.push(issue("warning", "REACHABILITY_LIMIT", "campaign.actions", `Exploration interrompue après ${reachability.exploredStates} états ; ${reachability.unresolved.length} action(s) restent indéterminées.`));
  }
  for (const actionId of reachability.unreachable) {
    issues.push(issue("warning", "UNREACHABLE_ACTION", `campaign.actions.${actionId}`, "Aucune branche jouable ne rend cette action accessible dans le temps imparti."));
  }
  return issues;
}

function summarizeCampaign(campaign, issues = validateCampaign(campaign)) {
  return {
    actors: Object.keys(campaign.actors || {}).length,
    knowledge: Object.keys(campaign.knowledge || {}).length,
    actions: (campaign.actions || []).length,
    events: (campaign.timeline || []).length,
    errors: issues.filter((item) => item.level === "error").length,
    warnings: issues.filter((item) => item.level === "warning").length,
  };
}

const STORAGE_PREFIX = "corpus-builder-draft";
const $ = (selector) => document.querySelector(selector);
const clone = (value) => structuredClone(value);
const storageKey = (source = ACTIVE_CAMPAIGN) => `${STORAGE_PREFIX}:${source.id}:schema-${source.schemaVersion}`;

let campaign = restoreDraft();
let activeView = "perspectives";
let activeActor = Object.keys(campaign.actors)[0];
let actionFilter = "all";
let sourceError = null;
let lastIssues = [];
let validationTimer = null;

function restoreDraft() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey()));
    return stored?.schemaVersion === ACTIVE_CAMPAIGN.schemaVersion ? stored : clone(ACTIVE_CAMPAIGN);
  } catch {
    return clone(ACTIVE_CAMPAIGN);
  }
}

function persist() {
  localStorage.setItem(storageKey(campaign), JSON.stringify(campaign));
  $("#draft-status").textContent = "brouillon local";
  $("#draft-status").classList.add("is-dirty");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function setAtPath(target, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  cursor[key] = value;
}

function bindField(selector, path, transform = (value) => value, rerender = false) {
  const input = $(selector);
  if (!input) return;
  input.addEventListener("input", () => {
    setAtPath(campaign, path, transform(input.value)); sourceError = null; changed();
  });
  if (rerender) input.addEventListener("change", renderWorkbench);
}

function renderIdentity() {
  $("#campaign-title").value = campaign.title || "";
  $("#campaign-premise").value = campaign.premise || "";
  $("#campaign-deadline").value = campaign.deadline || "";
}

function bindIdentity() {
  bindField("#campaign-title", "title");
  bindField("#campaign-premise", "premise");
  bindField("#campaign-deadline", "deadline", (value) => Number(value), true);
}

function renderStats() {
  const summary = summarizeCampaign(campaign, lastIssues);
  $("#campaign-stats").innerHTML = [
    [summary.actors, "positions"], [summary.actions, "actions"], [summary.knowledge, "savoirs"], [summary.events, "seuils"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderDiagnostics() {
  const issues = sourceError ? [{ level: "error", code: "JSON_PARSE", path: "campaign", message: sourceError }] : validateCampaign(campaign);
  lastIssues = issues;
  const errors = issues.filter((item) => item.level === "error").length;
  const warnings = issues.filter((item) => item.level === "warning").length;
  $("#validation-summary").innerHTML = `<div class="validation-count error"><strong>${errors}</strong><span>erreur${errors === 1 ? "" : "s"}</span></div><div class="validation-count warning"><strong>${warnings}</strong><span>alerte${warnings === 1 ? "" : "s"}</span></div>`;
  $("#diagnostics-list").innerHTML = issues.length ? issues.map((item) => `<article class="diagnostic" style="--level:${item.level === "error" ? "#b84e42" : "#d7a83d"}"><strong>${item.code}</strong><code>${escapeHtml(item.path)}</code><p>${escapeHtml(item.message)}</p></article>`).join("") : `<div class="all-clear"><strong>Structure et parcours cohérents.</strong><br>Références, relais et effets sont valides ; chaque action apparaît dans au moins une branche jouable avant l'échéance.</div>`;
}

function perspectiveView() {
  if (!campaign.actors[activeActor]) activeActor = Object.keys(campaign.actors)[0];
  const actor = campaign.actors[activeActor];
  return `<div class="actor-editor-grid">
    <div class="actor-picker">${Object.entries(campaign.actors).map(([id, item]) => `<button class="actor-pick ${id === activeActor ? "is-active" : ""}" style="--color:${escapeHtml(item.color)}" data-actor="${id}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.role)}</span></button>`).join("")}</div>
    <div class="actor-form">
      <label class="editor-field">Nom<input data-actor-field="name" value="${escapeHtml(actor.name)}"></label>
      <label class="editor-field">Couleur<input data-actor-field="color" type="color" value="${escapeHtml(actor.color)}"></label>
      <label class="editor-field">Rôle<input data-actor-field="role" value="${escapeHtml(actor.role)}"></label>
      <label class="editor-field">Lieu<input data-actor-field="place" value="${escapeHtml(actor.place)}"></label>
      <label class="editor-field wide">Nom de la scène<input data-actor-field="scene" value="${escapeHtml(actor.scene)}"></label>
      <div class="editor-field wide">Savoirs présents au départ<div class="knowledge-checks">${Object.entries(campaign.knowledge).map(([id, text]) => `<label class="knowledge-check"><input type="checkbox" data-knowledge="${id}" ${actor.initialKnowledge.includes(id) ? "checked" : ""}><span><strong>${escapeHtml(id)}</strong><br>${escapeHtml(text)}</span></label>`).join("")}</div></div>
    </div>
  </div>`;
}

function timelineView() {
  const deadline = Math.max(1, campaign.deadline || 1);
  return `<div class="timeline-editor">${campaign.timeline.map((event, index) => `<div class="timeline-row">
    <label class="editor-field">Heure<input type="number" min="0" max="${deadline}" data-event="${index}" data-event-field="hour" value="${event.hour}"></label>
    <label class="editor-field">Nom<input data-event="${index}" data-event-field="label" value="${escapeHtml(event.label)}"></label>
    <label class="editor-field">Affichage<input data-event="${index}" data-event-field="when" value="${escapeHtml(event.when)}"></label>
    <label class="knowledge-check"><input type="checkbox" data-event="${index}" data-event-field="irreversible" ${event.irreversible ? "checked" : ""}> Irréversible</label>
  </div>`).join("")}</div>
  <div class="timeline-preview">${campaign.timeline.map((event) => `<div class="timeline-event" style="--at:${Math.min(100, Math.max(0, event.hour / deadline * 100))}%;--event-color:${event.irreversible ? "#b84e42" : "#487f72"}"><span>${escapeHtml(event.when)}</span><strong>${escapeHtml(event.label)}</strong></div>`).join("")}</div>`;
}

function dependencyTags(action) {
  const requires = action.requires || {};
  const tags = [
    ...(requires.knowledge || []).map((id) => `sait:${id}`),
    ...(requires.anyKnowledge || []).map((id) => `sait?:${id}`),
    ...(requires.world || []).map((id) => `monde:${id}`),
    ...(action.relays || []).map((relay) => `→ ${relay.to}:${relay.fact}`),
  ];
  return tags.length ? tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : "<span>sans prérequis</span>";
}

function actionsView() {
  const filtered = campaign.actions.filter((action) => actionFilter === "all" || action.actor === actionFilter);
  return `<div class="actions-toolbar"><button class="filter-button ${actionFilter === "all" ? "is-active" : ""}" data-filter="all">Toutes</button>${Object.entries(campaign.actors).map(([id, actor]) => `<button class="filter-button ${actionFilter === id ? "is-active" : ""}" data-filter="${id}">${escapeHtml(actor.name)}</button>`).join("")}</div>
  <div class="action-editor-list">${filtered.map((action) => {
    const index = campaign.actions.indexOf(action);
    return `<article class="action-row"><header><div><em>${escapeHtml(action.verb)} · ${escapeHtml(action.actor)}</em><strong>${escapeHtml(action.title)}</strong></div><label class="editor-field">Durée<input type="number" min="1" data-action-index="${index}" data-action-field="duration" value="${action.duration}"></label></header><label class="editor-field">Titre<input data-action-index="${index}" data-action-field="title" value="${escapeHtml(action.title)}"></label><p>${escapeHtml(action.description)}</p><div class="action-deps">${dependencyTags(action)}</div></article>`;
  }).join("")}</div>`;
}

function sourceView() {
  return `<div class="source-actions"><button id="apply-source" class="studio-button primary" type="button">Appliquer le JSON</button><button id="format-source" class="studio-button" type="button">Reformater</button><span class="source-note">Les diagnostics ne changent qu'après application.</span></div><textarea id="source-editor" class="source-editor" spellcheck="false">${escapeHtml(JSON.stringify(campaign, null, 2))}</textarea>`;
}

const viewMeta = {
  perspectives: ["Positions situées", "Qui sait quoi, et depuis où ?", perspectiveView],
  timeline: ["Temps politique", "Quels seuils ferment quelles possibilités ?", timelineView],
  actions: ["Verbes et dépendances", "Que peut-on réellement faire ?", actionsView],
  source: ["Représentation complète", "Source JSON de la campagne", sourceView],
};

function renderWorkbench() {
  const [kicker, title, renderView] = viewMeta[activeView];
  $("#view-kicker").textContent = kicker;
  $("#view-title").textContent = title;
  $("#workbench-content").innerHTML = renderView();
  bindWorkbench();
}

function changed() {
  sourceError = null;
  persist();
  clearTimeout(validationTimer);
  validationTimer = setTimeout(() => { renderDiagnostics(); renderStats(); }, 140);
}

function bindWorkbench() {
  document.querySelectorAll("[data-actor]").forEach((button) => button.addEventListener("click", () => { activeActor = button.dataset.actor; renderWorkbench(); }));
  document.querySelectorAll("[data-actor-field]").forEach((input) => input.addEventListener("input", () => { campaign.actors[activeActor][input.dataset.actorField] = input.value; changed(); }));
  document.querySelectorAll("[data-knowledge]").forEach((input) => input.addEventListener("change", () => {
    const list = campaign.actors[activeActor].initialKnowledge;
    if (input.checked && !list.includes(input.dataset.knowledge)) list.push(input.dataset.knowledge);
    if (!input.checked) campaign.actors[activeActor].initialKnowledge = list.filter((id) => id !== input.dataset.knowledge);
    changed();
  }));
  document.querySelectorAll("[data-event-field]").forEach((input) => input.addEventListener("change", () => {
    const value = input.type === "checkbox" ? input.checked : input.dataset.eventField === "hour" ? Number(input.value) : input.value;
    campaign.timeline[Number(input.dataset.event)][input.dataset.eventField] = value; changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { actionFilter = button.dataset.filter; renderWorkbench(); }));
  document.querySelectorAll("[data-action-field]").forEach((input) => input.addEventListener("change", () => {
    const value = input.dataset.actionField === "duration" ? Number(input.value) : input.value;
    campaign.actions[Number(input.dataset.actionIndex)][input.dataset.actionField] = value; changed(); renderWorkbench();
  }));
  $("#apply-source")?.addEventListener("click", () => {
    try { campaign = JSON.parse($("#source-editor").value); sourceError = null; persist(); renderIdentity(); renderDiagnostics(); renderStats(); renderWorkbench(); }
    catch (error) { sourceError = error.message; renderDiagnostics(); }
  });
  $("#format-source")?.addEventListener("click", () => {
    try { $("#source-editor").value = JSON.stringify(JSON.parse($("#source-editor").value), null, 2); sourceError = null; }
    catch (error) { sourceError = error.message; renderDiagnostics(); }
  });
}

function render() {
  renderIdentity(); renderDiagnostics(); renderStats(); renderWorkbench();
  if (localStorage.getItem(storageKey(campaign))) { $("#draft-status").textContent = "brouillon local"; $("#draft-status").classList.add("is-dirty"); }
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
  activeView = button.dataset.view;
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
  renderWorkbench();
}));

$("#validate-button").addEventListener("click", () => {
  clearTimeout(validationTimer); renderDiagnostics(); renderStats();
  $("#diagnostics-list").scrollTo({ top: 0, behavior: "smooth" });
});
$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${campaign.id || "campaign"}.campaign.json`; link.click(); URL.revokeObjectURL(link.href);
});
$("#reset-button").addEventListener("click", () => {
  if (!window.confirm("Effacer le brouillon local et revenir à la version compilée ?")) return;
  localStorage.removeItem(storageKey(campaign)); campaign = clone(ACTIVE_CAMPAIGN); localStorage.removeItem(storageKey()); sourceError = null;
  $("#draft-status").textContent = "version compilée"; $("#draft-status").classList.remove("is-dirty"); render();
});

bindIdentity();
render();

})();
