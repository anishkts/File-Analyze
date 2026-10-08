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
});
