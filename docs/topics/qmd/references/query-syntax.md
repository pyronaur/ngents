---
summary: Query grammar and practical guidance for shaping `lex`, `vec`, `hyde`, `expand`, and `intent` queries.
read_when:
  - Need to write or debug QMD queries precisely.
  - Need the exact query model and syntax constraints.
---

# QMD Query Syntax

QMD queries are structured documents with typed sub-queries. Each line specifies a search type and query text.

## Grammar

```ebnf
query          = expand_query | query_document ;
expand_query   = text | explicit_expand ;
explicit_expand= "expand:" text ;
query_document = [ intent_line ] { typed_line } ;
intent_line    = "intent:" text newline ;
typed_line     = type ":" text newline ;
type           = "lex" | "vec" | "hyde" ;
text           = quoted_phrase | plain_text ;
quoted_phrase  = '"' { character } '"' ;
plain_text     = { character } ;
newline        = "\n" ;
```

## Query Types

| Type | Method | Description |
|------|--------|-------------|
| `lex` | BM25 | Keyword search with exact matching |
| `vec` | Vector | Semantic similarity search |
| `hyde` | Vector | Hypothetical document embedding |

## Default Behavior

A QMD query is either a single expand query or a multi-line query document. Any single-line query with no prefix is treated as an expand query and passed to the expansion model, which emits lex, vec, and hyde variants automatically.

```
# These are equivalent and cannot be combined with typed lines:
how does authentication work
expand: how does authentication work
```

## Lex Query Syntax

Lex queries support special syntax for precise keyword matching:

```ebnf
lex_query   = { lex_term } ;
lex_term    = negation | phrase | word ;
negation    = "-" ( phrase | word ) ;
phrase      = '"' { character } '"' ;
word        = { letter | digit | "'" } ;
```

| Syntax | Meaning | Example |
|--------|---------|---------|
| `word` | Prefix match | `perf` matches "performance" |
| `"phrase"` | Exact phrase | `"rate limiter"` |
| `-word` | Exclude term | `-sports` |
| `-"phrase"` | Exclude phrase | `-"test data"` |

### Examples

```
lex: CAP theorem consistency
lex: "machine learning" -"deep learning"
lex: auth -oauth -saml
```

## Vec Query Syntax

Vec queries are natural language questions. No special syntax — just write what you're looking for.

```
vec: how does the rate limiter handle burst traffic
vec: what is the tradeoff between consistency and availability
```

## Hyde Query Syntax

Hyde queries are hypothetical answer passages (50-100 words). Write what you expect the answer to look like.

```
hyde: The rate limiter uses a sliding window algorithm with a 60-second window. When a client exceeds 100 requests per minute, subsequent requests return 429 Too Many Requests.
```

## Multi-Line Queries

Combine multiple query types for best results. First query gets 2x weight in fusion.

```
lex: rate limiter algorithm
vec: how does rate limiting work in the API
hyde: The API implements rate limiting using a token bucket algorithm...
```

## Expand Queries

An expand query stands alone; it's not mixed with typed lines. You can either rely on the default untyped form or add the explicit `expand:` prefix:

```
expand: error handling best practices
# equivalent
error handling best practices
```

Both forms call the local query expansion model, which generates lex, vec, and hyde variations automatically.

## Intent

An optional `intent:` line provides background context to disambiguate ambiguous queries. It steers query expansion, reranking, and snippet extraction but does not search on its own.

- At most one `intent:` line per query document
- `intent:` cannot appear alone — at least one `lex:`, `vec:`, or `hyde:` line is required
- Intent is also available via the `--intent` CLI flag or MCP `intent` parameter

```
intent: web page load times and Core Web Vitals
lex: performance
vec: how to improve performance
```

Without intent, "performance" is ambiguous (web-perf? team health? fitness?). With intent, the search pipeline preferentially selects and ranks web-performance content.

## Constraints

- Top-level query must be either a standalone expand query or a multi-line document
- Query documents allow only `lex`, `vec`, `hyde`, and `intent` typed lines (no `expand:` inside)
- `lex` syntax (`-term`, `"phrase"`) only works in lex queries
- At most one `intent:` line per query document; cannot appear alone
- Empty lines are ignored
- Leading/trailing whitespace is trimmed

## CLI

```bash
# Single line (implicit expand)
qmd query "how does auth work"

# Multi-line with types
qmd query $'lex: auth token\nvec: how does authentication work'

# Structured
qmd query $'lex: keywords\nvec: question\nhyde: hypothetical answer...'

# With intent (inline)
qmd query $'intent: web performance and latency\nlex: performance\nvec: how to improve performance'

# With intent (flag)
qmd query --intent "web performance and latency" "performance"
```


### Query Types

| Type | Method | Input |
|------|--------|-------|
| `lex` | BM25 | Keywords — exact terms, names, code |
| `vec` | Vector | Question — natural language |
| `hyde` | Vector | Answer — hypothetical result (50-100 words) |



### Writing Good Queries

**lex (keyword)**
- 2-5 terms, no filler words
- Exact phrase: `"connection pool"` (quoted)
- Exclude terms: `performance -sports` (minus prefix)
- Code identifiers work: `handleError async`

**vec (semantic)**
- Full natural language question
- Be specific: `"how does the rate limiter handle burst traffic"`
- Include context: `"in the payment service, how are refunds processed"`

**hyde (hypothetical document)**
- Write 50-100 words of what the *answer* looks like
- Use the vocabulary you expect in the result

**expand (auto-expand)**
- Use a single-line query (implicit) or `expand: question` on its own line
- Lets the local LLM generate lex/vec/hyde variations
- Do not mix `expand:` with other typed lines — it's either a standalone expand query or a full query document



### Intent (Disambiguation)

When a query term is ambiguous, add `intent` to steer results:

```json
{
  "searches": [
    { "type": "lex", "query": "performance" }
  ],
  "intent": "web page load times and Core Web Vitals"
}
```

Intent affects expansion, reranking, chunk selection, and snippet extraction. It does not search on its own — it's a steering signal that disambiguates queries like "performance" (web-perf vs team health vs fitness).



### Combining Types

| Goal | Approach |
|------|----------|
| Know exact terms | `lex` only |
| Don't know vocabulary | Use a single-line query (implicit `expand:`) or `vec` |
| Best recall | `lex` + `vec` |
| Complex topic | `lex` + `vec` + `hyde` |
| Ambiguous query | Add `intent` to any combination above |

First query gets 2x weight in fusion — put your best guess first.



### Lex Query Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `term` | Prefix match | `perf` matches "performance" |
| `"phrase"` | Exact phrase | `"rate limiter"` |
| `-term` | Exclude | `performance -sports` |

Note: `-term` only works in lex queries, not vec/hyde.



### Collection Filtering

```json
{ "collections": ["docs"] }              // Single
{ "collections": ["docs", "notes"] }     // Multiple (OR)
```

Omit to search all collections.

