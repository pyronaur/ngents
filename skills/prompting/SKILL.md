---
name: prompting
description: Teach practical prompt engineering for coding agents using context contracts, scope discipline, tool contracts, and verification loops. Use when improving prompts, AGENTS.md/SKILL.md instructions, or debugging agent drift (verbosity, scope creep, weak verification, tool misuse).
---

# Prompting

Practical prompt-engineering playbook for coding agents. Keep this file small; load references early.

## Operating Principle

- It's better to read too much than too little.
- Keep base context light, then load relevant references aggressively.
- If unsure whether a reference applies, read it.

## Distilled Principles

- Be explicit and direct: clearly state task, constraints, and desired output.
- Add useful context and intent so the model can generalize correctly.
- Use relevant, diverse, structured examples to steer behavior.
- Structure prompts with clear tags and roles to reduce ambiguity.
- For long context, place source material first and restate exact instructions at the end.
- Control output format positively (what to do), and use structured outputs/tool schemas when reliability matters.
- Make tool behavior explicit: when to act, when to stay informational, and when to parallelize.
- Tune reasoning intentionally: use more for hard multi-step tasks, less when direct answers suffice.
- Use iterative agent patterns for complex work: draft, critique, revise; keep state across steps.
- Favor safe autonomy: take reversible actions freely, ask before destructive or shared-impact actions.
- Prefer retrieval and evidence-grounded responses over assumptions.
- Add capability-specific steering only when needed (for example vision or frontend design guidance).

## Core References

1. [General Principles](references/general-principles.md)
Read when: need clarity, context framing, examples, XML structure, long-context layout, or identity strings.

2. [Output and Formatting](references/output-formatting.md)
Read when: need style/verbosity control, output-shape steering, LaTeX control, or prefill migration patterns.

3. [Tool Use and Reasoning](references/tool-use-and-reasoning.md)
Read when: need action-vs-advice control, tool-call behavior, parallelization guidance, or reasoning depth tuning.

## Extended References

1. [Agentic Systems](references/agentic-systems.md)
Read when: running long-horizon workflows, managing state across windows, enforcing safety checks, or reducing overengineering.

2. [Capability-Specific Tips](references/capability-specific-tips.md)
Read when: handling vision-heavy tasks or steering frontend aesthetics.

3. [Reliability and Templates](references/reliability-and-templates.md)
Read when: designing production contracts, hierarchy rules, structured outputs, reliability loops, or using copy-ready skeleton prompts.

## Workflow

1. Read all core references first.
2. Read any extended reference that is even loosely relevant.
3. Draft prompt contract: inputs, outputs, constraints, success criteria.
4. Add minimal snippets needed for the task.
5. Verify with concrete checks (schema/test/rubric) before finalizing.
