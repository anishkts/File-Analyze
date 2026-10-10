import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDb,
  insertDocument,
  getDocument,
  deleteDocument,
  listDocuments,
  insertSections,
  searchSectionsFTS,
  createChatSession,
  getChatSession,
  insertChatMessage,
  getChatMessages,
  insertPages,
  getDocumentPages,
} from '../src/lib/db';
import fs from 'fs';
import path from 'path';

describe('Database Layer', () => {
  const testDbPath = path.resolve(__dirname, '../data/test-contracts.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }
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
    insertDocument(doc, testDbPath);
    const retrieved = getDocument('doc-1', testDbPath);
    expect(retrieved).toBeDefined();
    expect(retrieved?.filename).toBe('test-contract.pdf');
    expect(retrieved?.pageCount).toBe(5);
  });

  it('deletes a document and cascades', () => {
    const doc = {
      id: 'doc-del',
      filename: 'delete-me.docx',
      fileType: 'docx' as const,
      filePath: '/uploads/delete-me.docx',
      fileSize: 2048,
      pageCount: 2,
      extractedText: 'To be deleted.',
      isScanned: 0,
    };
    insertDocument(doc, testDbPath);
    expect(getDocument('doc-del', testDbPath)).toBeDefined();

    deleteDocument('doc-del', testDbPath);
    expect(getDocument('doc-del', testDbPath)).toBeUndefined();
  });

  it('inserts sections and executes FTS search', () => {
    const doc = {
      id: 'doc-fts',
      filename: 'fts.pdf',
      fileType: 'pdf' as const,
      filePath: '/uploads/fts.pdf',
      fileSize: 100,
      pageCount: 1,
      extractedText: 'Confidentiality and Liability terms.',
      isScanned: 0,
    };
    insertDocument(doc, testDbPath);

    insertSections(
      [
        {
          id: 'sec-1',
          documentId: 'doc-fts',
          sectionNumber: 'Section 8',
          title: 'Limitation of Liability',
          content: 'The aggregate liability shall not exceed AED 50,000.',
          startChar: 0,
          endChar: 55,
          pageNumber: 1,
        },
      ],
      testDbPath
    );

    const results = searchSectionsFTS('doc-fts', 'liability', testDbPath);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Limitation of Liability');
  });

  it('creates chat session and records messages', () => {
    createChatSession(
      {
        id: 'session-1',
        documentIds: ['doc-1'],
        title: 'Contract Chat',
      },
      testDbPath
    );

    const session = getChatSession('session-1', testDbPath);
    expect(session).toBeDefined();
    expect(session?.title).toBe('Contract Chat');

    insertChatMessage(
      {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'What is the liability cap?',
      },
      testDbPath
    );

    insertChatMessage(
      {
        id: 'msg-2',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'The liability cap is AED 50,000.',
        quotes: [{ text: 'AED 50,000', docId: 'doc-1', page: 1, verified: true }],
      },
      testDbPath
    );

    const messages = getChatMessages('session-1', testDbPath);
    expect(messages.length).toBe(2);
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].quotes?.length).toBe(1);
  });

  it('stores and retrieves document pages accurately', () => {
    const doc = {
      id: 'doc-multi-page',
      filename: 'multi-page.pdf',
      fileType: 'pdf' as const,
      filePath: '/uploads/multi-page.pdf',
      fileSize: 5000,
      pageCount: 3,
      extractedText: 'Page 1 content here. Page 2 content here. Page 3 content here.',
      isScanned: 0,
    };
    insertDocument(doc, testDbPath);

    insertPages(
      [
        { id: 'p-1', documentId: 'doc-multi-page', pageNumber: 1, startChar: 0, endChar: 20 },
        { id: 'p-2', documentId: 'doc-multi-page', pageNumber: 2, startChar: 21, endChar: 42 },
        { id: 'p-3', documentId: 'doc-multi-page', pageNumber: 3, startChar: 43, endChar: 65 },
      ],
      testDbPath
    );

    const pages = getDocumentPages('doc-multi-page', testDbPath);
    expect(pages.length).toBe(3);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[2].pageNumber).toBe(3);
    expect(pages[2].startChar).toBe(43);
  });

  it('derives pages from sections when document_pages has not been populated', () => {
    const doc = {
      id: 'doc-legacy',
      filename: 'legacy.pdf',
      fileType: 'pdf' as const,
      filePath: '/uploads/legacy.pdf',
      fileSize: 4000,
      pageCount: 2,
      extractedText: 'Legacy page 1 text. Legacy page 2 text.',
      isScanned: 0,
    };
    insertDocument(doc, testDbPath);

    insertSections(
      [
        {
          id: 'sec-1',
          documentId: 'doc-legacy',
          content: 'Legacy page 1 text.',
          startChar: 0,
          endChar: 19,
          pageNumber: 1,
        },
        {
          id: 'sec-2',
          documentId: 'doc-legacy',
          content: 'Legacy page 2 text.',
          startChar: 20,
          endChar: 39,
          pageNumber: 2,
        },
      ],
      testDbPath
    );

    const derivedPages = getDocumentPages('doc-legacy', testDbPath);
    expect(derivedPages.length).toBe(2);
    expect(derivedPages[0].pageNumber).toBe(1);
    expect(derivedPages[1].pageNumber).toBe(2);
  });
});
