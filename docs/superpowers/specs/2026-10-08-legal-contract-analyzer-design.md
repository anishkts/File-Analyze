# Engineering Design Specification: Legal Contract Analysis Web Application

**Date:** 2026-10-08  
**Status:** Approved  
**Challenge Track Selection (Part C):** Option 2: Agentic Document Research  

---

## 1. Executive Summary & Objectives

The goal is to engineer an enterprise-grade legal contract analysis web application capable of ingesting contracts (PDF and DOCX), supporting multi-round natural language research, and generating answers backed strictly by **verified quotes** directly linked to exact passages in the original documents.

The system addresses critical legal workflow requirements:
1. **Zero Hallucination Tolerance**: Every cited quote is verified by code against the canonical document before presentation. Unverified quotes are rejected or clearly flagged.
2. **Scalability for Large Documents**: Easily processes 150-page complex contracts without exceeding model context windows or making premature negative claims ("clause does not exist").
3. **Interactive Citation Highlighting**: Clicking any quote badge auto-scrolls the integrated dual-mode document viewer and highlights the exact multi-line passage.
4. **Cross-Contract Intelligence**: Multi-document querying across portfolios and clause-level substantive comparison with legal significance scoring.
5. **Agentic Tool-Calling Research (Part C Option 2)**: An autonomous multi-round research loop where the model uses document introspection tools (`list_clauses`, `search_document`, `get_section`, `check_coverage`) while emitting real-time progress steps.

---

## 2. Architecture & Tech Stack

### 2.1 Technology Stack
- **Framework**: Next.js 15 (App Router, React 19, TypeScript 5)
- **Styling**: Tailwind CSS with custom legal dark/light theme, Lucide React icons, Radix UI primitives
- **AI Orchestration**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`) configured via environment variables (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`, or `GEMINI_API_KEY`)
- **Document Parsers**:
  - PDF: `pdfjs-dist` (page-by-page text, coordinate layout, and character offset tracking) + `pdf-parse`
  - DOCX: `mammoth` (semantic HTML and structured paragraph/heading extraction)
- **Database & Full-Text Search**: SQLite (`better-sqlite3` with WAL mode) with native SQLite FTS5 for full-text search indexing
- **Document Viewing**: Dual-mode viewer:
  - PDF.js canvas and DOM text-layer renderer with highlight overlay
  - Structured DOCX HTML viewer with interactive element anchors
- **Comparison & Diffing Engine**: Custom clause segmentation + Myers diffing (`diff` library) + semantic legal significance classifier

---

## 3. Data Storage & Schema Design

SQLite provides zero-config, persistent storage for uploaded documents, clause indices, full-text indexes, and conversation histories:

