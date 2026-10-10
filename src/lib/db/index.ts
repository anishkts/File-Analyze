import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DocumentRecord {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx';
  filePath: string;
  fileSize: number;
  pageCount: number;
  extractedText: string;
  isScanned?: number;
  htmlContent?: string | null;
  createdAt?: string;
}

export interface SectionRecord {
  id: string;
  documentId: string;
  sectionNumber?: string;
  title?: string;
  content: string;
  startChar: number;
  endChar: number;
  pageNumber: number;
}

export interface PageRecord {
  id: string;
  documentId: string;
  pageNumber: number;
  startChar: number;
  endChar: number;
}

export interface ChatSessionRecord {
  id: string;
  documentIds: string[];
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
  quotes?: any[];
  createdAt?: string;
}

const defaultDbPath =
  process.env.DATABASE_PATH ||
  (process.env.VERCEL ? '/tmp/contracts.db' : path.resolve(process.cwd(), 'data/contracts.db'));
const dbCache = new Map<string, Database.Database>();

export function getDb(customPath?: string): Database.Database {
  const dbPath = customPath || defaultDbPath;
  if (dbCache.has(dbPath)) {
    return dbCache.get(dbPath)!;
  }

  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    // Embedded fallback schema if schema.sql is not found in bundled environment
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx')),
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        extracted_text TEXT NOT NULL,
        is_scanned INTEGER DEFAULT 0,
        html_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_sections (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        section_number TEXT,
        title TEXT,
        content TEXT NOT NULL,
        start_char INTEGER NOT NULL,
        end_char INTEGER NOT NULL,
        page_number INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sections_doc_id ON document_sections(document_id);
      CREATE INDEX IF NOT EXISTS idx_sections_page ON document_sections(document_id, page_number);

      CREATE TABLE IF NOT EXISTS document_pages (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        start_char INTEGER NOT NULL,
        end_char INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pages_doc ON document_pages(document_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(
        document_id UNINDEXED,
        section_id UNINDEXED,
        content,
        tokenize = 'porter unicode61'
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        document_ids TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        tool_calls TEXT,
        quotes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    `);
  }

  dbCache.set(dbPath, db);
  return db;
}

export function insertDocument(doc: DocumentRecord, customPath?: string): void {
  const db = getDb(customPath);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO documents (
      id, filename, file_type, file_path, file_size, page_count, extracted_text, is_scanned, html_content
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  stmt.run(
    doc.id,
    doc.filename,
    doc.fileType,
    doc.filePath,
    doc.fileSize,
    doc.pageCount,
    doc.extractedText,
    doc.isScanned ? 1 : 0,
    doc.htmlContent || null
  );
}

export function getDocument(id: string, customPath?: string): DocumentRecord | undefined {
  const db = getDb(customPath);
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    filename: row.filename,
    fileType: row.file_type,
    filePath: row.file_path,
    fileSize: row.file_size,
    pageCount: row.page_count,
    extractedText: row.extracted_text,
    isScanned: row.is_scanned,
    htmlContent: row.html_content,
    createdAt: row.created_at,
  };
}

export function listDocuments(customPath?: string): DocumentRecord[] {
  const db = getDb(customPath);
  const rows = db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    fileType: row.file_type,
    filePath: row.file_path,
    fileSize: row.file_size,
    pageCount: row.page_count,
    extractedText: row.extracted_text,
    isScanned: row.is_scanned,
    htmlContent: row.html_content,
    createdAt: row.created_at,
  }));
}

export function deleteDocument(id: string, customPath?: string): void {
  const db = getDb(customPath);
  db.transaction(() => {
    // Delete FTS entries
    db.prepare('DELETE FROM document_fts WHERE document_id = ?').run(id);
    // Delete document (cascades to document_sections)
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  })();
}

export function insertSections(sections: SectionRecord[], customPath?: string): void {
  const db = getDb(customPath);
  const insertSec = db.prepare(`
    INSERT OR REPLACE INTO document_sections (
      id, document_id, section_number, title, content, start_char, end_char, page_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare(`
    INSERT INTO document_fts (document_id, section_id, content) VALUES (?, ?, ?)
  `);

  const tx = db.transaction((secs: SectionRecord[]) => {
    if (secs.length > 0) {
      const docId = secs[0].documentId;
      db.prepare('DELETE FROM document_sections WHERE document_id = ?').run(docId);
      db.prepare('DELETE FROM document_fts WHERE document_id = ?').run(docId);
    }
    for (const s of secs) {
      insertSec.run(
        s.id,
        s.documentId,
        s.sectionNumber || null,
        s.title || null,
        s.content,
        s.startChar,
        s.endChar,
        s.pageNumber
      );
      insertFts.run(s.documentId, s.id, `${s.title || ''} ${s.content}`);
    }
  });

  tx(sections);
}

export function getDocumentSections(documentId: string, customPath?: string): SectionRecord[] {
  const db = getDb(customPath);
  const rows = db.prepare('SELECT * FROM document_sections WHERE document_id = ? ORDER BY page_number, start_char').all(documentId) as any[];
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    sectionNumber: r.section_number,
    title: r.title,
    content: r.content,
    startChar: r.start_char,
    endChar: r.end_char,
    pageNumber: r.page_number,
  }));
}

export function searchSectionsFTS(documentId: string, query: string, customPath?: string): SectionRecord[] {
  const db = getDb(customPath);
  // Sanitize query for FTS5
  const sanitizedQuery = query.replace(/[^\w\s]/g, ' ').trim();
  if (!sanitizedQuery) return [];

  const rows = db.prepare(`
    SELECT s.*, bm25(document_fts) as rank
    FROM document_fts
    JOIN document_sections s ON s.id = document_fts.section_id
    WHERE document_fts.document_id = ? AND document_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `).all(documentId, sanitizedQuery) as any[];

  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    sectionNumber: r.section_number,
    title: r.title,
    content: r.content,
    startChar: r.start_char,
    endChar: r.end_char,
    pageNumber: r.page_number,
  }));
}

