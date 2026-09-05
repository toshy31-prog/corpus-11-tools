---
name: corpus-native-conversation
description: Analyze a free-form user question with installed Corpus, seal the completed analytic packet, and return a concise faithful conversational response. Use when the user wants a clear Corpus answer without manually handling routes, JSON, packets, or rendering commands.
---

# Corpus Native Conversation

1. Preserve the user's full raw question verbatim. Do not summarize, classify,
   clarify, or present it to the conversational surface before routing.
2. **Before analysis**, run
   `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py prepare --raw-prompt "<verbatim user question>"`.
   Read its JSON. On `resume_verified`, return its `conversation` field
   immediately and do not route again. If preparation fails, report that
   sealing is unavailable and that no analysis was produced.
3. On `ready_for_analysis`, run
   `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py start --attempt <path>`;
   only then invoke `corpus-11-routing` and the selected Corpus skills.
4. State exactly one material conclusion, every useful uncertainty, every
   condition that could reverse the conclusion, routes actually used and
   critical dependencies actually used. Do not invent fields to fill a slot.
5. Run `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py complete --attempt <path>
   --raw-prompt "<verbatim user question>" --conclusion "<material conclusion>"`
   with every `--uncertainty`, `--reversal`, `--route`, and `--dependency`.
   It seals, renders and verifies the reserved attempt; it never overwrites a
   prior attempt. Use `standard` by default and `inspectable` only when method,
   routes or dependencies are asked.
6. Run `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py recover --attempt <path>` and return
   only its verified `conversation` field. Use the same recovery path after a
   truncated client display; never recreate an answer from an unsealed packet.

Never soften a strong conclusion, strengthen a prudent conclusion, omit a
technical uncertainty, or expose routes by default.

This development plugin does not modify Corpus stable. If sealing, rendering,
or verification fails, report that failure plainly and do not produce a
conversational answer from an unsealed packet.
