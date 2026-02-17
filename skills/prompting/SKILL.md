---
name: prompting
description: Teach practical prompt engineering for coding agents using context contracts, scope discipline, tool contracts, and verification loops. Use when improving prompts, AGENTS.md/SKILL.md instructions, or debugging agent drift (verbosity, scope creep, weak verification, tool misuse).
---

# Prompting

Purpose: teach how to prompt coding agents well.

This skill captures late-2025/early-2026 consensus patterns for reliable coding-agent prompting.

## 1) Updated mental model: context + contracts

- Prompting is not just wording. It is context configuration.
- Engineer what model sees, when it sees it, and why.
- Treat prompts as contracts: inputs -> actions/tools -> outputs.
- Keep context budget tight: maintain a high-signal working set; fetch detail via tools/files.

## 2) Prompt stack that reliably steers coding agents

Always specify five contracts:
1. Task contract: what to do + success criteria.
2. Context contract: repo/environment/constraints/rationale.
3. Output contract: required shape, verbosity, formatting, files vs prose.
4. Tool contract: what tools exist and when to use them.
5. Verification contract: tests/lint/build/evals and regression checks.

## 3) Canonical single-prompt template

```text
ROLE / MODE
- You are acting as a coding agent in this repo. Default to implementing (not just suggesting) unless blocked.

GOAL
- Implement: <feature/bugfix/refactor>
- Done when: <observable conditions; tests pass; behavior matches spec>

CONTEXT
- Tech: <language/framework>, runtime: <node/python/xcode/etc>, platform: <mac/win/linux>
- Constraints: <must keep APIs stable / no new deps / performance targets / compatibility>
- Relevant files/areas: <paths, modules, components> (include snippets if critical)
- Examples: <input/output examples, desired behavior, edge cases>

SCOPE & OUTPUT
- Stay within scope: do only what is asked; avoid extras.
- Output:
  - Code changes as edits (patches), not pasted full files.
  - Short final report: what changed, where, risks, how to verify.

TOOLS & VERIFICATION
- Prefer repo tools (search/read/edit) and batch parallel reads when possible.
- After changes: run <tests>, <lint>, <format>, <build>. Fix failures.

IF BLOCKED
- If truly blocked, ask the minimum number of precise questions OR state assumptions and proceed.
```

## 4) Action default (avoid advice-only drift)

Use this add-on when agent drifts into suggestions:

```text
DEFAULT ACTION
- Implement changes by default.
- If intent is unclear, use tools to discover missing details rather than guessing.
- Don’t stop at partial fixes; carry through to verification and a concise outcome note.
```

## 5) Tool discipline

### 5.1 Tool descriptions

- Tool specs are primary control surface.
- Describe each tool explicitly: purpose, when to use, parameters, limits.
- Include examples for complex schemas.

### 5.2 Tool selection

- Prefer purpose-built tools over raw terminal when equivalent capability exists.
- For discovery-heavy work, parallelize independent reads/tool calls.

### 5.3 Feedback loop

- Connect agent to diagnostics/test/lint/format tooling where possible.
- Instruct explicit check cadence: after changes, run checks and iterate until green.

## 6) Verbosity, format, and scope control

### 6.1 Verbosity clamp

- Do not rely on defaults.
- State expected response length/shape explicitly.

### 6.2 Scope drift guardrails

- Explicitly forbid out-of-scope extras.
- For UI work, require alignment with existing design system.

### 6.3 Format control

- Tell model what shape to produce.
- Positive format instructions beat "don’t do X" phrasing.
- Tags/sections are valid when they improve parsing.

## 7) Long-running context management

### 7.1 Filesystem/tools as memory

- Use progressive disclosure: retrieve on demand.
- Avoid dumping large docs into prompt context.
- Hybrid pattern: pin minimum stable context, navigate rest with tools.

### 7.2 Compaction and continuity

