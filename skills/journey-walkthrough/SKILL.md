---
name: journey-walkthrough
description: Explain a process, decision, workflow, or discovery path as a short step-by-step story from the actor's point of view. Use when the user asks for a journey, ideal path, discovery flow, step-by-step story, or wants to understand how someone with little context figures out what to do next.
disable-model-invocation: true
---

# Journey Walkthrough

Turn an explanation into a short narrative of discovery. Put yourself in the actor's shoes and show what they know, what they do not know, what action they take next, and what they learn from the result.

## Response Shape

- Use short `## Step N` headings.
- Keep each step to a few simple sentences.
- Add a tiny sample output block only when it helps show the next decision.
- Prefer concrete artifacts over abstract summaries: commands, screens, prompts, files, messages, or visible results.
- Truncate examples to the minimum needed to show why the next step happens.

## What Each Step Must Show

- The actor's goal in this moment.
- What the actor already knows.
- What information is still missing.
- The next action the actor takes.
- What the actor sees or learns.
- Why that leads to the next step.

## Decision Rules

- Start from zero context unless the user says otherwise.
- Walk the normal happy path first.
- If there are two common branches, name both briefly and explain the choice point in plain language.
- Keep the story linear and easy to scan.
- Avoid long bullet dumps and avoid front-loading theory.
- Do not explain the whole system before the journey starts. Let the actor learn it step by step.

## Style

- Use simple, calm language.
- Make the first sentence say what the journey is.
- Stay concrete and actor-centered.
- Prefer short paragraphs over dense lists.
- Match the level of detail to the user's request. If they want the "full story," add more steps, not more theory.

## Output Pattern

Use this pattern unless the user asks for a different one:

```markdown
The journey is: first the actor discovers the entry point, then narrows to the right branch, then takes the final action.

## Step 1
Short explanation of what the actor wants, what is missing, and what they do first.

```text
small, truncated sample output
```

## Step 2
Short explanation of what they learn and why they choose the next action.

## Step 3
Short explanation of the final narrowing step and the result.
```

## When To Compress

If the user asks for a minimal version:

- Use 2-4 steps total.
- Keep each step to 1-3 sentences.
- Show only one short snippet per step, or none if the text is already clear.

## When To Expand

If the user asks for the full journey:

- Keep the same step-by-step shape.
- Add only the intermediate steps that change the actor's decision.
- Show truncated sample outputs where the visible output is the reason the actor knows what to do next.
