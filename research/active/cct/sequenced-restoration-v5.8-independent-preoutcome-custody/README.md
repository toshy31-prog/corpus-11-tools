# CCT 5.8 candidate — independent pre-outcome custody

Candidate 5.7 verifies supplied content but lets its producer rewrite the whole bundle coherently. This candidate computes one digest over all target lineage commitments and unit fingerprints, then requires two Ed25519 signatures from custodians with distinct controllers and failure domains, recorded before outcome access and separate from measurement producers.

The held-out confrontation rewrites an artifact and recomputes its valid content hash after custody. It still passes 5.7, but the signed bundle no longer matches and 5.8 rejects it. Proposal, production, custody, verification, authorization, and deployment remain separate roles and states.

This is a local synthetic candidate. The signatures prove possession of the fixture keys and integrity after signing; they do not establish trustworthy external timestamps, real organizational independence, authorization, deployment, or external robustness.