```sql
-- 1. Documents Metadata & Raw Content
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx')),
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  extracted_text TEXT NOT NULL,
  is_scanned BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Structured Clauses & Sections (Hierarchical Indexing)
CREATE TABLE document_sections (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_number TEXT,
  title TEXT,
  content TEXT NOT NULL,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  page_number INTEGER NOT NULL
);

-- 3. Full-Text Search (SQLite FTS5)
CREATE VIRTUAL TABLE document_fts USING fts5(
  document_id UNINDEXED,
  section_id UNINDEXED,
  content,
  tokenize = 'porter unicode61'
);

-- 4. Chat Sessions (Single or Multi-Document)
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  document_ids TEXT NOT NULL, -- JSON array of document IDs
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chat Messages & Research History
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls TEXT, -- JSON array of research steps executed
  quotes TEXT,     -- JSON array of verified quotes [{quote, docId, page, startChar, endChar, verified}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Subsystem Details

### 4.1 Document Ingestion & Scanned Document Detection (Part A.1)
1. **Validation**: Upload route `/api/upload` enforces MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) and extensions `.pdf` / `.docx`. Any other format is rejected with a clear descriptive error.
2. **Parsing & Character Density Validation**:
   - PDF: Extracted using `pdfjs-dist`. Character counts per page are calculated. If the total extractable character count across all pages is under 50 characters, the document is flagged as `is_scanned = 1`. The upload warns the user immediately: *"Scanned document detected: This PDF contains images but no selectable text. Please upload an OCR-processed document."*
   - DOCX: Extracted using `mammoth.convertToHtml` and `mammoth.extractRawText`, parsing headings, numbered clauses, and tables.
3. **Section & Clause Segmentation**:
   - Regex patterns identify standard legal section patterns (`Section 1`, `Article II`, `1.1`, `8.2(a)`).
   - Paragraphs are mapped to character offsets `[start_char, end_char]` and page numbers.
   - Text is indexed into `document_fts` for instant sub-millisecond retrieval.
4. **Status Stream**: The client tracks upload progress through 4 distinct stages:
   `Uploading` → `Extracting text` → `Indexing clauses` → `Ready`.

### 4.2 Streaming Chat & Session Management (Part A.2)
1. **Streaming**: Powered by Vercel AI SDK `streamText` / SSE endpoint `/api/chat`.
2. **Stop Generation**: The client provides an immediate "Stop Generating" action connected to `AbortController`. When triggered, client preserves whatever partial text was emitted and commits it to the database message history.
3. **Session Persistence**: Chat history is persisted per document or document group in SQLite and reloaded automatically when opening a document.

### 4.3 Deterministic Quote Verification Engine (Part A.3)
This is the core reliability guarantee of the system:
1. **Zero-Trust Input**: The AI-generated answer contains citations formatted as `[quote: "exact quote", docId: "..."]` or standard blockquotes. The engine ignores any page number or offset asserted by the AI.
2. **Normalization Algorithm**:
   - Both the canonical document text and the candidate quote are tokenized into normalized word streams (whitespace collapsed, soft hyphens removed, punctuation standardized).
   - Character index mappings `token_index -> (start_char, end_char)` are retained.
3. **Sliding-Window Token Match**:
   - A sliding window searches for the token sequence of the quote in the canonical token stream.
   - If found: Calculates exact `start_char`, `end_char`, and `page_number` in the document. Quote status is marked `verified: true`.
   - If not found: Quote status is marked `verified: false`. The quote is flagged with an amber warning badge in the UI ("Unverified / Model paraphrased quote") or omitted from verified citation pills.
4. **Honest Negatives**: System prompt explicitly instructs the model: *"If the document does not contain an answer, state clearly that the clause or information is not present. Do not speculate or invent clauses."*

### 4.4 Large Document Handling (Part A.4 - 150 Pages)
1. **Context Window Strategy**: 150 pages of legal text (~60,000–90,000 words) exceed single-prompt limits and lead to "lost in the middle" degradation.
2. **Hierarchical Indexing**:
   - High-level Outline (Table of Contents / Clause Headings).
   - Clause-level FTS5 indexing.
3. **Coverage Accounting**:
   - The agent tracks which pages and sections have been read.
   - **Crucial Rule**: The system explicitly forbids stating a clause does not exist unless:
     a) An exhaustive FTS5 search across the entire document returned zero matches, AND
     b) The general structure / definitions sections were inspected.
   - If only a subset of pages was retrieved, the response states: *"Based on Sections 1–4 examined (coverage: 15%), no mention of termination was found. Full contract review recommended."*

### 4.5 Citation Highlighting & Dual-Mode Viewer (Part B.5)
1. **PDF Viewer**: Built with `pdfjs-dist` viewer components. Renders rendered canvas plus text-layer overlay.
2. **DOCX Viewer**: Built with formatted semantic HTML viewer with anchored paragraph IDs.
3. **Click-to-Highlight Interaction**:
   - Clicking a verified quote badge sends an event to the viewer: `{ pageNumber, startChar, endChar, quoteText }`.
   - Viewer scrolls to the target page via `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
   - Locates target text in the DOM text layer and wraps it in a pulse-animated highlight box (`bg-amber-300/60 ring-2 ring-amber-500 rounded animate-pulse`).
   - Supports multiline and page-crossing quotes by highlighting respective parts on each page.

### 4.6 Multi-Document Questions (Part B.6)
1. **Multi-Selection UI**: Checkboxes in the Document Library allow selecting 2 or more contracts.
2. **Comparative Prompting & Retrieval**:
   - The agent tool suite accepts `document_ids` and searches across all selected contracts.
   - Prompts mandate cross-document comparison rather than isolated answers.
   - Every cited quote is prefixed with its document source (e.g., `[Vendor Agreement 2023 • Page 4]`).
