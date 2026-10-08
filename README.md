# LexQuery — AI Legal Contract Analysis & Citation Engine

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=flat&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![SQLite FTS5](https://img.shields.io/badge/SQLite-FTS5-blueviolet?style=flat&logo=sqlite)](https://www.sqlite.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com)

**LexQuery** is an enterprise-grade web application engineered for in-depth analysis of commercial legal contracts (PDF and DOCX). It enables legal teams, attorneys, and contract managers to interrogate agreements using natural language, backed strictly by **programmatically verified quotes** that link interactively to exact passages in the original documents.

---

## 🌟 Key Features & Requirements Compliance

### Part A: Core Features
1. **Document Ingestion & Validation**
   - **Supported Formats:** Strict MIME and file-extension validation accepting only `.pdf` and `.docx`. Other file types are rejected with a clear message.
   - **Real-Time Processing Status:** Displays step-by-step progress states (`Uploading` → `Extracting text` → `Indexing clauses` → `Ready`).
   - **Scanned PDF Detection:** Evaluates character density across pages; flags image-only/unreadable PDFs with a warning alert rather than saving empty files.
   - **Document Library:** Dedicated interface to list, inspect page count/file size, open, and delete contracts with cascading cleanup.
2. **Streaming Chat with Stop Support**
   - Real-time token streaming via Server-Sent Events (SSE).
   - Dedicated **Stop Generating** button connected to `AbortController` that halts generation instantly while preserving partial output.
   - Chat session history is persisted per document or document portfolio in SQLite.
3. **Deterministic Verified Quotes (Zero-Trust Policy)**
   - Every answer is validated against the canonical source document text prior to presentation.
   - **Whitespace & Newline Tolerance:** Normalizes irregular line wraps, multiple spaces, and typography without altering semantic words.
   - **Anti-Hallucination:** Unverified or paraphrased quotes are flagged with an amber warning badge.
   - AI-reported page numbers and offsets are never trusted; our code calculates exact offsets directly from the source text.
4. **Large Document Strategy (150+ Pages)**
   - Hierarchical clause segmentation combined with SQLite FTS5 (BM25) full-text indexing.
   - **Coverage Accounting:** Tracks inspected sections. The agent is strictly constrained from asserting that a clause does not exist unless the full document or all relevant sections were inspected.

### Part B: Advanced Features
5. **Interactive Citation Highlighting**
   - Clicking any verified quote badge auto-scrolls the integrated document viewer and applies an animated pulsing yellow highlight overlay.
   - **Dual-Mode Viewer:** High-fidelity PDF.js page-by-page canvas + DOM text layer for PDFs, and semantic HTML renderer for DOCX.
   - Gracefully handles multi-line passages and quotes crossing page boundaries.
6. **Multi-Document Questions**
   - Multi-select checkboxes allow querying across multiple contracts simultaneously.
   - The model synthesizes cross-contract comparisons.
   - Every cited quote specifies its source document and is verified against that specific file.
7. **Clause-Level Contract Comparison**
   - Side-by-side contract diff aligned at the clause level (not a noisy character diff).
   - **Substantive Change Analysis:** Distinguishes commercial shifts (liability caps, termination rights) from cosmetic wording.
   - **Significance Filtering:** Instant filter pills for `All`, `High`, `Medium`, and `Low` significance.

### Part C (Challenge Selection): Option 2 — Agentic Document Research
- The model operates in an autonomous multi-round tool-calling loop:
  - `list_clauses({ documentId })`: Inspects document outline.
  - `search_document({ query, documentId })`: Executes FTS5 keyword searches.
  - `get_section({ sectionNumberOrTitle, documentId })`: Retrieves full clause text.
  - `check_coverage({ documentId })`: Evaluates inspected sections.
- **Live Status Badges:** Emits real-time progress steps (`Searching clauses...`, `Reading Section 8.2...`).
- **Hard Round Cap:** Enforces a maximum of 6 rounds to prevent runaway execution or unbounded bills.
- **Fault-Tolerant:** Malformed tool calls or missing arguments are caught gracefully without terminating the stream.

---

## 📐 Architecture & Workflow

```
                                 ┌────────────────────────┐
                                 │  PDF / DOCX Upload     │
                                 └───────────┬────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
            [Scanned / Empty PDF Check]              [Clause & Section Extractor]
            (Warns user if < 50 chars)                             │
                                                                   ▼
                                                     [SQLite FTS5 & Metadata Store]
                                                                   │
                                                                   ▼
┌─────────────────────────────────────────────────── [Agentic Research Loop] ◄────────────────┐
│  - Round 1: list_clauses                                                                     │
│  - Round 2: search_document("liability cap")                                                 │
│  - Round 3: get_section("Section 8")                                                         │
│  - Round 4: check_coverage                                                                   │
│  (Hard cap: 6 rounds)                                                                        │
└──────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Deterministic Quote Verifier    │
                     │  - Sliding-window token matcher   │
                     │  - Whitespace & newline tolerant  │
                     └─────────────────┬─────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 [Verified: TRUE]              [Verified: FALSE]
                        │                             │
                        ▼                             ▼
             Green Badge + Auto-Scroll       Amber Warning Badge
             Pulse Highlight in Viewer       (Hallucination alert)
```

---

## 🖥️ Screen Layout & Workflow

### 1. Analyze & Chat (Split-Pane Workspace)
```
+-------------------------------------------------------------------------------+
| LexQuery | Verified Quotes Active     [Analyze & Chat] [Compare] [Library (3)]|
+------------------------------------+------------------------------------------+
| CHAT CONSOLE                       | HIGH-FIDELITY DOCUMENT VIEWER            |
|                                    |                                          |
| Q: What is the liability cap?      | Master Services Agreement.pdf   [Page 4] |
|                                    |                                          |
| [Agent] search_document: liability | Section 8. Limitation of Liability       |
| [Agent] reading Section 8.2        |                                          |
|                                    | In no event shall either party's         |
| Aggregate liability is capped at   | **********************************       |
| AED 100,000 under Section 8.       | * aggregate liability exceed     * <---  |
|                                    | * AED 100,000.                   * Pulse |
| [✔ Verified Quote • Page 4]        | ********************************** Glow  |
| "In no event shall aggregate       |                                          |
|  liability exceed AED 100,000."    |                                          |
|                                    |                                          |
| [Ask a question...]   [Stop / Send]|                                          |
+------------------------------------+------------------------------------------+
```

### 2. Contract Comparison View
```
+-------------------------------------------------------------------------------+
| Version A: Vendor_2023.pdf  -->  Version B: Vendor_2024.pdf   [Compare Button]|
| Diff Summary: 3 modified clauses, 1 added, 1 deleted (2 High Significance)    |
| Filter: [All (5)] [High Significance (2)] [Medium (2)] [Low (1)]              |
+-------------------------------------------------------------------------------+
| [Section 8: Limitation of Liability]       [High Significance] [Modified]     |
| Substantive Shift: Commercial liability cap increased from AED 100k to AED 1M.|
|                                                                               |
| Version A: Capped at AED 100,000.    | Version B: Capped at AED 1,000,000.    |
+-------------------------------------------------------------------------------+
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node 20 & 25)
- npm or yarn

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your API key (supports OpenAI, OpenRouter, or Gemini):
```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL_NAME=gpt-4o-mini
```
*(Note: If no API key is provided, the application automatically falls back to an offline simulated agentic research runner that executes local FTS searches and deterministic quote verification without crashing!)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite
```bash
npm run test
```
All 16 unit and integration tests across parsers, SQLite database, quote verifier, agent tools, and contract comparison will execute via Vitest.

---

## 🐳 Docker Deployment

A multi-stage `Dockerfile` is provided for containerized deployment (e.g. Railway, Render, Fly.io):

```bash
docker build -t lexquery-app .
docker run -p 3000:3000 -e OPENAI_API_KEY="your-key" lexquery-app
```

---

## 📋 Feature Status: What is Finished and What is Not

| Feature | Status | Details |
|---|---|---|
| **PDF & DOCX Upload** | ✅ Finished | Rejects invalid extensions; parses text page-by-page. |
| **Scanned PDF Detection** | ✅ Finished | Checks printable character count; warns immediately if unreadable. |
| **Document Library** | ✅ Finished | Lists contracts, file sizes, page counts, open, and delete actions. |
| **Streaming Chat** | ✅ Finished | Real-time SSE streaming with Stop Generating button. |
| **Deterministic Quote Verification** | ✅ Finished | Whitespace-tolerant sliding window matcher; zero-trust for model offsets. |
| **Large Documents (150+ Pages)** | ✅ Finished | SQLite FTS5 BM25 search + section outline + coverage accounting. |
| **Interactive Citation Highlighting** | ✅ Finished | Clicking quote scrolls viewer and applies animated pulsing highlight. |
| **Multi-Document Questions** | ✅ Finished | Multi-select checkboxes; tags quotes by source document. |
| **Contract Comparison & Diffing** | ✅ Finished | Clause-level alignment with substantive shift summary and significance filters. |
| **Part C: Agentic Research Loop** | ✅ Finished | Autonomous multi-round tool calling (`list_clauses`, `search_document`, `get_section`, `check_coverage`), hard cap of 6 rounds, malformed call resilience. |
| **Offline Fallback Simulator** | ✅ Finished | Allows running and evaluating full UI and verification without external API keys. |
| **Part C: Tracked DOCX Redlining** | ⏸️ Not Chosen | Tracked-change redlining (Option 1) was deliberately not chosen in favor of Option 2 (Agentic Research). |
| **Native In-Browser OCR Engine** | 💡 Future Scope | Automatic OCR conversion for image-only scans. |

---

## 📄 Submission Documents

- **Half-Page Technical Note:** Located at [`docs/submission/technical-note.md`](docs/submission/technical-note.md)
- **Demo Video Recording Script (3-5 min):** Located at [`docs/submission/demo-video-script.md`](docs/submission/demo-video-script.md)
- **Design Specification:** Located at [`docs/superpowers/specs/2026-10-08-legal-contract-analyzer-design.md`](docs/superpowers/specs/2026-10-08-legal-contract-analyzer-design.md)
- **Implementation Plan:** Located at [`docs/superpowers/plans/2026-10-08-legal-contract-analyzer.md`](docs/superpowers/plans/2026-10-08-legal-contract-analyzer.md)
