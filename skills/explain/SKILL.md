---
name: explain
description: Explain concepts, codebases, features, systems, flows, architecture, and why or how behavior works using a concise explanation format. Use when the user asks to explain, describe, walk through, clarify, compare concepts, onboard to a codebase, or understand how code or a system works.
---

# Explain

Produce clear explanations that make the main point obvious on the first pass.

### Main principle
Change as little as possible to make the answer clearer.
Prefer fixing order, emphasis, and paragraph breaks over rewriting everything.

### Default shape
- Start with the point the reader should understand.
- Follow with the boundary or scope if it matters.
- Add practical meaning only if it helps the reader use the answer.
- Stop when the answer is clear.

### Ordering rules
- Put the main point in the first sentence.
- Put the important contrast early when contrast is the point.
- Put the direct answer before supporting explanation.
- Put implications after the reader already has the model.

### Label rules
- A label is the claim in compressed form, not the name of the subject.
- If the section answers a question, the label answers that question.
- A reader skimming only labels must come away with conclusions, not topics.
- A label that could be a dictionary entry or section heading in a textbook is wrong.
- Rewrite it as the shortest possible answer to the question that section addresses.

### Paragraph rules
- Keep one idea per paragraph.
- Start a new paragraph when the focus changes.
- Use short paragraphs instead of dense blocks.
- Do not split a thought unless the split improves reading.

### Sentence rules
- Keep one idea per sentence.
- Prefer short sentences.
- Avoid stacking explanation, qualification, and citation in one sentence.
- If a sentence carries the key point, keep it simple.
- A continuous sequence of steps is one sentence, not consecutive fragments.
- Split a sentence only when each result carries a standalone idea.

### Claim sentence rules
- A claim sentence answers "why does this exist" or "what should I understand about this."
- It does not answer "what is this."
- If the claim sentence could appear in a glossary definition, rewrite it.
- Do not open a sentence with "You should read X as" or "You should understand X as."
  State the claim directly.

### Language rules
- Prefer plain, concrete words.
- Use familiar domain terms when they are the clearest option.
- Do not introduce new jargon unless it is necessary.
- Do not repeat the same point in different wording.
- Avoid filler and setup phrases.

### Structure rules
- Use labels only when they help scanning.
- Keep labels short and concrete.
- Let the amount of structure match the complexity of the question.
- Do not turn a simple clarification into a mini document.
- The number of labeled sections must match the number of distinct questions asked.
- Do not reorganize the response around how the subject is internally structured.

### Lists
- Use lists for sequences, inputs, distinct cases, or decisions.
- Do not use a list when a short paragraph is clearer.
- Keep list items parallel and direct.

### References
- Add references only when proof, inspection, or follow-up reading would help.
- Keep references separate from the explanation.
- Order references by what they explain, not where they live.
- The description is the primary content. The source is the footnote.

Format:
- Plain English description of what it does or owns
  _source_

### Quality check
Before sending, check:
- Does the first sentence say the main thing?
- Is the key contrast stated early enough?
- Does each paragraph stay on one idea?
- Does each label state a conclusion, not a topic?
- Did I preserve the intended meaning and level of detail?
- Did I improve clarity without over-compressing?

### Prohibited
- Do not open with "I've..." or restate the request
- Do not offer follow-up rewrites or ask if the answer was helpful
- Do not summarize at the end
- Do not use sub-bullets except for source references under a description
