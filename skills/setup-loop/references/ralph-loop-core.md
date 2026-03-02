---
summary: "Core Ralph playbook covering requirement definition and planning/build loop workflow."
read_when:
  - Need the baseline Ralph process from requirements to loop execution.
  - Setting up planning or building prompts for a Ralph-style loop.
---

# The Ralph Playbook

## What is the optimal way to Ralph?

Ralph is a funnel with 3 Phases, 2 Prompts, and 1 Loop:

### Three Phases, Two Prompts, One Loop

#### Phase 1. Define Requirements (LLM conversation)

- Discuss project ideas → identify Jobs to Be Done (JTBD)
- Break individual JTBD into topic(s) of concern
- Use subagents to load info from URLs into context
- LLM understands JTBD topic of concern: subagent writes `specs/FILENAME.md` for each topic

#### Phase 2 / 3. Run Ralph Loop (two modes, swap `PROMPT.md` as needed)

Same loop mechanism, different prompts for different objectives:

| Mode       | When to use                            | Prompt focus                                            |
| ---------- | -------------------------------------- | ------------------------------------------------------- |
| _PLANNING_ | No plan exists, or plan is stale/wrong | Generate/update `plan_<name>.md` only           |
| _BUILDING_ | Plan exists                            | Implement from plan, commit, update plan as side effect |

_Prompt differences per mode:_

- 'PLANNING' prompt does gap analysis (specs vs code) and outputs a prioritized TODO list—no implementation, no commits.
- 'BUILDING' prompt assumes plan exists, picks tasks from it, implements, runs tests (backpressure), commits.

_Why use the loop for both modes?_

- BUILDING requires it: inherently iterative (many tasks × fresh context = isolation)
- PLANNING uses it for consistency: same execution model, though often completes in 1-2 iterations
- Flexibility: if plan needs refinement, loop allows multiple passes reading its own output
- Simplicity: one mechanism for everything; clean file I/O; easy stop/restart

_Context loaded each iteration:_ `PROMPT.md` + `AGENTS.md`

_PLANNING mode loop lifecycle:_

1. Subagents study `specs/*` and existing `/src`
2. Compare specs against code (gap analysis)
3. Create/update `plan_<name>.md` with prioritized tasks
4. No implementation

_BUILDING mode loop lifecycle:_

1. _Orient_ – subagents study `specs/*` (requirements)
2. _Read plan_ – study `plan_<name>.md`
3. _Select_ – pick the most important task
4. _Investigate_ – subagents study relevant `/src` ("don't assume not implemented")
5. _Implement_ – N subagents for file operations
6. _Validate_ – 1 subagent for build/tests (backpressure)
7. _Update `plan_<name>.md`_ – mark task done, note discoveries/bugs
8. _Update `AGENTS.md`_ – if operational learnings
9. _Commit_
10. _Loop ends_ → context cleared → next iteration starts fresh

#### Concepts

| Term                    | Definition                                                      |
| ----------------------- | --------------------------------------------------------------- |
| _Job to be Done (JTBD)_ | High-level user need or outcome                                 |
| _Topic of Concern_      | A distinct aspect/component within a JTBD                       |
| _Spec_                  | Requirements doc for one topic of concern (`specs/FILENAME.md`) |
| _Task_                  | Unit of work derived from comparing specs to code               |

_Relationships:_

- 1 JTBD → multiple topics of concern
- 1 topic of concern → 1 spec
- 1 spec → multiple tasks (specs are larger than tasks)

_Example:_

- JTBD: "Help designers create mood boards"
- Topics: image collection, color extraction, layout, sharing
- Each topic → one spec file
- Each spec → many tasks in implementation plan

_Topic Scope Test: "One Sentence Without 'And'"_

- Can you describe the topic of concern in one sentence without conjoining unrelated capabilities?
  - ✓ "The color extraction system analyzes images to identify dominant colors"
  - ✗ "The user system handles authentication, profiles, and billing" → 3 topics
