# Ralph Loop Advanced Patterns

Optional extensions to the core Ralph loop workflow.

Core guide: `docs/ralph/ralph-loop-core.md`.

## Enhancements

Potential enhancements to the core Ralph approach:

- [Claude's AskUserQuestionTool for Planning](#use-claudes-askuserquestiontool-for-planning) - use Claude's built-in interview tool to systematically clarify JTBD, edge cases, and acceptance criteria for specs.
- [Acceptance-Driven Backpressure](#acceptance-driven-backpressure) - Derive test requirements during planning from acceptance criteria. Prevents "cheating" - can't claim done without appropriate tests passing.
- [Non-Deterministic Backpressure](#non-deterministic-backpressure) - Using LLM-as-judge for tests against subjective tasks (tone, aesthetics, UX). Binary pass/fail reviews that iterate until pass.
- [Ralph-Friendly Work Branches](#ralph-friendly-work-branches) - Asking Ralph to "filter to feature X" at runtime is unreliable. Instead, create scoped plan per branch upfront.
- [JTBD → Story Map → SLC Release](#jtbd--story-map--slc-release) - Push the power of "Letting Ralph Ralph" to connect JTBD's audience and activities to Simple/Lovable/Complete releases.

---

### Use Claude's AskUserQuestionTool for Planning

During Phase 1 (Define Requirements), use Claude's built-in `AskUserQuestionTool` to systematically explore JTBD, topics of concern, edge cases, and acceptance criteria through structured interview before writing specs.

_When to use:_ Minimal/vague initial requirements, need to clarify constraints, or multiple valid approaches exist.

_Invoke:_ "Interview me using AskUserQuestion to understand [JTBD/topic/acceptance criteria/...]"

Claude will ask targeted questions to clarify requirements and ensure alignment before producing `specs/*.md` files.

---

### Acceptance-Driven Backpressure

Geoff's Ralph _implicitly_ connects specs → implementation → tests through emergent iteration. This enhancement would make that connection _explicit_ by deriving test requirements during planning, creating a direct line from "what success looks like" to "what verifies it."

This enhancement connects acceptance criteria (in specs) directly to test requirements (in implementation plan), improving backpressure quality by:

- _Preventing "no cheating"_ - Can't claim done without required tests derived from acceptance criteria
- _Enabling TDD workflow_ - Test requirements known before implementation starts
- _Improving convergence_ - Clear completion signal (required tests pass) vs ambiguous ("seems done?")
- _Maintaining determinism_ - Test requirements in plan (known state) not emergent (probabilistic)

#### Compatibility with Core Philosophy

| Principle             | Maintained? | How                                                         |
| --------------------- | ----------- | ----------------------------------------------------------- |
| Monolithic operation  | ✅ Yes      | One agent, one task, one loop at a time                     |
| Backpressure critical | ✅ Yes      | Tests are the mechanism, just derived explicitly now        |
| Context efficiency    | ✅ Yes      | Planning decides tests once vs building rediscovering       |
| Deterministic setup   | ✅ Yes      | Test requirements in plan (known state) not emergent        |
| Let Ralph Ralph       | ✅ Yes      | Ralph still prioritizes and chooses implementation approach |
| Plan is disposable    | ✅ Yes      | Wrong test requirements? Regenerate plan                    |
| "Capture the why"     | ✅ Yes      | Test intent documented in plan before implementation        |
| No cheating           | ✅ Yes      | Required tests prevent placeholder implementations          |

#### The Prescriptiveness Balance

The critical distinction:

_Acceptance criteria_ (in specs) = Behavioral outcomes, observable results, what success looks like

- ✅ "Extracts 5-10 dominant colors from any uploaded image"
- ✅ "Processes images <5MB in <100ms"
- ✅ "Handles edge cases: grayscale, single-color, transparent backgrounds"

_Test requirements_ (in implementation plan) = Verification points derived from acceptance criteria

- ✅ "Required tests: Extract 5-10 colors, Performance <100ms, Handle grayscale edge case"

_Implementation approach_ (up to Ralph) = Technical decisions about how to achieve it

- ❌ "Use K-means clustering with 3 iterations and LAB color space conversion"

The key: _Specify WHAT to verify (outcomes), not HOW to implement (approach)_

This maintains "Let Ralph Ralph" principle - Ralph decides implementation details while having clear success signals.

#### Architecture: Three-Phase Connection

```
Phase 1: Requirements Definition
    specs/*.md + Acceptance Criteria
    ↓
Phase 2: Planning (derives test requirements)
    IMPLEMENTATION_PLAN.md + Required Tests
    ↓
Phase 3: Building (implements with tests)
    Implementation + Tests → Backpressure
```

#### Phase 1: Requirements Definition

During the human + LLM conversation that produces specs:

- Discuss JTBD and break into topics of concern
- Use subagents to load external context as needed
- _Discuss and define acceptance criteria_ - what observable, verifiable outcomes indicate success
- Keep criteria behavioral (outcomes), not implementation (how to build it)
- LLM writes specs including acceptance criteria however makes most sense for the spec
- Acceptance criteria become the foundation for deriving test requirements in planning phase

#### Phase 2: Planning Mode Enhancement

Modify `PROMPT_plan.md` instruction 1 to include test derivation. Add after the first sentence:

```markdown
For each task in the plan, derive required tests from acceptance criteria in specs - what specific outcomes need verification (behavior, performance, edge cases). Tests verify WHAT works, not HOW it's implemented. Include as part of task definition.
```

#### Phase 3: Building Mode Enhancement

Modify `PROMPT_build.md` instructions:

_Instruction 1:_ Add after "choose the most important item to address":

```markdown
Tasks include required tests - implement tests as part of task scope.
```

_Instruction 2:_ Replace "run the tests for that unit of code" with:

```markdown
run all required tests specified in the task definition. All required tests must exist and pass before the task is considered complete.
```

_Prepend new guardrail_ (in the 9s sequence):

```markdown
999. Required tests derived from acceptance criteria must exist and pass before committing. Tests are part of implementation scope, not optional. Test-driven development approach: tests can be written first or alongside implementation.
```

---

### Non-Deterministic Backpressure

Some acceptance criteria resist programmatic validation:

- _Creative quality_ - Writing tone, narrative flow, engagement
- _Aesthetic judgments_ - Visual harmony, design balance, brand consistency
- _UX quality_ - Intuitive navigation, clear information hierarchy
- _Content appropriateness_ - Context-aware messaging, audience fit

These require human-like judgment but need backpressure to meet acceptance criteria during building loop.

_Solution:_ Add LLM-as-Judge tests as backpressure with binary pass/fail.

LLM reviews are non-deterministic (same artifact may receive different judgments across runs). This aligns with Ralph philosophy: "deterministically bad in an undeterministic world." The loop provides eventual consistency through iteration—reviews run until pass, accepting natural variance.

#### What Needs to Be Created (First Step)

Create two files in `src/lib/`:

```
src/lib/
  llm-review.ts          # Core fixture - single function, clean API
  llm-review.test.ts     # Reference examples showing the pattern (Ralph learns from these)
```

##### `llm-review.ts` - Binary pass/fail API Ralph discovers:

```typescript
interface ReviewResult {
  pass: boolean;
  feedback?: string; // Only present when pass=false
}

function createReview(config: {
  criteria: string; // What to evaluate (behavioral, observable)
  artifact: string; // Text content OR screenshot path
  intelligence?: "fast" | "smart"; // Optional, defaults to 'fast'
}): Promise<ReviewResult>;
```

_Multimodal support:_ Both intelligence levels would use multimodal model (text + vision). Artifact type detection is automatic:

- Text evaluation: `artifact: "Your content here"` → Routes as text input
- Vision evaluation: `artifact: "./tmp/screenshot.png"` → Routes as vision input (detects .png, .jpg, .jpeg extensions)

_Intelligence levels_ (quality of judgment, not capability type):

- `fast` (default): Quick, cost-effective models for straightforward evaluations
  - Example: Gemini 3.0 Flash (multimodal, fast, cheap)
- `smart`: Higher-quality models for nuanced aesthetic/creative judgment
  - Example: GPT 5.1 (multimodal, better judgment, higher cost)

The fixture implementation selects appropriate models. (Examples are current options, not requirements.)

##### `llm-review.test.ts` - Shows Ralph how to use it (text and vision examples):

```typescript
import { createReview } from "@/lib/llm-review";

// Example 1: Text evaluation
test("welcome message tone", async () => {
  const message = generateWelcomeMessage();
  const result = await createReview({
    criteria:
      "Message uses warm, conversational tone appropriate for design professionals while clearly conveying value proposition",
    artifact: message, // Text content
  });
  expect(result.pass).toBe(true);
});

// Example 2: Vision evaluation (screenshot path)
test("dashboard visual hierarchy", async () => {
  await page.screenshot({ path: "./tmp/dashboard.png" });
  const result = await createReview({
    criteria:
      "Layout demonstrates clear visual hierarchy with obvious primary action",
    artifact: "./tmp/dashboard.png", // Screenshot path
  });
  expect(result.pass).toBe(true);
});

// Example 3: Smart intelligence for complex judgment
test("brand visual consistency", async () => {
  await page.screenshot({ path: "./tmp/homepage.png" });
  const result = await createReview({
    criteria:
      "Visual design maintains professional brand identity suitable for financial services while avoiding corporate sterility",
    artifact: "./tmp/homepage.png",
    intelligence: "smart", // Complex aesthetic judgment
  });
  expect(result.pass).toBe(true);
});
```

_Ralph learns from these examples:_ Both text and screenshots work as artifacts. Choose based on what needs evaluation. The fixture handles the rest internally.

_Future extensibility:_ Current design uses single `artifact: string` for simplicity. Can expand to `artifact: string | string[]` if clear patterns emerge requiring multiple artifacts (before/after comparisons, consistency across items, multi-perspective evaluation). Composite screenshots or concatenated text could handle most multi-item needs.

#### Integration with Ralph Workflow

_Planning Phase_ - Update `PROMPT_plan.md`:

After:

```
...Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.
```

Insert this:

```
When deriving test requirements from acceptance criteria, identify whether verification requires programmatic validation (measurable, inspectable) or human-like judgment (perceptual quality, tone, aesthetics). Both types are equally valid backpressure mechanisms. For subjective criteria that resist programmatic validation, explore src/lib for non-deterministic evaluation patterns.
```

_Building Phase_ - Update `PROMPT_build.md`:

Prepend new guardrail (in the 9s sequence):

```markdown
9999. Create tests to verify implementation meets acceptance criteria and include both conventional tests (behavior, performance, correctness) and perceptual quality tests (for subjective criteria, see src/lib patterns).
```

_Discovery, not documentation:_ Ralph learns LLM review patterns from `llm-review.test.ts` examples during `src/lib` exploration (Phase 0c). No AGENTS.md updates needed - the code examples are the documentation.

#### Compatibility with Core Philosophy

| Principle             | Maintained? | How                                                                                                                                          |
| --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backpressure critical | ✅ Yes      | Extends backpressure to non-programmatic acceptance                                                                                          |
| Deterministic setup   | ⚠️ Partial  | Criteria in plan (deterministic), evaluation non-deterministic but converges through iteration. Intentional tradeoff for subjective quality. |
| Context efficiency    | ✅ Yes      | Fixture reused via `src/lib`, small test definitions                                                                                         |
| Let Ralph Ralph       | ✅ Yes      | Ralph discovers pattern, chooses when to use, writes criteria                                                                                |
| Plan is disposable    | ✅ Yes      | Review requirements part of plan, regenerate if wrong                                                                                        |
| Simplicity wins       | ✅ Yes      | Single function, binary result, no scoring complexity                                                                                        |
| Add signs for Ralph   | ✅ Yes      | Light prompt additions, learning from code exploration                                                                                       |

---

### Ralph-Friendly Work Branches

_The Critical Principle:_ Geoff's Ralph works from a single, disposable plan where Ralph picks "most important." To use branches with Ralph while maintaining this pattern, you must scope at plan creation, not at task selection.

_Why this matters:_

- ❌ _Wrong approach_: Create full plan, then ask Ralph to "filter" tasks at runtime → unreliable (70-80%), violates determinism
- ✅ _Right approach_: Create a scoped plan upfront for each work branch → deterministic, simple, maintains "plan is disposable"

_Solution:_ Add a `plan-work` mode to create a work-scoped IMPLEMENTATION_PLAN.md on the current branch. User creates work branch, then runs `plan-work` with a natural language description of the work focus. The LLM uses this description to scope the plan. Post planning, Ralph builds from this already-scoped plan with zero semantic filtering - just picks "most important" as always.

_Terminology:_ "Work" is intentionally broad - it can describe features, topics of concern, refactoring efforts, infrastructure changes, bug fixes, or any coherent body of related changes. The work description you pass to `plan-work` is natural language for the LLM - it can be prose, not constrained by git branch naming rules.

#### Design Principles

- ✅ _Each Ralph session operates monolithically_ on ONE body of work per branch
- ✅ _User creates branches manually_ - full control over naming conventions and strategy (e.g. worktrees)
- ✅ _Natural language work descriptions_ - pass prose to LLM, unconstrained by git naming rules
- ✅ _Scoping at plan creation_ (deterministic) not task selection (probabilistic)
- ✅ _Single plan per branch_ - one IMPLEMENTATION_PLAN.md per branch
- ✅ _Plan remains disposable_ - regenerate scoped plan when wrong/stale for a branch
- ✅ No dynamic branch switching within a loop session
- ✅ Maintains simplicity and determinism
- ✅ Optional - main branch workflow still works
- ✅ No semantic filtering at build time - Ralph just picks "most important"

#### Workflow

_1. Full Planning (on main branch)_

```bash
./loop.sh plan
# Generate full IMPLEMENTATION_PLAN.md for entire project
```

_2. Create Work Branch_

User performs:

```bash
git checkout -b ralph/user-auth-oauth
# Create branch with whatever naming convention you prefer
# Suggestion: ralph/* prefix for work branches
```

_3. Scoped Planning (on work branch)_

```bash
./loop.sh plan-work "user authentication system with OAuth and session management"
# Pass natural language description - LLM uses this to scope the plan
# Creates focused IMPLEMENTATION_PLAN.md with only tasks for this work
```

_4. Build from Plan (on work branch)_

```bash
./loop.sh
# Ralph builds from scoped plan (no filtering needed)
# Picks most important task from already-scoped plan
```

_5. PR Creation (when work complete)_

User performs:

```bash
gh pr create --base main --head ralph/user-auth-oauth --fill
```

#### Work-Scoped Loop Script

Extends the base enhanced loop script to add work branch support with scoped planning:

Template file: `docs/ralph/templates/loop-plan-work.sh`

#### `PROMPT_plan_work.md` Template

_Note:_ Identical to `PROMPT_plan.md` but with scoping instructions and `WORK_SCOPE` env var substituted (automatically by the loop script).

Template file: `docs/ralph/templates/PROMPT_plan_work.md`

#### Compatibility with Core Philosophy

| Principle              | Maintained? | How                                                                      |
| ---------------------- | ----------- | ------------------------------------------------------------------------ |
| Monolithic operation   | ✅ Yes      | Ralph still operates as single process within branch                     |
| One task per loop      | ✅ Yes      | Unchanged                                                                |
| Fresh context          | ✅ Yes      | Unchanged                                                                |
| Deterministic          | ✅ Yes      | Scoping at plan creation (deterministic), not runtime (prob.)            |
| Simple                 | ✅ Yes      | Optional enhancement, main workflow still works                          |
| Plan-driven            | ✅ Yes      | One IMPLEMENTATION_PLAN.md per branch                                    |
| Single source of truth | ✅ Yes      | One plan per branch - scoped plan replaces full plan on branch           |
| Plan is disposable     | ✅ Yes      | Regenerate scoped plan anytime: `./loop.sh plan-work "work description"` |
| Markdown over JSON     | ✅ Yes      | Still markdown plans                                                     |
| Let Ralph Ralph        | ✅ Yes      | Ralph picks "most important" from already-scoped plan - no filter        |

---

### JTBD → Story Map → SLC Release

#### Topics of Concern → Activities

Geoff's suggested workflow already aligns planning with Jobs-to-be-Done — breaking JTBDs into topics of concern, which in turn become specs. This approach can be extended by reframing _topics of concern_ as _activities_.

Activities are verbs in a journey ("upload photo", "extract colors") rather than capabilities ("color extraction system"). They're naturally scoped by user intent.

> Topics: "color extraction", "layout engine" → capability-oriented
> Activities: "upload photo", "see extracted colors", "arrange layout" → journey-oriented

#### Activities → User Journey

Activities — and their constituent steps — sequence naturally into a user flow, creating a _journey structure_ that makes gaps and dependencies visible. A _User Story Map_ organizes activities as columns (the journey backbone) with capability depths as rows — the full space of what _could_ be built:

```
UPLOAD    →   EXTRACT    →   ARRANGE     →   SHARE

basic         auto           manual          export
bulk          palette        templates       collab
batch         AI themes      auto-layout     embed
```

#### User Journey → Release Slices

Horizontal slices through the map become candidate releases. Not every activity needs new capability in every release — some cells stay empty, and that's fine if the slice is still coherent:

```
                  UPLOAD    →   EXTRACT    →   ARRANGE     →   SHARE

Release 1:        basic         auto                           export
                  ───────────────────────────────────────────────────
Release 2:                      palette        manual
                  ───────────────────────────────────────────────────
Release 3:        batch         AI themes      templates       embed
```

#### Release Slices → SLC Releases

The story map gives you _structure_ for slicing. Jason Cohen's _Simple, Lovable, Complete (SLC)_ gives you _criteria_ for what makes a slice good:

- _Simple_ — Narrow scope you can ship fast. Not every activity, not every depth.
- _Complete_ — Fully accomplishes a job within that scope. Not a broken preview.
- _Lovable_ — People actually want to use it. Delightful within its boundaries.

_Why SLC over MVP?_ MVPs optimize for learning at the customer's expense — "minimum" often means broken or frustrating. SLC flips this: learn in-market _while_ delivering real value. If it succeeds, you have optionality. If it fails, you still treated users well.

Each slice can become a release with a clear value and identity:

```
                  UPLOAD    →   EXTRACT    →   ARRANGE     →   SHARE

Palette Picker:   basic         auto                           export
                  ───────────────────────────────────────────────────
Mood Board:                     palette        manual
                  ───────────────────────────────────────────────────
Design Studio:    batch         AI themes      templates       embed
```

- _Palette Picker_ — Upload, extract, export. Instant value from day one.
- _Mood Board_ — Adds arrangement. Creative expression enters the journey.
- _Design Studio_ — Professional features: batch processing, AI themes, embeddable output.

---

#### Operationalizing with Ralph

The concepts above — activities, story maps, SLC releases — are the _thinking tools_. How do we translate them into Ralph's workflow?

_Default Ralph approach:_

1. _Define Requirements_: Human + LLM define JTBD topics of concern → `specs/*.md`
2. _Create Tasks Plan_: LLM analyzes all specs + current code → `IMPLEMENTATION_PLAN.md`
3. _Build_: Ralph builds against full scope

This works well for capability-focused work (features, refactors, infrastructure). But it doesn't naturally produce valuable (SLC) product releases - it produces "whatever the specs describe".

_Activities → SLC Release approach:_

To get SLC releases, we need to ground activities in audience context. Audience defines WHO has the JTBDs, which in turn informs WHAT activities matter and what "lovable" means.

```
Audience (who)
    └── has JTBDs (why)
            └── fulfilled by Activities (how)
```

##### Workflow

_I. Requirements Phase (2 steps):_

Still performed in LLM conversations with the human, similar to the default Ralph approach.

1. _Define audience and their JTBDs_ — WHO are we building for and what OUTCOMES do they want?

   - Human + LLM discuss and determine the audience(s) and their JTBDs (outcomes they want)
   - May contain multiple connected audiences (e.g. "designer" creates, "client" reviews)
   - Generates `AUDIENCE_JTBD.md`

2. _Define activities_ — WHAT do users do to accomplish their JTBDs?

   - Informed by `AUDIENCE_JTBD.md`
   - For each JTBD, identify activities necessary to accomplish it
   - For each activity, determine:
     - Capability depths (basic → enhanced) — levels of sophistication
     - Desired outcome(s) at each depth — what does success look like?
   - Generates `specs/*.md` (one per activity)

   The discrete steps within activities are implicit and LLM can infer them during planning.

_II. Planning Phase:_

Performed in Ralph loop with _updated_ planning prompt.

- LLM analyzes:
  - `AUDIENCE_JTBD.md` (who, desired outcomes)
  - `specs/*` (what could be built)
  - Current code state (what exists)
- LLM determines next SLC slice (which activities, at what capability depths) and plans tasks for that slice
- LLM generates `IMPLEMENTATION_PLAN.md`
- _Human verifies_ plan before building:
  - Does the scope represent a coherent SLC release?
  - Are the right activities included at the right depths?
  - If wrong → re-run planning loop to regenerate plan, optionally updating inputs or planning prompt
  - If right → proceed to building

_III. Building Phase:_

Performed in Ralph loop with standard building prompt.

##### Updated Planning Prompt

Variant of `PROMPT_plan.md` that adds audience context and SLC-oriented slice recommendation.

_Notes:_

- Unlike the default template, this does not have a `[project-specific goal]` placeholder — the goal is implicit: recommend the most valuable next release for the audience.
- Current subagents names presume using Claude.

Template file: `docs/ralph/templates/PROMPT_plan_slc.md`

##### Notes

_Why `AUDIENCE_JTBD.md` as a separate artifact:_

- Single source of truth — prevents drift across specs
- Enables holistic reasoning: "What does this audience need MOST?"
- JTBDs captured alongside audience (the "why" lives with the "who")
- Referenced twice: during spec creation AND SLC planning
- Keeps activity specs focused on WHAT, not repeating WHO

_Cardinalities:_

- One audience → many JTBDs ("Designer" has "capture space", "explore concepts", "present to client")
- One JTBD → many activities ("capture space" includes upload, measurements, room detection)
- One activity → can serve multiple JTBDs ("upload photo" serves both "capture" and "gather inspiration")
