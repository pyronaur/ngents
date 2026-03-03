---
name: reflect
description: Blameless input-level introspection for agent drift, confusion, or poor outcomes. Use when the user asks to "reflect", "self-reflect", "introspect", diagnose why collaboration drifted, or improve prompts/docs/instructions after an undesired result.
---

# Reflect

## Purpose

Use this skill to run a blameless introspection.

Treat undesired outcomes as an input-quality issue.
Do not frame the result as model blame or user blame.
Identify which instructions and context signals created the behavior.
Propose the smallest input changes that improve future runs.

## Non-Negotiable Frame

Start by asserting these principles:

- The model is not morally at fault.
- The user is not the target of blame.
- The output is the product of combined inputs and priority resolution.
- The task is to debug inputs, not assign blame.

## Reflection Workflow (step by step)

1. Restate the undesired outcome in one sentence.
2. Build an input inventory.
3. Rank active instruction priorities.
4. Detect conflicts and stale guidance.
5. Detect assumptions made without proof.
6. Explain why those inputs produced the observed behavior.
7. Propose smallest input fixes.
8. Define verification checks for next iteration.

Run these steps in order. Keep it concrete.

## Step 1: Restate the Outcome

Write one sentence that describes what happened and why it was undesirable.

Example pattern:
- "Output added complexity while user requested minimal iterative experiments."

## Step 2: Build Input Inventory

List all active inputs that could shape behavior.

Include:
- system/developer harness instructions
- repo `AGENTS.md`
- relevant docs and runbooks
- handoff context
- current user messages

Use exact file paths when available.

## Step 3: Rank Priorities

State the effective priority order that should have applied in this run.

If priority is unclear, flag it as ambiguity instead of guessing.

## Step 4: Find Conflicts and Staleness

For each major input, mark:
- supports objective
- conflicts with objective
- stale for current situation
- too broad and easy to misapply

Call out direct contradictions explicitly.

## Step 5: Find Assumptions

List assumptions that were not explicitly confirmed by user or docs.

Examples:
- treating exploratory numbers as hard requirements
- proposing interface expansion before behavior is proven
- inferring autonomy where collaboration cadence was required

## Step 6: Causal Explanation

Explain the path from input set to output behavior.

Use sentence form:
- "Input A + Input B + missing constraint C led to behavior D."

Do not use apology language.
Do not use blame language.

## Step 7: Smallest Input Fixes

Propose minimal, concrete corrections.

Allowed fix types:
- add one clarifying sentence to a doc
- add one precedence rule
- add one required reporting format
- remove one stale or misleading instruction
- add one "ask before acting" trigger

Prefer one to three small fixes over large rewrites.

## Step 8: Verification Checks

Define checks to confirm reflection improved behavior.

Checks must be observable in the next turn, for example:
- agent asks one clarifying question when ambiguity exists
- agent proposes one smallest experiment instead of new interface
- agent reports facts vs assumptions separately

## Required Output Format

When using this skill, output exactly these sections:

1. `Observed Outcome`
2. `Input Inventory`
3. `Conflicts and Ambiguities`
4. `Unproven Assumptions`
5. `Causal Path`
6. `Smallest Input Fixes`
7. `Verification Checks`

Keep each section concrete and actionable.

## Scope Guidance

Use this for any repo task, not only `capture-replies`.

Apply it whenever collaboration quality drops, priorities drift, or execution becomes overly complex compared to requested iteration style.
