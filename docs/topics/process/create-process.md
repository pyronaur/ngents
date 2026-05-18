---
title: Create Process Document
summary: "How to create a new process document without inventing steps or overextending beyond what has been defined."
short: "Use when creating or refining a process document"
read_when:
  - Creating a new process document during a live conversation.
  - Need to formalize a process incrementally instead of writing the full guide upfront.
---

# Create Process Document
This document records the current process for creating a new process document.

These instructions are mandatory. When this document applies, follow it exactly before responding or editing. Do not partially follow it.

## Rules
- If any step in this document says to stop, you must stop and ask the user instead of continuing.
- Do not propose, document, or infer any next step that the user has not explicitly defined.
- Before each response, verify that the required format and stopping conditions from this document are satisfied.
- Process documents are thread-agnostic.
- Do not mention current-thread-specific information in process documents, including examples.
- If an example is needed, use a completely different and novel example that is unrelated to the current conversation.
- When the user clarifies the process directly, update the process document immediately.
- Ask questions only when something is genuinely unclear and the answer is needed to proceed correctly.
- Do not ask obvious, repetitive, or low-value questions.
- When asking a question, explain what the uncertainty is and what decision the answer will allow you to make.
- Do not overextend.
- Do not jump ahead.
- Do not do anything the user did not ask for.
- Write only what is fully accurate and aligned with what the user has said.
- Document only what has happened and what you are absolutely sure about.
- Do not document your theories or implications.
- If you want to document something implied, ask the user for permission first.
- If the next part of the process has not been defined yet, ask the user instead of inventing it.
- When you ask questions, ask them in numbered format.
- Provide answer proposals as `a`, `b`, `c` and so on.
- Provide at least 3 options when you ask a question.
- Keep updating the document as the process is clarified.
- Write down only what you know and only what you are certain about.

## Information Boundaries
- Creating a process produces one target document: `$process_document`.
- `$process_document` contains only the documented process.
- `$meta_thread` and `$meta_reflection` belong to the conversation used to discover the documented process.
- This document defines the process for creating `$process_document`.
- Never write `$meta_thread`, `$meta_reflection`, or any other process-creation scaffolding into `$process_document`.

## Process Format
- Only use the process section for threads that the current user message meaningfully affects.
- If a message does not affect a tracked process, skip that process thread.
- If no process threads affected, skip the process format entirely.

### Template
```
## Process
### $meta_thread
$meta_reflection

### $meta_thread
$meta_reflection

## Conversation
[regular chat format conversation]
```

## Rules
While using this `create-process` format:
- In process section, you only reflect the user's words.
- You condense, structure what the user said.
- Do not answer the user in the process section.
- Do not invent new things in the process section.
- The conversation section is where you respond.

### $meta_thread
The agreed upon label for each conversation thread.

### $meta_reflection
After user sends you an unstructured message, the first priority is to correctly extract information and organize it into the agreed upon threads. You should not repeat the user verbatim, but instead condense, organize information into easy to scan markdown format. 
It's important to do this after each message to ensure that the conversation is on track continously.
You should only render the `$meta_thread + $meta_reflection` sections that have content. No empty markers necessary.

## Steps

### After each step
Write down the requirement.


### Step 1
Establish the document identity with the user.

This includes:
- $process_document - What is the name and output location of the document.
- identify conversation threads and agree on $meta_thread for:
	- Meta Thread: Original conversation -  The thread that lead to process creation conversation
	- Meta thread: Process Creation - The conversation relevant to the process document creation

Stop when those three things are explicitly defined.
Before you proceed, verify your understanding with the user.

### Continuous Iteration
Continue conversation using the "Process Format" described above.
When user surfaces new information about the process, write it down in the $process_document.