export function insertPages(
  pages: Array<{ id: string; documentId: string; pageNumber: number; startChar: number; endChar: number }>,
  customPath?: string
): void {
  const db = getDb(customPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_pages (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      start_char INTEGER NOT NULL,
      end_char INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pages_doc ON document_pages(document_id);
  `);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO document_pages (id, document_id, page_number, start_char, end_char)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.id, item.documentId, item.pageNumber, item.startChar, item.endChar);
    }
  });
  tx(pages);
}

export function getDocumentPages(
  documentId: string,
  customPath?: string
): Array<{ pageNumber: number; text: string; startChar: number; endChar: number }> {
  const db = getDb(customPath);

  // 1. Check if document_pages table exists and has entries
  try {
    const pageRows = db
      .prepare('SELECT page_number, start_char, end_char FROM document_pages WHERE document_id = ? ORDER BY page_number ASC')
      .all(documentId) as any[];
    if (pageRows && pageRows.length > 0) {
      return pageRows.map((r) => ({
        pageNumber: r.page_number,
        text: '',
        startChar: r.start_char,
        endChar: r.end_char,
      }));
    }
  } catch {
    // document_pages table may not exist yet in legacy DBs, fall through
  }

  // 2. Derive pages from document_sections
  const sectionRows = db
    .prepare(`
      SELECT page_number, MIN(start_char) as min_start, MAX(end_char) as max_end
      FROM document_sections
      WHERE document_id = ?
      GROUP BY page_number
      ORDER BY page_number ASC
    `)
    .all(documentId) as any[];

  if (sectionRows && sectionRows.length > 0) {
    return sectionRows.map((r) => ({
      pageNumber: r.page_number,
      text: '',
      startChar: r.min_start,
      endChar: r.max_end,
    }));
  }

  // 3. Fallback: Proportional page ranges based on document length and page_count
  const doc = getDocument(documentId, customPath);
  if (doc && doc.pageCount > 0 && doc.extractedText) {
    const textLen = doc.extractedText.length;
    const charsPerPage = Math.ceil(textLen / doc.pageCount);
    const pages: Array<{ pageNumber: number; text: string; startChar: number; endChar: number }> = [];
    for (let p = 1; p <= doc.pageCount; p++) {
      pages.push({
        pageNumber: p,
        text: '',
        startChar: (p - 1) * charsPerPage,
        endChar: Math.min(textLen, p * charsPerPage),
      });
    }
    return pages;
  }

  return [];
}

export function createChatSession(
  session: { id: string; documentIds: string[]; title: string },
  customPath?: string
): void {
  const db = getDb(customPath);
  db.prepare(`
    INSERT INTO chat_sessions (id, document_ids, title)
    VALUES (?, ?, ?)
  `).run(session.id, JSON.stringify(session.documentIds), session.title);
}

export function getChatSession(id: string, customPath?: string): ChatSessionRecord | undefined {
  const db = getDb(customPath);
  const row = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    documentIds: JSON.parse(row.document_ids),
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listChatSessions(documentId?: string, customPath?: string): ChatSessionRecord[] {
  const db = getDb(customPath);
  const rows = db.prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC').all() as any[];
  const sessions = rows.map((r) => ({
    id: r.id,
    documentIds: JSON.parse(r.document_ids),
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  if (documentId) {
    return sessions.filter((s) => s.documentIds.includes(documentId));
  }
  return sessions;
}

export function insertChatMessage(msg: ChatMessageRecord, customPath?: string): void {
  const db = getDb(customPath);
  db.prepare(`
    INSERT INTO chat_messages (id, session_id, role, content, tool_calls, quotes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    msg.id,
    msg.sessionId,
    msg.role,
    msg.content,
    msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
    msg.quotes ? JSON.stringify(msg.quotes) : null
  );

  db.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(msg.sessionId);
}

export function getChatMessages(sessionId: string, customPath?: string): ChatMessageRecord[] {
  const db = getDb(customPath);
  const rows = db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as any[];
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.role,
    content: r.content,
    toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
    quotes: r.quotes ? JSON.parse(r.quotes) : undefined,
    createdAt: r.created_at,
  }));
}
