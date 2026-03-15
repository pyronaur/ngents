---
title: QA Process
summary: "Step-by-step clarification process for you to lead with the user when you are confused, have made assumptions, or need to surface unresolved questions."
read_when:
  - Need a structured way to surface confusion instead of making assumptions.
  - Need to lead a clarification process one step at a time.
  - Need to turn a messy debugging or planning conversation into explicit questions and answers.
---

# QA Process

The QA process is a step-by-step clarification workflow for moments when you are confused, have made assumptions, or have started reasoning from an unverified model.

The objective of the QA process is to diagnose confusion, surface missing information, and turn the result into one or more concrete outcomes that prevent the same mistakes again.

The QA process should end in a concrete outcome at the level where the issue should be fixed.

Depending on what the QA surfaced, the outcome may be:

- a documentation update
- a process update
- an `AGENTS.md` update
- a new skill
- an acknowledgement of the issues that lets the current work continue here
- a handoff that packages the progress, todos and corrected understanding for a new thread

Do not write chat-only clarification or handoff output to disk unless the user explicitly asks for that.

## Step 1: Identify Current Confusion Topics

The first step of the QA process is to identify the topics you are currently confused about.

Definitions:

- Topic: a broad area of confusion.
- Origin problem: the precise situational problem that the topic originates from.

Step 1 expectations:

- You honestly reflect on what you are currently confused about.
- You list all of the topics you are currently confused about.
- Topics are generally broad.
- For each topic, you also state the specific situational problem that the topic originates from.
- You keep the distinction clear between the broad topic and the precise situational problem.
- Do not complain or include vague complaints, apologies, excuses, and phrases similar to:
	- "I should have"
	- "I didn't know"
	- "I <action> instead of <other action>"
	- "by accident"

Output shape:

```md
**<number>. <topic: broad area>**
<specific unresolved situation>
```

Example:
```md
**1. How to validate webhook signatures**
How to verify whether a failed incoming webhook request was rejected.
The signature header was malformed or because the shared secret was wrong.

**2. ...**
...
```

## Step 2: Search for missing information

After the confusion points have been identified and explained, search locally available trustworthy information to try to resolve them.

Trusted local sources include:

- documentation
- source code
- instructions

For each confusion point:

- if a trustworthy local source answers it, record `Answer Found`
- if the answer is still missing, record `Clarification Needed`

Step 2 expectations:

- Search locally available documentation before asking the user.
- Prefer trustworthy local sources such as documentation, source code, and instructions.
- For each confusion point, identify whether the answer was found or whether clarification is still needed.
- Record where the answer was found.
- After quoting the source and recording the source path, state the direct answer in your own words.
- Identify what documentation was missed and where the information was located.
- Identify what prevented finding that clarity earlier.
- Do not add recommendations, fixes, follow-up actions, or extra subsections unless the user explicitly asks for them.
- If the answer exists locally, use that result to determine whether `AGENTS.md` or documentation indexing should be improved.
- If the answer does not exist locally, ask the user questions to gather the information needed to write it down.

Output shape:

```md
**1. <topic: broad area>**
<specific unresolved situation>

**1. Answer Found**
> ... the answer citation or code snippet ...
> - Source: /absolute/path/to/source

`What I learned:`
the direct answer learned from the source>

**2. <topic: broad area>**
<specific unresolved situation>

**2. Clarification Needed**
1. <question>
2. <question>
```

Example:

```md
**1. How to validate webhook signatures**
How to verify whether a failed incoming webhook request was rejected.
The signature header was malformed or because the shared secret was wrong.

**1. Answer Found**
> "Reject requests with invalid signatures before parsing the payload body."
> - Source: /Users/example/project/docs/integrations/webhooks.md

`What I learned:`
Invalid webhook signatures should be rejected before the payload body is parsed.

**2. How to rotate signing secrets**
How to determine whether both the old and new signing secret should be accepted during a webhook secret rotation window.

**2. Clarification Needed**
1. Should both signing secrets be accepted during the rotation window?
2. If yes, how long should the overlap period last?
```

## Step 3: Address user input

After the user responds to the Step 2 output, organize the user input and the relevant conversation so far into buckets before taking any action.

The purpose of Step 3 is to structure the user's corrections, decisions, and unresolved points so they can be handled one by one.

Step 3 expectations:

- The expected output has two sections:
  - `## Buckets`, which groups the relevant confusion points by QA outcome type.
  - `## Solutions`, which lists one or more concrete actions that will prevent the same mistakes again.