- If you need "and" to describe what it does, it's probably multiple topics

---

## Key Principles

### ⏳ Context Is _Everything_

- When 200K+ tokens advertised = ~176K truly usable
- And 40-60% context utilization for "smart zone"
- Tight tasks + 1 task per loop = _100% smart zone context utilization_

This informs and drives everything else:

- _Use the main agent/context as a scheduler_
  - Don't allocate expensive work to main context; spawn subagents whenever possible instead
- _Use subagents as memory extension_
  - Each subagent gets ~156kb that's garbage collected
  - Fan out to avoid polluting main context
- _Simplicity and brevity win_
  - Applies to number of parts in system, loop config, and content
  - Verbose inputs degrade determinism
- _Prefer Markdown over JSON_
  - To define and track work, for better token efficiency

### 🧭 Steering Ralph: Patterns + Backpressure

Creating the right signals & gates to steer Ralph's successful output is **critical**. You can steer from two directions:

- _Steer upstream_
  - Ensure deterministic setup:
    - Allocate first ~5,000 tokens for specs
    - Every loop's context is allocated with the same files so model starts from known state (`PROMPT.md` + `AGENTS.md`)
  - Your existing code shapes what gets used and generated
  - If Ralph is generating wrong patterns, add/update utilities and existing code patterns to steer it toward correct ones
