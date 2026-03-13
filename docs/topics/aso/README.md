# ASO Library Guide

This directory is a docs topic, not an auto-loaded skill. Use it as reference material for App Store Optimization work, and pull in the upstream skill or Astro MCP only when you want them.

## Layout

- `ASO.md`: local ASO guide and source of truth for the workflow and heuristics you already maintain.
- `aso-store-aso-skill/`: upstream `app-store-aso-skill` content from Tim Broddin.
- `.ndex.md`: optional hidden section guide for `ndex`.

## How to use the upstream ASO skill

The upstream skill lives in `aso-store-aso-skill/` and is centered around three files:

- `aso-store-aso-skill/SKILL.md`: instructions and expected output shape.
- `aso-store-aso-skill/references/aso_learnings.md`: upstream ASO reference material.
- `aso-store-aso-skill/scripts/validate_metadata.py`: character-limit validator for App Store metadata.

Use the skill when you want an agent to:

- generate App Store metadata drafts,
- review an existing App Store listing,
- propose screenshot storyboards,
- perform ASO-oriented competitor analysis,
- validate title, subtitle, keyword, promo text, and description lengths.

Practical workflow:

1. Start with the local guide in `ASO.md` for your preferred framing and constraints.
2. Pull in `aso-store-aso-skill/SKILL.md` when you want the upstream structured workflow.
3. Use `aso-store-aso-skill/references/aso_learnings.md` for the upstream knowledge base.
4. Run the validator after drafting metadata:

```bash
python /Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/scripts/validate_metadata.py
```

Example prompt pattern for an agent:

```text
Use the ASO docs section guide at ~/.ngents/docs/topics/aso/.ndex.md.
Reference ~/.ngents/docs/topics/aso/ASO.md first.
Then use ~/.ngents/docs/topics/aso/aso-store-aso-skill/SKILL.md and validate the final metadata with validate_metadata.py.

App: <name>
Audience: <audience>
Core features: <features>
Competitors: <competitors>
Primary keywords: <keywords>
```

## Using mcporter with Astro MCP without installing Astro MCP into your config

`mcporter` can run MCP servers ad hoc. That means you can use Astro through `mcporter` without adding Astro MCP to your normal `mcporter` config and without making it an always-loaded MCP source.

Verified on March 13, 2026:

```bash
mcporter list --stdio "npx -y astro-mcp-server" --name astro --schema
```

That command succeeded locally and exposed Astro's tools through `mcporter`.

### What this gives you

- no `mcporter config add` step,
- no persistent MCP registration,
- no need to keep Astro MCP in the default server list,
- direct access to Astro tools only when you ask for them.

### Prerequisites

- Astro app installed on the Mac with data in its database.
- Node.js 18+ available to `npx`.
- `mcporter` available in the shell.

### Discover Astro tools on demand

```bash
mcporter list --stdio "npx -y astro-mcp-server" --name astro
mcporter list --stdio "npx -y astro-mcp-server" --name astro --schema
```

### Call Astro tools on demand

Examples:

```bash
mcporter call --stdio "npx -y astro-mcp-server" --name astro astro.get_version
mcporter call --stdio "npx -y astro-mcp-server" --name astro astro.list_apps
mcporter call --stdio "npx -y astro-mcp-server" --name astro astro.search_rankings keyword=habit store=us
mcporter call --stdio "npx -y astro-mcp-server" --name astro 'astro.get_keyword_competitors(keyword: "habit tracker", store: "us", limit: 10)'
```

Useful Astro tools exposed through `mcporter` include:

- `search_rankings`
- `get_historical_rankings`
- `list_apps`
- `get_app_keywords`
- `get_keyword_trends`
- `get_keyword_competitors`
- `get_keyword_recommendations`
- `analyze_competitive_landscape`
- `calculate_keyword_opportunity`
- `detect_ranking_anomalies`
- `predict_ranking_trends`
- `find_low_competition_keywords`

### When to use Astro MCP vs the local docs

Use `ASO.md` when you need strategy, writing guidance, metadata heuristics, and screenshot guidance.

Use Astro MCP through `mcporter` when you need live data such as:

- tracked apps,
- current keyword rankings,
- historical ranking changes,
- competitor results for a keyword,
- opportunity scoring from Astro's database.

The two fit together well:

1. Use Astro MCP via `mcporter` to gather ranking, competitor, and keyword data.
2. Use `ASO.md` plus the upstream ASO skill to turn that data into metadata and screenshot recommendations.
3. Run `validate_metadata.py` to confirm App Store length limits before using the draft.

## References

- Local ASO guide: [/Users/n14/.ngents/docs/topics/aso/ASO.md](/Users/n14/.ngents/docs/topics/aso/ASO.md)
- Upstream skill instructions: [/Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/SKILL.md](/Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/SKILL.md)
- Upstream ASO reference: [/Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/references/aso_learnings.md](/Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/references/aso_learnings.md)
- Metadata validator: [/Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/scripts/validate_metadata.py](/Users/n14/.ngents/docs/topics/aso/aso-store-aso-skill/scripts/validate_metadata.py)
- app-store-aso-skill repo: <https://github.com/TimBroddin/app-store-aso-skill>
- astro-mcp-server repo: <https://github.com/TimBroddin/astro-mcp-server>
- mcporter repo: <https://github.com/steipete/mcporter>
- Local mcporter tool reference: [/Users/n14/.ngents/TOOLS.md](/Users/n14/.ngents/TOOLS.md)
