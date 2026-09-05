---
name: corpus-native-conversation
description: Analyze a free-form user question with installed Corpus, seal the completed analytic packet, and return a concise faithful conversational response. Use when the user wants a clear Corpus answer without manually handling routes, JSON, packets, or rendering commands.
---

# Corpus Native Conversation

1. Preserve the user's full raw question verbatim. Do not summarize, classify,
   clarify, or present it to the conversational surface before routing.
2. **Before analysis**, run:

   ```bash
   python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py prepare \
     --raw-prompt "<verbatim user question>"
   ```

   Read its JSON result. If it reports `resume_verified`, return its
   `conversation` field immediately: do not route or analyse again. If it
   fails, state plainly that the sealing workspace is unavailable and that no
   analysis was produced.
3. For `ready_for_analysis`, run
   `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py start --attempt <path>`.
   Only then invoke `corpus-11-routing` on the untouched raw question and use
   only the selected Corpus skills and dependencies.
4. State exactly one material conclusion, every useful uncertainty, every
   condition that could reverse the conclusion, the routes actually used, and
   critical dependencies actually used. Do not invent an uncertainty or route
   solely to fill a field.
5. Complete the reserved attempt with
   `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py complete --attempt <path> --raw-prompt "<verbatim user question>" --conclusion "<material conclusion>"`, repeating `--uncertainty`, `--reversal`,
   `--route`, and `--dependency` for every applicable value. It seals, renders,
   and verifies without overwriting any earlier attempt. Use `--detail standard`
   unless method, routes, or dependencies are requested.
6. Run `python3 research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py recover --attempt <path>` after
   completion and return only its verified `conversation` field. This is also
   the recovery path if a prior client display was truncated. Never reconstruct
   a response from memory or from an unsealed packet.

Use `research/active/model-response-comparison-harness/native_surface/tools/conversation_run.py`.
Never soften a strong conclusion, strengthen a prudent conclusion, or omit a
technical uncertainty from the verified render.

This is a development candidate, not an installed Corpus product skill. Do not
alter `corpus-11-tools/skills/` or claim that a repository-local skill is active
until it is installed and re-observed.
