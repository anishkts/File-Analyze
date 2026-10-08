# Technical Note: Engineering Decisions & Architecture

**Author:** Antigravity Engineering Candidate  
**Project:** LexQuery — Legal Contract Analysis Engine  
**Assignment Track:** Part C Option 2 (Agentic Document Research)  

---

### 1. How Quote Verification Works, and Where It Could Fail

Our Quote Verification Engine enforces a **Zero-Trust Policy**: it never trusts model-asserted page numbers, paragraph indices, or character offsets. Instead, it locates each quote in the canonical document text programmatically before displaying it to the user.

**The Verification Pipeline:**
1. **Sanitization & Normalization:** Standardizes typographical curly quotes (`“`, `”`, `‘`, `’` to `"`, `'`), removes non-breaking spaces (`\u00A0`), soft hyphens (`\u00AD`), and standardizes em/en dashes.
2. **Fast-Path String Matching:** Executes case-exact and case-insensitive substring searches.
3. **Sliding-Window Token Alignment:** Because PDF extraction routinely introduces line breaks, soft hyphen splits, or double spaces between words without changing the semantic words, the canonical document text is tokenized into word objects retaining original character offsets `[startChar, endChar]`. A sliding token window matches the sequence of normalized tokens in the quote against the document tokens.
4. **Resolution to Canonical Pages:** Once a match is confirmed, the engine maps the offset back to the physical page and paragraph boundaries for the viewer. Quotes failing verification are flagged with an unverified warning.

**Where It Could Fail (Edge Cases & Limitations):**
- **OCR Character Errors:** In poor-quality scanned documents that went through third-party OCR, common character substitutions (e.g., `rn` recognized as `m`, `1` as `l`, `0` as `O`) would break token equivalence unless fuzzy edit-distance (Levenshtein) scoring is enabled.
- **Complex Multi-Cell Tables:** Tables with irregular spanning cells extracted as flattened text may interleave column text out of reading order, causing a multi-column quote to appear broken in the linear token stream.
- **Aggressive Model Paraphrasing:** If the model alters clause syntax or replaces synonyms rather than quoting verbatim, the sliding token matcher strictly rejects the quote.

---

### 2. How Large Documents (150+ Pages) Are Handled

A 150-page commercial contract contains ~60,000–90,000 words, exceeding typical attention budgets and inducing "lost in the middle" retrieval degradation.

**Our Multi-Tier Strategy:**
1. **Hierarchical Segmentation & FTS5 Indexing:** During ingestion, contracts are segmented into structured clauses (e.g., `Section 1.1`, `Article 8`, `Clause 14`) and indexed into an SQLite FTS5 (Full-Text Search) virtual table with BM25 ranking.
2. **Autonomous Agent Tool Retrieval:** Rather than feeding monolithic context, the model uses tools (`list_clauses`, `search_document`, `get_section`) to inspect high-level outlines, search targeted keywords, and fetch only relevant clauses on-demand.
3. **Strict Coverage Accounting:** The assignment mandates: *"If your app only read part of a document, it must not answer as though it read all of it. Confidently stating that a clause does not exist after reading only the first 30 pages is the worst possible output."*  
   To prevent false negatives, our `check_coverage` tool calculates the ratio of inspected sections. If the agent has only read a subset of sections, the model is forbidden by prompt guardrails from claiming a clause does not exist without explicitly reporting the inspection coverage and recommending an exhaustive review.

---

### 3. Which Part C Option Was Chosen and Why, Status, and Hardest Part

**Option Chosen:** **Option 2: Agentic Document Research**  
**Why:** Modern legal practice requires iterative investigation across non-linear contract clauses (e.g., cross-referencing indemnity in Section 14 with liability exclusions in Section 8 and definitions in Section 1). An autonomous tool-calling loop mirrors how human legal counsel actually investigates contracts.

**Status:**
- **Completed:** Multi-round agent research loop with Vercel AI SDK; hard round cap of 6 rounds; real-time status streaming; resilience to malformed tool calls; fallback offline simulator for keyless environments; and deterministic post-answer quote verification.

**The Hardest Part:**
Ensuring deterministic termination and graceful failure handling when the model attempts malformed tool calls or searches for non-existent sections. We solved this by implementing defensive parameter normalization inside each tool executor: instead of throwing uncaught exceptions that crash the SSE stream, tools return descriptive feedback strings (e.g., *"Section 14 not found. Call list_clauses to inspect valid section identifiers."*), enabling the agent to self-correct in the subsequent round.

---

### 4. What Would Be Built Next with More Time

1. **Embedded OCR Pipeline (Tesseract.js / Google Cloud Vision):** Automatically convert scanned PDFs into searchable text layers on upload rather than rejecting them.
2. **Hybrid Dense-Sparse Vector Search:** Augment SQLite FTS5 BM25 with local embeddings (Transformers.js / BGE-small) for semantic concept retrieval.
3. **Tracked-Change OOXML Redlining (Part C Option 1):** Allow lawyers to propose amendments in natural language and export real tracked changes (`w:ins`, `w:del`) into downloadable `.docx` files.
4. **Interactive Bounding-Box PDF Highlighting:** Map PDF.js character coordinates directly to visual rectangular bounding boxes on the canvas for pixel-perfect quote boxing.
