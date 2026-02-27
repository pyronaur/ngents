# Output and Formatting

## Read when

- Need control over style, verbosity, prose vs markdown, or latex output.
- Need document/presentation generation prompt snippets.
- Need migration guidance away from prefill/prefix hacks.

## Table of contents

- [Output and formatting](#output-and-formatting)
- [Communication style and verbosity](#communication-style-and-verbosity)
- [Control the format of responses](#control-the-format-of-responses)
- [LaTeX output](#latex-output)
- [Document creation](#document-creation)
- [Migrating away from “prefilled” responses and other prefix hacks](#migrating-away-from-prefilled-responses-and-other-prefix-hacks)

## Output and formatting

### Communication style and verbosity

Newer generations of models may have a more concise and natural communication style compared to earlier generations:

- **More direct and grounded**: Provides fact-based progress reports rather than self-celebratory updates
- **More conversational**: Slightly more fluent and colloquial, less machine-like
- **Less verbose**: May skip detailed summaries for efficiency unless prompted otherwise

This means a model may skip verbal summaries after tool calls, jumping directly to the next action. If you prefer more visibility:

```text
After completing a task that involves tool use, provide a quick summary of the work you've done.
```

### Control the format of responses

There are a few ways that we have found to be particularly effective in steering output formatting:

1. **Tell the model what to do instead of what not to do**

   - Instead of: "Do not use markdown in your response"
   - Try: "Your response should be composed of smoothly flowing prose paragraphs."

2. **Use XML format indicators**

   - Try: "Write the prose sections of your response in \<smoothly_flowing_prose_paragraphs\> tags."

3. **Match your prompt style to the desired output**

   The formatting style used in your prompt may influence the model's response style. If you are still experiencing steerability issues with output formatting, we recommend as best as you can matching your prompt style to your desired output style. For example, removing markdown from your prompt can reduce the volume of markdown in the output.

4. **Use detailed prompts for specific formatting preferences**

   For more control over markdown and formatting usage, provide explicit guidance:

```text
<avoid_excessive_markdown_and_bullet_points>
When writing reports, documents, technical explanations, analyses, or any long-form content, write in clear, flowing prose using complete paragraphs and sentences. Use standard paragraph breaks for organization and reserve markdown primarily for `inline code`, code blocks (```...```), and simple headings (###, and ###). Avoid using **bold** and *italics*.

DO NOT use ordered lists (1. ...) or unordered lists (*) unless : a) you're presenting truly discrete items where a list format is the best option, or b) the user explicitly requests a list or ranking

Instead of listing items with bullets or numbers, incorporate them naturally into sentences. This guidance applies especially to technical writing. Using prose instead of excessive formatting will improve user satisfaction. NEVER output a series of overly short bullet points.

Your goal is readable, flowing text that guides the reader naturally through ideas rather than fragmenting information into isolated points.
</avoid_excessive_markdown_and_bullet_points>
```

### LaTeX output

Some models default to LaTeX for mathematical expressions, equations, and technical explanations. If you prefer plain text, add the following instructions to your prompt:

```text
Format your response in plain text only. Do not use LaTeX, MathJax, or any markup notation such as \( \), $, or \frac{}{}. Write all math expressions using standard text characters (e.g., "/" for division, "*" for multiplication, and "^" for exponents).
```

### Document creation

Many models can create presentations, animations, and visual documents with strong instruction following. If you want a more polished result, explicitly request the level of design you want.

For best results with document creation:

```text
Create a professional presentation on [topic]. Include thoughtful design elements, visual hierarchy, and engaging animations where appropriate.
```

### Migrating away from “prefilled” responses and other prefix hacks

Some integrations historically relied on “prefilling” part of the assistant’s next message (or other prefix tricks) to force a particular structure or suppress preambles. Newer models often follow direct instructions reliably, and many APIs now offer more robust ways to enforce structure.

Here are common “prefill” scenarios and how to migrate away from them:

<section title="Controlling output formatting">

Prefills have been used to force specific output formats like JSON/YAML, classification, and similar patterns where a prefix constrains the model to a particular structure.

**Migration:** Prefer schema-constrained outputs (e.g., structured outputs / JSON schema enforcement), tool calling with enums, and/or deterministic post-validation with retries. If your stack doesn’t support schema enforcement, ask the model to conform to the output structure and validate the result in code.

</section>

<section title="Eliminating preambles">

Prefills like `Here is the requested summary:\n` were used to skip introductory text.

**Migration:** Use direct instructions in the system prompt: "Respond directly without preamble. Do not start with phrases like 'Here is...', 'Based on...', etc." Alternatively, direct the model to output within XML tags, use structured outputs, or use tool calling. If the occasional preamble slips through, strip it in post-processing.

</section>

<section title="Avoiding bad refusals">

Prefills were used to steer around unnecessary refusals.

**Migration:** Clear prompting within the user message without prefill is typically sufficient. If a refusal pattern is persistent, tighten the scope, specify allowed actions, and explicitly request the form of a safe partial answer when full compliance isn’t possible.

</section>

<section title="Continuations">

Prefills were used to continue partial completions, resume interrupted responses, or pick up where a previous generation left off.

**Migration:** Move the continuation to the user message, and include the final text from the interrupted response: "Your previous response was interrupted and ended with \`[previous_response]\`. Continue from where you left off." If this is part of error-handling or incomplete-response-handling and there is no UX penalty, retry the request.

</section>

<section title="Context hydration and role consistency">

Prefills were used to periodically ensure refreshed or injected context.

**Migration:** For very long conversations, inject what were previously “prefill reminders” into the system/developer prompt, or hydrate context via tools and external memory (retrieval) when appropriate.

</section>
