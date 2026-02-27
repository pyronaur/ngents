# Tool Use and Reasoning

## Read when

- Need to steer action vs suggestion behavior.
- Need tool-triggering or parallel tool-calling guidance.
- Need to tune reasoning depth, reflection, and self-check behavior.

## Table of contents

- [Tool use](#tool-use)
- [Tool usage](#tool-usage)
- [Optimize parallel tool calling](#optimize-parallel-tool-calling)
- [Thinking and reasoning](#thinking-and-reasoning)
- [Overthinking and excessive thoroughness](#overthinking-and-excessive-thoroughness)
- [Leverage reasoning & interleaved reflection capabilities](#leverage-reasoning--interleaved-reflection-capabilities)

## Tool use

### Tool usage

Tool-capable LLMs are trained for precise instruction following and benefit from explicit direction to use specific tools. If you say "can you suggest some changes," the model will sometimes provide suggestions rather than implementing them—even if making changes might be what you intended.

For the model to take action, be more explicit:

<section title="Example: Explicit instructions">

**Less effective (the model will only suggest):**
```text
Can you suggest some changes to improve this function?
```

**More effective (the model will make the changes):**
```text
Change this function to improve its performance.
```

Or:
```text
Make these edits to the authentication flow.
```

</section>

To make the model more proactive about taking action by default, you can add this to your system prompt:

```text
<default_to_action>
By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing. Try to infer the user's intent about whether a tool call (e.g., file edit or read) is intended or not, and act accordingly.
</default_to_action>
```

On the other hand, if you want the model to be more hesitant by default, less prone to jumping straight into implementations, and only take action if requested, you can steer this behavior with a prompt like the below:

```text
<do_not_act_before_instructions>
Do not jump into implementatation or changes files unless clearly instructed to make changes. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.
</do_not_act_before_instructions>
```

If your prompts were designed to reduce undertriggering on tools or skills, newer models may now overtrigger. The fix is to dial back any aggressive language. Where you might have said "CRITICAL: You MUST use this tool when...", you can use more normal prompting like "Use this tool when...".

### Optimize parallel tool calling

Some models and agent frameworks support (or simulate) parallel tool execution. When available, this can:

- Run multiple speculative searches during research
- Read several files at once to build context faster
- Execute commands in parallel

This behavior is steerable. You can boost parallelism or adjust the aggression level:

```text
<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel. Prioritize calling tools simultaneously whenever the actions can be done in parallel rather than sequentially. For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into context at the same time. Maximize use of parallel tool calls where possible to increase speed and efficiency. However, if some tool calls depend on previous calls to inform dependent values like the parameters, do NOT call these tools in parallel and instead call them sequentially. Never use placeholders or guess missing parameters in tool calls.
</use_parallel_tool_calls>
```

```text
Execute operations sequentially with brief pauses between each step to ensure stability.
```

## Thinking and reasoning

### Overthinking and excessive thoroughness

Some model versions do significantly more upfront exploration than others, especially when you enable optional “reasoning” features or set a higher “effort” / “thinking budget” parameter. This initial work often helps to optimize the final results, but the model may gather extensive context or pursue multiple threads of research without being prompted.

If this behavior is undesirable:

- **Replace blanket defaults with more targeted instructions.** Instead of "Default to using \[tool\]," add guidance like "Use \[tool\] when it would enhance your understanding of the problem."
- **Remove over-prompting.** Tools that undertriggered in previous models are likely to trigger appropriately now. Instructions like "If in doubt, use \[tool\]" can cause overtriggering.
- **Use reasoning controls as a fallback.** If the model continues to be overly aggressive, use a lower reasoning setting (if your stack exposes one).

In some cases, a model may think extensively, which can increase token usage and slow down responses. If this behavior is undesirable, add explicit instructions to constrain its reasoning, or lower the reasoning setting.

```text
When you're deciding how to approach a problem, choose an approach and commit to it. Avoid revisiting decisions unless you encounter new information that directly contradicts your reasoning. If you're weighing two approaches, pick one and see it through. You can always course-correct later if the chosen approach fails.
```

### Leverage reasoning & interleaved reflection capabilities

Some models and APIs offer reasoning modes that can be especially helpful for tasks involving reflection after tool use or complex multi-step reasoning. You can guide initial or interleaved reflection for better results.

You can guide the model’s reasoning behavior:

```text
After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your reasoning to plan and iterate based on this new information, and then take the best next action.
```

If you find the model “reasoning” more often than you'd like (which can happen with large or complex system prompts), add guidance to steer it:

```text
Reasoning adds latency and should only be used when it will meaningfully improve answer quality - typically for problems that require multi-step reasoning. When in doubt, respond directly.
```

- **Prefer general instructions over prescriptive steps.** A prompt like "reason thoroughly" often produces better results than a hand-written step-by-step plan — the model’s internal reasoning frequently exceeds what a human would prescribe.
- **Multishot examples work with reasoning.** Use `<thinking>` tags inside your few-shot examples to show the reasoning pattern. The model will often generalize that style.
- **Manual step-by-step as a fallback.** If you are not using special reasoning modes, you can still encourage step-by-step work by asking the model to reason through the problem. Use structured tags like `<thinking>` and `<answer>` to separate reasoning from the final output.
- **Ask the model to self-check.** Append something like "Before you finish, verify your answer against [test criteria]." This catches errors reliably, especially for coding and math.
