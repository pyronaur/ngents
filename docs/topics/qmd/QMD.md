---
summary: What QMD is, the core concepts it uses, and which local reference doc to read next.
read_when:
  - Need the shortest overview of QMD before opening deeper references.
  - Need the local map of the QMD docs set.
---

# QMD - Query Markup Documents

QMD is a local search engine for markdown notes, meeting transcripts, documentation, and other knowledge bases. This local docs set preserves the upstream non-networked documentation surface and reorganizes it into canonical concept owners.

## Core Concepts

- **Collections** are named roots that QMD indexes.
- **Contexts** add higher-level meaning to collections or subpaths.
- **Search modes** let you choose between keyword, vector, and hybrid retrieval.
- **Embeddings** power semantic search and reranking.

## Reference Map

- Read [installation-and-requirements.md](references/installation-and-requirements.md) for setup, verification, and model/runtime requirements.
- Read [cli.md](references/cli.md) for the command surface and shared options.
- Read [collections-contexts-and-indexing.md](references/collections-contexts-and-indexing.md) when setting up or maintaining indexed content.
- Read [search-and-retrieval.md](references/search-and-retrieval.md) for common search workflows and retrieval examples.
- Read [query-syntax.md](references/query-syntax.md) for exact query grammar and query-shaping guidance.
- Read [sdk-and-integration.md](references/sdk-and-integration.md) for Bun/Node integrations.
- Read [architecture-and-internals.md](references/architecture-and-internals.md) for scoring, storage, indexing, chunking, and internals.

Upstream source repo for regeneration: `https://github.com/tobi/qmd.git` at commit `1fb2e28`.

