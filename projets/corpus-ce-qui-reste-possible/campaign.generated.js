/* Generated from campaigns/sereine.campaign.json. */
export const ACTIVE_CAMPAIGN = Object.freeze({
  "schemaVersion": 3,
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
  "outcome": {
    "variants": [
      {
        "when": {
          "world": [
            "permitFrozen"
          ]
        },
        "heading": "Ce matin, personne ne part",
        "summary": "La chaîne juridique a atteint les personnes capables d'arrêter les machines. Le fond reste à juger."
      },
      {
        "when": {
          "world": [
            "depotHold"
          ]
        },
        "heading": "Ce matin, personne ne part",
        "summary": "Un veto collectif tient encore. Sa continuité dépend de celles et ceux qui peuvent le maintenir."
      },
      {
        "heading": "Le monde a changé avant le recours",
        "summary": "L'ordre a produit ses effets. Les voies encore ouvertes commencent désormais depuis un déplacement réalisé."
      }
    ],
    "dimensions": [
      {
        "label": "Sécurité immédiate",
        "variants": [
          {
            "when": {
              "anyWorld": [
                "permitFrozen",
                "depotHold"
              ]
            },
            "state": "préservée",
            "detail": "L'expulsion n'est pas exécutée à l'échéance."
          },
          {
            "state": "perdue",
            "detail": "La famille est déplacée sous contrainte."
          }
        ]
      },
      {
        "label": "Capacité de rester",
        "variants": [
          {
            "when": {
              "anyWorld": [
                "permitFrozen",
                "depotHold"
              ],
              "world": [
                "roadClosed",
                "routeTransmitted"
              ]
            },
            "state": "entravée",
            "detail": "Le passage de marée maintient une relation fragile au lieu."
          },
          {
            "when": {
              "anyWorld": [
                "permitFrozen",
                "depotHold"
              ],
              "world": [
                "roadClosed"
              ]
            },
            "state": "entravée",
            "detail": "La fermeture de la route coupe des usages absents du dossier."
          },
          {
            "when": {
              "anyWorld": [
                "permitFrozen",
                "depotHold"
              ]
            },
            "state": "ouverte",
            "detail": "La route reste utilisable à l'échéance, sans garantie pour la suite."
          },
          {
            "when": {
              "world": [
                "routeTransmitted"
              ]
            },
            "state": "fermée",
            "detail": "Le passage de marée maintient une relation fragile au lieu après le déplacement."
          },
          {
            "state": "fermée",
            "detail": "La fermeture de la route coupe des usages absents du dossier."
          }
        ]
      },
      {
        "label": "Recours",
        "variants": [
          {
            "when": {
              "world": [
                "permitFrozen"
              ]
            },
            "state": "effectif",
            "detail": "La suspension est reçue, appliquée et observable au dépôt."
          },
          {
            "when": {
              "world": [
                "freezeSent"
              ]
            },
            "state": "émis, non effectif",
            "detail": "Une signature existe, sans capacité d'arrêt vérifiée."
          },
          {
            "when": {
              "world": [
                "recordsCompared"
              ]
            },
            "state": "possible",
            "detail": "La contradiction documentaire ouvre un recours qui n'agit pas encore sur le chantier."
          },
          {
            "state": "faible",
            "detail": "Aucune suspension opposable n'agit sur le chantier."
          }
        ]
      },
      {
        "label": "Moyens de vivre",
        "variants": [
          {
            "when": {
              "world": [
                "harvestSaved"
              ]
            },
            "state": "partiellement préservés",
            "detail": "La récolte est sauvée ; la saison suivante ne l'est pas."
          },
          {
            "state": "exposés",
            "detail": "Récolte, bêtes et revenus absorbent encore la perte."
          }
        ]
      },
      {
        "label": "Capacité collective",
        "variants": [
          {
            "when": {
              "world": [
                "publicAssembly"
              ]
            },
            "state": "distribuée",
            "detail": "Plusieurs groupes disposent de tâches et de mandats distincts."
          },
          {
            "when": {
              "world": [
                "crewOrganized"
              ]
            },
            "state": "locale",
            "detail": "Le collectif du dépôt peut agir, mais la suite repose encore sur peu de personnes et de canaux."
          },
          {
            "state": "dépendante",
            "detail": "La suite repose encore sur peu de personnes et de canaux."
          }
        ]
      },
      {
        "label": "Mémoire",
        "variants": [
          {
            "when": {
              "world": [
                "recordsDistributed"
              ]
            },
            "state": "répartie",
            "detail": "Des copies expurgées survivent dans plusieurs milieux."
          },
          {
            "when": {
              "world": [
                "recordsCompared"
              ]
            },
            "state": "centralisée",
            "detail": "La contradiction dépend encore d'un tiroir."
          },
          {
            "state": "lacunaire",
            "detail": "La contradiction n'a pas été rendue visible."
          }
        ]
      },
      {
        "label": "Parole d'Ina",
        "variants": [
          {
            "when": {
              "world": [
                "protectedStory"
              ]
            },
            "state": "transmise sous mandat",
            "detail": "Le récit circule sans pièces brutes ni adresse."
          },
          {
            "when": {
              "world": [
                "interviewDeclined"
              ]
            },
            "state": "retirée",
            "detail": "Le refus est conservé sans être transformé en aveu."
          },
          {
            "when": {
              "world": [
                "mandateDefined"
              ]
            },
            "state": "protégée",
            "detail": "Un cadre d'usage existe, sans diffusion du récit."
          },
          {
            "state": "sans cadre",
            "detail": "Aucune permission de diffusion n'a été établie."
          }
        ]
      },
      {
        "label": "Coût du refus",
        "variants": [
          {
            "when": {
              "world": [
                "niloLostWork"
              ]
            },
            "state": "porté par Nilo",
            "detail": "Le chantier a absorbé son refus ; Nilo en conserve la sanction."
          },
          {
            "when": {
              "world": [
                "crewOrganized"
              ]
            },
            "state": "mutualisé",
            "detail": "Le collectif réduit sans supprimer le risque individuel."
          },
          {
            "state": "invisible",
            "detail": "Le risque individuel n'a pas été rendu observable."
          }
        ]
      },
      {
        "label": "Rive humide",
        "variants": [
          {
            "when": {
              "world": [
                "wetlandDamaged"
              ]
            },
            "state": "endommagée",
            "detail": "Le remblai demeure même si une décision ultérieure change."
          },
          {
            "state": "non terrassée",
            "detail": "L'absence de terrassement ne garantit pas la protection future du milieu."
          }
        ]
      }
    ]
  }
});