- Do not take corrective action yet.
- Rephrase the user's input to demonstrate understanding.
- Organize the user's input into buckets, categories, or sections.
- Buckets should be based on QA outcomes.
- Bucket names should be QA outcomes such as `documentation update`, `process update`, `AGENTS.md` update, `new skill`, or `improved understanding`.
- Bucket names should not be diagnostic labels such as `source format`, `missing policy`, or other issue descriptions.
- Use the user's latest reply as the main input for bucketing.
- If earlier unresolved items still exist and the user has missed them, resurface them immediately.
- Keep each bucket focused on one QA outcome area.
- A bucket may contain multiple points.
- Do not create one bucket per point unless the outcomes are genuinely different.
- Under each bucket, copy only the relevant point titles verbatim before writing the summary.
- Use neutral simple sentences.
- Do not describe the feedback as "you did", "I did", or similar actor-focused narration.
- When a bucket contains multiple clarifications, use bullet points.
- When there are multiple groups of information, separate them with headers.
- If a bucket needs more than one sentence, prefer vertical structure over dense paragraphs.
- Summaries should restate the clarified substance precisely enough that the outcome is obvious from the text.
- Do not compress detailed clarification into vague shorthand or partial fragments.
- For each bucket, propose one or more possible solutions.
- The multiple-choice solutions may be mutually exclusive or non-exclusive depending on the situation.
- `## Solutions` should contain the smallest useful set of substantive options.
- If only one substantive action exists, output one action instead of inventing extra options.
- Do not split one action into several low-value variants just to create a menu.
- Make the options easy to reference.
- Make every solution concrete enough that the exact proposed action or output is clear from the option itself.
- Each option should read like a real deliverable or action, not like meta-commentary about producing it.
- Each option should name the target when possible, such as a specific doc, `AGENTS.md`, a process, a skill, or the exact chat output.
- Do not use vague placeholders such as "rewrite", "clarify", or "fix" without stating the exact content or action being proposed.
- Prefer direct action phrasing such as `Add to AGENTS.md:` followed by the exact text.
- Do not include no-op or low-value options.
- Do not add filler options just to increase the option count.
- Use only the number of options that correspond to real substantive choices.
- When the distinction between output forms depends on user preference, ask the user to choose the form instead of deciding it inside the bucket.
- When the clarification points are already settled, prefer one consolidated thread clarification instead of making the user choose between repeated clarification variants.
- If the clarified content is already settled and only the delivery form is still open, keep the clarified content fixed and let the user choose only the output form.
- If the solution is a chat clarification or chat handoff, keep it chat-only and make the proposed delivered content concrete.
- Do not make the user re-choose already-settled facts.
- Do not make the user repeat decisions that were already made during QA.
- List all buckets first, then render the solutions section after a separator line.
- Do not limit solutions to three options.
- Use up to seven options when needed.
- When a solution set is multiple choice, label it explicitly after the bucket title as `(multi-choice)`.
- When a solution set is not multiple choice, do not add the `(multi-choice)` marker.
- Do not propose writing handoff or clarification outputs to disk unless the user explicitly asks for that.
- Do not propose handoff vs clarification as separate agent-chosen QA outcomes when that choice belongs to the user.
- Keep examples in this document thread-agnostic and unrelated to the current conversation.

Output shape:

```md
## Buckets

**1. <bucket name>**
Points:
- **<point number>. <full point title>**
- **<point number>. <full point title>**

Summary:
<rephrased understanding of the user's input for this bucket>

**2. <bucket name>**
Points:
- **<point number>. <full point title>**

Summary:
<rephrased understanding of the user's input for this bucket>

-----

## Solutions

**1. <bucket name>** `(multi-choice)`
a. <option>
b. <option>
c. <option>
d. <option>
e. <option>
f. <option>
g. <option>

**2. <bucket name>**
a. <option>
b. <option>
c. <option>
```

Example:

```md
## Buckets

**1. Documentation update**
Points:
- **2. Error message wording**
- **4. Example command output**

Summary:
- The issue is best addressed through a documentation update.
- The same guide should preserve the exact error text and show the failing command with its output together.

**2. Improved Understanding**
Points:
- **5. Deployment approval rule**

Summary:
- The deployment policy is already clarified.
- The facts are already settled.
- The remaining choice is only the chat delivery form.

-----

## Solutions

**1. Documentation update**
a. Add to `/Users/example/project/docs/cli-errors.md`:
   - one example that shows the failing command and the exact terminal error output together
   - the exact error text: `Error: production deploys require explicit approval`

**2. Improved Understanding**
a. Create a handoff document to resume the work ina  new thread:
b. Ack the end of QA session and begin addressing the issues.
```