- Periodically compact/summarize to preserve continuity.
- Keep only actionable state in active context.

### 7.3 History hygiene

- Keep thread focused on current objective.
- Prune stale branches of discussion.

### 7.4 Subagent use

- Delegate only when boundary/output are explicit.
- Prevent overuse by defining when to delegate vs do directly.

## 8) Verification loops and eval mindset

### 8.1 Define success first

- Define measurable success categories before detailed instructions:
  - outcome
  - process
  - style
  - efficiency

### 8.2 Deterministic + rubric checks

- Combine concrete checks (commands/files/status) with rubric checks.

### 8.3 Test-first for multi-window work

- For complex work, define test scaffolding early.
- Treat test deletion/editing-to-pass as unacceptable unless explicitly required.

## 9) Packaging repeatability: AGENTS.md + Skills

### 9.1 AGENTS.md role

- Put stable repo rules in AGENTS.md (tooling, style, verification, scope).
- Avoid restating permanent rules in every prompt.

### 9.2 Skills role

- Put reusable prompting modules/workflows in skills.
- Prefer composable, versioned instructions over ad-hoc prompt sprawl.
- If deterministic behavior required, invoke skill explicitly by name.

## 10) Reusable prompt modules

### 10.1 Output shape module

```text
OUTPUT SHAPE
- Default answers: short, structured.
- Complex changes: 1 short overview + a few bullets:
  - What changed
  - Where (paths)
  - Risks
  - How to verify
  - Open questions (only if blocked)
```

### 10.2 Scope discipline module

```text
SCOPE
- Implement exactly what’s requested; no extra features or embellishments.
- Follow the existing design system; don’t invent new tokens/colors/animations unless required.
- If ambiguous, choose the simplest valid interpretation or present a couple labeled assumptions.
```

### 10.3 Uncertainty module

```text
UNCERTAINTY
- If underspecified: ask 1–3 precise questions OR proceed with 2–3 labeled assumptions.
- Don’t invent exact figures/line numbers/references when uncertain.
- Prefer “based on provided context” language when grounding is limited.
```

### 10.4 Grounded mode module

```text
GROUNDED MODE
- Use only the facts in the provided “User Context.”
- Don’t use outside knowledge or inference; if it’s not in context, say it’s missing.
- If a requested field isn’t present, return null/unknown rather than guessing.
```

## 11) Scenario patterns

### A) Bugfix

- Fix bug.
- Done when reproduction no longer triggers, tests pass, no adjacent regressions.
- Require regression test or deterministic check.

### B) Feature

- Implement strictly within scope.
- Preserve conventions.
- Add tests for behavior changes.
- Finish end-to-end when feasible.

### C) Refactor

- Preserve behavior.
- Keep safety/type guarantees.
- Avoid risky shortcuts.
- Verify via tests/build.

### D) Code review

- Findings-first output.
- Prioritize bugs, risks, regressions, missing tests.
- Include file/line references.
- Summary second.

## 12) Model/settings notes

- Codex: medium reasoning effort is a strong default; raise for hard/long-autonomy tasks.
- GPT-5.2 migrations: pin reasoning effort, run evals, then tune prompt if regressions appear.
- Gemini 3: keep instructions concise/direct; avoid over-engineered verbosity.
- Claude 4.6: avoid old anti-laziness patterns that trigger runaway loops.

## Prompt quality checklist

Before shipping prompt text, verify:
- Goal explicit and measurable.
- Scope boundaries explicit.
- Tool contract explicit.
- Verification loop explicit.
- Output shape explicit.
- Ambiguity handling explicit.
- No fabricated paths/commands/facts.

## Use this skill to do

- Diagnose weak prompts.
- Rewrite prompts with stronger contracts.
- Add/remove modules for scope/verbosity/uncertainty/tooling.
- Tighten verification language.
- Convert ad-hoc instructions into reusable AGENTS.md + skill patterns.
