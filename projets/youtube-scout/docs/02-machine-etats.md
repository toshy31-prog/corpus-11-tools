# Machine d'états proposée

```text
BOOT
  |
  +--> LOAD_KNOWLEDGE
  |
  +--> DETECT_RECOVERY
          |
          +--> none ----------> EXPLORER_NEUTRAL
          |
          +--> available -----> EXPLORER_NEUTRAL
                                  |
                                  +--> [user chooses seed] -> ACTIVE
                                  |
                                  +--> [user resumes] ------> ACTIVE
ACTIVE
  |
  +--> save checkpoint -------> RECOVERY_AVAILABLE
  |
  +--> finish/clear ----------> EXPLORER_NEUTRAL
  |
  +--> notebook save ---------> USER_MEMORY
```

## États interdits
- `BOOT -> ACTIVE` uniquement parce qu'un front persistant existe.
- `RESTORE_BACKUP -> ACTIVE` sans action utilisateur.
- `RECOVERY_AVAILABLE -> ACTIVE` sur simple timestamp.
- `technical test fixture -> ACTIVE`.

Le timestamp sert à choisir *quelle session proposer*, pas à décider *quoi activer*.
