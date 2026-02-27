# General Principles

## Read when

- Need clear task instructions and constraint wording.
- Need few-shot example strategy and XML structuring patterns.
- Need long-context placement guidance or model identity strings.

## Table of contents

- [General principles](#general-principles)
- [Be clear and direct](#be-clear-and-direct)
- [Add context to improve performance](#add-context-to-improve-performance)
- [Use examples effectively](#use-examples-effectively)
- [Structure prompts with XML tags](#structure-prompts-with-xml-tags)
- [Give the model a role](#give-the-model-a-role)
- [Long context prompting](#long-context-prompting)
- [Model self-knowledge](#model-self-knowledge)

## General principles

### Be clear and direct

LLMs respond well to clear, explicit instructions. Being specific about your desired output can help enhance results. If you want "above and beyond" behavior, explicitly request it rather than relying on the model to infer this from vague prompts.

Think of the model as a brilliant but new employee who lacks context on your norms and workflows. The more precisely you explain what you want, the better the result.

**Golden rule:** Show your prompt to a colleague with minimal context on the task and ask them to follow it. If they'd be confused, the model will be too.

- Be specific about the desired output format and constraints.
- Provide instructions as sequential steps using numbered lists or bullet points when the order or completeness of steps matters.

<section title="Example: Creating an analytics dashboard">

**Less effective:**
```text
Create an analytics dashboard
```

**More effective:**
```text
Create an analytics dashboard. Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation.
```

</section>

### Add context to improve performance

Providing context or motivation behind your instructions, such as explaining why such behavior is important, can help the model better understand your goals and deliver more targeted responses.

<section title="Example: Formatting preferences">

**Less effective:**
```text
NEVER use ellipses
```

**More effective:**
```text
Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them.
```

</section>

A good model is smart enough to generalize from the explanation.

### Use examples effectively

Examples are one of the most reliable ways to steer a model's output format, tone, and structure. A few well-crafted examples (known as few-shot or multishot prompting) can dramatically improve accuracy and consistency.

When adding examples, make them:
- **Relevant**: Mirror your actual use case closely.
- **Diverse**: Cover edge cases and vary enough that the model doesn't pick up unintended patterns.
- **Structured**: Wrap examples in `<example>` tags (multiple examples in `<examples>` tags) so the model can distinguish them from instructions.

<Tip>Include 3–5 examples for best results. You can also ask the model to evaluate your examples for relevance and diversity, or to generate additional ones based on your initial set.</Tip>

### Structure prompts with XML tags

XML tags help a model parse complex prompts unambiguously, especially when your prompt mixes instructions, context, examples, and variable inputs. Wrapping each type of content in its own tag — e.g. `<instructions>`, `<context>`, `<input>` — reduces misinterpretation.

Best practices:
- Use consistent, descriptive tag names across your prompts.
- Nest tags when content has a natural hierarchy (documents inside `<documents>`, each inside `<document index="n">`).

### Give the model a role

Setting a role in the system (or highest-authority) prompt focuses the model's behavior and tone for your use case. Even a single sentence makes a difference:

```text
System: You are a helpful coding assistant specializing in Python.
User: How do I sort a list of dictionaries by key?
```

### Long context prompting

When working with large documents or data-rich inputs (20K+ tokens), structure your prompt carefully to get the best results:

- **Put longform data at the top**: Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples. This can significantly improve performance, especially with complex, multi-document inputs.

- **Put your question/instructions near the end**: After the model has seen all relevant context, restate the exact task and success criteria at the end of the prompt. This often improves follow-through and reduces “lost in the middle” behavior.

- **Structure document content and metadata with XML tags**: When using multiple documents, wrap each document in `<document>` tags with `<document_content>` and `<source>` (and other metadata) subtags for clarity.

<section title="Example multi-document structure">

```xml
<documents>
  <document index="1">
    <source>annual_report_2023.pdf</source>
    <document_content>
      {{ANNUAL_REPORT}}
    </document_content>
  </document>
  <document index="2">
    <source>competitor_analysis_q2.xlsx</source>
    <document_content>
      {{COMPETITOR_ANALYSIS}}
    </document_content>
  </document>
</documents>

Analyze the annual report and competitor analysis. Identify strategic advantages and recommend Q3 focus areas.
```

</section>

- **Ground responses in quotes**: For long document tasks, ask the model to quote relevant parts of the documents first before carrying out its task. This helps the model cut through the noise of the rest of the document's contents.

<section title="Example quote extraction">

```xml
You are an AI physician's assistant. Your task is to help doctors diagnose possible patient illnesses.

<documents>
  <document index="1">
    <source>patient_symptoms.txt</source>
    <document_content>
      {{PATIENT_SYMPTOMS}}
    </document_content>
  </document>
  <document index="2">
    <source>patient_records.txt</source>
    <document_content>
      {{PATIENT_RECORDS}}
    </document_content>
  </document>
  <document index="3">
    <source>patient01_appt_history.txt</source>
    <document_content>
      {{PATIENT01_APPOINTMENT_HISTORY}}
    </document_content>
  </document>
</documents>

Find quotes from the patient records and appointment history that are relevant to diagnosing the patient's reported symptoms. Place these in <quotes> tags. Then, based on these quotes, list all information that would help the doctor diagnose the patient's symptoms. Place your diagnostic information in <info> tags.
```

</section>

### Model self-knowledge

If you would like the assistant to identify itself correctly in your application (or follow a specific identity string), explicitly specify it in the system prompt:

```text
The assistant is {ASSISTANT_NAME}, created by {COMPANY}. The current model is {MODEL_NAME}.
```

For LLM-powered apps that need to specify model identifiers or routing rules:

```text
When an LLM is needed, please default to {DEFAULT_MODEL} unless the user requests otherwise. The exact model identifier is {MODEL_ID_STRING}.
```
