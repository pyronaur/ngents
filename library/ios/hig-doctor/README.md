# Apple HIG Skills

Apple Human Interface Guidelines as agent skills for Claude Code, Cursor, and other AI coding agents.

14 skills covering the complete Apple HIG — foundations, components, patterns, inputs, platforms, and technologies. Source: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) (February 2025).

## Install

```bash
npx skills add raintree-technology/apple-hig-skills
```

Or install via Claude Code plugin:

```
/plugin marketplace add raintree-technology/apple-hig-skills
```

## HIG Audit

Audit any project for Apple HIG compliance. Works with SwiftUI, UIKit, React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, React Native, Flutter, Jetpack Compose, Android XML, and plain HTML/CSS. Detects 349 patterns across accessibility, color systems, typography, responsive layout, dark mode, motion, i18n, and more.

Requires [Bun](https://bun.sh).

```bash
cd packages/hig-doctor/src-termcast
bun install
bun run audit <directory>
```

Example output:

```
  HIG Audit: website   100/100
  nextjs · 751 detections · 56 files

  ────────────────────────────────────────────────────────────────────
  Foundations                610  ███████████████████░  593 good
  Interaction Patterns        34  ███████████████████░  32 good
  Layout & Navigation         42  █████░░░░░░░░░░░░░░░  11 good
  Controls                    25  ░░░░░░░░░░░░░░░░░░░░
  Input Methods               17  ████████████████░░░░  14 good
  ────────────────────────────────────────────────────────────────────
  Totals                     751  650 good  101 patterns

  Excellent — Strong HIG compliance across the board.
```

### Options

| Flag | Description |
|------|-------------|
| `--export` | Write a full audit report to `<directory>/hig-audit.md` |
| `--stdout` | Print raw audit markdown to stdout (pipe to an AI for evaluation) |
| `--json` | Print structured results as JSON (for CI/scripts) |
| `--help` | Show help |

### What it detects

The audit scans code, stylesheets, and config files, then categorizes findings across HIG areas:

- **Foundations** — semantic vs hardcoded colors, Dynamic Type vs fixed font sizes, dark mode, motion preferences, accessibility labels, focus management, heading hierarchy, landmark regions, touch targets, i18n/RTL support
- **Layout & Navigation** — navigation patterns, responsive breakpoints, semantic HTML, adaptive layout, sidebar/tab patterns
- **Controls** — buttons, toggles, form elements, interactive controls, labels
- **Content Display** — images, collections, tables, cards, accordions, lists
- **Input Methods** — keyboard support, gesture handling, form validation, input types, fieldset/legend, autocomplete
- **Interaction Patterns** — drag and drop, pull-to-refresh, undo, animations, haptics, error handling
- **Dialogs & Presentations** — modals, sheets, alerts, popovers, toasts, tooltips
- **Menus & Actions** — dropdown menus, context menus, toolbars, menu roles
- **Search & Navigation** — search fields, search roles, page controls
- **Status & Progress** — progress indicators, loading states, aria-busy
- **Apple Technologies** — WidgetKit, ActivityKit, HealthKit, ARKit, Apple Pay, Sign in with Apple

**Accessibility anti-patterns detected**: div/span with click handlers but no ARIA role, missing alt text, ambiguous link text ("click here"), empty headings/buttons, `outline: none`, positive tabindex, mouse-only handlers, autoplay media, `user-scalable=no`.

**Context-aware rules**: `!important` inside `@media print` and `prefers-reduced-motion` blocks is not flagged. `outline: none` inside `:focus:not(:focus-visible)` progressive enhancement is not flagged. Hover rules skip pseudo-element selectors like `::-webkit-scrollbar-thumb`. Test/spec files are excluded from scanning.

Each detection is classified as a **positive** (good HIG practice), **concern** (potential violation), or **pattern** (neutral usage detected).

### Supported frameworks

| Framework | Rules | Detection depth |
|-----------|-------|----------------|
| SwiftUI | 55+ | Navigation, controls, color, typography, accessibility, dark mode, technologies |
| UIKit | 10+ | Accessibility, layout, color |
| React / Next.js | 100+ | Full a11y, color tokens, typography, dark mode, responsive, forms, structure |
| Vue / Nuxt | 25+ | Accessibility, navigation, forms, i18n, transitions |
| Svelte / SvelteKit | 20+ | Accessibility, forms, dark mode, motion |
| Angular | 25+ | Accessibility (CDK a11y), Material components, forms, i18n |
| Jetpack Compose | 30+ | Semantics, color, typography, dark mode, navigation, controls |
| Android XML | 20+ | contentDescription, color resources, sp/dp units, touch targets |
| React Native | 15+ | accessibilityLabel/Role, color scheme, navigation, gestures |
| Flutter | 20+ | Semantics, Theme colors/typography, dark mode, i18n |
| CSS / SCSS | 40+ | Custom properties, contrast, focus styles, outline, !important, z-index, logical properties, RTL |
| HTML | 15+ | Landmarks, lang attribute, heading structure, viewport meta |

### How scoring works

The score (0-100) is based on the ratio of positive patterns to concerns, with a small bonus for category breadth:

- **90-100**: Excellent HIG compliance
- **70-89**: Good, with room for improvement
- **50-69**: Needs work
- **Below 50**: Significant violations

Projects with low UI density (fewer than 4 detections per file and under 500 total) display a warning instead of a score interpretation, since scores are less meaningful for non-UI-focused projects like backend services or blockchain repos.

### JSON output

`--json` outputs structured results for CI pipelines and scripts:

```json
{
  "score": 100,
  "lowDensity": false,
  "frameworks": ["nextjs"],
  "files": { "code": 55, "style": 1, "config": 10 },
  "totals": { "concerns": 0, "positives": 650, "patterns": 101 },
  "categories": [
    {
      "name": "Foundations",
      "skill": "hig-foundations",
      "detections": 610,
      "concerns": 0,
      "positives": 593,
      "patterns": 17,
      "files": ["website/app/layout.tsx", "..."]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `score` | 0-100 HIG compliance score |
| `lowDensity` | `true` if the project has few UI patterns (score may be unreliable) |
| `frameworks` | Detected frameworks (nextjs, swiftui, vue, angular, flutter, etc.) |
| `files` | Count of scanned code, style, and config files |
| `totals` | Aggregate counts of concerns, positives, and neutral patterns |
| `categories` | Per-HIG-category breakdown with detection counts and affected files |

### Programmatic API

Import the audit function directly in Bun/Node:

```typescript
import { audit } from "./packages/hig-doctor/src-termcast/src/audit";

const result = await audit("./my-app");
console.log(result.categories);  // CategorySummary[]
console.log(result.allMatches);  // PatternMatch[]
console.log(result.scanResult);  // ScanResult with frameworks, file lists
console.log(result.markdown);    // Full audit report as markdown
```

### Full report for AI evaluation

Generate a detailed markdown report and pipe it to an AI for deeper analysis:

```bash
bun run audit ./my-app --stdout | pbcopy
```

The report includes code excerpts with line numbers, HIG reference material from the 14 skills, and per-category evaluation checklists.

## HIG Doctor (Skill Validator)

Validates skill file structure and repository consistency. Separate from the audit tool above.

```bash
npm --prefix packages/hig-doctor install
node packages/hig-doctor/src/cli.js . --verbose
```

After publishing to npm:

```bash
npx -y hig-doctor@latest . --verbose
```

Open the interactive TUI:

```bash
node packages/hig-doctor/src/cli.js . --tui
```

TUI controls: `j/k` or arrows to move, `f` to filter, `g` to toggle grouping, `q` to quit.

Use as a GitHub Action:

```yaml
- uses: actions/checkout@v4
- uses: raintree-technology/apple-hig-skills@main
  with:
    directory: .
    verbose: "true"
    strict: "true"
```

## Remotion Demo

A [Remotion](https://www.remotion.dev/) video demo that visualizes hig-doctor audit output with animated charts and glass-card UI.

```bash
cd demos/remotion-hig-doctor
npm install
npm run preview
```

Render to video:

```bash
npm run render
```

Output: `out/hig-doctor-showcase.mp4` (1920x1080, 30fps, 21s)

## Skills

| Skill | Description |
|-------|-------------|
| `hig-foundations` | Color, typography, SF Symbols, dark mode, accessibility, layout, motion, privacy, branding, icons |
| `hig-platforms` | Platform-specific design for iOS, iPadOS, macOS, tvOS, watchOS, visionOS |
| `hig-patterns` | UX patterns: onboarding, navigation, search, feedback, drag and drop, modality, settings |
| `hig-inputs` | Gestures, Apple Pencil, keyboards, game controllers, pointers, Digital Crown, eye tracking |
| `hig-technologies` | Siri, Apple Pay, HealthKit, ARKit, machine learning, Sign in with Apple, SharePlay |
| `hig-project-context` | Shared design context document for tailored guidance across skills |
| `hig-components-content` | Charts, collections, image views, web views, color wells, lockups |
| `hig-components-controls` | Pickers, toggles, sliders, steppers, segmented controls, text fields |
| `hig-components-dialogs` | Alerts, action sheets, popovers, sheets, digit entry views |
| `hig-components-layout` | Sidebars, split views, tab bars, scroll views, windows, lists, tables |
| `hig-components-menus` | Menus, context menus, toolbars, buttons, menu bar, pop-up buttons |
| `hig-components-search` | Search fields, page controls, path controls |
| `hig-components-status` | Progress indicators, status bars, activity rings |
| `hig-components-system` | Widgets, live activities, notifications, complications, app clips, app shortcuts |

## How it works

Skills use progressive disclosure to minimize token usage:

1. **Discovery** — Claude reads skill names and descriptions to decide relevance
2. **Activation** — The full SKILL.md loads with key principles and a reference index
3. **Deep reference** — Specific files from `references/` load on demand for detailed guidance

Each skill stays under 500 lines. Detailed HIG content lives in 156 reference documents loaded only when needed.

## Structure

```
skills/
  hig-foundations/
    SKILL.md
    references/
      color.md
      typography.md
      accessibility.md
      ...
  hig-components-layout/
    SKILL.md
    references/
      sidebars.md
      tab-bars.md
      ...
  ...
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding or improving skills.

## License

MIT (repository structure and skill files). Apple HIG content in `references/` is Apple's intellectual property, referenced here for AI agent guidance.
