# CITYWALK Context Engine Architecture

Status: **Accepted direction / implementation roadmap**  
Date: **2026-10-05**  
Scope: CITYWALK AI retrieval, context building, grounding, and future knowledge runtime

## Decision

CITYWALK will **not** start with a separate, complex vector-database RAG stack.

The system will evolve as a **Context Engine** that combines the retrieval method best suited to each type of data:

- structured retrieval for exact facts and constraints;
- geospatial retrieval for nearby places and route candidates;
- full-text / keyword search for exact terms;
- semantic retrieval only where meaning, vibe, or fuzzy intent matters;
- live lookups for time-sensitive data;
- long-context reasoning over a small, high-quality candidate set;
- agentic / multi-step retrieval only for requests that genuinely need multiple searches.

The core principle is:

> **Retrieval shrinks the world. Long context reasons deeply inside the smaller world.**

## Why

CITYWALK data is heterogeneous.

Some questions are best answered with deterministic filters:

- city
- latitude / longitude
- distance
- category
- opening hours
- price
- duration
- accessibility
- language
- route constraints

Other questions are semantic:

- "romantic"
- "mysterious"
- "local"
- "not touristy"
- "hidden"
- "architecturally interesting"

Using embeddings for every query would add complexity without improving exact filtering. Conversely, SQL alone is not enough for fuzzy traveler intent.

The architecture therefore uses **hybrid retrieval**, not a single retrieval technology.

## Target architecture

```text
User request
    |
    v
Intent / constraint extraction
    |
    v
Query planner
    |
    +----------------------+----------------------+-------------------+
    |                      |                      |                   |
    v                      v                      v                   v
Structured SQL       PostGIS / geo         Full-text search    Semantic search
facts & filters      nearby / route         exact terms         meaning / vibe
    |                      |                      |                   |
    +----------------------+----------------------+-------------------+
                                   |
                                   v
                         Candidate ranking
                                   |
                                   v
                         Enough information?
                          /              \
                       yes                no
                        |                  |
                        |             retrieve again
                        |                  |
                        +------------------+
                                   |
                                   v
                           Context builder
                                   |
                                   v
                         LLM reasoning layer
                                   |
                                   v
                       Grounded CITYWALK result
```

## Phase 1 — now

Use the existing relational data model as the primary retrieval layer.

Planned stack:

- PostgreSQL
- PostGIS for geospatial filtering and ranking
- strong metadata
- PostgreSQL full-text / keyword search where useful
- a dedicated Context Builder
- LLM generation / reasoning

### Phase 1 goals

1. Retrieve a bounded set of relevant places.
2. Build a compact, structured context for the model.
3. Avoid sending an entire city catalogue to the model.
4. Keep latency and inference cost predictable.
5. Keep retrieval deterministic when the problem is deterministic.
6. Ground generated route/story output in stored CITYWALK data.

### Example

User request:

> Build me a 90-minute walk near Holstentor with architecture and hidden places, no museums, and only places that are open.

Initial retrieval should use structured / geospatial constraints first:

```text
city = Lübeck
distance <= configured radius
category != museum
open_now = true
duration_budget = 90 minutes
```

The resulting candidate set is then passed to the Context Builder and LLM for route composition, ordering, diversity, and storytelling.

## Phase 2 — semantic retrieval

Add semantic retrieval when CITYWALK has enough content and real queries that benefit from it.

Preferred first option: **pgvector inside PostgreSQL**, rather than introducing a separate vector database immediately.

Candidate semantic fields include:

- place descriptions
- historical stories
- editorial descriptions
- atmosphere / vibe
- traveler-facing summaries
- semantic tags

Example:

> I want romantic, mysterious places that feel local and not touristy.

This should combine hard filters with semantic similarity.

### Rule

Use:

- **SQL / PostGIS for facts**
- **semantic retrieval for meaning**

Do not replace deterministic filters with embeddings.

## Phase 3 — agentic retrieval

One-shot retrieval is sufficient for simple questions.

Example:

> Tell me about Holstentor.

Flow:

```text
retrieve -> build context -> answer
```

Complex route requests may require multiple retrieval passes.

Example:

> Build a 3-hour medieval walk, include one local food stop, avoid crowded tourist streets, finish near the station, and make sure everything is open.

Possible flow:

```text
retrieve architecture candidates
        |
        v
check route constraints
        |
        v
retrieve food stop if missing
        |
        v
retrieve / rank endpoint candidates
        |
        v
verify opening / live constraints
        |
        v
build final context
        |
        v
generate route
```

Agentic retrieval should be used only when the request justifies the extra latency and model cost.

## Long-context policy

Long context is useful **after retrieval**, not as a replacement for retrieval at CITYWALK scale.

Example future city:

```text
5,000 city places
      |
      v
structured / geo filters
      |
      v
100-150 candidates
      |
      v
semantic / ranking stage
      |
      v
20-30 strong candidates
      |
      v
long-context reasoning
      |
      v
personalized route
```

The LLM should reason across the best candidate set rather than repeatedly rereading the full city dataset.

## Grounding and provenance

CITYWALK should progressively make generated content auditable.

Important facts should be able to carry provenance such as:

```text
fact
source
source_url
last_verified_at
confidence
```

Generated walks and stories should preserve the relationship between claims and the underlying CITYWALK data where practical.

This is especially important for:

- historical facts
- opening information
- ticket / price information
- accessibility
- temporary closures
- transport information
- event details

## Static vs live context

The Context Builder should eventually combine multiple categories of context.

### Relatively static

- historical descriptions
- architecture
- editorial stories
- place metadata
- categories

### Dynamic / live

- opening hours
- temporary closures
- events
- ticket prices
- weather
- public transport
- current route conditions where available

### User context

- current city / location
- available time
- interests
- travel style
- accessibility constraints
- places already visited / saved
- active walk state

## Retrieval decision table

| Need | Preferred method |
| --- | --- |
| Exact fact / filter | SQL |
| Nearby places / distance | PostGIS |
| Exact name / term | Full-text or keyword search |
| Vibe / meaning / fuzzy intent | Embeddings / semantic search |
| Complex multi-constraint trip | Hybrid retrieval, optionally agentic |
| Small bounded candidate set | Long-context reasoning |
| Time-sensitive information | Live API / tool / fresh database lookup |

## Explicit non-goals for now

Do **not** introduce these only because they are common in RAG tutorials:

- Pinecone or another separate vector database
- a dedicated reranking service
- a complex chunking pipeline
- multi-agent retrieval loops for every request
- embedding every field in the database
- sending an entire city dataset on every request

Any of these can be added later if measurements or product requirements justify them.

## Implementation sequence

1. Keep the CITYWALK relational / geo data clean and expressive.
2. Define a retrieval service with explicit filters and ranking.
3. Add a Context Builder with a stable input/output contract.
4. Measure candidate quality, latency, prompt size, and generation quality.
5. Add PostgreSQL full-text search where useful.
6. Add pgvector when real semantic queries justify it.
7. Add multi-step / agentic retrieval for complex planning tasks only.
8. Add stronger provenance, source conflict handling, and confidence signals as the knowledge layer matures.

## Architectural principle

CITYWALK should not be designed around a technology label such as "RAG" or "vector database".

It should be designed around one question:

> **What is the smallest, most trustworthy context the model needs to solve this user's request well?**

That context may come from SQL, geospatial search, keyword search, semantic retrieval, live tools, user state, or multiple retrieval passes.

The Context Engine is the layer responsible for making that decision.