3. **Per-Document Verification**: Each quote is strictly verified against its respective document record in SQLite. Clicking a quote automatically switches the active document in the viewer pane and highlights the passage.

### 4.7 Document Comparison Engine (Part B.7)
1. **Clause-Level Alignment**:
   - Ingestion segments both documents into clauses by numbering and heading.
   - Myers diffing aligns matching clauses between Version A and Version B.
   - Unmatched clauses are tagged as `Added` or `Deleted`.
2. **Substantive Change Analysis**:
   - An LLM analysis pass inspects modified clauses and classifies them into:
     - **High Significance**: Financial liability caps, indemnity, governing jurisdiction, termination rights.
     - **Medium Significance**: Payment schedules, notice periods, audit requirements.
     - **Low Significance**: Stylistic rephrasing, typography, formatting.
   - Generates an executive plain-language summary of what changed commercially.
3. **Interactive Comparison UI**:
   - Filter bar: `All Changes` | `High` | `Medium` | `Low`.
   - Side-by-side clause diff view with red deletions and green additions.

### 4.8 Part C Option 2: Agentic Document Research Loop
1. **Autonomous Tool Set**:
   - `list_clauses({ documentId })`: Retrieves document table of contents and section hierarchy.
   - `search_document({ documentId, query })`: FTS5 BM25 search returning matching snippets and section numbers.
   - `get_section({ documentId, sectionNumberOrTitle })`: Returns full text of specific clause for thorough legal analysis.
   - `check_coverage({ documentId })`: Summarizes inspected pages/sections.
2. **Execution Guardrails**:
   - **Hard Round Cap**: Maximum 6 research rounds.
   - **Error Handling**: Malformed tool calls or missing section IDs return descriptive feedback strings without crashing the agent loop.
   - **Live Progress Updates**: Server pushes real-time status notifications:
     `status: "Searching for termination provisions..."` → `status: "Reading Section 8.2..."` → `status: "Verifying cited quotes..."`.

---

## 5. UI/UX Design & Layout

- **Split-Screen Layout**:
  - Left Panel: Navigation tabs (`Chat`, `Library`, `Compare`), active session history, streaming response window, live agent status badges, verified quote cards.
  - Right Panel: Document Viewer (PDF canvas + text layer / DOCX HTML) with zoom controls, page navigator, and citation highlight overlays.
- **Design Aesthetic**: Premium typography (Inter / JetBrains Mono for clauses), sleek dark/light theme, high-contrast badges (green for verified quotes, amber for unverified, red for critical diffs).

---

## 6. Verification & Testing Strategy

1. **Unit Tests**:
   - Quote verification engine: exact match, whitespace differences, multiline spans, missing/hallucinated quotes.
   - Document parsers: PDF text extraction, DOCX extraction, scanned PDF detection.
2. **Integration Tests**:
   - Tool calling loop with mock model: validates max round enforcement and malformed argument handling.
   - Multi-document query routing and independent quote verification.
   - Clause alignment and significance classification.
3. **End-to-End Test Plan**:
   - Upload sample 150-page PDF and verify coverage reporting.
   - Upload scanned image PDF and verify scanned warning.
   - Click quote in chat and verify right pane auto-scrolls and highlights.

---

## 7. Submission Artifacts

1. **GitHub Repository**: Clean repository with zero committed API keys.
2. **Production Deployment**: Configured for Vercel / Railway / Docker.
3. **README.md**: Architectural diagrams, feature list, setup instructions, and screenshots.
4. **Demo Video Script (3-5 min)**:
   - Minute 0-1: Upload & processing, scanned PDF detection.
   - Minute 1-2: Asking question, agentic tool-calling stream, verified quotes.
   - Minute 2-3: Citation highlighting click-through in PDF viewer.
   - Minute 3-4: Multi-document Q&A and Document Comparison with significance filters.
   - Minute 4-5: Technical highlights and Part C Agentic Research discussion.
5. **Half-Page Technical Note**:
   - Quote verification mechanics and whitespace failure modes.
   - Large document indexing & coverage guarantees.
   - Part C Agentic Research implementation details.
   - Roadmap for future work.
