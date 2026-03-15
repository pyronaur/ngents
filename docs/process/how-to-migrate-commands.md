---
title: How To Migrate Commands
summary: "Compact process for classifying a command migration and reading the right docs before implementation."
read_when:
  - Migrating an existing command.
  - Need to determine which command-system docs apply before implementation.
---

# How To Migrate Commands

Use this document to classify a command migration before planning or implementation.

The goal is to identify the target command system first, then read the docs that actually apply to that system.

## First Step

Classify the migration into one of these types:

- Bunmagic or `bmt` migration
- standalone `command-template` or Node/NPM CLI migration
- other command migration

Do not assume that a command migration uses Bunmagic.

## Read The Right Docs

### Bunmagic or `bmt` migration

Read:

- `docs/bmt.md`
- `docs/bunmagic/migrate-bunmagic.md`
- `docs/bunmagic/single-script-v1-to-v2-playbook.md`

Use this path when the command will be exposed through Bunmagic or `bmt`.

### Standalone `command-template` or Node/NPM CLI migration

Read:

- `~/Projects/Open-Source/command-template/README.md`
- `~/Projects/Open-Source/command-template/docs/api-reference.md`
- `~/Projects/Open-Source/command-template/AGENTS.md`

Use this path when the command will be owned by a standalone Node/NPM package.

### Other command migration

Read the docs for the target command system before planning implementation.

## Required Decisions Before Implementation

Before implementation, write down:

- target runtime
- target packaging model
- target exposure model
- final owner path
- final command surface

If any of these are not explicit from the user or trustworthy local sources, stop and clarify them first.

## Boundary Rule

Do not use Bunmagic migration guidance for `command-template` migrations unless the user explicitly says Bunmagic remains part of the final design.
