# Agentic Systems

## Read when

- Need long-horizon execution patterns across context windows.
- Need state tracking, safety confirmation, or research loops.
- Need subagent guidance and controls against overengineering/hallucination.

## Table of contents

- [Agentic systems](#agentic-systems)
- [Long-horizon reasoning and state tracking](#long-horizon-reasoning-and-state-tracking)
- [Balancing autonomy and safety](#balancing-autonomy-and-safety)
- [Research and information gathering](#research-and-information-gathering)
- [Subagent orchestration](#subagent-orchestration)
- [Chain complex prompts](#chain-complex-prompts)
- [Reduce file creation in agentic coding](#reduce-file-creation-in-agentic-coding)
- [Overeagerness](#overeagerness)
- [Avoid focusing on passing tests and hard-coding](#avoid-focusing-on-passing-tests-and-hard-coding)
- [Minimizing hallucinations in agentic coding](#minimizing-hallucinations-in-agentic-coding)

## Agentic systems

### Long-horizon reasoning and state tracking

Modern models often excel at long-horizon reasoning tasks with strong state tracking capabilities. A practical pattern is incremental progress: making steady advances on a few things at a time rather than attempting everything at once. This especially emerges over multiple context windows or task iterations, where the model can work on a complex task, save the state, and continue with a fresh context window.

#### Context awareness and multi-window workflows

Some agent harnesses compact context or allow saving context to external files. If your environment behaves this way, add this information to your prompt so the model can behave accordingly. Otherwise, the model may sometimes try to wrap up work as it approaches context limits.

```text
Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely from where you left off. Therefore, do not stop tasks early due to token budget concerns. As you approach your token budget limit, save your current progress and state to memory before the context window refreshes. Always be as persistent and autonomous as possible and complete tasks fully, even if the end of your budget is approaching. Never artificially stop any task early regardless of the context remaining.
```

#### Multi-context window workflows

For tasks spanning multiple context windows:

1. **Use a different prompt for the very first context window**: Use the first context window to set up a framework (write tests, create setup scripts), then use future context windows to iterate on a todo-list.

2. **Have the model write tests in a structured format**: Ask the model to create tests before starting work and keep track of them in a structured format (e.g., `tests.json`). This leads to better long-term ability to iterate. Remind the model of the importance of tests: "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."

3. **Set up quality of life tools**: Encourage the model to create setup scripts (e.g., `init.sh`) to gracefully start servers, run test suites, and linters. This prevents repeated work when continuing from a fresh context window.

4. **Starting fresh vs compacting**: When a context window is cleared, consider starting with a brand new context window rather than using compaction. Modern models can be effective at discovering state from the local filesystem. In some cases, you may want to take advantage of this over compaction. Be prescriptive about how it should start:
   - "Call pwd; you can only read and write files in this directory."
   - "Review progress.txt, tests.json, and the git logs."
   - "Manually run through a fundamental integration test before moving on to implementing new features."

5. **Provide verification tools**: As the length of autonomous tasks grows, the model needs to verify correctness without continuous human feedback. Tools for testing UIs, running linters, or executing integration tests are helpful.

6. **Encourage complete usage of context**: Prompt the model to efficiently complete components before moving on:

```text
This is a very long task, so it may be beneficial to plan out your work clearly. It's encouraged to spend your entire output context working on the task - just make sure you don't run out of context with significant uncommitted work. Continue working systematically until you have completed this task.
```

#### State management best practices

- **Use structured formats for state data**: When tracking structured information (like test results or task status), use JSON or other structured formats to help the model understand schema requirements
- **Use unstructured text for progress notes**: Freeform progress notes work well for tracking general progress and context
- **Use git for state tracking**: Git provides a log of what's been done and checkpoints that can be restored
- **Emphasize incremental progress**: Explicitly ask the model to keep track of its progress and focus on incremental work

<section title="Example: State tracking">

```json
// Structured state file (tests.json)
{
  "tests": [
    { "id": 1, "name": "authentication_flow", "status": "passing" },
    { "id": 2, "name": "user_management", "status": "failing" },
    { "id": 3, "name": "api_endpoints", "status": "not_started" }
  ],
  "total": 200,
  "passing": 150,
  "failing": 25,
  "not_started": 25
}
```

```text
// Progress notes (progress.txt)
Session 3 progress:
- Fixed authentication token validation
- Updated user model to handle edge cases
- Next: investigate user_management test failures (test #2)
- Note: Do not remove tests as this could lead to missing functionality
```

</section>

### Balancing autonomy and safety

Without guidance, an agentic model may take actions that are difficult to reverse or affect shared systems, such as deleting files, force-pushing, or posting to external services. If you want the model to confirm before taking potentially risky actions, add guidance to your prompt:

```text
Consider the reversibility and potential impact of your actions. You are encouraged to take local, reversible actions like editing files or running tests, but for actions that are hard to reverse, affect shared systems, or could be destructive, ask the user before proceeding.

Examples of actions that warrant confirmation:
- Destructive operations: deleting files or branches, dropping database tables, rm -rf
- Hard to reverse operations: git push --force, git reset --hard, amending published commits
- Operations visible to others: pushing code, commenting on PRs/issues, sending messages, modifying shared infrastructure

When encountering obstacles, do not use destructive actions as a shortcut. For example, don't bypass safety checks (e.g. --no-verify) or discard unfamiliar files that may be in-progress work.
```

### Research and information gathering

Many models demonstrate strong research and synthesis capabilities and can find and synthesize information from multiple sources effectively (especially when paired with tools). For optimal research results:

1. **Provide clear success criteria**: Define what constitutes a successful answer to your research question

2. **Encourage source verification**: Ask the model to verify information across multiple sources

3. **For complex research tasks, use a structured approach**:

```text
Search for this information in a structured way. As you gather data, develop several competing hypotheses. Track your confidence levels in your progress notes to improve calibration. Regularly self-critique your approach and plan. Update a hypothesis tree or research notes file to persist information and provide transparency. Break down this complex research task systematically.
```

This structured approach allows the model to find and synthesize information and iteratively critique its findings, no matter the size of the corpus.

### Subagent orchestration

Some agent frameworks support subagent orchestration (delegating work to specialized subagents). When available, it can be useful for parallel workstreams or isolated contexts.

If you're seeing excessive subagent use, add explicit guidance about when subagents are and aren't warranted:

```text
Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams that don't need to share state. For simple tasks, sequential operations, single-file edits, or tasks where you need to maintain context across steps, work directly rather than delegating.
```

### Chain complex prompts

Even if a model can handle multi-step reasoning internally, explicit prompt chaining — breaking a task into sequential calls — is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure.

The most common chaining pattern is **self-correction**: generate a draft → have the model review it against criteria → have the model refine based on the review. Each step is a separate call so you can log, evaluate, or branch at any point.

### Reduce file creation in agentic coding

Agentic coding systems may sometimes create new files for testing and iteration purposes, particularly when working with code. This approach allows the model to use files (especially scripts) as a temporary scratchpad before saving its final output.

If you'd prefer to minimize net new file creation, instruct the model to clean up after itself:

```text
If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task.
```

### Overeagerness

Some models have a tendency to overengineer by creating extra files, adding unnecessary abstractions, or building in flexibility that wasn't requested. If you're seeing this undesired behavior, add specific guidance to keep solutions minimal.

For example:

```text
Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused:

- Scope: Don't add features, refactor code, or make "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability.

- Documentation: Don't add docstrings, comments, or type annotations to code you didn't change. Only add comments where the logic isn't self-evident.

- Defensive coding: Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs).

- Abstractions: Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task.
```

### Avoid focusing on passing tests and hard-coding

A model can sometimes focus too heavily on making tests pass at the expense of more general solutions, or may use workarounds like helper scripts for complex refactoring instead of using standard tools directly. To prevent this behavior and ensure robust, generalizable solutions:

```text
Please write a high-quality, general-purpose solution using the standard tools available. Do not create helper scripts or workarounds to accomplish the task more efficiently. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them. The solution should be robust, maintainable, and extendable.
```

### Minimizing hallucinations in agentic coding

To encourage grounded, accurate answers in a codebase:

```text
<investigate_before_answering>
Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.
</investigate_before_answering>
```
