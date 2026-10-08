# Legal Contract Analysis Web Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready legal contract analysis full-stack web application (Next.js 15 + SQLite + Vercel AI SDK) that parses PDF/DOCX contracts, executes streaming chat backed strictly by deterministic quote verification with interactive citation highlighting, supports multi-document analysis and clause-level comparison, and implements Part C Option 2 (Agentic Document Research Loop).

**Architecture:** A unified TypeScript Next.js 15 App Router codebase with local SQLite (WAL mode + FTS5 full-text indexing), robust PDF/DOCX parsing with scanned PDF warnings, a whitespace-invariant sliding-window quote verification engine, an autonomous multi-round tool-calling research agent emitting real-time status events, a dual-mode PDF.js/DOCX citation-highlighting viewer, and a clause-level legal contract comparison engine.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS, Lucide React, Radix UI, `better-sqlite3`, `pdfjs-dist`, `mammoth`, `ai` (Vercel AI SDK), `@ai-sdk/openai`, `@ai-sdk/google`, `diff`, `vitest`.

**Spec:** [`docs/superpowers/specs/2026-10-08-legal-contract-analyzer-design.md`](file:///Users/anishsharma/Desktop/Apply%20Job/File%20Analyze/docs/superpowers/specs/2026-10-08-legal-contract-analyzer-design.md)

## Global Constraints

- Accept only `.pdf` and `.docx` file uploads; reject all other formats with a clear user message.
- Detect scanned PDFs (< 50 extractable characters across pages) and alert the user immediately without saving empty documents.
- Quote verification must be 100% deterministic in code, whitespace-invariant, and never trust AI-claimed page numbers or offsets.
- Unverified quotes must never be presented as genuine; mark them clearly with an unverified badge.
- When partial document coverage is retrieved, the agent must never state that a clause does not exist as though it read all of it.
- Part C Option 2 must enforce a hard cap of 6 tool-calling rounds and handle malformed tool calls without crashing.
- No hardcoded API keys; read keys from `.env` (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`, or `GEMINI_API_KEY`).

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

**Interfaces:**
- Produces: Base project structure, TypeScript configuration, and Vitest test runner.

- [ ] **Step 1: Create package.json with dependencies**

```json
{
  "name": "legal-contract-analyzer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "better-sqlite3": "^11.8.1",
    "pdfjs-dist": "^4.10.38",
    "mammoth": "^1.9.0",
    "ai": "^4.1.0",
    "@ai-sdk/openai": "^1.1.0",
    "@ai-sdk/google": "^1.1.0",
    "diff": "^7.0.0",
    "lucide-react": "^0.475.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.1"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/node": "^22.13.0",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@types/better-sqlite3": "^7.6.12",
    "@types/diff": "^7.0.0",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "vitest": "^3.0.4"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: Dependencies installed and `node_modules` generated.

- [ ] **Step 3: Create tsconfig.json, next.config.mjs, vitest.config.ts, and tailwind.config.ts**

Setup TypeScript path aliases (`@/*` -> `./src/*`), server external packages for `better-sqlite3`, and test runner configuration.

- [ ] **Step 4: Verify test runner executes**

Run: `npx vitest --version`
Expected: Outputs Vitest version without error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts tailwind.config.ts postcss.config.mjs src/app/
git commit -m "feat: scaffold next.js 15 project with typescript, tailwind, and vitest"
```

---

### Task 2: Database Layer & SQLite Schema

**Files:**
- Create: `src/lib/db/schema.sql`
- Create: `src/lib/db/index.ts`
- Create: `tests/db.test.ts`

**Interfaces:**
- Produces: `getDb()`, `insertDocument(doc)`, `getDocument(id)`, `listDocuments()`, `deleteDocument(id)`, `insertSections(sections)`, `searchSectionsFTS(docId, query)`, `createChatSession(session)`, `insertChatMessage(msg)`, `getChatMessages(sessionId)`.

- [ ] **Step 1: Write the failing test for database operations**

```typescript
// tests/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, insertDocument, getDocument, deleteDocument, listDocuments } from '../src/lib/db';

describe('Database Layer', () => {
  beforeEach(() => {
    const db = getDb(':memory:');
  });

  it('inserts and retrieves a document', () => {
    const doc = {
      id: 'doc-1',
      filename: 'test-contract.pdf',
      fileType: 'pdf' as const,
      filePath: '/uploads/doc-1.pdf',
      fileSize: 1024,
      pageCount: 5,
      extractedText: 'This is a sample contract text.',
      isScanned: 0,
    };
    insertDocument(doc);
    const retrieved = getDocument('doc-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.filename).toBe('test-contract.pdf');
  });

  it('deletes a document and lists documents', () => {
    const docs = listDocuments();
    expect(Array.isArray(docs)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db.test.ts`
Expected: FAIL (module `../src/lib/db` not found).

- [ ] **Step 3: Implement SQLite database schema and helper functions**

Implement `src/lib/db/schema.sql` and `src/lib/db/index.ts` initializing `better-sqlite3` with WAL mode, foreign keys, tables (`documents`, `document_sections`, `document_fts`, `chat_sessions`, `chat_messages`), and CRUD functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db tests/db.test.ts
git commit -m "feat: implement sqlite database layer with fts5 indexing and crud helpers"
```

---

### Task 3: Document Parsers & Scanned Document Detection

**Files:**
- Create: `src/lib/parsers/types.ts`
- Create: `src/lib/parsers/pdf.ts`
- Create: `src/lib/parsers/docx.ts`
- Create: `src/lib/parsers/segmenter.ts`
- Create: `tests/parsers.test.ts`

**Interfaces:**
- Consumes: Raw PDF or DOCX file buffer.
- Produces: `parseDocument(buffer, filename, mimeType)` returning:
  `{ text, pageCount, pages: [{ pageNumber, text }], sections: [{ sectionNumber, title, content, pageNumber, startChar, endChar }], isScanned: boolean, htmlContent?: string }`.

- [ ] **Step 1: Write the failing test for document parsing and scanned detection**

```typescript
// tests/parsers.test.ts
import { describe, it, expect } from 'vitest';
import { isScannedDocument } from '../src/lib/parsers/pdf';
import { segmentClauses } from '../src/lib/parsers/segmenter';

describe('Document Parsers & Scanned Detection', () => {
  it('detects scanned PDF with insufficient text', () => {
    expect(isScannedDocument('', 10)).toBe(true);
    expect(isScannedDocument('   \n\t  ', 5)).toBe(true);
    expect(isScannedDocument('This is a fully readable legal contract clause with lots of text.', 1)).toBe(false);
  });

  it('segments text into structured clauses and sections', () => {
    const rawText = `
    AGREEMENT
    Section 1. Definitions
    As used herein, terms shall have the meanings set forth below.

    Section 2. Limitation of Liability
    Neither party shall be liable for indirect damages.
    `;
    const sections = segmentClauses(rawText, 'doc-1');
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].sectionNumber).toBe('Section 1');
    expect(sections[1].sectionNumber).toBe('Section 2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parsers.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement PDF parser, DOCX parser, and clause segmenter**

- In `src/lib/parsers/pdf.ts`: Use `pdfjs-dist` to extract page-by-page text. Calculate printable character density across pages; if < 50 characters, mark `isScanned = true`.
- In `src/lib/parsers/docx.ts`: Use `mammoth` to extract clean semantic HTML and plain text with preserved heading markers.
- In `src/lib/parsers/segmenter.ts`: Extract clauses using legal section regex (`Section \d+`, `Article [IVXLCDM]+`, `\d+\.\d+`). Calculate exact `startChar` and `endChar` offsets.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/parsers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsers tests/parsers.test.ts
git commit -m "feat: implement pdf and docx parsers with scanned document detection and clause segmentation"
```

---

### Task 4: Deterministic Quote Verification Engine

**Files:**
- Create: `src/lib/verification/types.ts`
- Create: `src/lib/verification/verifier.ts`
- Create: `tests/verifier.test.ts`

**Interfaces:**
- Consumes: `canonicalText`, `quoteText`, optional `documentPages`.
- Produces: `verifyQuote(documentText, quoteText, pages)` ->
  `{ verified: boolean, quote: string, matchedText?: string, pageNumber?: number, startChar?: number, endChar?: number, reason?: string }`.

- [ ] **Step 1: Write the failing test for quote verification**

```typescript
// tests/verifier.test.ts
import { describe, it, expect } from 'vitest';
import { verifyQuote } from '../src/lib/verification/verifier';

describe('Quote Verification Engine', () => {
  const docText = `In no event shall either party's aggregate liability exceed AED 100,000.\nThis agreement is governed by the laws of DIFC.`;
  const pages = [
    { pageNumber: 1, text: docText, startChar: 0, endChar: docText.length }
  ];

  it('verifies exact quote with identical whitespace', () => {
    const quote = "In no event shall either party's aggregate liability exceed AED 100,000.";
    const result = verifyQuote(docText, quote, pages);
    expect(result.verified).toBe(true);
    expect(result.pageNumber).toBe(1);
    expect(result.startChar).toBe(0);
  });

  it('verifies quote with irregular whitespace and newlines', () => {
    const quote = "In no event shall either\nparty's aggregate   liability exceed AED 100,000.";
    const result = verifyQuote(docText, quote, pages);
    expect(result.verified).toBe(true);
  });

  it('rejects hallucinated or non-existent quotes', () => {
    const fakeQuote = "The supplier warrants unlimited liability under all circumstances.";
    const result = verifyQuote(docText, fakeQuote, pages);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/verifier.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement token-normalizing sliding-window verification engine**

- Normalize token streams: strip excess whitespace, unify newlines, sanitize smart-quotes.
- Map token positions back to character indices `[startChar, endChar]`.
- Find exact token subsequence match.
- Map matched offsets back to the canonical page number using `pages`.
- If match fails: return `{ verified: false, reason: "Quote not found in document text" }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/verifier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verification tests/verifier.test.ts
git commit -m "feat: implement whitespace-tolerant deterministic quote verification engine"
```

---

### Task 5: Agentic Document Research Tools & Orchestrator (Part C Option 2)

**Files:**
- Create: `src/lib/agent/types.ts`
- Create: `src/lib/agent/tools.ts`
- Create: `src/lib/agent/orchestrator.ts`
- Create: `tests/agent.test.ts`

**Interfaces:**
- Produces:
  - `createContractTools(documentIds)`: Vercel AI SDK tools: `list_clauses`, `search_document`, `get_section`, `check_coverage`.
  - `runAgenticResearch(options)`: Multi-round loop with max 6 rounds, live SSE step events, error handling for malformed tool calls, and post-generation quote verification pass.

- [ ] **Step 1: Write the failing test for agent tools and round cap**

```typescript
// tests/agent.test.ts
import { describe, it, expect } from 'vitest';
import { createContractTools } from '../src/lib/agent/tools';

describe('Agentic Research Tools', () => {
  it('exposes list_clauses, search_document, get_section, and check_coverage', () => {
    const tools = createContractTools(['doc-1']);
    expect(tools.list_clauses).toBeDefined();
    expect(tools.search_document).toBeDefined();
    expect(tools.get_section).toBeDefined();
    expect(tools.check_coverage).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agent.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement tools and orchestrator with max 6 round cap and malformed call safety**

- In `src/lib/agent/tools.ts`: Implement `list_clauses`, `search_document`, `get_section`, `check_coverage` interfacing with SQLite FTS5.
- Wrap execution in `try / catch` so missing parameters or non-existent sections return informative error strings (e.g. `Error: Section not found`) without throwing uncaught exceptions.
- In `src/lib/agent/orchestrator.ts`: Implement multi-step generation with round counter capped at 6. Emit step events (`event: step, data: { tool, query, status }`). Run quote verification on the final assistant text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/agent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent tests/agent.test.ts
git commit -m "feat: implement agentic document research tools and multi-round orchestrator"
```

---

### Task 6: Backend API Routes

**Files:**
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/api/documents/route.ts`
- Create: `src/app/api/documents/[id]/route.ts`
- Create: `src/app/api/chat/route.ts`
- Create: `src/app/api/compare/route.ts`
- Create: `tests/api-compare.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/upload`: handles multipart upload, validates PDF/DOCX, detects scanned documents, indexes clauses, stores file.
  - `GET /api/documents`: lists all uploaded contracts.
  - `DELETE /api/documents/[id]`: deletes contract and cascades sections/fts.
  - `POST /api/chat`: streaming SSE endpoint executing agentic research and returning verified quotes.
  - `POST /api/compare`: aligns clauses between two contracts and computes substantive difference summaries and significance levels (High, Medium, Low).

- [ ] **Step 1: Write test for clause alignment and comparison diffing**

```typescript
// tests/api-compare.test.ts
import { describe, it, expect } from 'vitest';
import { compareClauses } from '../src/lib/comparison/differ';

describe('Document Comparison Engine', () => {
  it('identifies unchanged, modified, and added clauses', () => {
    const clausesA = [
      { sectionNumber: '1.1', title: 'Term', content: 'This agreement lasts 1 year.' }
    ];
    const clausesB = [
      { sectionNumber: '1.1', title: 'Term', content: 'This agreement lasts 3 years.' },
      { sectionNumber: '1.2', title: 'Renewal', content: 'Automatic renewal applies.' }
    ];
    const result = compareClauses(clausesA, clausesB);
    expect(result.length).toBe(2);
    expect(result[0].status).toBe('modified');
    expect(result[1].status).toBe('added');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api-compare.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement diffing engine and all API routes**

Implement `src/lib/comparison/differ.ts` and all route handlers (`/api/upload`, `/api/documents`, `/api/documents/[id]`, `/api/chat`, `/api/compare`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api-compare.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api src/lib/comparison tests/api-compare.test.ts
git commit -m "feat: implement backend api routes for upload, chat, documents, and contract comparison"
```

---

### Task 7: Dual-Mode Document Viewer & Citation Highlighter (Part B.5)

**Files:**
- Create: `src/components/viewer/types.ts`
- Create: `src/components/viewer/DocumentViewer.tsx`
- Create: `src/components/viewer/PDFViewer.tsx`
- Create: `src/components/viewer/DOCXViewer.tsx`
- Create: `src/components/viewer/HighlightOverlay.tsx`

**Interfaces:**
- Consumes: `documentId`, `fileType`, `activeHighlight: { pageNumber, startChar, endChar, quoteText } | null`.
- Produces: Interactive document viewer that renders PDF pages (canvas + textLayer) or DOCX formatted HTML, listens to active citations, scrolls smoothly to target passage, and renders animated yellow highlight pulse.

- [ ] **Step 1: Create viewer types and highlight mapping utilities**
- [ ] **Step 2: Implement PDFViewer using PDF.js with text-layer DOM elements**
- [ ] **Step 3: Implement DOCXViewer with anchored paragraph IDs and inline highlights**
- [ ] **Step 4: Implement DocumentViewer wrapper with zoom, page navigation, and auto-scroll**
- [ ] **Step 5: Commit**

```bash
git add src/components/viewer/
git commit -m "feat: implement dual-mode pdf and docx document viewer with citation highlighting"
```

---

### Task 8: Chat Workspace & Live Research Stream UI (Part A.2, A.3, Part C)

**Files:**
- Create: `src/components/chat/types.ts`
- Create: `src/components/chat/ChatPane.tsx`
- Create: `src/components/chat/ChatMessage.tsx`
- Create: `src/components/chat/ResearchStepBadge.tsx`
- Create: `src/components/chat/VerifiedQuoteBadge.tsx`
- Create: `src/components/chat/CoverageWarning.tsx`

**Interfaces:**
- Consumes: `selectedDocumentIds`, `onQuoteClick(quote)`.
- Produces: Chat console with streaming markdown, "Stop Generating" button, expandable agent research steps, verified quote cards with jump-to-source click handler, and coverage notice.

- [ ] **Step 1: Implement ResearchStepBadge showing real-time tool progress**
- [ ] **Step 2: Implement VerifiedQuoteBadge distinguishing verified (green) vs unverified (amber) citations**
- [ ] **Step 3: Implement ChatMessage with markdown rendering and citation pills**
- [ ] **Step 4: Implement ChatPane with SSE streaming, AbortController stop button, and history reload**
- [ ] **Step 5: Commit**

```bash
git add src/components/chat/
git commit -m "feat: implement chat console with streaming responses, research step feed, and verified quote pills"
```

---

### Task 9: Contract Comparison UI & Significance Filtering (Part B.7)

**Files:**
- Create: `src/components/compare/ComparisonView.tsx`
- Create: `src/components/compare/ClauseDiffCard.tsx`
- Create: `src/components/compare/SignificanceFilter.tsx`

**Interfaces:**
- Consumes: Document A and Document B selection.
- Produces: Side-by-side or unified clause comparison screen with filters (`All`, `High`, `Medium`, `Low`), inline additions/deletions, and plain-language legal change summaries.

- [ ] **Step 1: Implement SignificanceFilter button group**
- [ ] **Step 2: Implement ClauseDiffCard showing substantive change explanation and diff text**
- [ ] **Step 3: Implement ComparisonView container with document selector and export summary**
- [ ] **Step 4: Commit**

```bash
git add src/components/compare/
git commit -m "feat: implement contract comparison view with clause-level diffing and significance filtering"
```

---

### Task 10: Document Library, Multi-Document Selection & Layout Integration (Part A.1, B.6)

**Files:**
- Create: `src/components/library/DocumentLibrary.tsx`
- Create: `src/components/library/UploadModal.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: Complete application shell connecting Document Library (list, upload with progress, delete), multi-doc checkbox selection, split-screen layout (Chat left, Viewer right), and top-level mode navigation.

- [ ] **Step 1: Implement UploadModal with drag-and-drop, PDF/DOCX filter, scanned warning, and progress states**
- [ ] **Step 2: Implement DocumentLibrary with multi-select checkboxes for multi-document Q&A**
- [ ] **Step 3: Connect top-level layout in `src/app/page.tsx` with split pane and active view state**
- [ ] **Step 4: Verify full application build with `npm run build`**

Run: `npm run build`
Expected: Build succeeds with zero TypeScript or bundling errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/library/ src/app/page.tsx
git commit -m "feat: integrate application layout with document library, upload modal, and multi-doc mode"
```

---

### Task 11: Submission Deliverables (Documentation, Demo Script, Technical Note & Deployment)

**Files:**
- Create: `README.md`
- Create: `docs/submission/demo-video-script.md`
- Create: `docs/submission/technical-note.md`
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: Complete submission artifacts fulfilling all 5 evaluation items:
  1. GitHub repository documentation.
  2. Deployment instructions (Dockerfile + Vercel/Railway setup).
  3. Screenshots and local run instructions in README.
  4. 3-5 minute demo video script.
  5. Half-page technical note covering quote verification, large documents, Part C agentic research, and future roadmap.

- [ ] **Step 1: Create comprehensive README.md with architecture diagram, feature checklist, and setup guide**
- [ ] **Step 2: Create 3-5 minute demo video script in `docs/submission/demo-video-script.md`**
- [ ] **Step 3: Create half-page technical note in `docs/submission/technical-note.md`**
- [ ] **Step 4: Create Dockerfile for containerized deployment**
- [ ] **Step 5: Commit**

```bash
git add README.md docs/submission/ Dockerfile .dockerignore
git commit -m "docs: add submission deliverables, demo video script, technical note, and dockerfile"
```