- _Steer downstream_
  - Create backpressure via tests, typechecks, lints, builds, etc. that will reject invalid/unacceptable work
  - Prompt says "run tests" generically. `AGENTS .md` specifies actual commands to make backpressure project-specific
  - Backpressure can extend beyond code validation: some acceptance criteria resist programmatic checks - creative quality, aesthetics, UX feel. LLM-as-judge tests can provide backpressure for subjective criteria with binary pass/fail. ([More detailed thoughts below](#non-deterministic-backpressure) on how to approach this with Ralph.)
- _Remind Ralph to create/use backpressure_
  - Remind Ralph to use backpressure when implementing: "Important: When authoring documentation, capture the why — tests and implementation importance."

### 🙏 Let Ralph Ralph

Ralph's effectiveness comes from how much you trust it do the right thing (eventually) and engender its ability to do so.

- _Let Ralph Ralph_
  - Lean into LLM's ability to self-identify, self-correct and self-improve
  - Applies to implementation plan, task definition and prioritization
  - Eventual consistency achieved through iteration
- _Use protection_
  - To operate autonomously, Ralph requires `--dangerously-skip-permissions` - asking for approval on every tool call would break the loop. This bypasses Claude's permission system entirely - so a sandbox becomes your only security boundary.
  - Philosophy: "It's not if it gets popped, it's when. And what is the blast radius?"
  - Running without a sandbox exposes credentials, browser cookies, SSH keys, and access tokens on your machine
  - Run in isolated environments with minimum viable access:
    - Only the API keys and deploy keys needed for the task
    - No access to private data beyond requirements
    - Restrict network connectivity where possible
    - Options: Docker sandboxes (local), Fly Sprites/E2B/etc. (remote/production)
  - Additional escape hatches: Ctrl+C stops the loop; `git reset --hard` reverts uncommitted changes; regenerate plan if trajectory goes wrong

### 🚦 Move Outside the Loop

To get the most out of Ralph, you need to get out of his way. Ralph should be doing _all_ of the work, including decided which planned work to implement next and how to implement it. Your job is now to sit on the loop, not in it - to engineer the setup and environment that will allow Ralph to succeed.

_Observe and course correct_ – especially early on, sit and watch. What patterns emerge? Where does Ralph go wrong? What signs does he need? The prompts you start with won't be the prompts you end with - they evolve through observed failure patterns.

_Tune it like a guitar_ – instead of prescribing everything upfront, observe and adjust reactively. When Ralph fails a specific way, add a sign to help him next time.

But signs aren't just prompt text. They're _anything_ Ralph can discover:

- Prompt guardrails - explicit instructions like "don't assume not implemented"
- `AGENTS .md` - operational learnings about how to build/test
- Utilities in your codebase - when you add a pattern, Ralph discovers it and follows it
- Other discoverable, relevant inputs…

And remember, _the plan is disposable:_

- If it's wrong, throw it out, and start over
- Regeneration cost is one Planning loop; cheap compared to Ralph going in circles
- Regenerate when:
  - Ralph is going off track (implementing wrong things, duplicating work)
  - Plan feels stale or doesn't match current state
  - Too much clutter from completed items
  - You've made significant spec changes
  - You're confused about what's actually done

---

## Loop Mechanics

### Outer Loop Control

Geoff's initial minimal form of `loop.sh` script:

```bash
while :; do cat PROMPT.md | claude ; done
```

_Note:_ The same approach can be used with other CLIs; e.g. `amp`, `codex`, `opencode`, etc.

_What controls task continuation?_

The continuation mechanism is elegantly simple:

1. _Bash loop runs_ → feeds `PROMPT.md` to claude
2. _PROMPT.md instructs_ → "Study plan_<name>.md and choose the most important thing"
3. _Agent completes one task_ → updates plan_<name>.md on disk, commits, exits
4. _Bash loop restarts immediately_ → fresh context window
5. _Agent reads updated plan_ → picks next most important thing

_Key insight:_ The plan_<name>.md file persists on disk between iterations and acts as shared state between otherwise isolated loop executions. Each iteration deterministically loads the same files (`PROMPT.md` + `AGENTS.md` + `specs/*`) and reads the current state from disk.

_No sophisticated orchestration needed_ - just a dumb bash loop that keeps restarting the agent, and the agent figures out what to do next by reading the plan file each time.

### Inner Loop Control (Task Execution)

A single task execution has no hard technical limit. Control relies on:

- _Scope discipline_ - PROMPT.md instructs "one task" and "commit when tests pass"
- _Backpressure_ - tests/build failures force the agent to fix issues before committing
- _Natural completion_ - agent exits after successful commit

_Ralph can go in circles, ignore instructions, or take wrong directions_ - this is expected and part of the tuning process. When Ralph "tests you" by failing in specific ways, you add guardrails to the prompt or adjust backpressure mechanisms. The nondeterminism is manageable through observation and iteration.

### Enhanced Loop Example

Wraps core loop with mode selection (plan/build), max-iterations support, and git push after each iteration.

_This enhancement uses two saved prompt files:_

- `PROMPT_plan.md` - Planning mode (gap analysis, generates/updates plan)
- `PROMPT_build.md` - Building mode (implements from plan)

Template file: `docs/ralph/templates/loop.sh`

_Mode selection:_

- No keyword → Uses `PROMPT_build.md` for building (implementation)
- `plan` keyword → Uses `PROMPT_plan.md` for planning (gap analysis, plan generation)

_Max-iterations:_

- Limits the _outer loop_ (number of tasks attempted; NOT tool calls within a single task)
- Each iteration = one fresh context window = one task from plan_<name>.md = one commit
- `./loop.sh` runs unlimited (manual stop with Ctrl+C)
- `./loop.sh 20` runs max 20 iterations then stops

_Claude CLI flags:_

- `-p` (headless mode): Enables non-interactive operation, reads prompt from stdin
- `--dangerously-skip-permissions`: Bypasses all permission prompts for fully automated runs
- `--output-format=stream-json`: Outputs structured JSON for logging/monitoring/visualization
- `--model opus`: Primary agent uses Opus for task selection, prioritization, and coordination (can use `sonnet` for speed if tasks are clear)
- `--verbose`: Provides detailed execution logging

---

## Files

```
project-root/
├── docs/
│   └── ralph/
│       ├── ralph-loop-core.md      # Core loop guide
│       ├── ralph-loop-advanced.md  # Optional advanced patterns
│       └── templates/              # Extracted templates referenced by this guide
│           ├── loop.sh
│           ├── loop-plan-work.sh
│           ├── PROMPT_build.md
│           ├── PROMPT_plan.md
│           ├── PROMPT_plan_work.md
│           ├── PROMPT_plan_slc.md
│           └── AGENTS.md.example
├── AGENTS.md                       # Operational guide loaded each iteration
├── plan_<name>.md          # Prioritized task list (generated/updated by Ralph)
├── specs/                          # Requirement specs (one per JTBD topic)
│   ├── [jtbd-topic-a].md
│   └── [jtbd-topic-b].md
├── src/                            # Application source code
└── src/lib/                        # Shared utilities & components
```

### `loop.sh`

The outer loop script that orchestrates Ralph iterations.

See [Loop Mechanics](#loop-mechanics) section for detailed implementation examples and configuration options.

_Setup:_ Make the script executable before first use:

```bash
chmod +x loop.sh
```

_Core function:_ Continuously feeds prompt file to claude, manages iteration limits, and pushes changes after each task completion.

### PROMPTS

The instruction set for each loop iteration. Swap between PLANNING and BUILDING versions as needed.

_Prompt Structure:_

| Section                | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| _Phase 0_ (0a, 0b, 0c) | Orient: study specs, source location, current plan    |
| _Phase 1-4_            | Main instructions: task, validation, commit           |
| _999... numbering_     | Guardrails/invariants (higher number = more critical) |

_Key Language Patterns_ (Geoff's specific phrasing):

- "study" (not "read" or "look at")
- "don't assume not implemented" (critical - the Achilles' heel)
- "using parallel subagents" / "up to N subagents"
- "only 1 subagent for build/tests" (backpressure control)
- "Think extra hard" (now "Ultrathink)
- "capture the why"
- "keep it up to date"
- "if functionality is missing then it's your job to add it"
- "resolve them or document them"

#### `PROMPT_plan.md` Template

_Notes:_

- Update [project-specific goal] placeholder below.
- Current subagents names presume using Claude.

Template file: `docs/ralph/templates/PROMPT_plan.md`

#### `PROMPT_build.md` Template

_Note:_ Current subagents names presume using Claude.

Template file: `docs/ralph/templates/PROMPT_build.md`

### `AGENTS.md`

Single, canonical "heart of the loop" - a concise, operational "how to run/build" guide.

- NOT a changelog or progress diary
- Describes how to build/run the project
- Captures operational learnings that improve the loop
- Keep brief (~60 lines)

Status, progress, and planning belong in `plan_<name>.md`, not here.

_Loopback / Immediate Self-Evaluation:_

AGENTS.md should contain the project-specific commands that enable loopback - the ability for Ralph to immediately evaluate his work within the same loop. This includes:

- Build commands
- Test commands (targeted and full suite)
- Typecheck/lint commands
- Any other validation tools

The BUILDING prompt says "run tests" generically; AGENTS.md specifies the actual commands. This is how backpressure gets wired in per-project.

#### Example

Template file: `docs/ralph/templates/AGENTS.md.example`

### `plan_<name>.md`

Prioritized bullet-point list of tasks derived from gap analysis (specs vs code) - generated by Ralph.

- _Created_ via PLANNING mode
- _Updated_ during BUILDING mode (mark complete, add discoveries, note bugs)
- _Can be regenerated_ – Geoff: "I have deleted the TODO list multiple times" → switch to PLANNING mode
- _Self-correcting_ – BUILDING mode can even create new specs if missing

The circularity is intentional: eventual consistency through iteration.

_No pre-specified template_ - let Ralph/LLM dictate and manage format that works best for it.

### `specs/*`

One markdown file per topic of concern. These are the source of truth for what should be built.

- Created during Requirements phase (human + LLM conversation)
- Consumed by both PLANNING and BUILDING modes
- Can be updated if inconsistencies discovered (rare, use subagent)

_No pre-specified template_ - let Ralph/LLM dictate and manage format that works best for it.

### `src/` and `src/lib/`

Application source code and shared utilities/components.

Referenced in `PROMPT.md` templates for orientation steps.

---
