---
name: swift-first-time-lint-setup
description: Set up first-time linting and clean-code checks for Swift/iOS repos using SwiftLint (lint + analyze), Periphery (unused code), and jscpd (duplication) with bunx and Makefile wiring. Use when initializing linting in a Swift/Xcode/SwiftPM project, standardizing repo-wide lint automation, or excluding tests from linting.
---

# Swift First-Time Lint Setup

## Overview
Establish a strict, repeatable lint pipeline for Swift projects without baselines. Prefer scope control (exclude tests) and rule tuning over baselines.

## Workflow

### 1) Preflight and repo inspection
- Read repo-specific instructions and existing lint config files.
- Discover project structure (workspace/scheme, package targets, test locations).
- Check for existing lint tools or CI wiring before adding new files.

### 2) Verify tools before installing
- Always check tools before installing or changing system state.
  - `command -v swiftlint`, `swiftlint version`
  - `command -v periphery`, `periphery version`
  - `command -v bun`, `bun --version`
- Install only missing tools and only if the user asked for installation.

### 3) Add configs and scope
- Add `.swiftlint.yml`, `.periphery.yml`, `.jscpd.json` at repo root.
- Scope lint to app + package sources.
- Exclude tests if requested (prefer excluding test paths rather than baselines).
- Prefer conservative ignore/exclude patterns for build artifacts.

### 4) Wire `make lint`
- Add `make lint` plus helper targets:
  - `lint-swift` → `swiftlint lint`
  - `lint-analyze` → `swiftlint analyze`
  - `lint-unused` → `periphery scan`
  - `lint-dup` → `bunx jscpd`
- For SwiftLint analyze, prefer `--compiler-log-path` from a captured `xcodebuild` log.
- For Periphery, use `--exclude-tests` when tests should not be scanned.

### 4a) Optimize lint runtime (required)
- Split lint into **fast** and **full** paths:
  - `lint` (or `lint-fast`) runs only SwiftLint format + lint.
  - `lint-full` runs analyze + unused + dup.
- Add **changed-only** targets to keep edit/refresh loops fast:
  - `lint-format-changed`, `lint-swift-changed`, `lint-analyze-changed`.
  - Compute changed Swift files from git: `git diff --name-only --diff-filter=ACMR` and `git ls-files --others --exclude-standard`, then filter `*.swift`.
- Use SwiftLint caching everywhere:
  - Pass `--cache-path .swiftlint-cache` to `swiftlint lint`.
  - Add `.swiftlint-cache/` to `.gitignore`.
- Avoid `xcodebuild clean` for analyzer unless needed:
  - Prefer `xcodebuild build` and reuse the previous compiler log if it contains `SwiftDriver` lines.
  - Provide `lint-analyze-clean` for occasional full rebuilds.
- Keep build log temp files in `/tmp` to avoid workspace noise (use `mktemp`).

### 5) Run and verify
- Run `make lint` and confirm all steps succeed.
- If failures occur, adjust scope (exclude tests, narrow paths) or refine rules. Do not create baselines.

## References
- Use `references/templates.md` for minimal config examples.
