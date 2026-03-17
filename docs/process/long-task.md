---
title: Long Task
summary: "Workflow for long-running tasks."
read_when:
  - Working on a long task.
---

# Long Task

A Long Task is a process for preparing work that will be executed by an agent in Codex CLI.

## Purpose
- Assign a clear objective to the agent.
- Create the rules the agent should follow for the task.
- Structure the task so the agent can execute it predictably.
- Establish clear task boundaries.
- Define how the task should be executed step by step.

## Output
- One repo-local long-task document in the current working directory.
- The document must be executable by an agent with no prior thread context.

## Requirements
- Create the long-task document before execution begins.
- Define the objective before execution begins.
- Define the task-specific progress check before execution begins.
- Define the task-specific done gate before execution begins.
- Define the iteration loop before execution begins.
- Create an exhaustive checklist of currently known work before execution begins.
- Expand the checklist when new concrete work appears.
- Define task-specific execution rules before execution begins.
- Define the commit gate before execution begins.
- Define what finished work means before execution begins.
- Define how a new agent should resume the task before execution begins.
- Capture the task-specific instructions the user gave for the task.
- Continuously run the progress check while executing the task.
- Work one checklist item at a time.
- Solve each checklist item completely before moving on.
- Prefer long-term fixes over short-term patches.
- Run the required lints and tests before every commit.
- Commit autonomously immediately after a completed checklist item passes its validation gate.
- Use the repo's commit policy and commit-message format for every commit.
- Keep commits reviewable and use common sense about change size.
- Do not batch unrelated checklist items into one commit.
- Search local documentation, skills, and docs query before using web search.
- Continue until the done gate passes.

## Process
- When asked to create a long task, first ask what long task the user wants.
- Derive the long-task definition from a concrete task request.
- Use the concrete task request as the source input.
- Create the repo-local long-task document in the current working directory.
- Define the long task by extracting the reusable execution structure from that request.
- Define the objective before any execution begins.
- Define the done-state before any execution begins.
- Define scope boundaries and non-scope before any execution begins.
- Define the execution rules before any execution begins.
- Define the step-by-step phases before any execution begins.
- Define verification and stop conditions before any execution begins.
- Define the task so a new agent can start from scratch or resume in a dirty environment.
